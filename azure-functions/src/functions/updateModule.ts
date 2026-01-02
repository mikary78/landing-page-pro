/**
 * Update Module Azure Function
 * Updates module title or other properties
 * 
 * 참고: CurriculumTreePane.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

interface UpdateModuleRequest {
  title?: string;
  description?: string;
  order_index?: number;
}

export async function updateModule(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[UpdateModule] User: ${user.userId}`);

    // Get moduleId from URL params
    const moduleId = request.params.moduleId;
    if (!moduleId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Module ID is required',
        },
      };
    }

    // Parse request body
    const body = await request.json() as UpdateModuleRequest;
    const { title, description, order_index } = body;

    // Verify module ownership through course
    const moduleCheck = await query(
      `SELECT cm.id, cm.course_id 
       FROM course_modules cm
       JOIN courses c ON cm.course_id = c.id
       WHERE cm.id = $1 AND c.owner_id = $2`,
      [moduleId, user.userId]
    );

    if (moduleCheck.length === 0) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Module not found or access denied',
        },
      };
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramIndex++}`);
      values.push(order_index);
    }

    if (updates.length === 0) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'No fields to update',
        },
      };
    }

    updates.push(`updated_at = NOW()`);
    values.push(moduleId);

    const result = await query(
      `UPDATE course_modules 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        module: result[0],
      },
    };
  } catch (error) {
    context.error('[UpdateModule] Error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return {
        status: 401,
        jsonBody: {
          success: false,
          error: 'Unauthorized',
        },
      };
    }
    
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('updateModule', {
  methods: ['PUT', 'PATCH'],
  authLevel: 'anonymous',
  route: 'updatemodule/{moduleId}',
  handler: updateModule,
});

