/**
 * Get Stats Azure Function
 * Returns statistics for the authenticated user's projects
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

export async function getStats(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[GetStats] User: ${user.userId}`);

    // Ensure user profile exists
    await query(
      `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.userId, user.name || user.email || 'Unknown User']
    );

    // Get project statistics
    const statsByStatus = await query(
      `SELECT status, COUNT(*) as count
       FROM projects
       WHERE user_id = $1
       GROUP BY status`,
      [user.userId]
    );

    const statsByModel = await query(
      `SELECT ai_model, COUNT(*) as count
       FROM projects
       WHERE user_id = $1
       GROUP BY ai_model`,
      [user.userId]
    );

    const recentProjects = await query(
      `SELECT id, title, status, ai_model, created_at
       FROM projects
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [user.userId]
    );

    const totalProjects = await query(
      'SELECT COUNT(*) as count FROM projects WHERE user_id = $1',
      [user.userId]
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        stats: {
          total: parseInt(totalProjects[0]?.count || '0', 10),
          byStatus: statsByStatus.map((s: any) => ({
            status: s.status,
            count: parseInt(s.count, 10),
          })),
          byModel: statsByModel.map((m: any) => ({
            model: m.ai_model,
            count: parseInt(m.count, 10),
          })),
          recentActivity: recentProjects.map((p: any) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            aiModel: p.ai_model,
            createdAt: p.created_at,
          })),
        },
      },
    };
  } catch (error) {
    context.error('[GetStats] Error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('getStats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getstats/{userId}',
  handler: getStats,
});

