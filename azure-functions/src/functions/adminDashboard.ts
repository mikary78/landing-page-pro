/**
 * Admin Dashboard Azure Function
 * Returns aggregated stats, recent projects, courses, and role assignments
 * Requires admin role
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query, userHasRole } from '../lib/database';

export async function adminDashboard(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const user = await requireAuth(request, context);
    context.log(`[AdminDashboard] User: ${user.userId}`);

    // Check admin role
    const isAdmin = await userHasRole(user.userId, 'admin');
    if (!isAdmin) {
      return {
        status: 403,
        jsonBody: { success: false, error: 'Admin access required' },
      };
    }

    // Run all queries in parallel
    const [
      usersCountResult,
      projectsCountResult,
      coursesCountResult,
      recentProjectsResult,
      recentCoursesResult,
      roleAssignmentsResult,
    ] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) as count FROM profiles'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM projects'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM courses'),
      query(
        `SELECT id, title, description, status, created_at
         FROM projects
         ORDER BY created_at DESC
         LIMIT 5`
      ),
      query(
        `SELECT id, title, description, status, created_at
         FROM courses
         ORDER BY created_at DESC
         LIMIT 5`
      ),
      query(
        `SELECT ur.user_id, ur.role,
                COALESCE(p.display_name, '이름 없음') as display_name
         FROM user_roles ur
         LEFT JOIN profiles p ON ur.user_id = p.user_id
         ORDER BY ur.created_at DESC
         LIMIT 20`
      ),
    ]);

    return {
      status: 200,
      jsonBody: {
        success: true,
        stats: {
          users: parseInt(usersCountResult[0]?.count || '0', 10),
          projects: parseInt(projectsCountResult[0]?.count || '0', 10),
          courses: parseInt(coursesCountResult[0]?.count || '0', 10),
        },
        recentProjects: recentProjectsResult || [],
        recentCourses: recentCoursesResult || [],
        roleAssignments: (roleAssignmentsResult || []).map((r: any) => ({
          userId: r.user_id,
          role: r.role,
          displayName: r.display_name,
        })),
      },
    };
  } catch (error) {
    context.error('[AdminDashboard] Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { status: 401, jsonBody: { success: false, error: 'Unauthorized' } };
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

app.http('adminDashboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/dashboard',
  handler: adminDashboard,
});
