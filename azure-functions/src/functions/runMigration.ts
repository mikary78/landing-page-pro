/**
 * Run Database Migration
 * This function runs the PostgreSQL migration script to create all tables
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool } from '../lib/database';
import { migrationSQL } from '../lib/migrationSQL';

export async function runMigration(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('[Migration] Starting database migration...');
    context.log('[Migration] Migration script loaded, length:', migrationSQL.length);

    // Get database connection
    const pool = getPool();
    // NOTE:
    // 기존 구현은 세미콜론 분리로 DO $$ ... $$ 블록을 깨뜨려 마이그레이션이 항상 실패할 수 있습니다.
    // pg는 단일 query로 여러 statement 실행을 지원하므로 전체 스크립트를 한 번에 실행합니다.
    await pool.query(migrationSQL);
    context.log('[Migration] Migration completed!');

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Migration completed',
      },
    };
  } catch (error: unknown) {
    context.error('[Migration] Failed to run migration:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      status: 500,
      jsonBody: {
        success: false,
        error: errorMessage,
      },
    };
  }
}

app.http('runMigration', {
  methods: ['POST', 'GET'],
  authLevel: 'anonymous', // Change to 'function' in production and use a function key
  handler: runMigration,
});
