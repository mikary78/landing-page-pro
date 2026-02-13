# Azure AD Single-Page Application 설정 가이드

## 현재 문제
AADSTS9002326 오류: Cross-origin token redemption is permitted only for the 'Single-Page Application' client-type

## 원인
Azure AD App Registration이 Single-Page Application (SPA)으로 구성되지 않아서 MSAL.js의 PKCE 인증 흐름이 실패합니다.

## 해결 방법

### 1. Azure Portal 접속
- https://portal.azure.com 접속
- Microsoft Entra ID (Azure Active Directory) 선택

### 2. App Registration 찾기
- **App registrations** 메뉴 클릭
- **Client ID**: `9222c648-3066-455a-aa7e-49cdd9782943` 검색
- 또는 **Display Name**: "Landingpage" 검색

### 3. Authentication 설정 변경

#### 3-1. Platform 확인
- 좌측 메뉴에서 **Authentication** 클릭
- **Platform configurations** 섹션 확인

#### 3-2. Single-page application 플랫폼 추가
- **+ Add a platform** 버튼 클릭
- **Single-page application** 선택 (Web 아님!)
- **Redirect URIs** 입력:
  ```
  https://icy-forest-03cc7cb00.1.azurestaticapps.net
  ```
- **Configure** 버튼 클릭

#### 3-3. 기존 Web 플랫폼 제거 (있는 경우)
- 만약 "Web" 플랫폼에 redirect URI가 설정되어 있다면 제거
- SPA 플랫폼만 사용해야 합니다

#### 3-4. Implicit grant 설정 (필요시)
- **Implicit grant and hybrid flows** 섹션에서:
  - ✅ **Access tokens** (used for implicit flows)
  - ✅ **ID tokens** (used for implicit and hybrid flows)
- 체크 (MSAL.js 2.x는 기본적으로 PKCE를 사용하지만 fallback으로 필요할 수 있음)

#### 3-5. Advanced settings 확인
- **Advanced settings** 섹션에서:
  - **Allow public client flows**: **No** (SPA는 public client이지만 이 설정은 mobile/desktop용)
  - **Live SDK support**: 기본값 유지

### 4. API permissions 확인
- 좌측 메뉴에서 **API permissions** 클릭
- 다음 권한이 있는지 확인:
  - Microsoft Graph
    - openid
    - profile
    - email
    - offline_access
    - User.Read
  - 자체 API (api://9222c648-3066-455a-aa7e-49cdd9782943)
    - access_as_user

### 5. Expose an API 확인
- 좌측 메뉴에서 **Expose an API** 클릭
- **Application ID URI**: `api://9222c648-3066-455a-aa7e-49cdd9782943`
- **Scopes** 확인:
  - `api://9222c648-3066-455a-aa7e-49cdd9782943/access_as_user`

### 6. 저장 및 테스트
- 모든 변경사항 **Save** 클릭
- 브라우저에서 캐시 클리어 (Ctrl+Shift+Delete)
- https://icy-forest-03cc7cb00.1.azurestaticapps.net 재접속
- 로그인 테스트

## 현재 설정 정보

### 환경 변수 (.env.production)
```env
VITE_ENTRA_TENANT_NAME=Landingpage
VITE_ENTRA_TENANT_ID=64425cef-1c32-4713-bb61-7dcd4939e326
VITE_ENTRA_CLIENT_ID=9222c648-3066-455a-aa7e-49cdd9782943
VITE_ENTRA_REDIRECT_URI=https://icy-forest-03cc7cb00.1.azurestaticapps.net
```

### MSAL 설정 (src/config/authConfig.ts)
- **Authority**: `https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326`
- **Client ID**: `9222c648-3066-455a-aa7e-49cdd9782943`
- **Redirect URI**: `https://icy-forest-03cc7cb00.1.azurestaticapps.net`
- **Cache Location**: localStorage
- **Navigate to Login Request URL**: false

### 인증 흐름
- **Authentication Method**: PKCE (Proof Key for Code Exchange)
- **Token Storage**: localStorage
- **Scopes**: openid, profile, email, offline_access

## 추가 참고사항

### Microsoft Entra External ID vs Azure AD B2C
현재 앱은 Microsoft Entra External ID (CIAM)를 사용 중입니다.
- **Domain**: landingpage.ciamlogin.com
- **Authority**: https://landingpage.ciamlogin.com/{tenantId}
- **특징**: User Flow 없이 단순한 인증 구조

### 문제 해결 체크리스트
- [ ] App Registration이 Single-page application 플랫폼으로 설정됨
- [ ] Redirect URI가 SPA 플랫폼에 추가됨 (Web 플랫폼 아님)
- [ ] Redirect URI가 정확히 `https://icy-forest-03cc7cb00.1.azurestaticapps.net` (trailing slash 없음)
- [ ] API permissions에 필요한 권한 추가됨
- [ ] Expose an API에 access_as_user scope 설정됨
- [ ] 브라우저 캐시 클리어 후 재테스트

## 도움말
- Azure Portal에서 설정 변경 후 전파되는데 5-10분 정도 소요될 수 있습니다
- 변경 후에도 문제가 지속되면 브라우저의 시크릿/프라이빗 모드에서 테스트해보세요
