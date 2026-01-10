# CI/CD 파이프라인 및 GitHub Secrets 설정

## 📅 날짜: 2026-01-09

## 📋 요청 내용
- GitHub Actions CI/CD 파이프라인의 에러 해결
- GitHub Secrets 설정
- Azure 리소스 생성 및 연결

---

## ✅ 완료된 작업

### 1. GitHub Secrets 설정 (14개)

| 카테고리 | 시크릿 이름 | 설명 |
|---------|------------|------|
| **ACR** | `ACR_LOGIN_SERVER` | Azure Container Registry 로그인 서버 |
| **ACR** | `ACR_USERNAME` | ACR 사용자명 |
| **ACR** | `ACR_PASSWORD` | ACR 비밀번호 |
| **Azure 인증** | `AZURE_CREDENTIALS` | Service Principal JSON |
| **Function App** | `AZURE_FUNCTIONAPP_NAME_PROD` | 프로덕션 Function App 이름 |
| **Function App** | `AZURE_FUNCTIONAPP_NAME_STAGING` | 스테이징 Function App 이름 |
| **Function App** | `AZURE_FUNCTIONS_URL_PROD` | 프로덕션 Functions URL |
| **Function App** | `AZURE_FUNCTIONS_URL_STAGING` | 스테이징 Functions URL |
| **Web App** | `AZURE_WEBAPP_NAME_PROD` | 프로덕션 App Service 이름 |
| **Web App** | `AZURE_WEBAPP_NAME_STAGING` | 스테이징 App Service 이름 |
| **Entra ID** | `ENTRA_AUTHORITY` | Microsoft Entra Authority URL |
| **Entra ID** | `ENTRA_CLIENT_ID_PROD` | 프로덕션 클라이언트 ID |
| **Entra ID** | `ENTRA_CLIENT_ID_STAGING` | 스테이징 클라이언트 ID |
| **Entra ID** | `ENTRA_TENANT_ID` | Entra 테넌트 ID |

### 2. Azure 리소스 생성

#### 프로덕션 App Service 생성
```bash
# App Service Plan 생성
az appservice plan create \
  --name plan-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --sku B1 --is-linux \
  --location koreacentral

# App Service 생성
az webapp create \
  --name app-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --plan plan-landing-page-pro \
  --runtime "NODE:20-lts"
```

#### Service Principal 자격 증명 갱신
```bash
az ad sp credential reset --id ffbe4015-f87c-4bc3-ae14-b683b3ece0ca
```

### 3. CI 워크플로우 수정

#### 문제: 네이티브 모듈 로딩 실패
```
Error: Cannot find module '@rollup/rollup-linux-x64-gnu'
Error: Cannot find module '@swc/core-linux-x64-gnu'
```

#### 해결책: 캐시 비활성화 및 완전 재설치
```yaml
# .github/workflows/ci.yml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}
    # cache: 'npm'  # 캐시 비활성화

- name: Install dependencies
  run: |
    rm -rf node_modules package-lock.json
    npm install
    npm rebuild
```

### 4. Deploy Frontend 워크플로우 수정

#### 문제: Vite --mode 플래그 오류
```
Could not resolve entry module "staging/index.html"
```

#### 해결책: 환경 변수로 대체
```yaml
# Before
run: npm run build -- --mode staging

# After
run: npm run build
env:
  VITE_APP_ENV: staging
```

---

## 📁 수정된 파일

1. `.github/workflows/ci.yml`
   - npm 캐시 비활성화
   - `node_modules` 및 `package-lock.json` 삭제 후 재설치
   - `npm rebuild` 추가

2. `.github/workflows/deploy-frontend.yml`
   - `--mode` 플래그 제거
   - `VITE_APP_ENV` 환경 변수 추가
   - 동일한 의존성 설치 로직 적용

---

## 📊 CI/CD 파이프라인 상태

| 워크플로우 | 상태 | 비고 |
|-----------|------|------|
| **CI (Lint)** | ✅ 통과 | |
| **CI (Type Check)** | ✅ 통과 | |
| **CI (Unit Tests)** | ✅ 통과 | |
| **CI (Build)** | ✅ 통과 | |
| **CI (Functions Build)** | ✅ 통과 | |
| **CI (PR Comment)** | ⚠️ 권한 오류 | 선택사항, 기능에 영향 없음 |
| **Deploy Frontend** | 🔄 테스트 필요 | |
| **Deploy Functions** | 🔄 테스트 필요 | |
| **Docker Build & Push** | 🔄 테스트 필요 | |

---

## 🔧 추가 작업 (선택사항)

1. **PR 코멘트 권한 설정**
   - Repository Settings → Actions → General → Workflow permissions
   - "Read and write permissions" 선택

2. **Deploy 워크플로우 테스트**
   - `main` 브랜치로 머지하여 프로덕션 배포 테스트

---

## 📚 참고 자료

- [GitHub Actions - Workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Azure CLI - Service Principal](https://docs.microsoft.com/en-us/cli/azure/ad/sp)
- [npm optional dependencies issue](https://github.com/npm/cli/issues/4828)
