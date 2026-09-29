import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/prayaspro';

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]', err);
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('[SQL Execution]', { text, duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
}

export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Execute an atomic transaction safely with automatic rollback on error.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT current_database(), current_user, version()');
    console.log('Connected to PostgreSQL successfully:');
    console.log(`Database: ${res.rows[0].current_database}`);
    console.log(`User: ${res.rows[0].current_user}`);
    return true;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    return false;
  }
}
