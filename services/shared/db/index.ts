/**
 * 공유 데이터베이스 유틸리티
 * 
 * 각 마이크로서비스에서 사용하는 PostgreSQL 연결 유틸리티입니다.
 * 
 * @see https://node-postgres.com/
 */

import { Pool, PoolConfig, QueryResult } from 'pg';

// ============================================
// Types
// ============================================

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface TransactionClient {
  query: <T = unknown>(text: string, params?: unknown[]) => Promise<QueryResult<T>>;
  release: () => void;
}

// ============================================
// Database Pool Management
// ============================================

const pools: Map<string, Pool> = new Map();

/**
 * 환경 변수에서 DB 설정 로드
 */
export function loadDatabaseConfig(serviceName: string): DatabaseConfig {
  const prefix = serviceName.toUpperCase().replace(/-/g, '_');
  
  return {
    host: process.env[`${prefix}_DB_HOST`] || process.env.AZURE_POSTGRES_HOST || 'localhost',
    port: parseInt(process.env[`${prefix}_DB_PORT`] || process.env.AZURE_POSTGRES_PORT || '5432'),
    database: process.env[`${prefix}_DB_NAME`] || process.env.AZURE_POSTGRES_DATABASE || serviceName.replace('-service', ''),
    user: process.env[`${prefix}_DB_USER`] || process.env.AZURE_POSTGRES_USER || 'postgres',
    password: process.env[`${prefix}_DB_PASSWORD`] || process.env.AZURE_POSTGRES_PASSWORD || '',
    ssl: process.env.AZURE_POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
  };
}

/**
 * 데이터베이스 풀 생성
 */
export function createPool(serviceName: string, config?: Partial<DatabaseConfig>): Pool {
  if (pools.has(serviceName)) {
    return pools.get(serviceName)!;
  }

  const baseConfig = loadDatabaseConfig(serviceName);
  const finalConfig: PoolConfig = {
    ...baseConfig,
    ...config,
  };

  const pool = new Pool(finalConfig);

  // 에러 핸들링
  pool.on('error', (err) => {
    console.error(`[DB:${serviceName}] Unexpected error on idle client`, err);
  });

  pool.on('connect', () => {
    console.log(`[DB:${serviceName}] New client connected`);
  });

  pools.set(serviceName, pool);
  console.log(`[DB:${serviceName}] Pool created`);
  
  return pool;
}

/**
 * 데이터베이스 풀 가져오기
 */
export function getPool(serviceName: string): Pool {
  if (!pools.has(serviceName)) {
    return createPool(serviceName);
  }
  return pools.get(serviceName)!;
}

/**
 * 데이터베이스 풀 종료
 */
export async function closePool(serviceName: string): Promise<void> {
  const pool = pools.get(serviceName);
  if (pool) {
    await pool.end();
    pools.delete(serviceName);
    console.log(`[DB:${serviceName}] Pool closed`);
  }
}

/**
 * 모든 데이터베이스 풀 종료
 */
export async function closeAllPools(): Promise<void> {
  const closePromises = Array.from(pools.keys()).map(closePool);
  await Promise.all(closePromises);
  console.log('[DB] All pools closed');
}

// ============================================
// Query Helpers
// ============================================

/**
 * 단일 쿼리 실행
 */
export async function query<T = unknown>(
  serviceName: string,
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool(serviceName);
  const start = Date.now();
  
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`[DB:${serviceName}] Slow query (${duration}ms): ${text.substring(0, 100)}...`);
    }
    
    return result;
  } catch (error) {
    console.error(`[DB:${serviceName}] Query error:`, error);
    throw error;
  }
}

/**
 * 트랜잭션 실행
 */
export async function withTransaction<T>(
  serviceName: string,
  callback: (client: TransactionClient) => Promise<T>
): Promise<T> {
  const pool = getPool(serviceName);
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
 * 단일 행 조회
 */
export async function queryOne<T = unknown>(
  serviceName: string,
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(serviceName, text, params);
  return result.rows[0] ?? null;
}

/**
 * 여러 행 조회
 */
export async function queryMany<T = unknown>(
  serviceName: string,
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(serviceName, text, params);
  return result.rows;
}

// ============================================
// Health Check
// ============================================

/**
 * 데이터베이스 연결 상태 확인
 */
export async function checkDatabaseHealth(serviceName: string): Promise<boolean> {
  try {
    const pool = getPool(serviceName);
    const result = await pool.query('SELECT 1');
    return result.rowCount === 1;
  } catch (error) {
    console.error(`[DB:${serviceName}] Health check failed:`, error);
    return false;
  }
}

// ============================================
// Migration Helpers
// ============================================

/**
 * 마이그레이션 테이블 생성
 */
export async function ensureMigrationTable(serviceName: string): Promise<void> {
  await query(serviceName, `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * 마이그레이션 실행 여부 확인
 */
export async function isMigrationExecuted(
  serviceName: string,
  migrationName: string
): Promise<boolean> {
  const result = await queryOne<{ id: number }>(
    serviceName,
    'SELECT id FROM migrations WHERE name = $1',
    [migrationName]
  );
  return result !== null;
}

/**
 * 마이그레이션 완료 기록
 */
export async function recordMigration(
  serviceName: string,
  migrationName: string
): Promise<void> {
  await query(
    serviceName,
    'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
    [migrationName]
  );
}

export default {
  loadDatabaseConfig,
  createPool,
  getPool,
  closePool,
  closeAllPools,
  query,
  queryOne,
  queryMany,
  withTransaction,
  checkDatabaseHealth,
  ensureMigrationTable,
  isMigrationExecuted,
  recordMigration,
};
