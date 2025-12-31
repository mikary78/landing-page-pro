/**
 * Azure Functions API Client
 * Replaces Supabase Edge Functions with Azure Functions
 */

import { msalInstance } from '@/components/AuthProvider';
import { loginRequest } from '@/config/authConfig';

const AZURE_FUNCTIONS_URL = import.meta.env.VITE_AZURE_FUNCTIONS_URL || 'http://localhost:7071';

/**
 * Get access token from MSAL
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      console.warn('[AzureFunctions] No active account');
      return null;
    }

    console.log('[AzureFunctions] Acquiring token with scopes:', loginRequest.scopes);
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });

    console.log('[AzureFunctions] Token acquired successfully');
    console.log('[AzureFunctions] Token length:', response.accessToken.length);
    console.log('[AzureFunctions] Full token:', response.accessToken);

    // Decode and log token payload for debugging
    try {
      const parts = response.accessToken.split('.');
      const payload = JSON.parse(atob(parts[1]));
      console.log('[AzureFunctions] Token payload:', payload);
      console.log('[AzureFunctions] Audience (aud):', payload.aud);
      console.log('[AzureFunctions] Expected aud:', 'api://234895ba-cc32-4306-a28b-e287742f8e4e');
      console.log('[AzureFunctions] Match:', payload.aud === 'api://234895ba-cc32-4306-a28b-e287742f8e4e' ? '✅' : '❌');
    } catch (e) {
      console.error('[AzureFunctions] Failed to decode token:', e);
    }

    return response.accessToken;
  } catch (error) {
    console.error('[AzureFunctions] Failed to acquire token:', error);
    return null;
  }
}

/**
 * Call Azure Function
 */
async function callAzureFunction<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const accessToken = await getAccessToken();
    console.log('[AzureFunctions] Access token for request:', accessToken ? 'PRESENT' : 'NULL');

    const url = `${AZURE_FUNCTIONS_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      console.log('[AzureFunctions] Authorization header added');
    } else {
      console.warn('[AzureFunctions] No access token - request will be unauthenticated');
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Function error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error(`[AzureFunctions] Error calling ${endpoint}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

// ============================================================
// Process Document Function
// ============================================================

export interface ProcessDocumentRequest {
  projectId: string;
  documentContent?: string;
  aiModel: 'gemini' | 'claude' | 'chatgpt';
  stageId?: string;
  stageOrder?: number;
  regenerate?: boolean;
  retryWithDifferentAi?: boolean;
}

export interface ProcessDocumentResponse {
  success: boolean;
  projectId: string;
  stages?: Array<{
    id: string;
    name: string;
    content: string;
    orderIndex: number;
  }>;
  stageId?: string;
  content?: string;
}

/**
 * Process document with AI (5-stage curriculum generation)
 */
export async function processDocument(
  request: ProcessDocumentRequest
): Promise<{ data: ProcessDocumentResponse | null; error: Error | null }> {
  return callAzureFunction<ProcessDocumentResponse>(
    '/api/processDocument',
    'POST',
    request
  );
}

// ============================================================
// Generate Curriculum Function
// ============================================================

export interface GenerateCurriculumRequest {
  courseId: string;
  courseTitle: string;
  courseDescription?: string;
  level?: string;
  targetAudience?: string;
  totalDuration?: string;
  aiModel: 'gemini' | 'claude' | 'chatgpt';
}

export interface GenerateCurriculumResponse {
  success: boolean;
  message: string;
  data: {
    modulesCreated: number;
    lessonsCreated: number;
  };
}

/**
 * Generate course curriculum with AI
 */
export async function generateCurriculum(
  request: GenerateCurriculumRequest
): Promise<{ data: GenerateCurriculumResponse | null; error: Error | null }> {
  return callAzureFunction<GenerateCurriculumResponse>(
    '/api/generateCurriculum',
    'POST',
    request
  );
}

// ============================================================
// Fallback: Call Azure Functions directly (for debugging)
// ============================================================

/**
 * Call Azure Function (exported for direct use)
 */
export async function callAzureFunctionDirect<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<{ data: T | null; error: Error | null }> {
  return callAzureFunction<T>(endpoint, method, body);
}

/**
 * Call Azure Function without authentication (for local testing)
 */
export async function callAzureFunctionUnauthenticated<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const url = `${AZURE_FUNCTIONS_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Azure Function error: ${response.status} ${errorText}`);

      // 401 오류는 예상된 동작이므로 콘솔에 로그하지 않음
      if (response.status !== 401) {
        console.error(`[AzureFunctions] Error calling ${endpoint}:`, error);
      }

      throw error;
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    // 401 오류는 예상된 동작이므로 콘솔에 로그하지 않음
    const is401 = error instanceof Error && error.message.includes('401');
    if (!is401) {
      console.error(`[AzureFunctions] Error calling ${endpoint}:`, error);
    }

    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}
