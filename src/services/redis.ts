import 'dotenv/config';
import { Redis as UpstashRedis } from '@upstash/redis';
import { Redis as IORedisClient } from 'ioredis';

export class InMemoryRedis {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async set(
    key: string,
    value: string,
    opts?: { nx?: boolean; ex?: number } | string,
    ...rest: unknown[]
  ): Promise<'OK' | null> {
    const now = Date.now();
    let isNx = false;
    let exSeconds: number | undefined;

    if (opts && typeof opts === 'object') {
      isNx = Boolean(opts.nx);
      exSeconds = opts.ex;
    } else if (typeof opts === 'string') {
      const args = [opts, ...rest].map(String);
      if (args.includes('NX')) isNx = true;
      const exIndex = args.indexOf('EX');
      if (exIndex !== -1 && args[exIndex + 1]) {
        exSeconds = Number(args[exIndex + 1]);
      }
    }

    const existing = this.store.get(key);
    if (existing && existing.expiresAt > now) {
      if (isNx) {
        return null;
      }
    }
    const expiresAt = exSeconds ? now + exSeconds * 1000 : Infinity;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async eval(script: string, keys: string[] | number, ...args: unknown[]): Promise<number> {
    let key: string;
    let expectedValue: string;

    if (Array.isArray(keys)) {
      key = keys[0];
      const scriptArgs = args[0] as unknown[];
      expectedValue = String(Array.isArray(scriptArgs) ? scriptArgs[0] : args[0]);
    } else {
      key = String(args[0]);
      expectedValue = String(args[1]);
    }

    const now = Date.now();
    const item = this.store.get(key);
    if (item && item.expiresAt > now && item.value === expectedValue) {
      this.store.delete(key);
      return 1;
    }
    return 0;
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  clear(): void {
    this.store.clear();
  }
}

export const inMemoryRedisInstance = new InMemoryRedis();

export interface IRedisService {
  set(
    key: string,
    value: string,
    opts?: { nx?: boolean; ex?: number }
  ): Promise<string | null>;
  eval(
    script: string,
    keys: string[],
    args: unknown[]
  ): Promise<unknown>;
  get?(key: string): Promise<string | null>;
  del?(...keys: string[]): Promise<number>;
  clear?(): void;
}

class IORedisAdapter implements IRedisService {
  private client: IORedisClient;

  constructor(url: string) {
    this.client = new IORedisClient(url, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
      enableAutoPipelining: true,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });

    this.client.on('error', (err: Error) => {
      console.warn('Redis connection issue:', err.message);
    });
  }

  async set(
    key: string,
    value: string,
    opts?: { nx?: boolean; ex?: number }
  ): Promise<string | null> {
    if (opts?.nx && opts?.ex) {
      return this.client.set(key, value, 'EX', opts.ex, 'NX');
    }
    if (opts?.nx) {
      return this.client.set(key, value, 'NX');
    }
    if (opts?.ex) {
      return this.client.set(key, value, 'EX', opts.ex);
    }
    return this.client.set(key, value);
  }

  async eval(
    script: string,
    keys: string[],
    args: unknown[]
  ): Promise<unknown> {
    return this.client.eval(script, keys.length, ...keys, ...(args as (string | number)[]));
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }
}

export function createRedisClient(): IRedisService {
  if (process.env.NODE_ENV === 'test') {
    return inMemoryRedisInstance;
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return new IORedisAdapter(redisUrl);
  }

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }) as unknown as IRedisService;
  }

  return new IORedisAdapter('redis://localhost:6379');
}

export const redis = createRedisClient();
export default redis;
