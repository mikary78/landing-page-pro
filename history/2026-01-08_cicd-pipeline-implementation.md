# CI/CD 파이프라인 구현

**날짜**: 2026-01-08  
**작업자**: AI Assistant  
**작업 유형**: 인프라/DevOps

---

## 📋 요청 내용

사용자 요청:
- CI/CD 파이프라인에 CD 추가 (Azure App Service 자동 배포)
- Azure Functions 자동 배포 추가
- 환경별 분리 (dev/staging/prod)

---

## ✅ 완료된 작업

### 1. CI 워크플로우 개선 (`.github/workflows/ci.yml`)

**변경 내용:**
- develop 브랜치 트리거 추가
- TypeScript 타입 체크 단계 추가 (`npm run typecheck`)
- Azure Functions 빌드 검증 추가
- PR 코멘트에 빌드 상태 표시 기능 추가
- 작업 병렬화로 CI 속도 개선

**실행 작업:**
- Lint (ESLint)
- Type Check (TypeScript)
- Unit Tests (Vitest)
- Build (Frontend)
- Build Functions (Azure Functions)

### 2. 프론트엔드 CD 워크플로우 (`.github/workflows/deploy-frontend.yml`)

**트리거:**
- `main` 브랜치 푸시 → Production 배포
- `develop` 브랜치 푸시 → Staging 배포
- 수동 실행 (`workflow_dispatch`)

**배포 흐름:**
```
Push → Build → Upload Artifact → Deploy to Azure App Service
```

**환경별 빌드:**
- Staging: `npm run build -- --mode staging`
- Production: `npm run build -- --mode production`

### 3. Azure Functions CD 워크플로우 (`.github/workflows/deploy-functions.yml`)

**트리거:**
- `azure-functions/` 폴더 변경 시만 실행
- `main` 브랜치 → Production 배포
- `develop` 브랜치 → Staging 배포

**배포 흐름:**
```
Push → Build TypeScript → Create ZIP → Deploy to Azure Functions
```

**검증 단계:**
- 배포 후 30초 대기
- `/api/hello` 엔드포인트 호출로 배포 검증

### 4. 환경별 설정

**파일 생성:**
- `env.example` - 환경 변수 템플릿

**환경 구조:**
| 환경 | 브랜치 | 용도 |
|------|--------|------|
| Development | 로컬 | 개발자 로컬 개발 |
| Staging | develop | QA/테스트 |
| Production | main | 운영 서비스 |

### 5. 설정 가이드 문서 (`docs/CI-CD-SETUP-GUIDE.md`)

**포함 내용:**
1. Azure Service Principal 생성 방법
2. GitHub Secrets 설정 목록 및 방법
3. Azure 리소스 생성 명령어 (스테이징)
4. CORS 설정
5. 배포 트리거 설명
6. 모니터링 방법
7. 롤백 절차
8. 문제 해결 가이드

---

## 📁 변경된 파일

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `.github/workflows/ci.yml` | 수정 | CI 개선 (병렬화, 타입체크 추가) |
| `.github/workflows/deploy-frontend.yml` | 신규 | 프론트엔드 CD 파이프라인 |
| `.github/workflows/deploy-functions.yml` | 신규 | Functions CD 파이프라인 |
| `env.example` | 신규 | 환경 변수 템플릿 |
| `docs/CI-CD-SETUP-GUIDE.md` | 신규 | CI/CD 설정 가이드 |

---

## 🔑 필요한 GitHub Secrets

### 필수 Secrets

```
AZURE_CREDENTIALS           # Azure Service Principal JSON
AZURE_WEBAPP_NAME_PROD      # 프로덕션 App Service 이름
AZURE_WEBAPP_NAME_STAGING   # 스테이징 App Service 이름
AZURE_FUNCTIONAPP_NAME_PROD # 프로덕션 Function App 이름
AZURE_FUNCTIONAPP_NAME_STAGING # 스테이징 Function App 이름
```

### 환경 변수 Secrets

```
AZURE_FUNCTIONS_URL_PROD    # 프로덕션 Functions URL
AZURE_FUNCTIONS_URL_STAGING # 스테이징 Functions URL
ENTRA_CLIENT_ID_PROD        # 프로덕션 Entra Client ID
ENTRA_CLIENT_ID_STAGING     # 스테이징 Entra Client ID
ENTRA_TENANT_ID             # Entra Tenant ID
ENTRA_AUTHORITY             # Entra Authority URL
```

---

## 🚀 배포 명령어

### 로컬에서 수동 배포

**프론트엔드:**
```bash
npm run build
# dist/ 폴더를 Azure App Service에 배포
```

**Azure Functions:**
```bash
cd azure-functions
npm run build
func azure functionapp publish func-landing-page-pro
```

### GitHub Actions에서 자동 배포

**자동 트리거:**
- `main` 브랜치에 푸시 → 프로덕션 배포
- `develop` 브랜치에 푸시 → 스테이징 배포

**수동 트리거:**
1. GitHub > Actions > Deploy Frontend (또는 Deploy Azure Functions)
2. Run workflow > 환경 선택 > Run workflow

---

## 📊 다음 단계 권장 사항

### 즉시 진행 필요

1. **GitHub Secrets 설정**
   - Azure Service Principal 생성
   - 모든 필수 Secrets 등록

2. **스테이징 리소스 생성**
   - `app-landing-page-pro-staging` App Service
   - `func-landing-page-pro-staging` Function App

3. **develop 브랜치 생성**
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

### 추가 개선 사항 (선택)

- [ ] Slack/Teams 배포 알림 통합
- [ ] E2E 테스트 CI 통합 (Playwright)
- [ ] 코드 커버리지 리포팅
- [ ] 배포 슬롯 활용 (무중단 배포)
- [ ] Application Insights 연동

---

## 🔗 참고 문서

- [docs/CI-CD-SETUP-GUIDE.md](../docs/CI-CD-SETUP-GUIDE.md) - 상세 설정 가이드
- [azure-migration/PHASE1-SETUP-GUIDE.md](../azure-migration/PHASE1-SETUP-GUIDE.md) - Azure 인프라 설정
- [azure-migration/PHASE4-AZURE-FUNCTIONS-DEPLOYMENT.md](../azure-migration/PHASE4-AZURE-FUNCTIONS-DEPLOYMENT.md) - Functions 배포

---

**작성 완료**: 2026-01-08
