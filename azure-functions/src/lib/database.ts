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
      // Azure PostgreSQL requires SSL
      ssl: { rejectUnauthorized: false },
      // Azure Functions 환경에 맞게 연결 풀 최적화
      // 서버리스 환경에서는 연결 수를 최소화해야 함
      max: 3, // 최대 연결 수 줄임 (20 → 3)
      min: 0, // 유휴 연결 유지하지 않음
      idleTimeoutMillis: 10000, // 유휴 연결 10초 후 종료
      connectionTimeoutMillis: 5000, // 연결 타임아웃 5초
      allowExitOnIdle: true, // 유휴 시 프로세스 종료 허용
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client:', err);
    });
    
    pool.on('connect', () => {
      console.log('[DB] New client connected');
    });
    
    pool.on('remove', () => {
      console.log('[DB] Client removed from pool');
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
