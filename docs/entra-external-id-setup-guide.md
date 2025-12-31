# Microsoft Entra External ID 설정 가이드

**목적**: 일반 사용자들이 이메일/비밀번호로 회원가입 및 로그인할 수 있도록 Microsoft Entra External ID 구성

**참고**: Azure AD B2C는 2025년 5월 1일부로 신규 판매 중단되었으며, Microsoft Entra External ID가 후속 서비스입니다.

## 1. Microsoft Entra External ID 개요

### 주요 특징:
- ✅ 일반 사용자용 이메일/비밀번호 인증
- ✅ 소셜 로그인 지원 (Google, Facebook, Apple 등)
- ✅ 월 50,000 활성 사용자 무료
- ✅ B2C보다 향상된 보안 및 관리 기능
- ✅ 기존 MSAL 코드와 호환

### B2C와의 차이점:
- User Flows 대신 **Sign-up and sign-in flows** 사용
- 더 직관적인 관리 UI
- 향상된 커스터마이징 옵션

## 2. External ID 테넌트 생성

### 2.1. Azure Portal 접속

1. [Azure Portal](https://portal.azure.com) 로그인
2. 검색창에 **"Microsoft Entra ID"** 입력
3. 좌측 메뉴에서 **"External Identities"** 클릭

### 2.2. External ID 활성화

1. **"Get started"** 또는 **"Set up"** 클릭
2. **Tenant type** 선택:
   - **External (customers)** 선택 (일반 고객용)
   - ~~External (partners/suppliers)~~ (B2B용, 선택 안 함)
3. 테넌트 정보 입력:
   - **Organization name**: `ParandurumeLandingPage`
   - **Initial domain**: `parandurume` (고유해야 함)
   - **Country/Region**: `Korea`
   - **Subscription**: 사용 중인 구독
   - **Resource group**: 기존 또는 새로 생성
4. **"Review + create"** → **"Create"**

### 2.3. 생성된 정보 확인

생성 후 다음 정보를 기록:
- **Tenant name**: `parandurume`
- **Domain**: `parandurume.ciamlogin.com` (External ID 도메인)
- **Tenant ID**: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`

## 3. 애플리케이션 등록

### 3.1. 앱 등록

1. External ID 테넌트에서 **"App registrations"** 클릭
2. **"+ New registration"** 클릭
3. 애플리케이션 정보:
   - **Name**: `Landing Page Pro - Frontend`
   - **Supported account types**:
     - **Accounts in this organizational directory only (Single tenant)**
   - **Redirect URI**:
     - Platform: **Single-page application (SPA)**
     - URI: `http://localhost:5173`
4. **"Register"** 클릭

### 3.2. Application (Client) ID 복사

등록 완료 후:
- **Application (client) ID** 복사 (환경 변수에 사용)
- **Directory (tenant) ID** 복사

### 3.3. 인증 설정

1. **"Authentication"** 메뉴 클릭
2. **Redirect URIs** 추가:
   ```
   http://localhost:5173
   http://localhost:5173/auth
   https://your-production-domain.com
   https://your-production-domain.com/auth
   ```
3. **Implicit grant and hybrid flows**:
   - ✅ **Access tokens (used for implicit flows)**
   - ✅ **ID tokens (used for implicit and hybrid flows)**
4. **"Save"** 클릭

### 3.4. API 권한 설정

1. **"API permissions"** 클릭
2. **"+ Add a permission"** 클릭
3. **"Microsoft Graph"** → **"Delegated permissions"** 선택:
   - ✅ `openid`
   - ✅ `profile`
   - ✅ `email`
   - ✅ `offline_access`
4. **"Add permissions"** 클릭
5. **"Grant admin consent"** 클릭 (관리자 동의)

### 3.5. Token Configuration

1. **"Token configuration"** 메뉴 클릭
2. **"+ Add optional claim"** 클릭
3. **Token type**: `ID` 선택
4. 추가할 claims:
   - ✅ `email`
   - ✅ `family_name`
   - ✅ `given_name`
5. **"Add"** 클릭

## 4. 사용자 플로우 구성

### 4.1. Sign-up and Sign-in Flow

1. **"User flows"** 메뉴 클릭
2. **"+ New user flow"** 클릭
3. **"Sign up and sign in"** 선택
4. User flow 설정:
   - **Name**: `signupsignin` (자동으로 `B2C_1_signupsignin`이 될 수 있음)
   - **Local accounts**:
     - ✅ **Email**
   - **Social identity providers**: (선택사항)
     - 나중에 추가 가능
   - **User attributes** (수집할 정보):
     - ✅ **Email Address** (필수)
     - ✅ **Display Name** (선택)
     - ✅ **Given Name** (선택)
     - ✅ **Surname** (선택)
   - **Application claims** (토큰에 포함할 정보):
     - ✅ **Email Addresses**
     - ✅ **Display Name**
     - ✅ **Given Name**
     - ✅ **Surname**
     - ✅ **User's Object ID**
5. **"Create"** 클릭

### 4.2. Password Reset Flow (선택사항)

1. **"+ New user flow"** 클릭
2. **"Password reset"** 선택
3. User flow 설정:
   - **Name**: `passwordreset`
   - **Identity providers**: ✅ **Email**
4. **"Create"** 클릭

### 4.3. Profile Editing Flow (선택사항)

1. **"+ New user flow"** 클릭
2. **"Profile editing"** 선택
3. User flow 설정:
   - **Name**: `profileediting`
   - **Identity providers**: ✅ **Email**
   - **User attributes**: Display Name, Given Name, Surname
4. **"Create"** 클릭

## 5. 소셜 로그인 설정 (선택사항)

### 5.1. Google Identity Provider

1. **Google Cloud Console** 설정:
   - [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 접속
   - OAuth 2.0 Client ID 생성
   - Authorized redirect URIs:
     ```
     https://parandurume.ciamlogin.com/parandurume.onmicrosoft.com/oauth2/authresp
     ```

2. **Azure Portal** 설정:
   - **"Identity providers"** → **"+ New OpenID Connect provider"**
   - Google Client ID와 Secret 입력
   - User flow에 Google 추가

### 5.2. Facebook Identity Provider

1. **Facebook Developers** 설정:
   - [Facebook Developers](https://developers.facebook.com/) 접속
   - 앱 생성 및 Facebook Login 추가
   - Valid OAuth Redirect URIs:
     ```
     https://parandurume.ciamlogin.com/parandurume.onmicrosoft.com/oauth2/authresp
     ```

2. **Azure Portal** 설정:
   - **"Identity providers"** → **"Facebook"**
   - App ID와 App Secret 입력

## 6. 환경 변수 설정

### Frontend (.env)

```env
# Microsoft Entra External ID Configuration
VITE_ENTRA_TENANT_NAME="parandurume"
VITE_ENTRA_CLIENT_ID="YOUR_CLIENT_ID_HERE"
VITE_ENTRA_REDIRECT_URI="http://localhost:5173"

# External ID Authority (CIAM)
VITE_ENTRA_AUTHORITY="https://parandurume.ciamlogin.com/parandurume.onmicrosoft.com"

# User Flow Names (External ID uses simpler names)
VITE_EXTERNAL_ID_SIGNUP_SIGNIN="signupsignin"
VITE_EXTERNAL_ID_PASSWORD_RESET="passwordreset"
VITE_EXTERNAL_ID_PROFILE_EDIT="profileediting"

# Azure Functions
VITE_AZURE_FUNCTIONS_URL="https://func-landing-page-pro.azurewebsites.net"
```

### Backend (Azure Functions Application Settings)

```env
ENTRA_TENANT_NAME="parandurume"
ENTRA_TENANT_ID="YOUR_TENANT_ID"
ENTRA_CLIENT_ID="YOUR_CLIENT_ID"

# External ID Issuer
ENTRA_ISSUER_URL="https://parandurume.ciamlogin.com/{tenantId}/v2.0"
```

## 7. 코드 업데이트 필요 사항

### 7.1. authConfig.ts

B2C 설정을 External ID로 변경:
- `b2clogin.com` → `ciamlogin.com`
- User Flow 이름 업데이트

### 7.2. Backend auth.ts

JWKS URI 업데이트:
```typescript
const jwksUri = `https://parandurume.ciamlogin.com/parandurume.onmicrosoft.com/discovery/v2.0/keys`
```

## 8. 테스트

### 8.1. User Flow 테스트

1. **"User flows"** → 생성한 flow 선택
2. **"Run user flow"** 클릭
3. 브라우저에서 회원가입/로그인 테스트
4. JWT 토큰 확인

### 8.2. Frontend 테스트

```bash
npm run dev
# http://localhost:5173/auth 접속
# 회원가입 → 로그인 테스트
```

## 9. B2C와의 주요 차이점

| 기능 | Azure AD B2C | Entra External ID |
|------|--------------|-------------------|
| 도메인 | `*.b2clogin.com` | `*.ciamlogin.com` |
| User Flows | `B2C_1_*` prefix | 간단한 이름 |
| 관리 UI | 복잡함 | 단순하고 직관적 |
| 가격 | MAU 기반 | 동일 (50K 무료) |
| 신규 생성 | ❌ 불가능 (2025.05.01+) | ✅ 가능 |

## 10. 비용

### 무료 할당량:
- 월 50,000 활성 사용자 (MAU)
- 무제한 인증 요청

### 초과 시:
- 50,000+ MAU: 사용자당 ~$0.00325/월

### 예상 비용:
- 10,000 users: **무료**
- 100,000 users: ~$162/월
- 500,000 users: ~$1,462/월

## 11. 문제 해결

### Q: "ciamlogin.com" 도메인을 찾을 수 없어요
**A**: External ID 테넌트가 제대로 생성되었는지 확인하세요. 테넌트 타입이 "External (customers)"인지 확인.

### Q: 로그인 화면이 영어로 나와요
**A**: User flow → Language customization에서 한국어 추가

### Q: 토큰 검증 실패
**A**: Backend의 JWKS URI와 issuer URL이 `ciamlogin.com`을 사용하는지 확인

## 12. 추가 리소스

- [Microsoft Entra External ID 공식 문서](https://learn.microsoft.com/entra/external-id/)
- [B2C에서 External ID 마이그레이션 가이드](https://learn.microsoft.com/entra/external-id/customers/how-to-migrate-customers-from-azure-ad-b2c)
- [External ID 가격 정보](https://azure.microsoft.com/pricing/details/entra-external-id/)

---

**작성일**: 2025-12-30
**작성자**: Claude Code
**업데이트**: B2C 중단에 따른 External ID 가이드
