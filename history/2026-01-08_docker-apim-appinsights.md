# Docker, API Management, Application Insights 구현

## 📅 날짜
2026-01-08

## 👤 요청 내용
중기 (1-2개월) 작업 진행:
1. Docker 컨테이너화
2. Azure API Management 도입
3. Application Insights 설정

## 🎯 구현 내용

### 1. Docker 컨테이너화 ✅

#### 생성된 파일
- `Dockerfile` - 프론트엔드 Multi-stage 빌드
- `nginx.conf` - Nginx 설정 (SPA 라우팅, 캐싱, 보안 헤더)
- `azure-functions/Dockerfile` - Azure Functions 컨테이너
- `docker-compose.yml` - 로컬 개발 환경 (프론트엔드, Functions, PostgreSQL, Azurite)
- `.dockerignore` - Docker 빌드 제외 파일
- `azure-functions/.dockerignore` - Azure Functions Docker 빌드 제외 파일
- `.github/workflows/docker-build.yml` - Docker 이미지 빌드 및 ACR 푸시 워크플로우

#### Docker Compose 구성
```yaml
services:
  frontend:        # React SPA (Nginx)
  functions:       # Azure Functions
  postgres:        # PostgreSQL 15
  azurite:         # Azure Storage 에뮬레이터
```

#### 실행 방법
```bash
# 로컬 개발 환경 시작
docker-compose up -d

# 프론트엔드: http://localhost:3000
# Functions:  http://localhost:7071
# PostgreSQL: localhost:5432
```

### 2. Application Insights 설정 ✅

#### 기존 리소스 확인
- `func-landing-page-pro` - 프로덕션 Functions용
- `func-landing-page-pro-staging` - 스테이징 Functions용

#### 프론트엔드 연동
- `@microsoft/applicationinsights-web` 패키지 설치
- `src/lib/applicationInsights.ts` 생성
  - 자동 페이지 뷰 추적
  - 라우트 변경 추적
  - AJAX 요청 추적
  - 에러 추적
  - 커스텀 이벤트/메트릭 추적 함수

#### 설정
- `App.tsx`에 초기화 코드 추가
- `env.example`에 환경 변수 추가:
  ```
  VITE_APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;...
  ```

### 3. Azure API Management 도입 🔄 (생성 중)

#### 생성된 리소스
- `apim-landing-page-pro` (Consumption tier)
- 위치: Korea Central

#### 생성된 파일
- `azure-migration/setup-apim.ps1` - APIM 설정 스크립트
- `docs/API-MANAGEMENT-GUIDE.md` - APIM 사용 가이드

#### 주요 기능
- Rate Limiting (분당 100회)
- CORS 정책
- Function Key 자동 주입
- 보안 헤더 추가

#### 설정 완료 후 실행
```powershell
cd azure-migration
.\setup-apim.ps1
```

## 📁 파일 변경 내역

### 신규 파일
| 파일 | 설명 |
|------|------|
| `Dockerfile` | 프론트엔드 Docker 이미지 |
| `nginx.conf` | Nginx 설정 |
| `azure-functions/Dockerfile` | Functions Docker 이미지 |
| `docker-compose.yml` | 로컬 개발 환경 |
| `.dockerignore` | 프론트엔드 Docker 제외 파일 |
| `azure-functions/.dockerignore` | Functions Docker 제외 파일 |
| `.github/workflows/docker-build.yml` | Docker 빌드 워크플로우 |
| `src/lib/applicationInsights.ts` | Application Insights SDK |
| `azure-migration/setup-apim.ps1` | APIM 설정 스크립트 |
| `docs/API-MANAGEMENT-GUIDE.md` | APIM 가이드 |

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `src/App.tsx` | Application Insights 초기화 추가 |
| `env.example` | Application Insights 환경 변수 추가 |
| `package.json` | @microsoft/applicationinsights-web 의존성 추가 |

## 🔧 추가 설정 필요

### GitHub Secrets (Docker/ACR 사용 시)
```
ACR_LOGIN_SERVER=<your-acr>.azurecr.io
ACR_USERNAME=<acr-username>
ACR_PASSWORD=<acr-password>
```

### 환경 변수
```bash
# Application Insights (프론트엔드)
VITE_APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=xxx;...

# API Management 사용 시 (APIM 생성 완료 후)
VITE_AZURE_FUNCTIONS_URL=https://apim-landing-page-pro.azure-api.net/api
```

## 📊 아키텍처

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Client    │────▶│  API Management  │────▶│  Azure Functions │
│   (React)   │     │  (Gateway)       │     │  (Backend)       │
└─────────────┘     └──────────────────┘     └──────────────────┘
       │                    │                        │
       │                    │                        │
       ▼                    ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Insights                         │
│              (Monitoring, Logging, Analytics)                   │
└─────────────────────────────────────────────────────────────────┘
```

## ✅ 완료 상태

| 작업 | 상태 |
|------|------|
| Docker 컨테이너화 | ✅ 완료 |
| Application Insights 설정 | ✅ 완료 |
| API Management 도입 | 🔄 리소스 생성 중 |

## 📚 참고 자료

- [Docker Multi-stage Build](https://docs.docker.com/build/building/multi-stage/)
- [Azure API Management](https://learn.microsoft.com/azure/api-management/)
- [Application Insights JavaScript SDK](https://learn.microsoft.com/azure/azure-monitor/app/javascript)
