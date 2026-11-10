import { Redis } from '@upstash/redis';
import { config } from './env.js';

export class InMemoryRedis {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async set(
    key: string,
    value: string,
    opts?: { nx?: boolean; ex?: number }
  ): Promise<'OK' | null> {
    const now = Date.now();
    const existing = this.store.get(key);
    if (existing && existing.expiresAt > now) {
      if (opts?.nx) {
        return null;
      }
    }
    const expiresAt = opts?.ex ? now + opts.ex * 1000 : Infinity;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async eval(script: string, keys: string[], args: unknown[]): Promise<number> {
    const key = keys[0];
    const expectedValue = String(args[0]);
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

export const redis =
  process.env.NODE_ENV === 'test'
    ? inMemoryRedisInstance
    : new Redis({
        url: config.UPSTASH_REDIS_REST_URL,
        token: config.UPSTASH_REDIS_REST_TOKEN,
      });
