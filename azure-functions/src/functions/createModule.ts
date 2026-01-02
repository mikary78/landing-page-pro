/**
 * Create Module Azure Function
 * Creates a new module in a course
 * 
 * 참고: CurriculumTreePane.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

interface CreateModuleRequest {
  courseId: string;
  title?: string;
}

export async function createModule(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[CreateModule] User: ${user.userId}`);

    // Parse request body
    const body = await request.json() as CreateModuleRequest;
    const { courseId, title } = body;

    if (!courseId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Course ID is required',
        },
      };
    }

    // Verify course ownership
    const courseCheck = await query(
      `SELECT id FROM courses WHERE id = $1 AND owner_id = $2`,
      [courseId, user.userId]
    );

    if (courseCheck.length === 0) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Course not found or access denied',
        },
      };
    }

    // Get the next order_index
    const orderResult = await query<{ max_order: number }>(
      `SELECT COALESCE(MAX(order_index), 0) as max_order 
       FROM course_modules 
       WHERE course_id = $1`,
      [courseId]
    );
    
    const nextOrderIndex = (orderResult[0]?.max_order || 0) + 1;
    const moduleTitle = title || `새 모듈 ${nextOrderIndex}`;

    // Create the module
    const result = await query(
      `INSERT INTO course_modules (course_id, title, order_index, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [courseId, moduleTitle, nextOrderIndex]
    );

    const newModule = result[0];

    return {
      status: 201,
      jsonBody: {
        success: true,
        module: {
          ...newModule,
          lessons: [], // New module has no lessons
        },
      },
    };
  } catch (error) {
    context.error('[CreateModule] Error:', error);
    
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

app.http('createModule', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'createmodule',
  handler: createModule,
});

