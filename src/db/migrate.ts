import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const migrationPath = fileURLToPath(new URL('./migrations/001_init.sql', import.meta.url));

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(await readFile(migrationPath, 'utf8'));
    await client.query('COMMIT');
    console.log('Migration applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
