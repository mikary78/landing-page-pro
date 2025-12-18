# Phase 4: Azure Functions 배포 가이드

**날짜**: 2025-12-17
**목적**: Supabase Edge Functions를 Azure Functions로 마이그레이션

---

## ✅ 완료된 작업

1. ✅ Azure Functions 프로젝트 구조 생성
2. ✅ `processDocument` 함수 변환 완료
3. ✅ `generateCurriculum` 함수 변환 완료
4. ✅ JWT 인증 미들웨어 구현
5. ✅ PostgreSQL 연결 라이브러리 구현
6. ✅ AI 서비스 통합 (Gemini, Claude, ChatGPT)
7. ✅ 의존성 설치 (`npm install`)

---

## 📦 프로젝트 구조

```
azure-functions/
├── package.json              # 의존성 및 스크립트
├── tsconfig.json             # TypeScript 설정
├── host.json                 # Azure Functions 런타임 설정
├── local.settings.json       # 로컬 환경 변수
├── .funcignore               # 배포 시 제외할 파일
├── README.md                 # 프로젝트 문서
└── src/
    ├── middleware/
    │   └── auth.ts           # JWT 검증 미들웨어
    ├── lib/
    │   ├── database.ts       # PostgreSQL 연결 풀
    │   └── ai-services.ts    # AI API 통합
    └── functions/
        ├── processDocument.ts       # 문서 처리 (5단계)
        └── generateCurriculum.ts    # 커리큘럼 생성
```

---

## 🔧 Step 1: 로컬 환경 변수 설정

`azure-functions/local.settings.json` 파일을 열고 실제 값으로 업데이트하세요:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",

    "AZURE_POSTGRES_HOST": "psql-landing-page-pro.postgres.database.azure.com",
    "AZURE_POSTGRES_DATABASE": "landingpagepro",
    "AZURE_POSTGRES_USER": "pgadmin",
    "AZURE_POSTGRES_PASSWORD": "LandingPage2025!@#Strong",
    "AZURE_POSTGRES_PORT": "5432",

    "AZURE_AD_B2C_TENANT_NAME": "landingpagepro",
    "AZURE_AD_B2C_TENANT_ID": "<Azure Portal에서 복사>",
    "AZURE_AD_B2C_CLIENT_ID": "<Azure Portal에서 복사>",
    "AZURE_AD_B2C_JWKS_URI": "https://landingpagepro.b2clogin.com/landingpagepro.onmicrosoft.com/B2C_1_signupsignin/discovery/v2.0/keys",

    "GEMINI_API_KEY": "<Supabase에서 복사>",
    "ANTHROPIC_API_KEY": "<Supabase에서 복사>",
    "OPENAI_API_KEY": "<Supabase에서 복사>"
  }
}
```

### 환경 변수 가져오기

#### Azure AD B2C 값:
```bash
# Tenant ID 확인
az ad signed-in-user show --query 'tenant' -o tsv

# Client ID는 Phase 3에서 생성한 앱 등록에서 복사
```

#### AI API Keys:
Supabase Edge Functions에서 사용하던 키를 그대로 사용:
```bash
# Supabase Secrets 확인
supabase secrets list

# 또는 .env 파일에서 확인
cat .env | grep API_KEY
```

---

## 🔧 Step 2: 로컬 테스트

### 2.1 빌드 및 실행

```bash
cd azure-functions
npm run build
npm start
```

출력 예시:
```
Azure Functions Core Tools
Core Tools Version:       4.0.5455 Commit hash: N/A  (64-bit)
Function Runtime Version: 4.27.5.21554

Functions:

  processDocument: [POST] http://localhost:7071/api/processDocument
  generateCurriculum: [POST] http://localhost:7071/api/generateCurriculum

For detailed output, run func with --verbose flag.
```

### 2.2 테스트 JWT 토큰 생성 (임시)

Azure AD B2C 로그인 없이 테스트하려면 임시로 인증을 비활성화할 수 있습니다:

**Option A: 인증 미들웨어 임시 비활성화**
`src/middleware/auth.ts`에서 `requireAuth` 함수 수정:

```typescript
export async function requireAuth(request: HttpRequest, context: InvocationContext) {
  // 임시: 인증 비활성화 (로컬 테스트용)
  return {
    userId: '00000000-0000-0000-0000-000000000000', // 테스트 user_id
    email: 'test@example.com',
    name: 'Test User',
  };

  // 실제 인증 코드 (주석 처리)
  // const user = await authenticateRequest(request, context);
  // if (!user) throw new Error('Unauthorized');
  // return user;
}
```

**Option B: 실제 JWT 토큰 사용**
프론트엔드에서 로그인 후 받은 토큰을 사용.

### 2.3 API 호출 테스트

#### processDocument 테스트:
```bash
curl -X POST http://localhost:7071/api/processDocument \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<실제 project ID>",
    "aiModel": "gemini"
  }'
```

#### generateCurriculum 테스트:
```bash
curl -X POST http://localhost:7071/api/generateCurriculum \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "<실제 course ID>",
    "courseTitle": "React 마스터 클래스",
    "courseDescription": "React 기초부터 심화까지",
    "level": "중급",
    "targetAudience": "프론트엔드 개발자",
    "totalDuration": "8주",
    "aiModel": "gemini"
  }'
```

---

## 🚀 Step 3: Azure Function App 생성

### 3.1 Function App 리소스 생성

```bash
az functionapp create \
  --resource-group rg-landing-page-pro \
  --name func-landing-page-pro \
  --storage-account stlandingpagepro \
  --consumption-plan-location koreacentral \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --os-type Linux
```

출력 예시:
```json
{
  "defaultHostName": "func-landing-page-pro.azurewebsites.net",
  "state": "Running",
  "hostNames": [
    "func-landing-page-pro.azurewebsites.net"
  ]
}
```

### 3.2 CORS 설정

프론트엔드 도메인 허용:
```bash
az functionapp cors add \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --allowed-origins "http://localhost:5173" "https://your-production-domain.com"
```

---

## 🔧 Step 4: 환경 변수 설정 (Azure)

### 4.1 Application Settings 추가

```bash
az functionapp config appsettings set \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --settings \
    AZURE_POSTGRES_HOST=psql-landing-page-pro.postgres.database.azure.com \
    AZURE_POSTGRES_DATABASE=landingpagepro \
    AZURE_POSTGRES_USER=pgadmin \
    AZURE_POSTGRES_PASSWORD="LandingPage2025!@#Strong" \
    AZURE_POSTGRES_PORT=5432 \
    AZURE_AD_B2C_TENANT_NAME=landingpagepro \
    AZURE_AD_B2C_CLIENT_ID="<YOUR_CLIENT_ID>" \
    AZURE_AD_B2C_JWKS_URI="https://landingpagepro.b2clogin.com/landingpagepro.onmicrosoft.com/B2C_1_signupsignin/discovery/v2.0/keys" \
    GEMINI_API_KEY="<YOUR_GEMINI_KEY>" \
    ANTHROPIC_API_KEY="<YOUR_ANTHROPIC_KEY>" \
    OPENAI_API_KEY="<YOUR_OPENAI_KEY>"
```

### 4.2 환경 변수 확인

```bash
az functionapp config appsettings list \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --query "[].{name:name, value:value}" -o table
```

---

## 🚀 Step 5: 배포

### 5.1 빌드 및 배포

```bash
cd azure-functions
npm run build
func azure functionapp publish func-landing-page-pro
```

출력 예시:
```
Getting site publishing info...
Creating archive for current directory...
Uploading 12.5 MB [####################]
Upload completed successfully.
Deployment completed successfully.
Syncing triggers...
Functions in func-landing-page-pro:
  processDocument - [httpTrigger]
      Invoke url: https://func-landing-page-pro.azurewebsites.net/api/processDocument
  generateCurriculum - [httpTrigger]
      Invoke url: https://func-landing-page-pro.azurewebsites.net/api/generateCurriculum
```

### 5.2 배포 확인

```bash
# Function 목록 확인
az functionapp function list \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --query "[].{name:name, status:config.state}" -o table
```

---

## 🧪 Step 6: 프로덕션 테스트

### 6.1 Health Check

```bash
curl https://func-landing-page-pro.azurewebsites.net/api/processDocument
```

예상 응답:
```json
{
  "error": "Missing required fields: projectId, aiModel"
}
```
(인증 없이 호출 시 400 에러는 정상)

### 6.2 실제 JWT 토큰으로 테스트

프론트엔드에서 로그인 후:
```bash
curl -X POST https://func-landing-page-pro.azurewebsites.net/api/processDocument \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<project_id>",
    "aiModel": "gemini"
  }'
```

---

## 🔧 Step 7: 프론트엔드 통합

### 7.1 API URL 환경 변수 추가

`.env` 파일 업데이트:
```env
VITE_AZURE_FUNCTIONS_URL=https://func-landing-page-pro.azurewebsites.net
```

### 7.2 API 호출 코드 수정

기존 Supabase Edge Functions 호출을 Azure Functions로 변경:

**Before (Supabase Edge Functions):**
```typescript
const { data, error } = await supabase.functions.invoke('process-document', {
  body: { projectId, aiModel },
});
```

**After (Azure Functions):**
```typescript
import { callAzureFunction } from '@/lib/api';

const data = await callAzureFunction('/api/processDocument', 'POST', {
  projectId,
  aiModel,
});
```

### 7.3 수정할 파일 목록

다음 파일들에서 Supabase Edge Functions 호출을 찾아 변경:
- `src/pages/ProjectDetail.tsx`
- `src/pages/CoursesPage.tsx`
- 기타 Edge Functions를 호출하는 컴포넌트

---

## 📊 마이그레이션 체크리스트

### Azure Functions
- [ ] 로컬 환경 변수 설정 (`local.settings.json`)
- [ ] 로컬 빌드 및 실행 (`npm run build && npm start`)
- [ ] 로컬 API 테스트 (curl 또는 Postman)
- [ ] Azure Function App 생성
- [ ] CORS 설정
- [ ] Azure 환경 변수 설정
- [ ] 프로덕션 배포 (`func azure functionapp publish`)
- [ ] 프로덕션 API 테스트

### 프론트엔드
- [ ] `.env`에 `VITE_AZURE_FUNCTIONS_URL` 추가
- [ ] `src/lib/api.ts` 구현 확인
- [ ] Supabase Edge Functions 호출 → Azure Functions로 변경
- [ ] 로컬 테스트
- [ ] 프로덕션 배포

### 모니터링
- [ ] Azure Portal에서 로그 확인
- [ ] Application Insights 설정 (선택사항)
- [ ] 비용 모니터링

---

## 🆘 문제 해결

### 문제 1: "Cannot find module '@azure/functions'"
**원인**: 의존성 설치 누락
**해결**:
```bash
cd azure-functions
npm install
```

### 문제 2: "Connection to PostgreSQL failed"
**원인**: 방화벽 규칙 또는 연결 문자열 오류
**해결**:
```bash
# Azure Function App IP 확인
az functionapp show \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --query outboundIpAddresses -o tsv

# PostgreSQL 방화벽 규칙 추가
az postgres flexible-server firewall-rule create \
  --resource-group rg-landing-page-pro \
  --name psql-landing-page-pro \
  --rule-name AllowAzureFunctions \
  --start-ip-address <FUNCTION_APP_IP> \
  --end-ip-address <FUNCTION_APP_IP>
```

### 문제 3: "JWT token invalid"
**원인**: JWKS URI 또는 Client ID 불일치
**해결**:
- Azure AD B2C 설정 확인
- `AZURE_AD_B2C_JWKS_URI` 정확성 확인
- `AZURE_AD_B2C_CLIENT_ID` 일치 확인

### 문제 4: "AI API rate limit exceeded"
**원인**: API 호출 한도 초과
**해결**:
- API 키 크레딧 확인
- Rate limiting 구현
- 더 저렴한 모델 사용 (gemini-2.0-flash-exp)

### 문제 5: "Function timeout"
**원인**: AI 생성 시간이 기본 타임아웃(5분) 초과
**해결**:
```bash
# Function App 타임아웃 연장 (최대 10분)
az functionapp config appsettings set \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --settings functionTimeout=00:10:00
```

---

## 📊 로그 확인

### Azure Portal에서 확인
1. Azure Portal → Function App → `func-landing-page-pro`
2. 왼쪽 메뉴 → **Functions** → 함수 선택 → **Monitor**
3. 실행 로그 및 에러 확인

### CLI에서 실시간 로그 확인
```bash
func azure functionapp logstream func-landing-page-pro
```

---

## 💰 비용 추정

### Azure Functions (Consumption Plan)
- **실행 비용**: $0.20/million executions
- **리소스 비용**: $0.000016/GB-s
- **월 무료 할당량**: 1M executions, 400K GB-s
- **예상 비용**: ~$5-10/month (10K requests/month)

### AI APIs
- **Gemini**: 무료 (gemini-2.0-flash-exp)
- **Claude**: $0.25/MTok (~$5/month, 20M tokens)
- **ChatGPT**: $0.15/MTok (~$3/month, 20M tokens)

**총 예상 비용**: ~$13-23/month

---

## 🎯 다음 단계

Phase 4 완료 후:
1. ⏭️ 프론트엔드 Supabase 코드 제거
2. ⏭️ 데이터 마이그레이션 (Supabase → Azure PostgreSQL)
3. ⏭️ Application Insights 설정
4. ⏭️ CI/CD 파이프라인 구축

---

**작성일**: 2025-12-17
**이전**: PHASE3-FRONTEND-INTEGRATION.md
**다음**: PHASE5-FINAL-MIGRATION.md
