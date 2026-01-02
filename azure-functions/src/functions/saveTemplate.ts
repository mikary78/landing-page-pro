/**
 * Save Template Azure Function
 * Saves a project as a template
 * 
 * 참고: ProjectDetail.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

interface SaveTemplateRequest {
  projectId: string;
  templateName: string;
}

export async function saveTemplate(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[SaveTemplate] User: ${user.userId}`);

    // Parse request body
    const body = await request.json() as SaveTemplateRequest;
    const { projectId, templateName } = body;

    if (!projectId || !templateName) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Project ID and template name are required',
        },
      };
    }

    // Get project with ownership check
    const projects = await query(
      `SELECT * FROM projects WHERE id = $1 AND user_id = $2`,
      [projectId, user.userId]
    );

    if (projects.length === 0) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Project not found or access denied',
        },
      };
    }

    const project = projects[0];

    // Create template
    const result = await query(
      `INSERT INTO project_templates (
        user_id, template_name, description, 
        education_session, education_duration, education_course, ai_model,
        created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        user.userId,
        templateName,
        project.description,
        project.education_session,
        project.education_duration,
        project.education_course,
        project.ai_model,
      ]
    );

    return {
      status: 201,
      jsonBody: {
        success: true,
        template: result[0],
      },
    };
  } catch (error) {
    context.error('[SaveTemplate] Error:', error);
    
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

app.http('saveTemplate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'savetemplate',
  handler: saveTemplate,
});

