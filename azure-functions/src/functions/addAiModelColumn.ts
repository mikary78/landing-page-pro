/**
 * Add missing columns to database tables
 * One-time migration script for:
 * - ai_model (projects, project_stages)
 * - stage_order (project_stages)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool } from '../lib/database';

export async function addAiModelColumn(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('[Migration] Adding ai_model column to projects table...');

    const pool = getPool();
    const results: string[] = [];

    // Add ai_model column to projects table
    try {
      await pool.query(`
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS ai_model VARCHAR(50) DEFAULT 'gemini'
      `);
      results.push('✓ Added ai_model column to projects table');
      context.log('[Migration] ✓ Added ai_model column to projects table');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        results.push('⊘ ai_model column already exists in projects table');
        context.log('[Migration] ⊘ ai_model column already exists');
      } else {
        results.push(`⚠ Error adding ai_model to projects: ${errorMessage}`);
        context.error('[Migration] Error:', errorMessage);
      }
    }

    // Add ai_model column to project_stages table
    try {
      await pool.query(`
        ALTER TABLE project_stages 
        ADD COLUMN IF NOT EXISTS ai_model VARCHAR(50) DEFAULT 'gemini'
      `);
      results.push('✓ Added ai_model column to project_stages table');
      context.log('[Migration] ✓ Added ai_model column to project_stages table');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        results.push('⊘ ai_model column already exists in project_stages table');
        context.log('[Migration] ⊘ ai_model column already exists in project_stages');
      } else {
        results.push(`⚠ Error adding ai_model to project_stages: ${errorMessage}`);
        context.error('[Migration] Error:', errorMessage);
      }
    }

    // Update existing rows that have null ai_model in projects
    try {
      const updateResult = await pool.query(`
        UPDATE projects 
        SET ai_model = 'gemini' 
        WHERE ai_model IS NULL
      `);
      results.push(`✓ Updated ${updateResult.rowCount} projects rows with default ai_model`);
      context.log(`[Migration] ✓ Updated ${updateResult.rowCount} projects rows`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.error('[Migration] Error updating projects rows:', errorMessage);
      results.push(`⚠ Error updating projects rows: ${errorMessage}`);
    }

    // Update existing rows that have null ai_model in project_stages
    try {
      const updateResult = await pool.query(`
        UPDATE project_stages 
        SET ai_model = 'gemini' 
        WHERE ai_model IS NULL
      `);
      results.push(`✓ Updated ${updateResult.rowCount} project_stages rows with default ai_model`);
      context.log(`[Migration] ✓ Updated ${updateResult.rowCount} project_stages rows`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.error('[Migration] Error updating project_stages rows:', errorMessage);
      results.push(`⚠ Error updating project_stages rows: ${errorMessage}`);
    }

    // Verify the column exists in projects
    const verifyProjects = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'ai_model'
    `);

    if (verifyProjects.rows.length > 0) {
      results.push(`✓ Verified: projects.ai_model exists with type ${verifyProjects.rows[0].data_type}`);
    } else {
      results.push('✗ Warning: projects.ai_model not found');
    }

    // Verify the column exists in project_stages
    const verifyStages = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'project_stages' AND column_name = 'ai_model'
    `);

    if (verifyStages.rows.length > 0) {
      results.push(`✓ Verified: project_stages.ai_model exists with type ${verifyStages.rows[0].data_type}`);
    } else {
      results.push('✗ Warning: project_stages.ai_model not found');
    }

    // Add stage_order column to project_stages table
    try {
      await pool.query(`
        ALTER TABLE project_stages 
        ADD COLUMN IF NOT EXISTS stage_order INTEGER DEFAULT 1
      `);
      results.push('✓ Added stage_order column to project_stages table');
      context.log('[Migration] ✓ Added stage_order column to project_stages table');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        results.push('⊘ stage_order column already exists in project_stages table');
      } else {
        results.push(`⚠ Error adding stage_order to project_stages: ${errorMessage}`);
        context.error('[Migration] Error:', errorMessage);
      }
    }

    // Add stage_name column to project_stages table
    try {
      await pool.query(`
        ALTER TABLE project_stages 
        ADD COLUMN IF NOT EXISTS stage_name VARCHAR(255)
      `);
      results.push('✓ Added stage_name column to project_stages table');
      context.log('[Migration] ✓ Added stage_name column to project_stages table');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        results.push('⊘ stage_name column already exists in project_stages table');
      } else {
        results.push(`⚠ Error adding stage_name to project_stages: ${errorMessage}`);
      }
    }

    // Add status column to project_stages table
    try {
      await pool.query(`
        ALTER TABLE project_stages 
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
      `);
      results.push('✓ Added status column to project_stages table');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        results.push('⊘ status column already exists in project_stages table');
      } else {
        results.push(`⚠ Error adding status to project_stages: ${errorMessage}`);
      }
    }

    // Add content column to project_stages table
    try {
      await pool.query(`
        ALTER TABLE project_stages 
        ADD COLUMN IF NOT EXISTS content TEXT
      `);
      results.push('✓ Added content column to project_stages table');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        results.push('⊘ content column already exists in project_stages table');
      } else {
        results.push(`⚠ Error adding content to project_stages: ${errorMessage}`);
      }
    }

    // Add feedback column to project_stages table
    try {
      await pool.query(`
        ALTER TABLE project_stages 
        ADD COLUMN IF NOT EXISTS feedback TEXT
      `);
      results.push('✓ Added feedback column to project_stages table');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        results.push('⊘ feedback column already exists in project_stages table');
      } else {
        results.push(`⚠ Error adding feedback to project_stages: ${errorMessage}`);
      }
    }

    // Verify stage_order column
    const verifyStageOrder = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'project_stages' AND column_name = 'stage_order'
    `);

    if (verifyStageOrder.rows.length > 0) {
      results.push(`✓ Verified: project_stages.stage_order exists with type ${verifyStageOrder.rows[0].data_type}`);
    } else {
      results.push('✗ Warning: project_stages.stage_order not found');
    }

    // List all columns in project_stages table
    const allColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'project_stages'
      ORDER BY ordinal_position
    `);

    interface ColumnInfo {
      column_name: string;
      data_type: string;
    }
    results.push(`--- project_stages columns: ${allColumns.rows.map((r: ColumnInfo) => r.column_name).join(', ')}`)

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'ai_model column migration completed',
        results,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    context.error('[Migration] Failed:', errorMessage);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: errorMessage,
      },
    };
  }
}

app.http('addAiModelColumn', {
  methods: ['POST', 'GET'],
  authLevel: 'anonymous',
  route: 'migrate/add-ai-model',
  handler: addAiModelColumn,
});

