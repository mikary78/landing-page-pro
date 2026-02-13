/**
 * Admin Change Role Azure Function
 * Changes a user's role (delete existing + insert new)
 * Requires admin role
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query, transaction, userHasRole } from '../lib/database';

interface ChangeRoleBody {
  userId: string;
  role: 'admin' | 'moderator' | 'user';
}

export async function adminChangeRole(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const user = await requireAuth(request, context);
    context.log(`[AdminChangeRole] User: ${user.userId}`);

    // Check admin role
    const isAdmin = await userHasRole(user.userId, 'admin');
    if (!isAdmin) {
      return {
        status: 403,
        jsonBody: { success: false, error: 'Admin access required' },
      };
    }

    const body = (await request.json()) as ChangeRoleBody;
    if (!body.userId || !body.role) {
      return {
        status: 400,
        jsonBody: { success: false, error: 'userId and role are required' },
      };
    }

    const validRoles = ['admin', 'moderator', 'user'];
    if (!validRoles.includes(body.role)) {
      return {
        status: 400,
        jsonBody: { success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
      };
    }

    // Use transaction to delete old role and insert new one
    await transaction(async (client) => {
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [body.userId]);
      await client.query(
        'INSERT INTO user_roles (user_id, role, created_at) VALUES ($1, $2, NOW())',
        [body.userId, body.role]
      );
    });

    context.log(`[AdminChangeRole] Role changed: ${body.userId} -> ${body.role}`);

    return {
      status: 200,
      jsonBody: {
        success: true,
        userId: body.userId,
        role: body.role,
      },
    };
  } catch (error) {
    context.error('[AdminChangeRole] Error:', error);
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

app.http('adminChangeRole', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'manage/change-role',
  handler: adminChangeRole,
});
