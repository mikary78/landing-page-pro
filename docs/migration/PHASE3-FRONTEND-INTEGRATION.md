# Phase 3: 프론트엔드 Azure AD B2C 통합

**날짜**: 2025-12-17
**목적**: React 앱에 MSAL 통합 및 Supabase Auth 대체

---

## ✅ 완료된 작업

1. ✅ `@azure/msal-browser`, `@azure/msal-react` 설치
2. ✅ `src/config/authConfig.ts` 생성 (MSAL 설정)
3. ✅ `src/components/AuthProvider.tsx` 생성 (Provider)
4. ✅ `src/hooks/useAzureAuth.tsx` 생성 (커스텀 훅)
5. ✅ `src/components/AzureAuthButton.tsx` 생성 (로그인 UI)

---

## 🔧 Step 1: App.tsx 수정

`src/App.tsx` 파일을 열고 `AuthProvider`로 감싸세요:

### 변경 전:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// ...

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* routes */}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

### 변경 후:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/AuthProvider"; // 추가

// ...

function App() {
  return (
    <AuthProvider> {/* 최상위에 배치 */}
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {/* routes */}
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

---

## 🔧 Step 2: Header 컴포넌트 수정

`src/components/Header.tsx`에서 기존 Supabase Auth를 Azure Auth로 교체:

### 변경 전:
```tsx
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, signOut } = useAuth();
  // ...
}
```

### 변경 후:
```tsx
import { AzureAuthButton } from "@/components/AzureAuthButton";

export function Header() {
  return (
    <header>
      {/* 기존 네비게이션 */}
      <AzureAuthButton /> {/* Supabase 버튼 대체 */}
    </header>
  );
}
```

---

## 🔧 Step 3: 보호된 라우트 구현

로그인이 필요한 페이지를 보호하는 컴포넌트:

### `src/components/ProtectedRoute.tsx` 생성:

```tsx
import { useAzureAuth } from '@/hooks/useAzureAuth';
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAzureAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
```

### 사용 예시 (`src/App.tsx`):

```tsx
import { ProtectedRoute } from "@/components/ProtectedRoute";

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

---

## 🔧 Step 4: API 호출 시 토큰 추가

Azure Functions 호출 시 JWT 토큰을 헤더에 추가:

### `src/lib/api.ts` 생성:

```typescript
import { msalInstance } from '@/components/AuthProvider';
import { loginRequest } from '@/config/authConfig';

export async function callAzureFunction(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
) {
  // 액세스 토큰 가져오기
  let accessToken = '';
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      accessToken = response.accessToken;
    }
  } catch (error) {
    console.error('Failed to acquire token:', error);
  }

  const url = `${import.meta.env.VITE_AZURE_FUNCTIONS_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}
```

### 사용 예시:

```typescript
import { callAzureFunction } from '@/lib/api';

// AI 커리큘럼 생성
const result = await callAzureFunction('/api/generate-curriculum', 'POST', {
  brief: briefText,
  aiModel: 'gemini',
});
```

---

## 🔧 Step 5: 환경 변수 설정

`.env` 파일에 Azure AD B2C 설정 추가:

```env
# Azure AD B2C (Step 5에서 복사한 값 사용)
VITE_AZURE_AD_B2C_TENANT_NAME=landingpagepro
VITE_AZURE_AD_B2C_CLIENT_ID=<Client ID>
VITE_AZURE_AD_B2C_POLICY_SIGNIN=B2C_1_signupsignin
VITE_AZURE_AD_B2C_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_AZURE_AD_B2C_AUTHORITY=https://landingpagepro.b2clogin.com/landingpagepro.onmicrosoft.com/B2C_1_signupsignin

# Azure Functions
VITE_AZURE_FUNCTIONS_URL=https://func-landing-page-pro.azurewebsites.net
```

---

## 🧪 Step 6: 테스트

### 6.1 개발 서버 시작

```bash
npm run dev
```

### 6.2 로그인 테스트

1. http://localhost:5173 접속
2. "Sign In" 버튼 클릭
3. Azure AD B2C 로그인 페이지로 리다이렉트
4. 테스트 계정으로 로그인
5. 앱으로 돌아와서 사용자 정보 표시 확인

### 6.3 보호된 라우트 테스트

1. 로그아웃 상태에서 `/dashboard` 접속
2. `/auth`로 리다이렉트 확인
3. 로그인 후 `/dashboard` 접근 가능 확인

### 6.4 토큰 확인

브라우저 DevTools → Application → Local Storage → `msal.<clientId>` 확인

```json
{
  "idToken": "eyJ0eXAiOiJKV1...",
  "accessToken": "eyJ0eXAiOiJKV1...",
  "account": {
    "localAccountId": "00000000-0000-0000-0000-000000000000",
    "username": "user@landingpagepro.onmicrosoft.com",
    "name": "Test User"
  }
}
```

---

## 🔄 Step 7: Supabase Auth 제거 (선택사항)

모든 테스트 완료 후 기존 Supabase Auth 코드 제거:

### 제거할 파일:
- `src/hooks/useAuth.tsx` (기존 Supabase 버전)
- `src/integrations/supabase/client.ts` (필요 시 유지)

### 수정할 컴포넌트:
- `src/components/AuthForm.tsx` → 삭제 또는 AzureAuthButton으로 교체
- `src/pages/Auth.tsx` → 리다이렉트 또는 삭제
- `src/pages/ResetPassword.tsx` → Azure B2C 정책 사용

---

## 📊 마이그레이션 체크리스트

### 프론트엔드
- [ ] `AuthProvider`로 App 감싸기
- [ ] Header에 `AzureAuthButton` 추가
- [ ] `ProtectedRoute` 적용
- [ ] API 호출에 토큰 추가
- [ ] 환경 변수 설정
- [ ] 로그인/로그아웃 테스트

### 백엔드
- [ ] Azure Functions에서 JWT 검증 로직 추가
- [ ] `user_id` 추출 (JWT의 `oid` 클레임)
- [ ] PostgreSQL에 `user_id` 매핑

### 데이터베이스
- [ ] `profiles.user_id`를 Azure AD B2C ObjectId로 업데이트
- [ ] 기존 Supabase UUID → Azure ObjectId 매핑 테이블

---

## 🆘 문제 해결

### 문제 1: "AADB2C90088: The provided grant has not been issued"
**원인**: 만료된 토큰
**해결**: `localStorage` 삭제 후 재로그인

### 문제 2: "Redirect URI mismatch"
**원인**: Azure Portal 설정과 코드의 URI 불일치
**해결**: `authConfig.ts`의 `redirectUri`와 Azure Portal 설정 일치 확인

### 문제 3: "Failed to acquire token silently"
**원인**: 토큰 갱신 실패
**해결**: 팝업으로 재인증 (자동 처리됨)

---

## 🎯 다음 단계

Phase 3 완료 후:
1. ⏭️ Azure Functions 배포 (Edge Functions 대체)
2. ⏭️ 백엔드 JWT 검증 구현
3. ⏭️ 데이터베이스 user_id 매핑

---

**작성일**: 2025-12-17
**다음**: PHASE4-AZURE-FUNCTIONS.md
