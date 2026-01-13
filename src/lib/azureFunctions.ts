/**
 * Azure Functions API Client
 * Replaces Supabase Edge Functions with Azure Functions
 */

import { msalInstance } from '@/components/AuthProvider';
import { apiRequest } from '@/config/authConfig';
import { buildAzureFunctionsUrl } from '@/lib/azureFunctionsUrl';

const AZURE_FUNCTIONS_URL = import.meta.env.VITE_AZURE_FUNCTIONS_URL || 'http://localhost:7071';
const DEBUG_AZURE_FUNCTIONS = import.meta.env.VITE_DEBUG_AZURE_FUNCTIONS === 'true';

function redactUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    // Mask all query param values (e.g. code=, tokens, etc.)
    u.searchParams.forEach((_v, k) => u.searchParams.set(k, '***'));
    return u.toString();
  } catch {
    return rawUrl;
  }
}

// Token cache to prevent repeated token acquisition
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get access token from MSAL (with caching)
 */
async function getAccessToken(): Promise<string | null> {
  try {
    // Check if cached token is still valid (with 5 minute buffer)
    const now = Date.now();
    if (cachedToken && tokenExpiry > now + 5 * 60 * 1000) {
      return cachedToken;
    }

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      console.warn('[AzureFunctions] No active account');
      return null;
    }
    
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...apiRequest,
        account: accounts[0],
      });

      // Cache the token
      cachedToken = response.accessToken;
      tokenExpiry = response.expiresOn?.getTime() || (now + 60 * 60 * 1000); // Default 1 hour
      
      return cachedToken;
    } catch (silentError: any) {
      // API scope가 없거나 실패하면 기본 scope로 fallback
      try {
        const fallbackResponse = await msalInstance.acquireTokenSilent({
          scopes: ['openid', 'profile', 'email', 'offline_access'],
          account: accounts[0],
        });
        
        // Cache the fallback token
        cachedToken = fallbackResponse.accessToken;
        tokenExpiry = fallbackResponse.expiresOn?.getTime() || (now + 60 * 60 * 1000);
        
        return cachedToken;
      } catch (fallbackError: any) {
        console.error('[AzureFunctions] Failed to acquire token');
        return null;
      }
    }
  } catch (error) {
    console.error('[AzureFunctions] Failed to acquire token:', error);
    return null;
  }
}

/**
 * Clear token cache (call on logout)
 */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiry = 0;
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

    const url = buildAzureFunctionsUrl(AZURE_FUNCTIONS_URL, endpoint);
    if (DEBUG_AZURE_FUNCTIONS) {
      console.debug(`[AzureFunctions] Request: ${method} ${redactUrl(url)} (endpoint=${endpoint})`);
    }
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      // 개발 환경에서만 허용되는 Auth Bypass (로컬 테스트 편의)
      if (import.meta.env.VITE_DEV_AUTH_BYPASS === 'true') {
        const key = 'dev_auth_user_id';
        let userId = localStorage.getItem(key);
        if (!userId) {
          userId = crypto.randomUUID();
          localStorage.setItem(key, userId);
        }
        headers['x-dev-user-id'] = userId;
        headers['x-dev-email'] = 'dev@example.com';
        headers['x-dev-name'] = 'Dev User';
      }
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
      const snippet = (errorText || '').slice(0, 800);
      const msg = `Azure Function error: ${response.status} (url=${redactUrl(url)}) ${snippet}`;
      if (DEBUG_AZURE_FUNCTIONS) {
        console.error(`[AzureFunctions] HTTP ${response.status} for ${redactUrl(url)}`);
        if (snippet) console.error(`[AzureFunctions] Response (first 800 chars):\n${snippet}`);
      }
      throw new Error(msg);
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
// Agent Orchestration (Generation Job)
// ============================================================

export type GenerationOutputType = 'document' | 'infographic' | 'slides';

export interface StartGenerationJobRequest {
  projectId: string;
  documentContent: string;
  aiModel: 'gemini' | 'claude' | 'chatgpt';
  outputs: {
    document: boolean;
    infographic: boolean;
    slides: boolean;
  };
  options?: {
    enableWebSearch?: boolean;
    enableImageGeneration?: boolean;
    slides?: {
      /** PRD 기준: 3~15 */
      slideCount?: number;
      /** PPTX 스타일(내보내기/톤) */
      template?: 'default' | 'minimal' | 'creative';
    };
  };
}

export interface StartGenerationJobResponse {
  success: boolean;
  jobId: string;
}

export async function startGenerationJob(
  request: StartGenerationJobRequest
): Promise<{ data: StartGenerationJobResponse | null; error: Error | null }> {
  return callAzureFunction<StartGenerationJobResponse>(
    '/api/generation/start',
    'POST',
    request
  );
}

export interface GenerationJobDto {
  id: string;
  project_id: string;
  user_id: string;
  ai_model: string;
  requested_outputs: any;
  options: any;
  status: string;
  current_step_index: number;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface GenerationStepDto {
  id: string;
  job_id: string;
  step_type: string;
  title: string;
  status: string;
  order_index: number;
  input?: any;
  output?: any;
  log?: string;
  error?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GenerationArtifactDto {
  id: string;
  job_id: string;
  artifact_type: GenerationOutputType;
  status: string;
  content_text?: string;
  content_json?: any;
  assets?: any;
  created_at: string;
  updated_at: string;
}

export interface JobSummary {
  id: string;
  ai_model: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GetGenerationJobResponse {
  success: boolean;
  job: GenerationJobDto | null;
  jobs: JobSummary[];  // 모든 Job 요약 (AI 모델별 비교용)
  steps: GenerationStepDto[];
  artifacts: GenerationArtifactDto[];
}

export async function getGenerationJob(
  projectId: string,
  jobId?: string  // 특정 Job 조회용
): Promise<{ data: GetGenerationJobResponse | null; error: Error | null }> {
  const url = jobId 
    ? `/api/generation/job/${projectId}?jobId=${jobId}`
    : `/api/generation/job/${projectId}`;
  return callAzureFunction<GetGenerationJobResponse>(url, 'GET');
}

export interface GenerationChatRequest {
  projectId: string;
  message: string;
  targets?: {
    document?: boolean;
    infographic?: boolean;
    slides?: boolean;
  };
  aiModel?: 'gemini' | 'claude' | 'chatgpt';
}

export interface GenerationChatResponse {
  success: boolean;
  assistantMessage?: string;
  action?: any;
}

export async function generationChat(
  request: GenerationChatRequest
): Promise<{ data: GenerationChatResponse | null; error: Error | null }> {
  return callAzureFunction<GenerationChatResponse>(
    `/api/generation/chat`,
    'POST',
    request
  );
}

export interface CancelGenerationJobRequest {
  projectId?: string;
  jobId?: string;
  reason?: string;
}

export interface CancelGenerationJobResponse {
  success: boolean;
  jobId?: string;
  status?: string;
}

export async function cancelGenerationJob(
  request: CancelGenerationJobRequest
): Promise<{ data: CancelGenerationJobResponse | null; error: Error | null }> {
  return callAzureFunction<CancelGenerationJobResponse>(
    `/api/generation/cancel`,
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
// User Roles
// ============================================================

export interface UserRolesResponse {
  success: boolean;
  roles: string[];
}

export async function getUserRoles(): Promise<{ data: UserRolesResponse | null; error: Error | null }> {
  return callAzureFunction<UserRolesResponse>(
    '/api/user/roles',
    'GET'
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
    const url = buildAzureFunctionsUrl(AZURE_FUNCTIONS_URL, endpoint);
    if (DEBUG_AZURE_FUNCTIONS) {
      console.debug(`[AzureFunctions] Unauth Request: ${method} ${redactUrl(url)} (endpoint=${endpoint})`);
    }
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
      const snippet = (errorText || '').slice(0, 800);
      const error = new Error(`Azure Function error: ${response.status} (url=${redactUrl(url)}) ${snippet}`);

      // 401 오류는 예상된 동작이므로 콘솔에 로그하지 않음
      if (response.status !== 401) {
        console.error(`[AzureFunctions] Error calling ${endpoint}:`, error);
        if (DEBUG_AZURE_FUNCTIONS && snippet) {
          console.error(`[AzureFunctions] Response (first 800 chars):\n${snippet}`);
        }
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
