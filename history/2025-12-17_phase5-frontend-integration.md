# Phase 5: 프론트엔드 Azure Functions 통합

**날짜**: 2025-12-17
**작업**: React 프론트엔드를 Azure Functions로 통합
**작업자**: Claude Code

---

## 작업 개요

React 프론트엔드의 Supabase Edge Functions 호출을 Azure Functions로 완전히 교체했습니다.

### 주요 목표
1. ✅ Supabase Edge Functions 호출 위치 파악
2. ✅ Azure Functions API 클라이언트 생성
3. ✅ 환경 변수 설정
4. ✅ 모든 Edge Functions 호출을 Azure Functions로 교체

---

## 변경된 파일

### 1. 새로 생성된 파일

#### `src/lib/azureFunctions.ts` (200줄)

**역할**: Azure Functions API 클라이언트 라이브러리

**핵심 기능:**

1. **JWT 토큰 획득 (MSAL)**
```typescript
async function getAccessToken(): Promise<string | null> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) return null;

  const response = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account: accounts[0],
  });

  return response.accessToken;
}
```

2. **Azure Function 호출 헬퍼**
```typescript
async function callAzureFunction<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<{ data: T | null; error: Error | null }> {
  const accessToken = await getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };

  const response = await fetch(`${AZURE_FUNCTIONS_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return { data: await response.json(), error: null };
}
```

3. **processDocument 함수**
```typescript
export interface ProcessDocumentRequest {
  projectId: string;
  documentContent?: string;
  aiModel: 'gemini' | 'claude' | 'chatgpt';
  stageId?: string;
  stageOrder?: number;
  regenerate?: boolean;
  retryWithDifferentAi?: boolean;
}

export async function processDocument(
  request: ProcessDocumentRequest
): Promise<{ data: ProcessDocumentResponse | null; error: Error | null }> {
  return callAzureFunction<ProcessDocumentResponse>(
    '/api/processDocument',
    'POST',
    request
  );
}
```

4. **generateCurriculum 함수**
```typescript
export interface GenerateCurriculumRequest {
  courseId: string;
  courseTitle: string;
  courseDescription?: string;
  level?: string;
  targetAudience?: string;
  totalDuration?: string;
  aiModel: 'gemini' | 'claude' | 'chatgpt';
}

export async function generateCurriculum(
  request: GenerateCurriculumRequest
): Promise<{ data: GenerateCurriculumResponse | null; error: Error | null }> {
  return callAzureFunction<GenerateCurriculumResponse>(
    '/api/generateCurriculum',
    'POST',
    request
  );
}
```

5. **인증 없는 호출 (로컬 테스트용)**
```typescript
export async function callAzureFunctionUnauthenticated<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<{ data: T | null; error: Error | null }> {
  // JWT 토큰 없이 호출 (로컬 개발용)
}
```

---

### 2. 수정된 파일

#### `.env`

**추가된 환경 변수:**
```env
# Azure Functions
VITE_AZURE_FUNCTIONS_URL="https://func-landing-page-pro.azurewebsites.net"
# For local testing, use: http://localhost:7071

# Azure AD B2C (from Phase 3)
VITE_AZURE_AD_B2C_TENANT_NAME="landingpagepro"
VITE_AZURE_AD_B2C_CLIENT_ID="<YOUR_CLIENT_ID>"
VITE_AZURE_AD_B2C_POLICY_SIGNIN="B2C_1_signupsignin"
VITE_AZURE_AD_B2C_REDIRECT_URI="http://localhost:5173/auth/callback"
VITE_AZURE_AD_B2C_AUTHORITY="https://landingpagepro.b2clogin.com/landingpagepro.onmicrosoft.com/B2C_1_signupsignin"
```

#### `src/pages/ProjectDetail.tsx`

**변경 사항:**

1. **Import 추가**
```typescript
import { processDocument } from "@/lib/azureFunctions";
```

2. **단계 재생성 (Line 234-243)**
```typescript
// Before (Supabase)
const { error: funcError } = await supabase.functions.invoke("process-document", {
  body: {
    projectId: id,
    stageId,
    stageOrder,
    regenerate: true,
  },
});

// After (Azure Functions)
const { error: funcError } = await processDocument({
  projectId: id!,
  aiModel: project.ai_model as 'gemini' | 'claude' | 'chatgpt',
  stageId,
  stageOrder,
  regenerate: true,
});
```

3. **다른 AI 모델로 재시도 (Line 709-717)**
```typescript
// Before (Supabase)
const { error: funcError } = await supabase.functions.invoke("process-document", {
  body: {
    projectId: project.id,
    documentContent: project.document_content,
    aiModel: aiModel,
    retryWithDifferentAi: true,
  },
});

// After (Azure Functions)
const { error: funcError } = await processDocument({
  projectId: project.id,
  documentContent: project.document_content,
  aiModel: aiModel as 'gemini' | 'claude' | 'chatgpt',
  retryWithDifferentAi: true,
});
```

#### `src/pages/CourseBuilderPage.tsx`

**변경 사항:**

1. **Import 추가**
```typescript
import { generateCurriculum } from "@/lib/azureFunctions";
```

2. **커리큘럼 생성 (Line 103-125)**
```typescript
// Before (Supabase)
const { error: functionError, data: functionData } = await supabase.functions.invoke(
  "generate-curriculum",
  {
    body: {
      courseId: course.id,
      courseTitle: course.title,
      courseDescription: course.description,
      level: course.level,
      targetAudience: course.target_audience,
      totalDuration: course.total_duration,
      aiModel: selectedAiModel,
    },
  }
);

// After (Azure Functions)
const { error: functionError, data: functionData } = await generateCurriculum({
  courseId: course.id,
  courseTitle: course.title,
  courseDescription: course.description || undefined,
  level: course.level || undefined,
  targetAudience: course.target_audience || undefined,
  totalDuration: course.total_duration || undefined,
  aiModel: selectedAiModel as 'gemini' | 'claude' | 'chatgpt',
});
```

#### `src/pages/ProjectCreate.tsx`

**변경 사항:**

1. **Import 추가**
```typescript
import { processDocument } from "@/lib/azureFunctions";
```

2. **프로젝트 생성 후 AI 처리 (Line 100-116)**
```typescript
// Before (Supabase)
const { error: functionError, data: functionData } = await supabase.functions.invoke("process-document", {
  body: {
    projectId: project.id,
    documentContent: formData.documentContent,
    aiModel: formData.aiModel,
  },
});

// After (Azure Functions)
const { error: functionError, data: functionData } = await processDocument({
  projectId: project.id,
  documentContent: formData.documentContent,
  aiModel: formData.aiModel as 'gemini' | 'claude' | 'chatgpt',
});
```

---

## 변경 사항 요약

### Edge Functions 호출 → Azure Functions 호출

| 파일 | 함수 | Before | After | Line |
|------|------|--------|-------|------|
| ProjectDetail.tsx | 단계 재생성 | `supabase.functions.invoke("process-document")` | `processDocument({...})` | 234-243 |
| ProjectDetail.tsx | AI 재시도 | `supabase.functions.invoke("process-document")` | `processDocument({...})` | 709-717 |
| CourseBuilderPage.tsx | 커리큘럼 생성 | `supabase.functions.invoke("generate-curriculum")` | `generateCurriculum({...})` | 103-125 |
| ProjectCreate.tsx | 프로젝트 생성 | `supabase.functions.invoke("process-document")` | `processDocument({...})` | 100-116 |

### API 응답 형식 변경

#### Supabase Edge Functions
```typescript
const { error, data } = await supabase.functions.invoke("function-name", {
  body: { ... }
});

// error: FunctionsHttpError | FunctionsRelayError | FunctionsFetchError
// data: any
```

#### Azure Functions
```typescript
const { error, data } = await azureFunction({ ... });

// error: Error | null
// data: TypedResponse | null
```

**차이점:**
1. **타입 안정성**: Azure Functions는 명시적인 타입 정의
2. **에러 처리**: 표준 Error 객체 사용
3. **요청 형식**: body 래핑 없이 직접 파라미터 전달

---

## 인증 흐름

### Before (Supabase)
```
User → Supabase Auth → Edge Function
       (자동 JWT 전송)
```

### After (Azure)
```
User → MSAL Login → Azure AD B2C JWT
     → React App → msalInstance.acquireTokenSilent()
     → Azure Functions (JWT in Authorization header)
     → JWT Verification (JWKS)
     → Business Logic
```

**인증 단계:**
1. 사용자가 Azure AD B2C로 로그인
2. MSAL이 JWT 토큰을 로컬 스토리지에 저장
3. API 호출 시 `getAccessToken()`으로 토큰 획득
4. `Authorization: Bearer <token>` 헤더에 포함
5. Azure Functions에서 JWKS로 JWT 검증
6. `user_id` 추출하여 비즈니스 로직 실행

---

## 로컬 개발 설정

### 1. Azure Functions 로컬 실행

```bash
cd azure-functions
npm run build
npm start
```

출력:
```
Functions:
  processDocument: [POST] http://localhost:7071/api/processDocument
  generateCurriculum: [POST] http://localhost:7071/api/generateCurriculum
```

### 2. 프론트엔드 환경 변수 변경

`.env` 파일 수정:
```env
# 로컬 테스트용
VITE_AZURE_FUNCTIONS_URL="http://localhost:7071"
```

### 3. 프론트엔드 실행

```bash
npm run dev
```

### 4. 인증 우회 (로컬 테스트용)

`src/middleware/auth.ts`에서 임시로 인증 비활성화:
```typescript
export async function requireAuth(request: HttpRequest, context: InvocationContext) {
  // 임시: 로컬 테스트용
  return {
    userId: '00000000-0000-0000-0000-000000000000',
    email: 'test@example.com',
    name: 'Test User',
  };
}
```

---

## 프로덕션 배포

### 1. 환경 변수 설정

`.env` 파일:
```env
# 프로덕션용
VITE_AZURE_FUNCTIONS_URL="https://func-landing-page-pro.azurewebsites.net"
VITE_AZURE_AD_B2C_CLIENT_ID="<실제 Client ID>"
```

### 2. Azure Functions 배포

```bash
cd azure-functions
npm run build
func azure functionapp publish func-landing-page-pro
```

### 3. 프론트엔드 빌드 및 배포

```bash
npm run build
# Vercel, Netlify, Azure Static Web Apps 등에 배포
```

---

## 테스트 시나리오

### 1. 프로젝트 생성 테스트
1. 로그인
2. "새 프로젝트 생성" 클릭
3. 브리프 작성 및 AI 모델 선택
4. "생성" 클릭
5. **기대 결과**: Azure Functions가 5단계 콘텐츠 생성

### 2. 단계 재생성 테스트
1. 프로젝트 상세 페이지 이동
2. 특정 단계에 피드백 입력
3. "이 단계 재생성" 클릭
4. **기대 결과**: Azure Functions가 해당 단계만 재생성

### 3. 다른 AI 모델로 재시도 테스트
1. 프로젝트 상세 페이지에서 AI 모델 변경 (Gemini → Claude)
2. **기대 결과**: Azure Functions가 Claude로 전체 재생성

### 4. 커리큘럼 생성 테스트
1. 코스 빌더 페이지 이동
2. "AI로 커리큘럼 생성" 클릭
3. **기대 결과**: Azure Functions가 모듈 및 레슨 생성

---

## 문제 해결

### 문제 1: "CORS error"
**증상**: `Access-Control-Allow-Origin` 에러
**해결**:
```bash
az functionapp cors add \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --allowed-origins "http://localhost:5173" "https://your-domain.com"
```

### 문제 2: "Unauthorized" 401 에러
**원인**: JWT 토큰이 없거나 만료됨
**해결**:
1. 브라우저 DevTools → Application → Local Storage 확인
2. `msal.*` 키 삭제 후 재로그인
3. `getAccessToken()` 디버깅:
```typescript
const token = await getAccessToken();
console.log('Access Token:', token);
```

### 문제 3: "Function not found" 404 에러
**원인**: Azure Functions URL 또는 엔드포인트 오류
**해결**:
1. `.env` 파일에서 `VITE_AZURE_FUNCTIONS_URL` 확인
2. Azure Portal에서 Function App URL 확인:
```bash
az functionapp show \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --query defaultHostName -o tsv
```

### 문제 4: "Network error" 또는 타임아웃
**원인**: Azure Functions가 실행 중이 아니거나 방화벽 문제
**해결**:
```bash
# Function App 상태 확인
az functionapp show \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --query state -o tsv

# 출력: Running (정상)
```

### 문제 5: "AI API rate limit" 에러
**원인**: AI API 호출 한도 초과
**해결**:
1. Azure Functions 환경 변수에서 API 키 확인
2. AI 모델 변경 (Gemini → Claude → ChatGPT)
3. Rate limiting 구현 고려

---

## 성능 최적화

### 1. 토큰 캐싱
MSAL은 자동으로 토큰을 캐싱하지만, 추가 최적화 가능:
```typescript
let cachedToken: { token: string; expiry: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  // 캐시된 토큰이 아직 유효하면 재사용
  if (cachedToken && cachedToken.expiry > Date.now()) {
    return cachedToken.token;
  }

  // 새 토큰 획득
  const response = await msalInstance.acquireTokenSilent({...});
  cachedToken = {
    token: response.accessToken,
    expiry: response.expiresOn.getTime(),
  };

  return response.accessToken;
}
```

### 2. 병렬 요청
여러 API 호출이 독립적이면 병렬 실행:
```typescript
const [projectData, stagesData, aiResultsData] = await Promise.all([
  supabase.from("projects").select("*").eq("id", id).single(),
  supabase.from("project_stages").select("*").eq("project_id", id),
  supabase.from("project_ai_results").select("*").eq("project_id", id),
]);
```

### 3. 재시도 로직
네트워크 일시적 오류에 대한 재시도:
```typescript
async function callAzureFunctionWithRetry<T>(
  endpoint: string,
  body: any,
  retries = 3
): Promise<{ data: T | null; error: Error | null }> {
  for (let i = 0; i < retries; i++) {
    const result = await callAzureFunction<T>(endpoint, 'POST', body);
    if (!result.error) return result;

    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  return { data: null, error: new Error('Max retries exceeded') };
}
```

---

## 다음 단계

Phase 5 완료 후:

1. **데이터 마이그레이션 (Phase 6)**
   - Supabase → Azure PostgreSQL
   - user_id 매핑 (Supabase UUID → Azure ObjectId)

2. **Supabase 의존성 제거**
   - `@supabase/supabase-js` 언인스톨
   - Supabase Auth 관련 코드 제거
   - Azure AD B2C 완전 전환

3. **모니터링 및 로깅**
   - Application Insights 설정
   - 에러 추적 및 분석
   - 성능 메트릭 수집

4. **CI/CD 파이프라인**
   - GitHub Actions 또는 Azure DevOps
   - 자동 빌드 및 배포
   - E2E 테스트 자동화

---

## 결론

프론트엔드의 모든 Supabase Edge Functions 호출을 Azure Functions로 성공적으로 교체했습니다.

### 주요 성과
1. ✅ Azure Functions API 클라이언트 생성 (`src/lib/azureFunctions.ts`)
2. ✅ 3개 파일에서 Edge Functions 호출 교체
3. ✅ JWT 인증 통합 (MSAL)
4. ✅ 환경 변수 설정
5. ✅ 타입 안정성 향상

### 기술 스택 변화
- **인증**: Supabase Auth → Azure AD B2C (MSAL)
- **API 호출**: Supabase Client → fetch + JWT
- **엔드포인트**: Deno Edge Functions → Node.js Azure Functions

### 비용 영향
- Supabase Edge Functions: 무료 (제한적)
- Azure Functions: ~$5-10/month (Consumption Plan)
- **총 증가**: ~$5-10/month (MS 파트너십 크레딧으로 상쇄 가능)

---

**작성일**: 2025-12-17
**작성자**: Claude Code
**관련 문서**:
- `azure-migration/PHASE3-FRONTEND-INTEGRATION.md`
- `azure-migration/PHASE4-AZURE-FUNCTIONS-DEPLOYMENT.md`
