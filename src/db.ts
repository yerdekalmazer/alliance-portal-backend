import fs from 'fs';
import path from 'path';
import { Pool, PoolClient, types } from 'pg';

// DATE sütunları saat dilimine göre kaymasın: '2026-11-10' olduğu gibi dönsün
types.setTypeParser(types.builtins.DATE, (v) => v);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL tanımlı değil');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DATABASE_POOL_MAX || 5),
});

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function queryOne<T = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Şemayı uygular; tüm ifadeler IF NOT EXISTS olduğu için her açılışta güvenle çalışır. */
export async function migrate(): Promise<void> {
  const candidates = [
    path.join(__dirname, '..', 'db', 'schema.sql'),
    path.join(process.cwd(), 'db', 'schema.sql'),
  ];
  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) throw new Error('db/schema.sql bulunamadı');
  await pool.query(fs.readFileSync(file, 'utf8'));
}
