# External ID User Flows Configuration Guide

## 현재 상황
- External ID 테넌트: **ParandurumeLandingPage**
- Tenant ID: `64425cef-1c32-4713-bb61-7dcd4939e326`
- 문제: 로그인 시 "해당 이메일 주소가 있는 계정을 찾을 수 없습니다" 에러
- 원인: Self-service sign-up이 구성되지 않음

## External ID에서 User Flows 찾기

### 방법 1: Azure Portal 검색 사용
1. Azure Portal 상단의 **검색창**에 "user flows" 입력
2. "User flows (Preview)" 또는 "Authentication methods" 결과 클릭

### 방법 2: External ID 테넌트 직접 탐색
1. Azure Portal에서 **Microsoft Entra External ID** 선택
2. 왼쪽 메뉴에서 다음 중 하나를 찾아보세요:
   - **Sign in experiences** (가장 가능성 높음)
   - **User flows**
   - **Authentication methods**
   - **Identity providers**

### 방법 3: App Registration을 통한 설정
External ID의 경우 User flows 대신 **App Registration**에서 직접 설정할 수 있습니다:

1. Azure Portal → **Microsoft Entra External ID**
2. 왼쪽 메뉴 → **App registrations**
3. 앱 선택: **landing-page-pro** (Client ID: `e6db2185-d0d9-4db2-9f4d-b8d0343e0b1e`)
4. **Authentication** 클릭
5. "Platform configurations" 섹션에서 **Add a platform** → **Single-page application** 선택
6. Redirect URI 확인: `http://localhost:5173`

## Self-Service Sign-Up 활성화

### App Registration에서 설정하기
1. App Registration → **Authentication**
2. **Supported account types** 섹션에서:
   - ✅ "Accounts in any identity provider or organizational directory (for authenticating users with user flows)"
3. **Allow public client flows** → **Yes** (선택사항)
4. 저장

### Token Configuration
1. App Registration → **Token configuration**
2. **Add optional claim** 클릭
3. Token type: **ID**
4. Claims 선택:
   - ✅ email
   - ✅ given_name
   - ✅ family_name
5. 저장

### API Permissions 확인
1. App Registration → **API permissions**
2. 필요한 권한:
   - ✅ `openid`
   - ✅ `profile`
   - ✅ `email`
   - ✅ `offline_access`
3. 없다면 **Add a permission** → **Microsoft Graph** → **Delegated permissions**에서 추가

## Identity Providers 구성

### Email One-Time Passcode (OTP) 활성화
1. Microsoft Entra External ID → **External Identities** (또는 **All Identity Providers**)
2. **Email one-time passcode** 클릭
3. **Enable** 또는 **On** 선택
4. 저장

### Local Account (Email/Password) 활성화
1. **External Identities** → **All Identity Providers**
2. **Email with password** 또는 **Local accounts** 찾기
3. 활성화 상태 확인

## 주의사항

### External ID vs 일반 Entra ID
- External ID는 B2C의 후속 서비스이지만 UI/메뉴 구조가 다릅니다
- "User settings" 같은 일부 기능은 External ID에서 사용 불가
- User flows 대신 **Sign-in experiences** 또는 **App Registration** 설정 사용

### 현재 .env 설정 (확인용)
```env
VITE_ENTRA_TENANT_NAME="Landingpage"
VITE_ENTRA_TENANT_ID="64425cef-1c32-4713-bb61-7dcd4939e326"
VITE_ENTRA_CLIENT_ID="e6db2185-d0d9-4db2-9f4d-b8d0343e0b1e"
VITE_ENTRA_REDIRECT_URI="http://localhost:5173"
```

## 테스트 절차

설정 완료 후:
1. 브라우저 캐시 및 localStorage 삭제
2. 앱 재시작: `npm run dev`
3. `/auth` 페이지로 이동
4. "회원가입" 클릭
5. 새 이메일 주소로 가입 시도

## 문제 해결

### "Account not found" 에러가 계속되면
1. App Registration → Authentication → Supported account types 재확인
2. External Identities → Identity providers에서 Email 활성화 확인
3. 개발자 도구 콘솔에서 MSAL 에러 메시지 확인

### "Feature unavailable" 메시지
- 정상입니다. External ID 테넌트에는 일부 Entra ID 기능이 없습니다
- User flows는 다른 위치에서 관리됩니다

## 다음 단계

1. ✅ App Registration 설정 확인
2. ✅ Identity Providers 활성화
3. ⏳ Self-service sign-up 테스트
4. ⏳ 회원가입 플로우 검증
