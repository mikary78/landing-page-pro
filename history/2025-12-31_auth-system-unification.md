# 2025-12-31: 인증 시스템 통일 및 로그인 문제 해결

## 작업 개요

사용자가 홈페이지에서 로그인 버튼을 눌러도 "이미 로그인 되어 있다"고 하면서 화면에 변화가 없는 문제와, 시작하기 버튼이 작동하지 않는 문제를 분석하고 해결함.

## 사용자 요청

> 히스토리 내역을 보고 잘 이해해줘. 홈페이지 첫 화면에서 로그인 버튼을 누르면 이미 로그인 되어 있다고 하면서 화면에 변화가 없어. 시작하기 버튼도 작동을 안하고. 로그인과 회원가입 단계에 대한 프로세스를 모두 점검하고 문제점을 찾아줘.

## 발견된 문제점

### 핵심 문제: 두 개의 독립적인 인증 시스템 혼재

프로젝트에 두 개의 서로 다른 인증 시스템이 혼재되어 있었음:

| 컴포넌트 | 사용하던 인증 훅 | 인증 시스템 |
|---------|----------------|------------|
| Header.tsx (일부) | `useAzureAuth` | Microsoft Entra External ID |
| Hero.tsx, Dashboard 등 | `useAuth` | **Supabase** |
| Auth.tsx | `useAzureAuth` | Microsoft Entra External ID |

### 문제 발생 흐름

```
1. Index 페이지 로드
   → Header에서 useAuth (Supabase) 또는 useAzureAuth 사용
   → 인증 상태 체크

2. "로그인" 버튼 클릭 → /auth 페이지 이동

3. Auth 페이지에서:
   → useAzureAuth 사용
   → 이전에 Azure로 로그인한 적 있으면 isAuthenticated: true
   → "이미 로그인 되어 있다" 판단 → 홈으로 리다이렉트 시도

4. 홈 페이지로 돌아가면:
   → 다른 컴포넌트는 useAuth (Supabase) 체크
   → Supabase user 없음 → 다시 "로그인" 버튼 표시

⇒ 무한 반복 또는 화면 변화 없음
```

## 수정 사항

### 1. `useAuth.tsx` 훅 재작성

**이전 (Supabase 인증)**:
```typescript
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  // Supabase 인증 사용
  supabase.auth.onAuthStateChange(...)
  supabase.auth.signInWithPassword(...)
};
```

**이후 (Azure 인증으로 통일)**:
```typescript
import { useAzureAuth } from '@/hooks/useAzureAuth';

export const useAuth = () => {
  const { user: azureUser, isAuthenticated, loginPopup, logout, ... } = useAzureAuth();
  
  // Azure 사용자 정보를 기존 인터페이스에 맞게 변환
  const user = convertAzureUser(azureUser);
  
  return {
    user,
    session,
    loading,
    isAuthenticated,
    signUp,    // → loginPopup() 호출
    signIn,    // → loginPopup() 호출
    signOut,   // → logout() 호출
    ...
  };
};
```

**주요 변경점**:
- 기존 Supabase 인증 코드 제거
- 내부적으로 `useAzureAuth` 사용
- 기존 인터페이스(`user`, `session`, `signIn`, `signOut` 등) 유지
- 기존 컴포넌트 코드 변경 최소화

### 2. `Header.tsx` 수정

**이전**:
```typescript
import { useAzureAuth } from "@/hooks/useAzureAuth";

const Header = () => {
  const { user, logout } = useAzureAuth();
```

**이후**:
```typescript
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const { user, signOut } = useAuth();
```

### 3. `Auth.tsx` 수정

**이전**:
- `useAzureAuth`만 사용
- 리다이렉트 로직에 타이밍 이슈 있음

**이후**:
- `useAuth`와 `useAzureAuth` 함께 사용 (useAuth로 인증 상태 확인, useAzureAuth로 로그인 기능)
- `setTimeout`을 사용하여 React Router 타이밍 이슈 방지
- 로딩 상태 체크 강화

```typescript
useEffect(() => {
  if (loading) {
    console.log('[Auth] Still loading, waiting...');
    return;
  }
  
  if (isAuthenticated && user && user.id) {
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 100);
  }
}, [isAuthenticated, user, loading, navigate]);
```

## 수정된 파일

1. **src/hooks/useAuth.tsx** - Azure 인증으로 완전 재작성
2. **src/pages/Auth.tsx** - 통합 인증 훅 사용으로 변경
3. **src/components/Header.tsx** - useAuth로 통일

## 테스트 결과

### 개발 서버
- 서버 시작: `npm run dev` → 포트 5176에서 실행
- 페이지 로드 정상

### 인증 플로우
1. ✅ 홈페이지 로드 → 로그인 버튼 표시
2. ✅ 로그인 버튼 클릭 → /auth 페이지 이동
3. ✅ Auth 페이지에서 "Microsoft 계정으로 로그인" 버튼 표시
4. ⚠️ 로그인 팝업 테스트 필요 (Azure Portal에서 redirect URI 설정 필요)

### 콘솔 로그
```
[AuthProvider] MSAL initialized successfully
[AuthProvider] Accounts found: 0
[Auth] Component state: { isAuthenticated: false, user: null, loading: false }
[Auth] Checking redirect: { isAuthenticated: false, user: null, loading: false }
```

## 추가 확인 필요 사항

### 1. Azure Portal에서 Redirect URI 설정

현재 서버가 포트 5176에서 실행 중이므로, Azure Portal에서 다음 redirect URI가 등록되어 있어야 함:

- `http://localhost:5173` (기본)
- `http://localhost:5174`
- `http://localhost:5175`
- `http://localhost:5176`

또는 Vite 설정에서 포트를 5173으로 고정:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true, // 포트가 사용 중이면 에러
  },
});
```

### 2. .env 파일 확인

```env
VITE_ENTRA_TENANT_NAME="Landingpage"
VITE_ENTRA_TENANT_ID="64425cef-1c32-4713-bb61-7dcd4939e326"
VITE_ENTRA_CLIENT_ID="9222c648-3066-455a-aa7e-49cdd9782943"
VITE_ENTRA_REDIRECT_URI="http://localhost:5173"
```

## 기술적 배경

### Supabase vs Azure Entra ID

| 항목 | Supabase | Azure Entra External ID |
|------|----------|------------------------|
| 인증 방식 | 이메일/비밀번호, OAuth | Microsoft 계정, User Flows |
| 토큰 | Supabase JWT | Azure AD JWT |
| 사용자 저장 | Supabase auth.users | Azure AD |
| SDK | @supabase/supabase-js | @azure/msal-browser |

### 왜 Azure로 마이그레이션했는가?

1. 2025-12-18 히스토리: Azure AD B2C → Microsoft Entra ID 마이그레이션 작업
2. Azure 인증을 메인으로 사용하기로 결정
3. 그러나 기존 Supabase 코드가 남아있어 충돌 발생

## 결론

두 개의 독립적인 인증 시스템이 혼재되어 있던 문제를 발견하고, 모든 컴포넌트에서 Azure 인증을 사용하도록 통일함.

`useAuth` 훅을 Azure 인증 래퍼로 재작성하여:
- 기존 인터페이스 유지 (하위 호환성)
- 내부적으로 Azure MSAL 사용
- 모든 컴포넌트에서 일관된 인증 상태

---

**작업일**: 2025-12-31
**작업자**: Claude Code
**관련 히스토리**:
- [2025-12-18_microsoft-entra-id-integration.md](./2025-12-18_microsoft-entra-id-integration.md)
- [2025-12-30_azure-authentication-and-ai-configuration.md](./2025-12-30_azure-authentication-and-ai-configuration.md)
- [2025-12-31_external-id-authentication-troubleshooting.md](./2025-12-31_external-id-authentication-troubleshooting.md)

