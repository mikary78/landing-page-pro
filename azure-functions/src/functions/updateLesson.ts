/**
 * Update Lesson Azure Function
 * Updates lesson title or other properties
 * 
 * 참고: CurriculumTreePane.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

interface UpdateLessonRequest {
  title?: string;
  learning_objectives?: string;
  order_index?: number;
  project_id?: string | null;
  selected_ai_model?: string | null;
}

export async function updateLesson(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[UpdateLesson] User: ${user.userId}`);

    // Get lessonId from URL params
    const lessonId = request.params.lessonId;
    if (!lessonId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Lesson ID is required',
        },
      };
    }

    // Parse request body
    const body = await request.json() as UpdateLessonRequest;
    const { title, learning_objectives, order_index, project_id, selected_ai_model } = body;

    // Verify lesson ownership through module and course
    const lessonCheck = await query(
      `SELECT l.id, l.module_id
       FROM lessons l
       JOIN course_modules cm ON l.module_id = cm.id
       JOIN courses c ON cm.course_id = c.id
       WHERE l.id = $1 AND c.owner_id = $2`,
      [lessonId, user.userId]
    );

    if (lessonCheck.length === 0) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Lesson not found or access denied',
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
    if (learning_objectives !== undefined) {
      updates.push(`learning_objectives = $${paramIndex++}`);
      values.push(learning_objectives);
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramIndex++}`);
      values.push(order_index);
    }
    if (project_id !== undefined) {
      updates.push(`project_id = $${paramIndex++}`);
      values.push(project_id);
    }
    if (selected_ai_model !== undefined) {
      updates.push(`selected_ai_model = $${paramIndex++}`);
      values.push(selected_ai_model);
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
    values.push(lessonId);

    const result = await query(
      `UPDATE lessons 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        lesson: result[0],
      },
    };
  } catch (error) {
    context.error('[UpdateLesson] Error:', error);
    
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

app.http('updateLesson', {
  methods: ['PUT', 'PATCH'],
  authLevel: 'anonymous',
  route: 'updatelesson/{lessonId}',
  handler: updateLesson,
});

