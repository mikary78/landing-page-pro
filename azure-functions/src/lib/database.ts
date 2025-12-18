/**
 * Azure PostgreSQL Database Connection
 */

import { Pool, PoolClient } from 'pg';

// PostgreSQL connection pool
let pool: Pool | null = null;

/**
 * Get database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.AZURE_POSTGRES_HOST,
      port: parseInt(process.env.AZURE_POSTGRES_PORT || '5432'),
      database: process.env.AZURE_POSTGRES_DATABASE,
      user: process.env.AZURE_POSTGRES_USER,
      password: process.env.AZURE_POSTGRES_PASSWORD,
      ssl: process.env.AZURE_POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client:', err);
    });
  }

  return pool;
}

/**
 * Query helper
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows;
}

/**
 * Transaction helper
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
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

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string) {
  const rows = await query(
    'SELECT id, user_id, display_name, avatar_url, created_at, updated_at FROM profiles WHERE user_id = $1',
    [userId]
  );
  return rows[0] || null;
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(userId: string, displayName: string, email: string) {
  const rows = await query(
    `
    INSERT INTO profiles (user_id, display_name, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name, updated_at = NOW()
    RETURNING *
    `,
    [userId, displayName]
  );
  return rows[0];
}

/**
 * Check if user has role
 */
export async function userHasRole(userId: string, role: string): Promise<boolean> {
  const rows = await query(
    'SELECT 1 FROM user_roles WHERE user_id = (SELECT user_id FROM profiles WHERE user_id = $1) AND role = $2',
    [userId, role]
  );
  return rows.length > 0;
}
