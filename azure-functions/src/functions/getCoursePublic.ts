/**
 * Get Course Public Azure Function
 * Returns publicly accessible course data (no auth required)
 * 
 * 참고: CourseView.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query } from '../lib/database';

export async function getCoursePublic(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Get projectId from URL params
    const projectId = request.params.projectId;
    if (!projectId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Project ID is required',
        },
      };
    }

    context.log(`[GetCoursePublic] Project ID: ${projectId}`);

    // Get project (public access)
    const projects = await query(
      `SELECT id, title, description, education_duration, education_course, education_session
       FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projects.length === 0) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Project not found',
        },
      };
    }

    // Get completed stages
    const stages = await query(
      `SELECT id, stage_name, stage_order, content, status
       FROM project_stages
       WHERE project_id = $1 AND status = 'completed'
       ORDER BY stage_order ASC`,
      [projectId]
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        project: projects[0],
        stages: stages || [],
      },
    };
  } catch (error) {
    context.error('[GetCoursePublic] Error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('getCoursePublic', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'course/public/{projectId}',
  handler: getCoursePublic,
});

