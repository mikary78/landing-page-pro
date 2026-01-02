/**
 * Feedback API Azure Functions
 * Manages course feedbacks
 * 
 * 참고: CourseFeedback.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query } from '../lib/database';

// Get feedbacks (public)
export async function getFeedbacks(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const projectId = request.params.projectId;

    if (!projectId) {
      return { status: 400, jsonBody: { success: false, error: 'Project ID is required' } };
    }

    const feedbacks = await query(
      `SELECT * FROM course_feedbacks
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        feedbacks: feedbacks || [],
      },
    };
  } catch (error) {
    context.error('[GetFeedbacks] Error:', error);
    return { status: 500, jsonBody: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}

// Create feedback (public - no auth required)
export async function createFeedback(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as {
      projectId: string;
      userEmail?: string;
      rating: number;
      comment?: string;
      feedbackType?: string;
    };
    const { projectId, userEmail, rating, comment, feedbackType } = body;

    if (!projectId || !rating) {
      return { status: 400, jsonBody: { success: false, error: 'Project ID and rating are required' } };
    }

    const result = await query(
      `INSERT INTO course_feedbacks (project_id, user_email, rating, comment, feedback_type, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [projectId, userEmail || null, rating, comment || null, feedbackType || 'general']
    );

    return {
      status: 201,
      jsonBody: {
        success: true,
        feedback: result[0],
      },
    };
  } catch (error) {
    context.error('[CreateFeedback] Error:', error);
    return { status: 500, jsonBody: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}

app.http('getFeedbacks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feedback/{projectId}',
  handler: getFeedbacks,
});

app.http('createFeedback', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'feedback',
  handler: createFeedback,
});

