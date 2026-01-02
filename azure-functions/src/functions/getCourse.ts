/**
 * Get Course Azure Function
 * Returns a single course by ID for the authenticated user
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

export async function getCourse(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[GetCourse] User: ${user.userId}`);

    // Get course ID from URL
    const courseId = request.params.courseId;
    if (!courseId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Course ID is required',
        },
      };
    }

    // Get course for user
    const courses = await query(
      `SELECT 
        id,
        owner_id,
        title,
        description,
        level,
        target_audience,
        total_duration,
        status,
        created_at,
        updated_at
       FROM courses
       WHERE id = $1 AND owner_id = $2`,
      [courseId, user.userId]
    );

    if (courses.length === 0) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Course not found',
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        course: courses[0],
      },
    };
  } catch (error) {
    context.error('[GetCourse] Error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('getCourse', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getcourse/{courseId}',
  handler: getCourse,
});


