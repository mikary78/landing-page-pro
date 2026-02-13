# Vertex AI Imagen API 설정 가이드

## 작성일: 2026-01-11

## 개요
Google Cloud Vertex AI의 Imagen API를 사용하여 이미지 생성 기능을 활성화하는 방법을 단계별로 안내합니다.

---

## 목차
1. [사전 준비사항](#사전-준비사항)
2. [Google Cloud 프로젝트 생성](#google-cloud-프로젝트-생성)
3. [Vertex AI API 활성화](#vertex-ai-api-활성화)
4. [인증 설정 (API 키 또는 서비스 계정)](#인증-설정)
5. [환경 변수 설정](#환경-변수-설정)
6. [테스트 및 확인](#테스트-및-확인)
7. [문제 해결](#문제-해결)

---

## 사전 준비사항

### 필요한 것들
- Google 계정
- 신용카드 (Google Cloud 무료 체험 계정 생성 시 필요, $300 크레딧 제공)
- 인터넷 연결

### 참고사항
- Google Cloud는 무료 체험 계정을 제공합니다 ($300 크레딧, 90일간 유효)
- Imagen API는 사용량에 따라 과금됩니다 (자세한 가격은 [Google Cloud 가격 페이지](https://cloud.google.com/vertex-ai/pricing) 참조)

---

## Google Cloud 프로젝트 생성

### 1단계: Google Cloud Console 접속

1. 웹 브라우저에서 [Google Cloud Console](https://console.cloud.google.com) 접속
2. Google 계정으로 로그인

### 2단계: 새 프로젝트 생성

1. 상단 메뉴에서 **프로젝트 선택** 드롭다운 클릭
2. **새 프로젝트** 클릭
3. 프로젝트 정보 입력:
   - **프로젝트 이름**: 예) `landing-page-pro-images`
   - **조직**: 선택사항 (조직이 있는 경우)
   - **위치**: 선택사항
4. **만들기** 클릭
5. 프로젝트 생성 완료까지 1-2분 소요

### 3단계: 프로젝트 ID 확인

1. 프로젝트 선택 후 상단 메뉴에서 **프로젝트 정보** 아이콘 클릭
2. **프로젝트 ID** 복사 (예: `landing-page-pro-images-123456`)
   - 이 값이 `VERTEX_PROJECT_ID`에 사용됩니다

---

## Vertex AI API 활성화

### 방법 1: API 라이브러리에서 활성화 (권장)

1. Google Cloud Console에서 **API 및 서비스** → **라이브러리** 메뉴 클릭
2. 검색창에 **"Vertex AI API"** 또는 **"AI Platform API"** 입력
3. **Vertex AI API** 선택
4. **사용 설정** 버튼 클릭
5. 활성화 완료까지 1-2분 소요

### 방법 2: Imagen API 직접 활성화

1. Google Cloud Console에서 **API 및 서비스** → **라이브러리** 메뉴 클릭
2. 검색창에 **"Imagen API"** 또는 **"Generative AI"** 입력
3. **Vertex AI Generative AI API** 선택
4. **사용 설정** 버튼 클릭

### 방법 3: Cloud Shell에서 활성화

```bash
# 프로젝트 ID 설정 (본인의 프로젝트 ID로 변경)
export PROJECT_ID="your-project-id"

# 프로젝트 설정
gcloud config set project $PROJECT_ID

# Vertex AI API 활성화
gcloud services enable aiplatform.googleapis.com

# Imagen API 활성화 (Generative AI API)
gcloud services enable generativelanguage.googleapis.com
```

### 활성화 확인

1. **API 및 서비스** → **사용 설정된 API** 메뉴로 이동
2. 다음 API들이 목록에 있는지 확인:
   - ✅ Vertex AI API
   - ✅ Vertex AI Generative AI API (또는 Imagen API)

---

## 인증 설정

Vertex AI API를 사용하기 위한 인증 방법은 두 가지가 있습니다:

### 옵션 1: API 키 사용 (간단, 개발용)

#### API 키 생성

1. Google Cloud Console에서 **API 및 서비스** → **사용자 인증 정보** 메뉴 클릭
2. 상단 **+ 사용자 인증 정보 만들기** → **API 키** 선택
3. API 키가 생성되면 복사 (예: `AIzaSyDzll_sialr7wIk764qJf8-sQrdqiqqNQ4`)
4. **제한사항** 탭에서 API 키 제한 설정 (선택사항, 권장):
   - **애플리케이션 제한사항**: HTTP 리퍼러(웹사이트) 또는 IP 주소
   - **API 제한사항**: Vertex AI API만 선택

#### API 키 보안 설정

⚠️ **중요**: API 키는 민감한 정보이므로 안전하게 관리하세요.

1. 생성된 API 키 옆 **연필 아이콘** 클릭
2. **애플리케이션 제한사항** 설정:
   - **HTTP 리퍼러(웹사이트)**: 특정 도메인만 허용
   - **IP 주소**: 특정 IP만 허용 (Azure Functions의 경우 고정 IP 사용)
3. **API 제한사항** 설정:
   - **키 제한**: **Vertex AI API**만 선택
4. **저장** 클릭

**장점**:
- 설정이 간단함
- 빠르게 시작 가능

**단점**:
- 보안이 서비스 계정보다 낮음
- 프로덕션 환경에서는 권장하지 않음

---

### 옵션 2: 서비스 계정 사용 (권장, 프로덕션용)

#### 서비스 계정 생성

1. Google Cloud Console에서 **IAM 및 관리자** → **서비스 계정** 메뉴 클릭
2. 상단 **+ 서비스 계정 만들기** 클릭
3. 서비스 계정 정보 입력:
   - **서비스 계정 이름**: 예) `landing-page-pro-image-gen`
   - **서비스 계정 ID**: 자동 생성됨
   - **설명**: "Landing Page Pro 이미지 생성용 서비스 계정"
4. **만들고 계속하기** 클릭

#### 역할 부여

1. **역할 선택** 화면에서 다음 역할 추가:
   - **Vertex AI User** (`roles/aiplatform.user`)
   - **Service Account User** (`roles/iam.serviceAccountUser`)
2. **계속** → **완료** 클릭

#### 서비스 계정 키 생성

1. 생성된 서비스 계정 클릭
2. **키** 탭 클릭
3. **키 추가** → **새 키 만들기** 클릭
4. **JSON** 선택 → **만들기** 클릭
5. JSON 키 파일이 자동으로 다운로드됨 (예: `landing-page-pro-images-123456-abc123.json`)

⚠️ **중요**: 
- 이 JSON 파일은 **절대 공개 저장소에 업로드하지 마세요**
- 파일을 안전한 위치에 보관하세요
- 키가 유출되면 즉시 삭제하고 새로 생성하세요

**장점**:
- 보안이 높음
- 프로덕션 환경에 적합
- 세밀한 권한 제어 가능

**단점**:
- 설정이 복잡함
- JSON 파일 관리 필요

---

## 환경 변수 설정

### Azure Functions `local.settings.json` 설정

#### 옵션 1: API 키 사용

```json
{
  "IsEncrypted": false,
  "Values": {
    "VERTEX_API_KEY": "AIzaSyDzll_sialr7wIk764qJf8-sQrdqiqqNQ4",
    "VERTEX_PROJECT_ID": "landing-page-pro-images-123456",
    "VERTEX_LOCATION": "us-central1"
  }
}
```

#### 옵션 2: 서비스 계정 키 사용

```json
{
  "IsEncrypted": false,
  "Values": {
    "GOOGLE_APPLICATION_CREDENTIALS": "C:\\path\\to\\your\\service-account-key.json",
    "VERTEX_PROJECT_ID": "landing-page-pro-images-123456",
    "VERTEX_LOCATION": "us-central1"
  }
}
```

**참고**: 
- `GOOGLE_APPLICATION_CREDENTIALS`는 JSON 파일의 **절대 경로**를 지정합니다
- Windows: `C:\\path\\to\\file.json` (백슬래시 두 개 사용)
- Linux/Mac: `/path/to/file.json`

### Azure Portal에서 환경 변수 설정 (운영 환경)

1. [Azure Portal](https://portal.azure.com) 접속
2. **Function App** → `func-landing-page-pro` 선택
3. **Configuration** → **Application settings** 메뉴 클릭
4. **+ New application setting** 클릭하여 다음 변수 추가:

   ```
   VERTEX_API_KEY = your-api-key
   VERTEX_PROJECT_ID = your-project-id
   VERTEX_LOCATION = us-central1
   ```

   또는 서비스 계정 키 사용 시:

   ```
   GOOGLE_APPLICATION_CREDENTIALS = /path/to/service-account-key.json
   VERTEX_PROJECT_ID = your-project-id
   VERTEX_LOCATION = us-central1
   ```

5. **저장** 클릭
6. Function App 재시작 확인

### Azure CLI로 설정

```bash
# API 키 사용
az functionapp config appsettings set \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --settings \
    VERTEX_API_KEY="your-api-key" \
    VERTEX_PROJECT_ID="your-project-id" \
    VERTEX_LOCATION="us-central1"

# 서비스 계정 키 사용 (Azure Storage에 업로드 후 경로 지정)
az functionapp config appsettings set \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --settings \
    GOOGLE_APPLICATION_CREDENTIALS="/home/site/wwwroot/service-account-key.json" \
    VERTEX_PROJECT_ID="your-project-id" \
    VERTEX_LOCATION="us-central1"
```

---

## 테스트 및 확인

### 1. 로컬 환경 테스트

```bash
cd azure-functions
npm run build
npm start
```

### 2. API 키 확인

환경 변수가 제대로 로드되었는지 확인:

```bash
# PowerShell (Windows)
$env:VERTEX_API_KEY
$env:VERTEX_PROJECT_ID

# Bash (Linux/Mac)
echo $VERTEX_API_KEY
echo $VERTEX_PROJECT_ID
```

### 3. 이미지 생성 테스트

1. 프로젝트 생성 페이지에서 새 프로젝트 생성
2. "이미지 생성" 옵션 활성화
3. Generation Studio에서 이미지 생성 단계 확인
4. 로그에서 다음 메시지 확인:
   - ✅ `[image-generation] Imagen API 사용`
   - ❌ `[image-generation] Imagen API 실패, OpenAI로 대체`

### 4. Vertex AI API 직접 테스트 (선택사항)

```bash
# API 키로 테스트
curl -X POST \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/imagegeneration@006:predict" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [{
      "prompt": "A beautiful sunset over mountains"
    }],
    "parameters": {
      "sampleCount": 1,
      "aspectRatio": "1:1"
    }
  }'
```

---

## 문제 해결

### 문제 1: "API not enabled" 오류

**증상**: `403 Forbidden` 또는 `API not enabled` 오류

**해결 방법**:
1. Google Cloud Console에서 **API 및 서비스** → **사용 설정된 API** 확인
2. Vertex AI API가 활성화되어 있는지 확인
3. 활성화되지 않았다면 [Vertex AI API 활성화](#vertex-ai-api-활성화) 단계 다시 수행

### 문제 2: "Permission denied" 오류

**증상**: `403 Permission denied` 오류

**해결 방법**:
1. API 키 제한사항 확인:
   - **API 제한사항**에 Vertex AI API가 포함되어 있는지 확인
2. 서비스 계정 권한 확인:
   - **IAM 및 관리자** → **서비스 계정**에서 역할 확인
   - `roles/aiplatform.user` 역할이 있는지 확인

### 문제 3: "Invalid project ID" 오류

**증상**: `400 Bad Request` 또는 `Invalid project ID` 오류

**해결 방법**:
1. `VERTEX_PROJECT_ID` 값 확인:
   - 프로젝트 ID는 숫자와 하이픈으로 구성 (예: `project-123456`)
   - 프로젝트 이름이 아닌 **프로젝트 ID**를 사용해야 함
2. Google Cloud Console에서 프로젝트 정보 확인

### 문제 4: "Location not supported" 오류

**증상**: `400 Bad Request` 또는 `Location not supported` 오류

**해결 방법**:
1. `VERTEX_LOCATION` 값 확인:
   - 지원되는 리전: `us-central1`, `us-east1`, `us-west1`, `europe-west1`, `asia-northeast1`
   - 기본값: `us-central1`
2. 프로젝트의 리전과 일치하는지 확인

### 문제 5: 이미지 생성이 작동하지 않음

**증상**: 이미지 생성 단계가 스킵되거나 실패

**해결 방법**:
1. 환경 변수 확인:
   ```bash
   # 로컬
   cat azure-functions/local.settings.json
   
   # Azure Portal
   Function App → Configuration → Application settings
   ```

2. 로그 확인:
   - Azure Functions 로그에서 `[image-generation]` 관련 메시지 확인
   - 오류 메시지 확인

3. API 키 유효성 확인:
   - Google Cloud Console에서 API 키가 활성화되어 있는지 확인
   - API 키 제한사항이 너무 엄격한지 확인

### 문제 6: 서비스 계정 키 파일을 찾을 수 없음

**증상**: `GOOGLE_APPLICATION_CREDENTIALS` 파일을 찾을 수 없음

**해결 방법**:
1. 파일 경로 확인:
   - 절대 경로 사용 (상대 경로 사용 금지)
   - Windows: `C:\\path\\to\\file.json` (백슬래시 두 개)
   - Linux/Mac: `/path/to/file.json`
2. 파일 권한 확인:
   - 파일이 읽기 가능한지 확인
3. Azure Functions에 파일 업로드:
   - Azure Portal → Function App → **개발 도구** → **App Service Editor**
   - 파일 업로드 후 경로 설정

---

## 비용 관리

### 무료 할당량

- Google Cloud는 $300 무료 크레딧 제공 (90일간 유효)
- 일부 API는 무료 할당량 제공 (자세한 내용은 [가격 페이지](https://cloud.google.com/vertex-ai/pricing) 참조)

### 예상 비용

- Imagen API 가격은 사용량에 따라 다름
- 일반적으로 이미지당 $0.02-0.04 정도 (모델 및 해상도에 따라 다름)

### 비용 제한 설정

1. Google Cloud Console에서 **청구** → **예산 및 알림** 메뉴 클릭
2. **예산 만들기** 클릭
3. 예산 금액 설정 (예: $50/월)
4. 알림 임계값 설정 (예: 50%, 90%, 100%)
5. **저장** 클릭

---

## 보안 모범 사례

### 1. API 키 보안

- ✅ API 키를 환경 변수에 저장
- ✅ API 키 제한사항 설정 (IP, 도메인, API)
- ❌ API 키를 코드에 하드코딩하지 않기
- ❌ API 키를 Git에 커밋하지 않기

### 2. 서비스 계정 키 보안

- ✅ 서비스 계정 키 파일을 안전한 위치에 보관
- ✅ 최소 권한 원칙 적용 (필요한 역할만 부여)
- ❌ 서비스 계정 키를 공개 저장소에 업로드하지 않기
- ❌ 키가 유출되면 즉시 삭제하고 새로 생성

### 3. 환경 변수 관리

- ✅ `.gitignore`에 `local.settings.json` 포함
- ✅ Azure Portal의 Application Settings 사용 (운영 환경)
- ✅ Azure Key Vault 사용 (민감한 정보)

---

## 참고 자료

- [Vertex AI 공식 문서](https://cloud.google.com/vertex-ai/docs)
- [Imagen API 문서](https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview)
- [Google Cloud 가격 계산기](https://cloud.google.com/products/calculator)
- [API 키 보안 모범 사례](https://cloud.google.com/docs/authentication/api-keys)
- [서비스 계정 가이드](https://cloud.google.com/iam/docs/service-accounts)

---

## 다음 단계

1. ✅ Vertex AI API 활성화 완료
2. ✅ 환경 변수 설정 완료
3. 🔄 이미지 생성 기능 테스트
4. 🔄 프로덕션 환경 배포
5. 🔄 모니터링 및 비용 관리 설정

---

**작성일**: 2026-01-11  
**작성자**: Claude Code  
**최종 업데이트**: 2026-01-11
