# Azure AD B2C 설정 가이드

**목적**: 일반 사용자들이 이메일/비밀번호로 회원가입 및 로그인할 수 있도록 Azure AD B2C 구성

## 1. Azure AD B2C 테넌트 생성

### 1.1. Azure Portal에서 B2C 테넌트 생성

1. [Azure Portal](https://portal.azure.com) 접속
2. 검색창에 "Azure AD B2C" 입력
3. **"Create a tenant"** 클릭
4. **"Azure Active Directory B2C"** 선택
5. 테넌트 정보 입력:
   - **Organization name**: `ParandurumeLandingPage` (또는 원하는 이름)
   - **Initial domain name**: `parandurumelandingpage` (고유해야 함)
   - **Country/Region**: `Korea`
   - **Subscription**: 사용 중인 구독 선택
   - **Resource group**: 기존 리소스 그룹 선택 또는 새로 생성
6. **"Review + create"** → **"Create"** 클릭
7. 생성 완료 후 **"Switch to new tenant"** 클릭

### 1.2. B2C 디렉터리 확인

생성된 테넌트 정보 확인:
- **Tenant ID**: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX` (나중에 사용)
- **Domain**: `parandurumelandingpage.onmicrosoft.com`

## 2. 앱 등록 (App Registration)

### 2.1. 새 애플리케이션 등록

1. B2C 테넌트에서 좌측 메뉴 **"App registrations"** 클릭
2. **"+ New registration"** 클릭
3. 애플리케이션 정보 입력:
   - **Name**: `Landing Page Pro - Frontend`
   - **Supported account types**: `Accounts in any identity provider or organizational directory (for authenticating users with user flows)`
   - **Redirect URI**:
     - Platform: `Single-page application (SPA)`
     - URI: `http://localhost:5173`
4. **"Register"** 클릭

### 2.2. 앱 설정 구성

**Application (client) ID** 복사 → 환경 변수에 사용

#### 2.2.1. Redirect URIs 추가

1. **"Authentication"** 메뉴 클릭
2. **"+ Add a platform"** → **"Single-page application"** 선택
3. Redirect URIs 추가:
   ```
   http://localhost:5173
   http://localhost:5173/auth
   https://your-production-domain.com
   https://your-production-domain.com/auth
   ```
4. **"Implicit grant and hybrid flows"** 섹션에서:
   - ✅ **Access tokens** 체크
   - ✅ **ID tokens** 체크
5. **"Save"** 클릭

#### 2.2.2. API 권한 설정

1. **"API permissions"** 메뉴 클릭
2. 기본적으로 `Microsoft Graph` → `User.Read` 권한이 있음 (유지)
3. 필요 시 추가 권한 부여

#### 2.2.3. Expose an API (API 노출)

1. **"Expose an API"** 메뉴 클릭
2. **"+ Add a scope"** 클릭
3. Application ID URI 설정:
   - **Application ID URI**: `api://{CLIENT_ID}` (자동 생성)
   - 또는 커스텀: `https://parandurumelandingpage.onmicrosoft.com/api`
4. Scope 추가:
   - **Scope name**: `access_as_user`
   - **Admin consent display name**: `Access the API as a user`
   - **Admin consent description**: `Allows the app to access the API as the signed-in user`
   - **State**: `Enabled`
5. **"Add scope"** 클릭

## 3. User Flows (사용자 플로우) 생성

User Flows는 회원가입, 로그인, 프로필 편집, 비밀번호 재설정 등의 사용자 경험을 정의합니다.

### 3.1. Sign up and sign in (회원가입 및 로그인)

1. **"User flows"** 메뉴 클릭
2. **"+ New user flow"** 클릭
3. **"Sign up and sign in"** 선택 → **"Recommended"** 버전 선택
4. User flow 설정:
   - **Name**: `signupsignin1` (자동으로 `B2C_1_signupsignin1`이 됨)
   - **Identity providers**:
     - ✅ **Email signup** (이메일 회원가입)
     - ✅ **Email signin** (이메일 로그인)
   - **Multifactor authentication**: `Off` (또는 필요 시 `On`)
   - **User attributes and token claims** (수집할 정보 선택):
     - ✅ **Display Name** (수집 + 반환)
     - ✅ **Email Address** (수집 + 반환)
     - ✅ **Given Name** (선택 사항)
     - ✅ **Surname** (선택 사항)
5. **"Create"** 클릭

### 3.2. Profile editing (프로필 편집)

1. **"+ New user flow"** 클릭
2. **"Profile editing"** 선택 → **"Recommended"** 버전
3. User flow 설정:
   - **Name**: `profileediting1`
   - **Identity providers**: ✅ **Email signin**
   - **User attributes**:
     - ✅ **Display Name**
     - ✅ **Given Name**
     - ✅ **Surname**
4. **"Create"** 클릭

### 3.3. Password reset (비밀번호 재설정)

1. **"+ New user flow"** 클릭
2. **"Password reset"** 선택 → **"Recommended"** 버전
3. User flow 설정:
   - **Name**: `passwordreset1`
   - **Identity providers**: ✅ **Reset password using email address**
4. **"Create"** 클릭

## 4. 소셜 로그인 설정 (선택 사항)

### 4.1. Google Identity Provider 추가

1. **"Identity providers"** 메뉴 클릭
2. **"+ New OpenID Connect provider"** 또는 **"Google"** 선택
3. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성:
   - [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 접속
   - **"Create Credentials"** → **"OAuth client ID"**
   - Application type: **"Web application"**
   - Authorized redirect URIs:
     ```
     https://parandurumelandingpage.b2clogin.com/parandurumelandingpage.onmicrosoft.com/oauth2/authresp
     ```
4. Azure B2C에 Google Client ID와 Secret 입력
5. User flow에 Google provider 추가

### 4.2. Microsoft Account Provider 추가

1. **"Identity providers"** 메뉴 클릭
2. **"Microsoft Account"** 선택
3. Azure Portal에서 앱 등록 (개인 Microsoft 계정용)
4. Client ID와 Secret을 B2C에 입력
5. User flow에 Microsoft provider 추가

## 5. 브랜딩 커스터마이징 (선택 사항)

1. **"Company branding"** 메뉴 클릭
2. 로고, 배경, 색상 등 커스터마이징
3. User flow의 **"Page layouts"** 에서 각 페이지 커스터마이징

## 6. 환경 변수 설정

### Frontend (.env)

Azure Portal에서 확인한 정보를 입력:

```env
# Azure AD B2C Configuration
VITE_ENTRA_TENANT_NAME="parandurumelandingpage"
VITE_ENTRA_CLIENT_ID="YOUR_B2C_APPLICATION_CLIENT_ID"
VITE_ENTRA_AUTHORITY="https://parandurumelandingpage.b2clogin.com/parandurumelandingpage.onmicrosoft.com/B2C_1_signupsignin1"
VITE_ENTRA_REDIRECT_URI="http://localhost:5173"

# B2C Policies (User Flows)
VITE_B2C_SIGNUP_SIGNIN_POLICY="B2C_1_signupsignin1"
VITE_B2C_PROFILE_EDIT_POLICY="B2C_1_profileediting1"
VITE_B2C_PASSWORD_RESET_POLICY="B2C_1_passwordreset1"

# Known Authorities
VITE_B2C_KNOWN_AUTHORITIES="parandurumelandingpage.b2clogin.com"

# Azure Functions
VITE_AZURE_FUNCTIONS_URL="https://func-landing-page-pro.azurewebsites.net"
```

### Backend (Azure Functions Application Settings)

```env
ENTRA_TENANT_NAME="parandurumelandingpage"
ENTRA_CLIENT_ID="YOUR_B2C_APPLICATION_CLIENT_ID"
ENTRA_TENANT_ID="YOUR_B2C_TENANT_ID"

# B2C 발급자 URL
ENTRA_ISSUER_URL="https://parandurumelandingpage.b2clogin.com/{tenantId}/v2.0"
```

## 7. 설정 확인 정보

설정 완료 후 다음 정보를 확인하고 기록하세요:

```
✅ B2C Tenant Name: parandurumelandingpage
✅ B2C Domain: parandurumelandingpage.onmicrosoft.com
✅ Tenant ID: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
✅ Application (Client) ID: YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY
✅ Sign up/Sign in Policy: B2C_1_signupsignin1
✅ Profile Edit Policy: B2C_1_profileediting1
✅ Password Reset Policy: B2C_1_passwordreset1
✅ API Scope: api://{CLIENT_ID}/access_as_user
```

## 8. 테스트

### 8.1. User Flow 테스트

1. **"User flows"** → **"B2C_1_signupsignin1"** 클릭
2. **"Run user flow"** 클릭
3. 브라우저에서 회원가입/로그인 테스트
4. 성공 시 JWT 토큰 확인

### 8.2. Frontend 통합 테스트

코드 수정 후:
1. `npm run dev` 실행
2. `http://localhost:5173/auth` 접속
3. 회원가입 → 로그인 → 프로필 편집 → 비밀번호 재설정 테스트

## 9. 주의사항

### 비용
- **무료 할당량**: 월 50,000 활성 사용자
- **초과 시**: 사용자당 약 $0.00325 (MAU 기준)
- **스토리지**: 사용자 데이터 저장에 대한 소량의 비용

### 보안
- Redirect URI를 정확히 설정하세요 (프로덕션 도메인 추가)
- Client Secret은 백엔드에서만 사용 (프론트엔드 노출 금지)
- HTTPS 사용 (프로덕션 환경)

### 제한사항
- B2C 테넌트는 일반 Entra ID 테넌트와 별도로 관리됨
- 기업용 Entra ID 계정과 B2C 계정은 다름

## 10. 다음 단계

1. ✅ Azure Portal에서 B2C 테넌트 생성
2. ✅ 앱 등록 및 User Flows 설정
3. ⏭️ Frontend 코드 B2C로 마이그레이션
4. ⏭️ Backend 인증 미들웨어 B2C 지원 추가
5. ⏭️ 테스트 및 배포

---

**작성일**: 2025-12-30
**작성자**: Claude Code
