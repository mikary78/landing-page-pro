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

    // Split SQL into individual statements (simple split by semicolon)
    // Filter out comments and empty lines
    const statements = migrationSQL
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => {
        // Remove empty statements
        if (!stmt) return false;
        // Remove comment-only statements
        if (stmt.startsWith('--')) return false;
        return true;
      });

    context.log(`[Migration] Found ${statements.length} SQL statements to execute`);

    const results: string[] = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Skip comments
      if (stmt.trim().startsWith('--')) {
        continue;
      }

      try {
        await pool.query(stmt);
        successCount++;

        // Log first 100 chars of statement
        const preview = stmt.substring(0, 100).replace(/\s+/g, ' ');
        context.log(`[Migration] ✓ Statement ${i + 1}: ${preview}...`);
        results.push(`✓ ${preview}...`);
      } catch (error: any) {
        // Check if error is due to already existing object
        if (
          error.message.includes('already exists') ||
          error.message.includes('already defined') ||
          error.message.includes('duplicate')
        ) {
          skipCount++;
          const preview = stmt.substring(0, 100).replace(/\s+/g, ' ');
          context.log(`[Migration] ⊘ Skipped ${i + 1} (already exists): ${preview}...`);
          results.push(`⊘ Skipped: ${preview}...`);
        } else {
          errorCount++;
          const preview = stmt.substring(0, 100).replace(/\s+/g, ' ');
          context.error(`[Migration] ✗ Error in statement ${i + 1}: ${error.message}`);
          context.error(`[Migration] Statement: ${preview}...`);
          results.push(`✗ Error: ${preview}... - ${error.message}`);

          // Don't stop on errors, continue with next statement
        }
      }
    }

    context.log('[Migration] Migration completed!');
    context.log(`[Migration] Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`);

    return {
      status: errorCount > 0 ? 207 : 200, // 207 Multi-Status if there were errors
      jsonBody: {
        success: true,
        message: 'Migration completed',
        stats: {
          total: statements.length,
          success: successCount,
          skipped: skipCount,
          errors: errorCount,
        },
        details: results,
      },
    };
  } catch (error: any) {
    context.error('[Migration] Failed to run migration:', error);

    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error.message,
      },
    };
  }
}

app.http('runMigration', {
  methods: ['POST', 'GET'],
  authLevel: 'anonymous', // Change to 'function' in production and use a function key
  handler: runMigration,
});
