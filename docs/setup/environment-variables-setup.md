# 환경 변수 설정 가이드

## 작성일: 2026-01-11

## 개요
Azure Functions에서 사용하는 환경 변수를 설정하는 방법을 안내합니다.

---

## 1. 로컬 개발 환경 설정

### `azure-functions/local.settings.json` 파일 수정

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    
    // PostgreSQL 연결 정보
    "AZURE_POSTGRES_HOST": "psql-landing-page-pro.postgres.database.azure.com",
    "AZURE_POSTGRES_DATABASE": "landingpagepro",
    "AZURE_POSTGRES_USER": "pgadmin",
    "AZURE_POSTGRES_PASSWORD": "your-password",
    "AZURE_POSTGRES_PORT": "5432",
    
    // Entra ID 인증 설정
    "ENTRA_TENANT_ID": "64425cef-1c32-4713-bb61-7dcd4939e326",
    "ENTRA_TENANT_NAME": "Landingpage",
    "ENTRA_CLIENT_ID": "9222c648-3066-455a-aa7e-49cdd9782943",
    
    // AI API Keys
    "GEMINI_API_KEY": "your-gemini-api-key",
    "ANTHROPIC_API_KEY": "your-anthropic-api-key",
    "OPENAI_API_KEY": "your-openai-api-key",
    
    // 웹 검색 API Keys (새로 추가)
    "TAVILY_API_KEY": "your-tavily-api-key",
    "SERPER_API_KEY": "your-serper-api-key",
    
    // Vertex AI Imagen API (이미지 생성용, 선택사항)
    "VERTEX_API_KEY": "your-vertex-api-key",
    "VERTEX_PROJECT_ID": "your-google-cloud-project-id",
    "VERTEX_LOCATION": "us-central1"
  }
}
```

### API 키 발급 방법

#### Tavily API 키
1. [Tavily 웹사이트](https://tavily.com) 접속
2. 회원가입 또는 로그인
3. Dashboard에서 API Key 확인
4. `TAVILY_API_KEY`에 복사

#### Serper API 키
1. [Serper 웹사이트](https://serper.dev) 접속
2. 회원가입 또는 로그인
3. Dashboard에서 API Key 확인
4. `SERPER_API_KEY`에 복사

#### Vertex AI Imagen API 키 (이미지 생성용, 선택사항)
**상세한 설정 방법**: `docs/vertex-ai-imagen-setup-guide.md` 참조

**간단 요약**:
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 생성 또는 선택
3. Vertex AI API 활성화 (API 및 서비스 → 라이브러리 → Vertex AI API)
4. API 키 생성 또는 서비스 계정 키 다운로드
5. `VERTEX_API_KEY`에 API 키 설정 (또는 `GOOGLE_APPLICATION_CREDENTIALS`에 서비스 계정 키 파일 경로 설정)
6. `VERTEX_PROJECT_ID`에 Google Cloud 프로젝트 ID 설정
7. `VERTEX_LOCATION` 설정 (기본값: `us-central1`)

---

## 2. Azure Portal에서 환경 변수 설정 (운영 환경)

### 방법 1: Azure Portal UI

1. [Azure Portal](https://portal.azure.com) 접속
2. **Function App** → `func-landing-page-pro` 선택
3. 왼쪽 메뉴: **Configuration** → **Application settings**
4. **+ New application setting** 클릭하여 다음 변수들 추가:

   ```
   TAVILY_API_KEY = your-tavily-api-key
   SERPER_API_KEY = your-serper-api-key
   VERTEX_API_KEY = your-vertex-api-key
   VERTEX_PROJECT_ID = your-google-cloud-project-id
   VERTEX_LOCATION = us-central1
   ```

5. 기존 변수 확인/수정:
   - `GEMINI_API_KEY`: Gemini API 키
   - `ANTHROPIC_API_KEY`: Anthropic API 키
   - `OPENAI_API_KEY`: OpenAI API 키 (이미지 생성용, 선택사항)

6. **저장** 클릭
7. **계속** 클릭 (Function App 재시작 확인)

### 방법 2: Azure CLI

```bash
# 웹 검색 API 키 추가
az functionapp config appsettings set \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --settings \
    TAVILY_API_KEY="your-tavily-api-key" \
    SERPER_API_KEY="your-serper-api-key"

# 기존 API 키 확인
az functionapp config appsettings list \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --query "[?name=='GEMINI_API_KEY' || name=='TAVILY_API_KEY' || name=='SERPER_API_KEY'].{name:name, value:value}" \
  --output table
```

### 방법 3: Azure Functions Core Tools

```bash
# 로컬에서 Azure로 환경 변수 동기화 (주의: 모든 변수가 덮어씌워짐)
func azure functionapp fetch-app-settings func-landing-page-pro

# 또는 개별 변수 설정
func azure functionapp publish func-landing-page-pro --publish-settings-only
```

---

## 3. Docker Compose 환경 설정

`docker-compose.yml` 파일의 `functions` 서비스에 환경 변수 추가:

```yaml
functions:
  environment:
    # 기존 설정...
    
    # 웹 검색 API Keys
    TAVILY_API_KEY: ${TAVILY_API_KEY}
    SERPER_API_KEY: ${SERPER_API_KEY}
    
    # AI API Keys
    GEMINI_API_KEY: ${GEMINI_API_KEY}
    ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    OPENAI_API_KEY: ${OPENAI_API_KEY}
```

`.env` 파일에 실제 값 설정:

```env
TAVILY_API_KEY=your-tavily-api-key
SERPER_API_KEY=your-serper-api-key
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
```

---

## 4. 환경 변수 우선순위

웹 검색 API는 다음 우선순위로 사용됩니다:
1. `TAVILY_API_KEY` (우선)
2. `SERPER_API_KEY` (대체)
3. 둘 다 없으면 에러 반환

---

## 5. 보안 주의사항

⚠️ **중요**: 
- `local.settings.json` 파일은 **절대 Git에 커밋하지 마세요**
- `.gitignore`에 포함되어 있는지 확인하세요
- API 키는 민감한 정보이므로 안전하게 관리하세요
- Azure Portal의 Application Settings는 암호화되어 저장됩니다

---

## 6. 확인 방법

### 로컬 환경 확인
```bash
cd azure-functions
func start
# 로그에서 환경 변수 로드 확인
```

### Azure Portal에서 확인
1. Function App → Configuration → Application settings
2. `TAVILY_API_KEY`, `SERPER_API_KEY` 값 확인
3. Function App 재시작 후 테스트

### 테스트
1. 새 프로젝트 생성 시 "웹 검색(최신 내용 반영)" 옵션 활성화
2. Generation Studio에서 웹 검색 단계 확인
3. 검색 결과가 표시되는지 확인

---

---

## 7. 이미지 생성 API 관련 참고사항

⚠️ **중요**: Gemini API는 **이미지 생성 기능이 없습니다**.

- **Gemini API**: 텍스트 생성 및 이미지 이해만 가능
- **이미지 생성**: Google Imagen API (Vertex AI) 필요
  - Vertex AI 프로젝트 설정 필요
  - 서비스 계정 키 필요
  - 일반 Gemini API 키로는 접근 불가

**현재 상태**:
- 이미지 생성 우선순위:
  1. **Vertex AI Imagen API** (우선) - `VERTEX_API_KEY`와 `VERTEX_PROJECT_ID` 설정 시
  2. **OpenAI DALL-E** (대체) - `OPENAI_API_KEY` 설정 시
- 두 API 키 중 하나만 설정해도 동작합니다

**Vertex AI Imagen API 사용 방법**:
1. Google Cloud 프로젝트 생성
2. Vertex AI API 활성화
3. API 키 생성 또는 서비스 계정 키 발급
4. `VERTEX_API_KEY`에 API 키 설정
5. `VERTEX_PROJECT_ID`에 프로젝트 ID 설정
6. `VERTEX_LOCATION` 설정 (기본값: `us-central1`)

**참고**: 
- `VERTEX_API_KEY`가 설정되어 있으면 Imagen API를 우선 사용합니다
- `GOOGLE_APPLICATION_CREDENTIALS` 환경 변수에 서비스 계정 키 파일 경로를 설정해도 사용 가능합니다

---

---

## 8. Tavily MCP API 관련 참고사항

**질문**: Tavily의 MCP API도 사용 가능한가요?

**답변**: 
- ✅ Tavily는 MCP 서버로도 제공됩니다
- 하지만 현재 프로젝트에서는 **REST API 방식이 더 적합**합니다

**비교**:
- **REST API (현재 방식)**: 간단, 직접적, 추가 의존성 없음 ✅ 권장
- **MCP 방식**: 표준화된 프로토콜이지만, 서버 설정 및 프로세스 관리 필요

**자세한 내용**: `docs/tavily-mcp-integration.md` 참조

---

## 참고 자료
- [Tavily API 문서](https://docs.tavily.com)
- [Serper API 문서](https://serper.dev/api)
- [Azure Functions 환경 변수 문서](https://learn.microsoft.com/azure/azure-functions/functions-app-settings)
- [Google Imagen API 문서](https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview)
- [Tavily MCP 통합 가이드](./tavily-mcp-integration.md)