/**
 * Delete Course Azure Function
 * Deletes a course for the authenticated user
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

export async function deleteCourse(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[DeleteCourse] User: ${user.userId}`);

    // Get course ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const courseId = pathParts[pathParts.length - 1];

    if (!courseId) {
      return {
        status: 400,
        jsonBody: { success: false, error: 'Course ID is required' },
      };
    }

    // Verify course belongs to user
    const courses = await query(
      'SELECT id FROM courses WHERE id = $1 AND owner_id = $2',
      [courseId, user.userId]
    );

    if (courses.length === 0) {
      return {
        status: 404,
        jsonBody: { success: false, error: 'Course not found' },
      };
    }

    // Delete course (CASCADE will handle related records)
    await query('DELETE FROM courses WHERE id = $1 AND owner_id = $2', [
      courseId,
      user.userId,
    ]);

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Course deleted successfully',
      },
    };
  } catch (error) {
    context.error('[DeleteCourse] Error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('deleteCourse', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'deleteCourse/{courseId}',
  handler: deleteCourse,
});

