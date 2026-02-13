# Phase 1: Azure 인프라 설정 가이드

## 📋 필요한 Azure 리소스

### 1. Resource Group
- **이름**: `rg-landing-page-pro`
- **지역**: Korea Central (한국 중부)
- **태그**:
  - Environment: Production
  - Project: LandingPagePro

### 2. Azure Database for PostgreSQL
- **이름**: `psql-landing-page-pro`
- **티어**: Flexible Server
- **컴퓨팅**: Burstable B1ms (1 vCore, 2GB RAM) - 개발/테스트용
  - 프로덕션: General Purpose D2ds_v4 (2 vCore, 8GB RAM)
- **스토리지**: 32GB (자동 확장 가능)
- **PostgreSQL 버전**: 15
- **백업**: 7일 보관
- **고가용성**: Zone-redundant (프로덕션용)

### 3. Azure AD B2C
- **테넌트 이름**: `landingpagepro`
- **도메인**: `landingpagepro.onmicrosoft.com`
- **사용자 플로우**:
  - 가입/로그인 (Sign up and sign in)
  - 프로필 편집
  - 비밀번호 재설정

### 4. Azure Functions
- **이름**: `func-landing-page-pro`
- **런타임**: Node.js 20
- **플랜**: Consumption (종량제)
  - 프로덕션: Premium EP1 (더 나은 성능)
- **스토리지**: 자동 생성

### 5. Azure Storage Account
- **이름**: `stlandingpagepro` (24자 제한, 소문자/숫자만)
- **종류**: StorageV2
- **복제**: LRS (로컬 중복)
  - 프로덕션: GRS (지역 중복)
- **용도**:
  - Functions 코드 저장
  - 사용자 업로드 파일
  - 생성된 문서 (PDF, PPTX)

### 6. Azure App Service (프론트엔드 호스팅)
- **이름**: `app-landing-page-pro`
- **플랜**: B1 (Basic, $13/월)
- **런타임**: Node.js 20
- **배포**: GitHub Actions

---

## 🛠️ Step-by-Step 설치 가이드

### 사전 준비

1. **Azure CLI 설치** (Windows)
   ```powershell
   winget install Microsoft.AzureCLI
   ```

2. **Azure 로그인**
   ```bash
   az login
   ```

3. **구독 확인**
   ```bash
   az account list --output table
   az account set --subscription "YOUR_SUBSCRIPTION_ID"
   ```

---

### Step 1: Resource Group 생성

```bash
az group create \
  --name rg-landing-page-pro \
  --location koreacentral \
  --tags Environment=Production Project=LandingPagePro
```

---

### Step 2: PostgreSQL 데이터베이스 생성

```bash
# PostgreSQL Flexible Server 생성
az postgres flexible-server create \
  --resource-group rg-landing-page-pro \
  --name psql-landing-page-pro \
  --location koreacentral \
  --admin-user pgadmin \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --public-access 0.0.0.0 \
  --backup-retention 7

# 방화벽 규칙 추가 (개발 중 로컬 접속용)
az postgres flexible-server firewall-rule create \
  --resource-group rg-landing-page-pro \
  --name psql-landing-page-pro \
  --rule-name AllowLocalClient \
  --start-ip-address YOUR_IP_ADDRESS \
  --end-ip-address YOUR_IP_ADDRESS

# Azure 서비스 접근 허용
az postgres flexible-server firewall-rule create \
  --resource-group rg-landing-page-pro \
  --name psql-landing-page-pro \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# 데이터베이스 생성
az postgres flexible-server db create \
  --resource-group rg-landing-page-pro \
  --server-name psql-landing-page-pro \
  --database-name landingpagepro
```

**연결 문자열 확인:**
```bash
az postgres flexible-server show-connection-string \
  --server-name psql-landing-page-pro \
  --database-name landingpagepro \
  --admin-user pgadmin
```

출력 예시:
```
postgresql://pgadmin:YourSecurePassword123!@psql-landing-page-pro.postgres.database.azure.com:5432/landingpagepro?sslmode=require
```

---

### Step 3: Storage Account 생성

```bash
az storage account create \
  --name stlandingpagepro \
  --resource-group rg-landing-page-pro \
  --location koreacentral \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Blob 컨테이너 생성
az storage container create \
  --name user-uploads \
  --account-name stlandingpagepro \
  --public-access blob

az storage container create \
  --name generated-documents \
  --account-name stlandingpagepro \
  --public-access blob

# 연결 문자열 확인
az storage account show-connection-string \
  --name stlandingpagepro \
  --resource-group rg-landing-page-pro \
  --output tsv
```

---

### Step 4: Azure Functions 생성

```bash
# Function App 생성
az functionapp create \
  --resource-group rg-landing-page-pro \
  --name func-landing-page-pro \
  --storage-account stlandingpagepro \
  --consumption-plan-location koreacentral \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --os-type Linux

# CORS 설정 (프론트엔드 도메인 허용)
az functionapp cors add \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --allowed-origins http://localhost:5173 https://app-landing-page-pro.azurewebsites.net
```

---

### Step 5: Azure AD B2C 테넌트 생성

**⚠️ 주의: Azure AD B2C는 Azure Portal에서 수동 생성 권장**

1. [Azure Portal](https://portal.azure.com) 접속
2. "리소스 만들기" → "Azure Active Directory B2C" 검색
3. "만들기" 클릭
4. "새 Azure AD B2C 테넌트 만들기" 선택
5. 설정:
   - 조직 이름: `Landing Page Pro`
   - 초기 도메인 이름: `landingpagepro`
   - 국가/지역: 대한민국
6. 생성 완료 후 디렉터리 전환

**사용자 플로우 생성:**
1. Azure AD B2C → "사용자 플로우" → "새 사용자 플로우"
2. "가입 및 로그인" 선택
3. 이름: `B2C_1_signupsignin`
4. ID 공급자: 이메일 가입
5. 사용자 특성: 표시 이름, 이메일 주소
6. 만들기

---

### Step 6: App Service 생성 (프론트엔드)

```bash
# App Service Plan 생성
az appservice plan create \
  --name plan-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --location koreacentral \
  --sku B1 \
  --is-linux

# Web App 생성
az webapp create \
  --name app-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --plan plan-landing-page-pro \
  --runtime "NODE:20-lts"

# 환경 변수 설정 (나중에 추가)
az webapp config appsettings set \
  --name app-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --settings NODE_ENV=production
```

---

## 📝 생성된 리소스 정보 정리

생성 완료 후 다음 정보를 `.env.azure` 파일에 저장하세요:

```env
# Azure PostgreSQL
AZURE_POSTGRES_HOST=psql-landing-page-pro.postgres.database.azure.com
AZURE_POSTGRES_DATABASE=landingpagepro
AZURE_POSTGRES_USER=pgadmin
AZURE_POSTGRES_PASSWORD=YourSecurePassword123!
AZURE_POSTGRES_PORT=5432
AZURE_POSTGRES_SSL=true

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=<from step 3>
AZURE_STORAGE_ACCOUNT_NAME=stlandingpagepro
AZURE_STORAGE_CONTAINER_UPLOADS=user-uploads
AZURE_STORAGE_CONTAINER_DOCS=generated-documents

# Azure Functions
AZURE_FUNCTIONS_URL=https://func-landing-page-pro.azurewebsites.net

# Azure AD B2C
AZURE_AD_B2C_TENANT_NAME=landingpagepro
AZURE_AD_B2C_TENANT_ID=<from Azure Portal>
AZURE_AD_B2C_CLIENT_ID=<from Azure Portal - create app>
AZURE_AD_B2C_CLIENT_SECRET=<from Azure Portal>
AZURE_AD_B2C_POLICY_SIGNIN=B2C_1_signupsignin

# AI Keys (기존 유지)
OPENAI_API_KEY=<existing>
ANTHROPIC_API_KEY=<existing>
GEMINI_API_KEY=<existing>
```

---

## ✅ 체크리스트

- [ ] Azure CLI 설치 및 로그인
- [ ] Resource Group 생성
- [ ] PostgreSQL Flexible Server 생성
- [ ] PostgreSQL 연결 테스트
- [ ] Storage Account 생성
- [ ] Blob 컨테이너 생성
- [ ] Azure Functions 생성
- [ ] Azure AD B2C 테넌트 생성
- [ ] B2C 사용자 플로우 설정
- [ ] App Service 생성
- [ ] `.env.azure` 파일 작성
- [ ] 모든 연결 문자열 확인

---

## 💰 예상 비용 (월)

| 리소스 | 티어 | 예상 비용 |
|--------|------|-----------|
| PostgreSQL Flexible B1ms | Burstable | ~$15 |
| Storage Account | Standard LRS | ~$2 |
| Functions Consumption | 종량제 | ~$5 |
| App Service B1 | Basic | ~$13 |
| Azure AD B2C | 50K MAU 무료 | $0 |
| **합계** | | **~$35/월** |

**MS 파트너 크레딧 활용 시: $0-10/월**

---

## 🔍 다음 단계

Phase 1 완료 후:
1. PostgreSQL 연결 테스트
2. Supabase 데이터 백업
3. Phase 2: 데이터 마이그레이션 진행

---

## 🆘 문제 해결

### PostgreSQL 연결 안 됨
```bash
# 방화벽 규칙 확인
az postgres flexible-server firewall-rule list \
  --resource-group rg-landing-page-pro \
  --name psql-landing-page-pro

# 내 IP 확인
curl ifconfig.me
```

### Storage Account 이름 중복
- 전역적으로 고유해야 함
- 회사명 또는 프로젝트 코드 추가 (예: `stlppro2025`)

### Azure AD B2C 생성 실패
- 구독당 하나의 무료 B2C 테넌트 제한
- 기존 B2C 확인: `az ad b2c tenant list`
