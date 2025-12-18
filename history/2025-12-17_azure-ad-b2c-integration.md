# Azure AD B2C 인증 시스템 통합

**날짜**: 2025-12-17
**작업자**: Claude (AI Assistant)
**관련 작업**: Phase 3 - Supabase Auth → Azure AD B2C 전환

---

## 📋 작업 개요

1. **Azure AD B2C 설정 가이드 작성**: Portal 수동 작업 단계별 문서
2. **MSAL 라이브러리 설치**: `@azure/msal-browser`, `@azure/msal-react`
3. **인증 컴포넌트 구축**: Provider, Hook, UI 컴포넌트
4. **프론트엔드 통합 가이드**: App.tsx 수정 및 사용법

---

## ✅ 완료된 작업

### 1. 문서 작성 (3개)

#### 1.1 PHASE3-AZURE-AD-B2C-SETUP.md (6.5KB)
**내용**:
- Azure Portal에서 B2C 테넌트 생성 (Step-by-Step)
- 사용자 플로우 3개 설정 (가입/로그인, 프로필 편집, 비밀번호 재설정)
- 애플리케이션 등록 및 리디렉션 URI 설정
- 클라이언트 시크릿 생성
- 테스트 사용자 생성 및 플로우 실행

**예상 소요 시간**: 25분

#### 1.2 PHASE3-FRONTEND-INTEGRATION.md (5KB)
**내용**:
- App.tsx 수정 (AuthProvider 통합)
- Header 컴포넌트 교체
- ProtectedRoute 구현
- API 호출 시 JWT 토큰 추가
- 환경 변수 설정
- 트러블슈팅

**단계별 코드 예시**: 7개

#### 1.3 생성된 코드 파일

| 파일 | 라인 | 용도 |
|------|------|------|
| `src/config/authConfig.ts` | 120+ | MSAL 설정, B2C 정책, API 스코프 |
| `src/components/AuthProvider.tsx` | 45+ | MSAL Provider 래퍼, 이벤트 리스너 |
| `src/hooks/useAzureAuth.tsx` | 150+ | 커스텀 훅 (login, logout, token) |
| `src/components/AzureAuthButton.tsx` | 70+ | 로그인/로그아웃 UI |

---

### 2. 라이브러리 설치

```bash
npm install @azure/msal-browser @azure/msal-react
```

**추가된 패키지**:
- `@azure/msal-browser@^3.x`: 코어 인증 라이브러리
- `@azure/msal-react@^2.x`: React 통합

---

### 3. 코드 구조

#### 3.1 authConfig.ts (MSAL 설정)

```typescript
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_AD_B2C_CLIENT_ID,
    authority: `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${policySignIn}`,
    knownAuthorities: [`${tenantName}.b2clogin.com`],
    redirectUri: 'http://localhost:5173/auth/callback',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};
```

**주요 기능**:
- 환경 변수에서 설정 읽기
- B2C Authority URL 자동 생성
- 로컬스토리지 캐싱
- 로깅 설정 (개발 모드)

---

#### 3.2 AuthProvider.tsx (MSAL 초기화)

```typescript
export const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.initialize().then(() => {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  // 로그인/로그아웃 이벤트 리스너
  msalInstance.addEventCallback((event: EventMessage) => {
    if (event.eventType === EventType.LOGIN_SUCCESS) {
      // 계정 설정
    }
  });
});
```

**기능**:
- MSAL 인스턴스 생성 및 초기화
- 자동 계정 복원 (localStorage에서)
- 이벤트 핸들러 (로그인 성공/실패)
- React Context Provider 제공

---

#### 3.3 useAzureAuth.tsx (커스텀 훅)

```typescript
export function useAzureAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const [user, setUser] = useState<User | null>(null);

  // 사용자 정보 추출 (JWT 클레임에서)
  useEffect(() => {
    if (accounts.length > 0) {
      const idTokenClaims = accounts[0].idTokenClaims;
      setUser({
        id: accounts[0].localAccountId, // Azure AD B2C ObjectId
        email: idTokenClaims?.emails?.[0],
        displayName: idTokenClaims?.name,
      });
    }
  }, [accounts]);

  return {
    user,
    isAuthenticated,
    loginPopup,
    logout,
    getAccessToken,
    resetPassword,
    editProfile,
  };
}
```

**제공 메서드**:
1. `loginPopup()`: 팝업으로 로그인
2. `loginRedirect()`: 리다이렉트로 로그인
3. `logout()`: 로그아웃 (팝업)
4. `logoutRedirect()`: 로그아웃 (리다이렉트)
5. `getAccessToken()`: API 호출용 토큰 획득
6. `resetPassword()`: 비밀번호 재설정 플로우
7. `editProfile()`: 프로필 편집 플로우

---

#### 3.4 AzureAuthButton.tsx (UI 컴포넌트)

```typescript
export function AzureAuthButton() {
  const { user, isAuthenticated, loginPopup, logout } = useAzureAuth();

  if (!isAuthenticated) {
    return (
      <Button onClick={() => loginPopup()}>
        <LogIn className="mr-2" />
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <Avatar>{getInitials(user.displayName)}</Avatar>
      <DropdownMenuItem onClick={logout}>Sign Out</DropdownMenuItem>
    </DropdownMenu>
  );
}
```

**기능**:
- 로그인/로그아웃 버튼
- 사용자 프로필 드롭다운
- 아바타 (이니셜 표시)
- 프로필 편집, 비밀번호 변경 메뉴

---

## 🔧 통합 방법

### Step 1: App.tsx 수정

```tsx
import { AuthProvider } from "@/components/AuthProvider";

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider>
        {/* 기존 컴포넌트 */}
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

### Step 2: Header 수정

```tsx
import { AzureAuthButton } from "@/components/AzureAuthButton";

export function Header() {
  return (
    <header>
      <AzureAuthButton /> {/* Supabase 버튼 대체 */}
    </header>
  );
}
```

### Step 3: 보호된 라우트

```tsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### Step 4: API 호출 시 토큰 추가

```typescript
const { getAccessToken } = useAzureAuth();

async function callAPI() {
  const token = await getAccessToken();
  const response = await fetch('/api/endpoint', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
```

---

## 🌐 환경 변수

`.env` 파일에 추가:

```env
VITE_AZURE_AD_B2C_TENANT_NAME=landingpagepro
VITE_AZURE_AD_B2C_CLIENT_ID=<Client ID from Azure Portal>
VITE_AZURE_AD_B2C_POLICY_SIGNIN=B2C_1_signupsignin
VITE_AZURE_AD_B2C_REDIRECT_URI=http://localhost:5173/auth/callback
```

---

## 🔐 인증 흐름

### 로그인 (Popup)

```
1. User clicks "Sign In"
   ↓
2. useAzureAuth.loginPopup() called
   ↓
3. MSAL opens B2C login page (popup)
   ↓
4. User enters credentials
   ↓
5. B2C validates & issues JWT tokens
   ↓
6. MSAL stores tokens in localStorage
   ↓
7. App redirects to /auth/callback
   ↓
8. useAzureAuth extracts user info from JWT
   ↓
9. isAuthenticated = true
```

### API 호출

```
1. Component calls getAccessToken()
   ↓
2. MSAL checks localStorage for valid token
   ↓
3. If expired: acquireTokenSilent() (refresh)
   ↓
4. If refresh fails: acquireTokenPopup() (re-auth)
   ↓
5. Return access token
   ↓
6. Add to Authorization header
   ↓
7. Azure Functions verify JWT
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 신규 사용자 가입

1. [ ] "Sign In" 버튼 클릭
2. [ ] Azure AD B2C 가입 페이지 표시
3. [ ] 이메일, 비밀번호, 이름 입력
4. [ ] 이메일 인증 (옵션)
5. [ ] 앱으로 돌아와 로그인 상태 확인
6. [ ] PostgreSQL `profiles` 테이블에 사용자 생성

### 시나리오 2: 기존 사용자 로그인

1. [ ] "Sign In" → 이메일/비밀번호 입력
2. [ ] 로그인 성공 → 토큰 발급
3. [ ] `user.id`가 Azure AD B2C ObjectId인지 확인
4. [ ] Dashboard 접근 가능 확인

### 시나리오 3: 비밀번호 재설정

1. [ ] 로그인 페이지 → "Forgot password?" 클릭
2. [ ] B2C 비밀번호 재설정 플로우
3. [ ] 이메일로 인증 코드 받기
4. [ ] 새 비밀번호 설정
5. [ ] 재로그인 성공

### 시나리오 4: 토큰 갱신

1. [ ] 1시간 후 토큰 만료
2. [ ] API 호출 시 자동으로 `acquireTokenSilent()` 실행
3. [ ] 갱신 성공 → 계속 사용
4. [ ] 갱신 실패 → 재로그인 팝업

---

## 🚧 남은 작업

### Azure Portal (수동 작업 필요)

- [ ] Azure AD B2C 테넌트 생성
- [ ] 사용자 플로우 설정 (B2C_1_signupsignin)
- [ ] 애플리케이션 등록
- [ ] Client ID, Tenant ID 복사
- [ ] Redirect URI 설정 (`http://localhost:5173/auth/callback`)
- [ ] 클라이언트 시크릿 생성
- [ ] 테스트 사용자 생성

### 코드 통합 (개발자 작업)

- [ ] `App.tsx`에 `<AuthProvider>` 추가
- [ ] `Header.tsx`에 `<AzureAuthButton>` 추가
- [ ] `.env` 파일에 Azure 설정 추가
- [ ] 기존 `useAuth` 훅 사용처를 `useAzureAuth`로 교체
- [ ] `ProtectedRoute` 적용
- [ ] API 호출에 JWT 토큰 추가

### 백엔드 (Phase 4)

- [ ] Azure Functions에서 JWT 검증
- [ ] `user_id` 추출 (JWT `oid` 클레임)
- [ ] PostgreSQL 연동

---

## 📊 파일 요약

| 파일 | 크기 | 라인 | 용도 |
|------|------|------|------|
| PHASE3-AZURE-AD-B2C-SETUP.md | 6.5KB | 250+ | Portal 설정 가이드 |
| PHASE3-FRONTEND-INTEGRATION.md | 5KB | 200+ | 코드 통합 가이드 |
| src/config/authConfig.ts | 3KB | 120+ | MSAL 설정 |
| src/components/AuthProvider.tsx | 1.5KB | 45+ | Provider |
| src/hooks/useAzureAuth.tsx | 4KB | 150+ | 커스텀 훅 |
| src/components/AzureAuthButton.tsx | 2KB | 70+ | UI |
| **총계** | **22KB** | **835+** | |

---

## 💡 기술적 결정

### 1. Popup vs Redirect

**선택**: Popup (기본), Redirect (옵션)

**이유**:
- ✅ Popup: UX 좋음 (페이지 유지)
- ❌ Redirect: 모바일 호환성 (Safari 팝업 차단)

**구현**: 두 가지 모두 제공
```typescript
loginPopup(); // 데스크톱
loginRedirect(); // 모바일
```

---

### 2. Token Storage

**선택**: localStorage

**이유**:
- ✅ 새로고침 시 로그인 유지
- ✅ 탭 간 공유 가능
- ❌ XSS 공격 위험 (httpOnly 쿠키가 더 안전)

**보안 강화**: Content Security Policy (CSP) 설정 권장

---

### 3. User ID Mapping

**문제**: Supabase `auth.users.id` (UUID) vs Azure B2C `objectId` (UUID)

**해결**:
- Azure B2C ObjectId → `profiles.user_id` 저장
- 기존 Supabase 사용자는 마이그레이션 필요
- 신규 사용자는 Azure ObjectId로 시작

---

## 📝 다음 단계

Phase 3 완료 후:

1. **사용자 작업**: Azure Portal에서 B2C 테넌트 생성 (25분)
2. **개발자 작업**: 프론트엔드 통합 (1시간)
3. **Phase 4**: Azure Functions 배포 및 JWT 검증 (2시간)
4. **Phase 5**: E2E 테스트 및 Supabase Auth 제거

---

## 🆘 트러블슈팅

### 문제 1: "Invalid redirect URI"
**원인**: Azure Portal 설정과 코드 불일치
**해결**: `authConfig.ts`의 `redirectUri`와 Portal의 Redirect URI 일치 확인

### 문제 2: "Token acquisition failed"
**원인**: Scope 오류 또는 권한 문제
**해결**: `loginRequest.scopes`에 `openid`, `profile` 포함 확인

### 문제 3: "User information not available"
**원인**: JWT 클레임 설정 누락
**해결**: Azure Portal → 사용자 흐름 → 토큰 클레임에서 "Display Name", "Email" 반환 설정

---

**작성일**: 2025-12-17
**다음 리뷰**: Portal 설정 완료 후
