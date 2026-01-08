# CI/CD 설정 가이드

## 📋 개요

이 문서는 Landing Page Pro 프로젝트의 CI/CD 파이프라인 설정 및 운영 가이드입니다.

### 파이프라인 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Repository                             │
│  main branch ─────────────────────────────────────► Production   │
│  develop branch ──────────────────────────────────► Staging      │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │   CI     │   │ Frontend │   │ Functions│
   │  Tests   │   │  Deploy  │   │  Deploy  │
   └──────────┘   └──────────┘   └──────────┘
```

---

## 🔧 1단계: Azure Service Principal 생성

CI/CD 파이프라인에서 Azure에 배포하려면 Service Principal이 필요합니다.

### 1.1 Azure CLI로 Service Principal 생성

```bash
# Azure 로그인
az login

# 구독 확인
az account list --output table

# 구독 선택
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Service Principal 생성 (역할: Contributor)
az ad sp create-for-rbac \
  --name "sp-landing-page-pro-cicd" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/rg-landing-page-pro \
  --sdk-auth
```

### 1.2 출력 JSON 저장

위 명령어 실행 후 출력되는 JSON을 복사하세요:

```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

---

## 🔑 2단계: GitHub Secrets 설정

GitHub Repository > Settings > Secrets and variables > Actions 에서 다음 Secrets를 추가합니다.

### 2.1 필수 Secrets

| Secret Name | 설명 | 예시 값 |
|-------------|------|---------|
| `AZURE_CREDENTIALS` | Service Principal JSON (전체) | `{"clientId":"...", ...}` |
| `AZURE_WEBAPP_NAME_PROD` | 프로덕션 App Service 이름 | `app-landing-page-pro` |
| `AZURE_WEBAPP_NAME_STAGING` | 스테이징 App Service 이름 | `app-landing-page-pro-staging` |
| `AZURE_FUNCTIONAPP_NAME_PROD` | 프로덕션 Function App 이름 | `func-landing-page-pro` |
| `AZURE_FUNCTIONAPP_NAME_STAGING` | 스테이징 Function App 이름 | `func-landing-page-pro-staging` |

### 2.2 환경 변수 Secrets

| Secret Name | 설명 |
|-------------|------|
| `AZURE_FUNCTIONS_URL_PROD` | 프로덕션 Functions URL |
| `AZURE_FUNCTIONS_URL_STAGING` | 스테이징 Functions URL |
| `ENTRA_CLIENT_ID_PROD` | 프로덕션 Entra 앱 Client ID |
| `ENTRA_CLIENT_ID_STAGING` | 스테이징 Entra 앱 Client ID |
| `ENTRA_TENANT_ID` | Entra Tenant ID (공통) |
| `ENTRA_AUTHORITY` | Entra Authority URL |

### 2.3 Secrets 추가 방법

1. GitHub Repository 이동
2. **Settings** > **Secrets and variables** > **Actions**
3. **New repository secret** 클릭
4. Name과 Secret 입력 후 **Add secret**

---

## 🌍 3단계: Azure 리소스 생성 (환경별)

### 3.1 스테이징 환경 리소스

```bash
# 스테이징 App Service
az webapp create \
  --name app-landing-page-pro-staging \
  --resource-group rg-landing-page-pro \
  --plan plan-landing-page-pro \
  --runtime "NODE:20-lts"

# 스테이징 Function App
az functionapp create \
  --name func-landing-page-pro-staging \
  --resource-group rg-landing-page-pro \
  --storage-account stlandingpagepro \
  --consumption-plan-location koreacentral \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --os-type Linux

# 스테이징 환경 변수 설정
az functionapp config appsettings set \
  --name func-landing-page-pro-staging \
  --resource-group rg-landing-page-pro \
  --settings \
    NODE_ENV=staging \
    AZURE_POSTGRES_HOST=psql-landing-page-pro.postgres.database.azure.com \
    AZURE_POSTGRES_DATABASE=landingpagepro_staging
```

### 3.2 CORS 설정

```bash
# 프로덕션 Function App CORS
az functionapp cors add \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --allowed-origins \
    "https://app-landing-page-pro.azurewebsites.net" \
    "https://your-custom-domain.com"

# 스테이징 Function App CORS
az functionapp cors add \
  --name func-landing-page-pro-staging \
  --resource-group rg-landing-page-pro \
  --allowed-origins \
    "https://app-landing-page-pro-staging.azurewebsites.net" \
    "http://localhost:5173"
```

---

## 📁 4단계: 환경별 설정 파일

### 4.1 로컬 환경 설정

```bash
# 템플릿 복사
cp env.example .env.local

# .env.local 편집
VITE_APP_ENV=development
VITE_AZURE_FUNCTIONS_URL=http://localhost:7071
VITE_ENTRA_CLIENT_ID=your-dev-client-id
VITE_ENTRA_TENANT_ID=your-tenant-id
VITE_ENTRA_AUTHORITY=https://your-tenant.ciamlogin.com
VITE_DEBUG=true
```

### 4.2 Vite 환경 설정

`vite.config.ts`에서 환경별 설정:

```typescript
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // 환경 변수 로드
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    define: {
      'import.meta.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV || mode),
    },
    // ... 기타 설정
  };
});
```

---

## 🚀 5단계: 배포 트리거

### 5.1 자동 배포 (Push 트리거)

| 브랜치 | 대상 환경 | 조건 |
|--------|----------|------|
| `main` | Production | 프론트엔드/Functions 변경 시 |
| `develop` | Staging | 프론트엔드/Functions 변경 시 |

### 5.2 수동 배포 (workflow_dispatch)

1. GitHub Repository > **Actions** 탭
2. 원하는 워크플로우 선택 (Deploy Frontend / Deploy Azure Functions)
3. **Run workflow** 클릭
4. 환경 선택 (staging / production)
5. **Run workflow** 클릭

### 5.3 배포 경로별 트리거

**프론트엔드 배포** (다음 경로 변경 시):
- `src/**`
- `public/**`
- `index.html`
- `package.json`
- `vite.config.ts`
- `tailwind.config.ts`

**Functions 배포** (다음 경로 변경 시):
- `azure-functions/**`

---

## 📊 6단계: 배포 모니터링

### 6.1 GitHub Actions 확인

1. Repository > **Actions** 탭
2. 워크플로우 실행 상태 확인
3. 로그 확인 (실패 시)

### 6.2 Azure Portal 확인

```bash
# Function App 상태 확인
az functionapp show \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --query state

# Function 목록 확인
az functionapp function list \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --output table

# 실시간 로그 스트리밍
func azure functionapp logstream func-landing-page-pro
```

### 6.3 배포 검증

```bash
# 프론트엔드 헬스 체크
curl -I https://app-landing-page-pro.azurewebsites.net

# Functions API 헬스 체크
curl https://func-landing-page-pro.azurewebsites.net/api/hello
```

---

## 🔄 7단계: 롤백 절차

### 7.1 GitHub Actions에서 이전 버전 배포

1. **Actions** 탭 > 성공한 이전 워크플로우 선택
2. **Re-run all jobs** 클릭

### 7.2 Azure CLI로 롤백

```bash
# App Service 이전 배포 목록 확인
az webapp deployment list-publishing-credentials \
  --name app-landing-page-pro \
  --resource-group rg-landing-page-pro

# 특정 배포 슬롯으로 교체 (슬롯 사용 시)
az webapp deployment slot swap \
  --name app-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --slot staging \
  --target-slot production
```

---

## 🛠️ 문제 해결

### 문제 1: "Azure login failed"

**원인**: AZURE_CREDENTIALS가 잘못됨
**해결**:
1. Service Principal JSON 형식 확인
2. 만료되었다면 새로 생성:
   ```bash
   az ad sp credential reset --id YOUR_CLIENT_ID
   ```

### 문제 2: "Permission denied"

**원인**: Service Principal 권한 부족
**해결**:
```bash
# 권한 확인
az role assignment list --assignee YOUR_CLIENT_ID

# 권한 추가
az role assignment create \
  --assignee YOUR_CLIENT_ID \
  --role Contributor \
  --scope /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/rg-landing-page-pro
```

### 문제 3: "Build failed"

**원인**: 의존성 또는 빌드 오류
**해결**:
1. GitHub Actions 로그에서 오류 확인
2. 로컬에서 `npm run build` 실행하여 테스트
3. `npm ci`로 clean install

### 문제 4: "Deployment slot not found"

**원인**: 스테이징 리소스 미생성
**해결**:
```bash
# 리소스 존재 확인
az webapp show --name app-landing-page-pro-staging --resource-group rg-landing-page-pro

# 없으면 생성 (3.1 참조)
```

---

## 📋 체크리스트

### 초기 설정
- [ ] Azure Service Principal 생성
- [ ] GitHub Secrets 설정 (AZURE_CREDENTIALS)
- [ ] GitHub Secrets 설정 (리소스 이름)
- [ ] GitHub Secrets 설정 (환경 변수)
- [ ] 스테이징 리소스 생성
- [ ] CORS 설정

### 배포 검증
- [ ] develop 브랜치 푸시 → 스테이징 배포 확인
- [ ] main 브랜치 푸시 → 프로덕션 배포 확인
- [ ] 수동 배포 테스트

### 모니터링
- [ ] GitHub Actions 알림 설정
- [ ] Azure Monitor 알림 설정 (선택)

---

## 📚 참고 자료

- [Azure/login Action](https://github.com/Azure/login)
- [Azure/webapps-deploy Action](https://github.com/Azure/webapps-deploy)
- [Azure/functions-action](https://github.com/Azure/functions-action)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Vite 환경 변수](https://vitejs.dev/guide/env-and-mode.html)

---

**작성일**: 2026-01-08
**버전**: 1.0.0
