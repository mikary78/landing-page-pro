/**
 * Create Lesson Azure Function
 * Creates a new lesson in a module
 * 
 * 참고: CurriculumTreePane.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

interface CreateLessonRequest {
  moduleId: string;
  title?: string;
  learning_objectives?: string;
}

export async function createLesson(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[CreateLesson] User: ${user.userId}`);

    // Parse request body
    const body = await request.json() as CreateLessonRequest;
    const { moduleId, title, learning_objectives } = body;

    if (!moduleId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Module ID is required',
        },
      };
    }

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

    // Get the next order_index
    const orderResult = await query<{ max_order: number }>(
      `SELECT COALESCE(MAX(order_index), 0) as max_order 
       FROM lessons 
       WHERE module_id = $1`,
      [moduleId]
    );
    
    const nextOrderIndex = (orderResult[0]?.max_order || 0) + 1;
    const lessonTitle = title || `새 레슨 ${nextOrderIndex}`;

    // Create the lesson
    const result = await query(
      `INSERT INTO lessons (module_id, title, learning_objectives, order_index, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [moduleId, lessonTitle, learning_objectives || null, nextOrderIndex]
    );

    const newLesson = result[0];

    return {
      status: 201,
      jsonBody: {
        success: true,
        lesson: newLesson,
      },
    };
  } catch (error) {
    context.error('[CreateLesson] Error:', error);
    
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

app.http('createLesson', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'createlesson',
  handler: createLesson,
});

