import 'dotenv/config';
import pg from 'pg';

export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/ev_db'
  );
}

function shouldUseSsl(dbUrl: string): boolean | { rejectUnauthorized: boolean } {
  if (process.env.DB_SSL === 'false') return false;
  if (process.env.DB_SSL === 'true') return { rejectUnauthorized: false };

  // Detect local or docker hosts where SSL is not enabled
  if (
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1') ||
    dbUrl.includes('@postgres:') ||
    dbUrl.includes('@postgres/')
  ) {
    if (!dbUrl.includes('sslmode=require') && !dbUrl.includes('neon.tech')) {
      return false;
    }
  }

  // Cloud hosted databases (Neon, Render, Railway, AWS) require SSL
  if (
    dbUrl.includes('neon.tech') ||
    dbUrl.includes('sslmode=require') ||
    dbUrl.includes('railway') ||
    dbUrl.includes('render')
  ) {
    return { rejectUnauthorized: false };
  }

  return false;
}

const dbUrl = getDatabaseUrl();
const ssl = shouldUseSsl(dbUrl);

export const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: ssl,
  max: Number(process.env.PGMAX || 20),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export default pool;

