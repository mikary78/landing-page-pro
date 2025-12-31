# Microsoft Entra External ID 상세 설정 가이드

**날짜**: 2025-12-30
**목적**: External ID 완전 설정 - 이메일 인증, 비밀번호 재설정, 프로필 편집, 소셜 로그인

## 목차

1. [기본 설정 (필수)](#1-기본-설정-필수)
2. [이메일 인증 활성화](#2-이메일-인증-활성화)
3. [Self-Service Password Reset (SSPR)](#3-self-service-password-reset-sspr)
4. [프로필 편집 설정](#4-프로필-편집-설정)
5. [소셜 로그인 설정](#5-소셜-로그인-설정)
6. [환경 변수 설정](#6-환경-변수-설정)

---

## 1. 기본 설정 (필수)

### 1.1. App Registration에서 API Permissions 추가

1. Azure Portal → **App registrations** → **"Landing Page Pro - Frontend"** 클릭
2. 좌측 메뉴: **"API permissions"**
3. **"+ Add a permission"** 클릭
4. **"Microsoft Graph"** 선택
5. **"Delegated permissions"** 선택
6. 다음 permissions 추가:
   - ✅ `openid`
   - ✅ `profile`
   - ✅ `email`
   - ✅ `offline_access`
   - ✅ `User.Read` (사용자 프로필 읽기)
7. **"Add permissions"** 클릭
8. **"Grant admin consent for [Your Tenant]"** 버튼 클릭 ⭐ 중요!

### 1.2. Token Configuration

1. 좌측 메뉴: **"Token configuration"**
2. **"+ Add optional claim"** 클릭
3. **Token type**: `ID` 선택
4. Claims 선택:
   - ✅ `email`
   - ✅ `given_name`
   - ✅ `family_name`
5. **"Add"** 클릭
6. Microsoft Graph permissions 요청 팝업 → **"Yes"** 클릭

### 1.3. Authentication 설정 확인

1. 좌측 메뉴: **"Authentication"**
2. **Platform configurations** 확인:
   - **Single-page application**에 다음 URI 있는지 확인:
     - `http://localhost:5173`
     - `http://localhost:5173/auth`
3. **Implicit grant and hybrid flows**:
   - ✅ Access tokens
   - ✅ ID tokens
4. **Allow public client flows**: `No` (SPA는 필요 없음)

---

## 2. 이메일 인증 활성화

External ID는 기본적으로 이메일 인증을 지원합니다.

### 2.1. Email OTP 설정

1. External ID 테넌트로 전환
2. 좌측 메뉴: **"Security"** → **"Authentication methods"**
3. **"Email OTP"** 클릭
4. **Enable**: `Yes`로 설정
5. **Target**: `All users` 또는 특정 그룹 선택
6. **"Save"** 클릭

### 2.2. Sign-up Experience 설정

1. 좌측 메뉴: **"External Identities"** 펼치기
2. **"All identity providers"** 클릭
3. **"Email one-time passcode"**가 활성화되어 있는지 확인
4. 없다면 **"+ New"** → **"Email one-time passcode"** 추가

---

## 3. Self-Service Password Reset (SSPR)

External ID에서 비밀번호 재설정은 Azure AD의 SSPR 기능을 사용합니다.

### 3.1. SSPR 활성화

1. External ID 테넌트에서
2. 좌측 메뉴: **"Users"** → **"Password reset"**
3. **Self service password reset enabled**:
   - `Selected` 선택 → 그룹 선택
   - 또는 `All` 선택 (모든 사용자)
4. **"Save"** 클릭

### 3.2. Authentication Methods 설정

1. 같은 페이지에서 **"Authentication methods"** 탭 클릭
2. **Number of methods required to reset**: `1` 선택
3. **Methods available to users**:
   - ✅ Email
   - ✅ Mobile phone (선택사항)
4. **"Save"** 클릭

### 3.3. Registration 설정

1. **"Registration"** 탭 클릭
2. **Require users to register when signing in**: `Yes`
3. **Number of days before users are asked to reconfirm**: `180`
4. **"Save"** 클릭

### 3.4. 코드에서 비밀번호 재설정 링크 제공

Frontend에서 비밀번호 재설정 링크:

```typescript
// src/pages/Auth.tsx 또는 로그인 페이지
const passwordResetUrl = `https://${tenantName}.ciamlogin.com/${tenantName}.onmicrosoft.com/oauth2/v2.0/authorize?p=B2C_1_PasswordReset&client_id=${clientId}&nonce=defaultNonce&redirect_uri=${redirectUri}&scope=openid&response_type=id_token&prompt=login`;

<a href={passwordResetUrl} target="_blank">
  비밀번호를 잊으셨나요?
</a>
```

**또는 더 간단하게**:

External ID는 로그인 화면에서 자동으로 "Forgot password?" 링크를 제공합니다.

---

## 4. 프로필 편집 설정

External ID에서 프로필 편집은 Microsoft Graph API를 통해 구현합니다.

### 4.1. API Permissions 추가 (프로필 편집용)

1. **App registrations** → **"Landing Page Pro - Frontend"**
2. **"API permissions"** 클릭
3. **"+ Add a permission"** → **"Microsoft Graph"** → **"Delegated"**
4. 추가 permission:
   - ✅ `User.ReadWrite` (자신의 프로필 수정)
5. **"Add permissions"** 클릭
6. **"Grant admin consent"** 클릭

### 4.2. 코드에서 프로필 편집 구현

**useAzureAuth.tsx 수정**:

```typescript
import { graphScopes } from '@/config/authConfig';

// 프로필 편집 함수
const editProfile = useCallback(async () => {
  try {
    // Microsoft Graph API 토큰 요청
    const response = await instance.acquireTokenPopup({
      scopes: graphScopes.userReadWrite,
      account: accounts[0],
    });

    const accessToken = response.accessToken;

    // Microsoft Graph API로 프로필 업데이트
    const graphEndpoint = 'https://graph.microsoft.com/v1.0/me';

    const profileData = {
      displayName: '새로운 이름',
      givenName: '성',
      surname: '이름',
    };

    await fetch(graphEndpoint, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    console.log('[Auth] Profile updated successfully');
  } catch (error) {
    console.error('[Auth] Profile edit error:', error);
    throw error;
  }
}, [instance, accounts]);
```

---

## 5. 소셜 로그인 설정

External ID는 Google, Facebook, Microsoft, Apple 등 소셜 로그인을 지원합니다.

### 5.1. Google 로그인 설정

#### Step 1: Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services** → **Credentials** 클릭
4. **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client ID"** 선택
5. Application type: **Web application**
6. Name: `Landing Page Pro`
7. **Authorized redirect URIs** 추가:
   ```
   https://<tenant-name>.ciamlogin.com/<tenant-name>.onmicrosoft.com/oauth2/authresp
   ```
   예시:
   ```
   https://parandurumelandingpage.ciamlogin.com/parandurumelandingpage.onmicrosoft.com/oauth2/authresp
   ```
8. **"CREATE"** 클릭
9. **Client ID**와 **Client Secret** 복사 (나중에 사용)

#### Step 2: Azure Portal에서 Google 추가

1. External ID 테넌트로 전환
2. 좌측 메뉴: **"External Identities"** → **"All identity providers"**
3. **"+ New Google"** 클릭 (또는 **"+ New OpenID Connect provider"**)
4. **Display name**: `Google`
5. **Client ID**: Google에서 복사한 Client ID 붙여넣기
6. **Client Secret**: Google에서 복사한 Client Secret 붙여넣기
7. **"Save"** 클릭

#### Step 3: App Registration에 Google 연결

1. **App registrations** → **"Landing Page Pro - Frontend"**
2. 좌측 메뉴: **"Authentication"**
3. **Identity providers** 섹션에서 Google이 자동으로 추가됨

### 5.2. Facebook 로그인 설정

#### Step 1: Facebook Developers 설정

1. [Facebook Developers](https://developers.facebook.com/) 접속
2. **"My Apps"** → **"Create App"** 클릭
3. Use case: **Consumer** 선택
4. App name: `Landing Page Pro`
5. Contact email 입력
6. **"Create App"** 클릭
7. Dashboard에서 **"Facebook Login"** → **"Set Up"** 클릭
8. Platform: **Web** 선택
9. **Settings** → **Basic**:
   - **App ID** 복사
   - **App Secret** 복사 (Show 클릭)
10. **Settings** → **Facebook Login** → **Settings**:
    - **Valid OAuth Redirect URIs** 추가:
      ```
      https://<tenant-name>.ciamlogin.com/<tenant-name>.onmicrosoft.com/oauth2/authresp
      ```
11. **"Save Changes"** 클릭

#### Step 2: Azure Portal에서 Facebook 추가

1. External ID 테넌트
2. **"External Identities"** → **"All identity providers"**
3. **"+ New Facebook"** 클릭
4. **Client ID**: Facebook App ID 붙여넣기
5. **Client Secret**: Facebook App Secret 붙여넣기
6. **"Save"** 클릭

### 5.3. Microsoft Account 로그인 설정

#### Step 1: App Registration (MSA용)

1. [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) 접속
2. **"+ New registration"** 클릭
3. Name: `Landing Page Pro - MSA`
4. **Supported account types**:
   - **Accounts in any organizational directory and personal Microsoft accounts**
5. Redirect URI: 위와 동일
6. **"Register"** 클릭
7. **Application (client) ID** 복사
8. **Certificates & secrets** → **"+ New client secret"**
9. Secret 복사

#### Step 2: Azure Portal에서 Microsoft 추가

1. External ID 테넌트
2. **"External Identities"** → **"All identity providers"**
3. **"+ New Microsoft Account"** 클릭
4. Client ID와 Secret 입력
5. **"Save"** 클릭

### 5.4. 코드에서 소셜 로그인 사용

소셜 로그인은 Azure Portal에서 설정하면 **자동으로 로그인 화면에 표시**됩니다.

별도의 코드 수정 필요 없음! MSAL이 자동으로 처리합니다.

**로그인 시**:
```typescript
// 기존 loginPopup() 호출하면 자동으로 소셜 로그인 옵션이 표시됨
await loginPopup();
```

---

## 6. 환경 변수 설정

### Frontend (.env)

```env
# External ID Tenant (테넌트 이름만, .onmicrosoft.com 제외)
VITE_ENTRA_TENANT_NAME="parandurumelandingpage"

# Tenant ID (Azure Portal → Overview에서 확인)
VITE_ENTRA_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Application (Client) ID
VITE_ENTRA_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Redirect URI
VITE_ENTRA_REDIRECT_URI="http://localhost:5173"

# Azure Functions URL
VITE_AZURE_FUNCTIONS_URL="https://func-landing-page-pro.azurewebsites.net"
```

### Backend (Azure Functions Application Settings)

Azure Portal → Function App → Configuration → Application settings:

```env
ENTRA_TENANT_NAME="parandurumelandingpage"
ENTRA_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
ENTRA_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

## 7. 테스트

### 7.1. 이메일 로그인 테스트

```bash
npm run dev
# http://localhost:5173/auth 접속
# "Sign in" 버튼 클릭
# 이메일 입력 → OTP 코드 받기 → 로그인
```

### 7.2. 비밀번호 재설정 테스트

1. 로그인 화면에서 **"Forgot password?"** 클릭
2. 이메일 입력
3. OTP 코드 받기
4. 새 비밀번호 설정

### 7.3. 소셜 로그인 테스트

1. 로그인 화면에 Google/Facebook 버튼이 표시되는지 확인
2. 각 버튼 클릭하여 로그인 테스트

---

## 8. 문제 해결

### Q: 로그인 화면이 영어로 나와요
**A**:
1. **"External Identities"** → **"Company branding"** → **"Languages"**
2. 한국어 추가

### Q: 소셜 로그인 버튼이 안 보여요
**A**:
1. Identity providers가 제대로 추가되었는지 확인
2. App Registration의 Authentication 설정 확인

### Q: "AADB2C90157: The redirect_uri parameter is invalid" 에러
**A**:
1. Redirect URI가 정확히 일치하는지 확인
2. `http://` vs `https://` 확인
3. 끝에 `/` 없는지 확인

---

## 9. 추가 참고 자료

- [Microsoft Entra External ID 공식 문서](https://learn.microsoft.com/entra/external-id/)
- [MSAL.js 공식 문서](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Microsoft Graph API 문서](https://learn.microsoft.com/graph/api/overview)

---

**작성일**: 2025-12-30
**작성자**: Claude Code
**업데이트**: External ID 완전 설정 가이드
