# Azure API Management 가이드

## 📋 개요

Azure API Management(APIM)는 API 게이트웨이로서 다음 기능을 제공합니다:

- **보안**: API 키, OAuth 2.0, JWT 검증
- **Rate Limiting**: 과도한 요청 방지
- **캐싱**: 응답 캐싱으로 성능 향상
- **모니터링**: 요청/응답 로깅, 분석
- **버전 관리**: API 버전 관리
- **개발자 포털**: API 문서화

## 🏗️ 아키텍처

```
┌─────────────────┐      ┌──────────────────┐      ┌───────────────────┐
│                 │      │                  │      │                   │
│   Frontend      │ ──▶  │  API Management  │ ──▶  │  Azure Functions  │
│   (React SPA)   │      │  (Gateway)       │      │  (Backend API)    │
│                 │      │                  │      │                   │
└─────────────────┘      └──────────────────┘      └───────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │                      │
                    │  Application         │
                    │  Insights            │
                    │                      │
                    └──────────────────────┘
```

## 🚀 설정 방법

### 1. API Management 생성 확인

```powershell
# 상태 확인
az apim show --name apim-landing-page-pro --resource-group rg-landing-page-pro --query "provisioningState" --output tsv
```

예상 결과: `Succeeded`

### 2. 자동 설정 스크립트 실행

```powershell
cd azure-migration
.\setup-apim.ps1
```

### 3. 수동 설정 (선택사항)

#### 3.1 Named Value 생성 (Function Key)

```powershell
# Function Key 가져오기
$functionKey = az functionapp keys list --name func-landing-page-pro --resource-group rg-landing-page-pro --query "functionKeys.default" --output tsv

# Named Value 생성
az apim nv create `
    --resource-group rg-landing-page-pro `
    --service-name apim-landing-page-pro `
    --named-value-id "function-key" `
    --display-name "Azure Functions Key" `
    --value $functionKey `
    --secret true
```

#### 3.2 API 생성

```powershell
az apim api create `
    --resource-group rg-landing-page-pro `
    --service-name apim-landing-page-pro `
    --api-id landing-page-pro-api `
    --display-name "Landing Page Pro API" `
    --path api `
    --protocols https `
    --service-url "https://func-landing-page-pro.azurewebsites.net/api" `
    --subscription-required false
```

## 📝 API 정책

### Rate Limiting

```xml
<rate-limit calls="100" renewal-period="60" />
```

- 분당 100회 요청 제한
- 인증된 사용자별 또는 IP별 적용 가능

### CORS 설정

```xml
<cors allow-credentials="true">
    <allowed-origins>
        <origin>https://app-landing-page-pro.azurewebsites.net</origin>
        <origin>https://app-landing-page-pro-staging.azurewebsites.net</origin>
        <origin>http://localhost:5173</origin>
    </allowed-origins>
    <allowed-methods>
        <method>GET</method>
        <method>POST</method>
        <method>PUT</method>
        <method>DELETE</method>
        <method>OPTIONS</method>
    </allowed-methods>
    <allowed-headers>
        <header>*</header>
    </allowed-headers>
</cors>
```

### JWT 검증 (Entra ID)

```xml
<validate-jwt header-name="Authorization" failed-validation-httpcode="401">
    <openid-config url="https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration" />
    <audiences>
        <audience>{client-id}</audience>
    </audiences>
</validate-jwt>
```

### Function Key 자동 추가

```xml
<set-header name="x-functions-key" exists-action="override">
    <value>{{function-key}}</value>
</set-header>
```

## 🔧 프론트엔드 설정 변경

### 환경 변수 업데이트

API Management를 사용하려면 프론트엔드의 API URL을 변경해야 합니다:

```bash
# Before (직접 Functions 호출)
VITE_AZURE_FUNCTIONS_URL=https://func-landing-page-pro.azurewebsites.net

# After (API Management 경유)
VITE_AZURE_FUNCTIONS_URL=https://apim-landing-page-pro.azure-api.net/api
```

### GitHub Secrets 추가

```
AZURE_FUNCTIONS_URL_PROD=https://apim-landing-page-pro.azure-api.net/api
AZURE_FUNCTIONS_URL_STAGING=https://apim-landing-page-pro.azure-api.net/api
```

## 📊 모니터링

### Application Insights 연동

API Management는 자동으로 Application Insights와 연동됩니다.

```powershell
# Application Insights 연결
az apim update `
    --name apim-landing-page-pro `
    --resource-group rg-landing-page-pro `
    --set properties.customProperties.Microsoft.WindowsAzure.ApiManagement.Gateway.Protocols.Server.Http2=True
```

### 로그 확인

1. Azure Portal > API Management > Analytics
2. 요청/응답 통계 확인
3. 오류 분석

## 🔐 보안 고려사항

### 1. Subscription Key (선택)

프로덕션에서는 Subscription Key를 활성화할 수 있습니다:

```powershell
az apim api update `
    --resource-group rg-landing-page-pro `
    --service-name apim-landing-page-pro `
    --api-id landing-page-pro-api `
    --subscription-required true
```

### 2. IP 필터링

특정 IP만 허용:

```xml
<ip-filter action="allow">
    <address-range from="10.0.0.0" to="10.0.0.255" />
</ip-filter>
```

### 3. 요청 크기 제한

```xml
<set-body-limit size-in-bytes="1048576" /> <!-- 1MB -->
```

## 💰 비용

### Consumption Tier (현재 사용 중)

- **기본 요금**: 무료
- **API 호출**: 첫 100만 호출 무료, 이후 100만 호출당 약 $3.50
- **데이터 전송**: 표준 데이터 전송 요금

### Developer Tier (개발/테스트용)

- **월 고정 요금**: 약 $50/월
- **개발자 포털 포함**

## 🧪 테스트

### cURL 테스트

```bash
# Hello API
curl https://apim-landing-page-pro.azure-api.net/api/hello

# Health Check
curl https://apim-landing-page-pro.azure-api.net/api/health
```

### PowerShell 테스트

```powershell
# Hello API
Invoke-RestMethod -Uri "https://apim-landing-page-pro.azure-api.net/api/hello" -Method GET

# Health Check
Invoke-RestMethod -Uri "https://apim-landing-page-pro.azure-api.net/api/health" -Method GET
```

## 📚 참고 자료

- [Azure API Management 문서](https://learn.microsoft.com/azure/api-management/)
- [API Management 정책 참조](https://learn.microsoft.com/azure/api-management/api-management-policies)
- [Consumption 티어 가격](https://azure.microsoft.com/pricing/details/api-management/)
