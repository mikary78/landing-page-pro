# Azure External ID 회원가입 UI 제한사항

## 문제 상황

사용자가 "회원가입" 버튼을 클릭하면 **바로 회원가입 화면**으로 이동하기를 원합니다.
하지만 현재는 로그인 화면이 열리고, "계정 만들기" 링크를 클릭해야 회원가입으로 이동합니다.

## 원인

**Azure External ID (CIAM)**의 구조적 제한사항:

1. **Sign Up과 Sign In이 같은 User Flow**: `signupsignin` User Flow는 로그인과 회원가입을 하나의 플로우로 처리합니다.
2. **MSAL 라이브러리 제한**: MSAL은 `loginPopup()` 또는 `loginRedirect()`만 제공하며, "회원가입 전용" 메서드는 없습니다.
3. **OAuth 2.0 표준**: OAuth 2.0 표준에서도 로그인과 회원가입을 구분하는 표준 파라미터가 없습니다.

## 현재 구현

```typescript
// useAzureAuth.tsx
const signupPopup = async () => {
  const signupRequest = {
    ...loginRequest,
    prompt: 'login', // 기존 세션 무시
  };
  return await instance.loginPopup(signupRequest);
};
```

**결과**: 여전히 로그인 화면이 먼저 나타나고, 사용자가 "계정 만들기" 링크를 클릭해야 합니다.

## 해결 방안

### 옵션 1: 현재 구현 유지 (권장)

- ✅ 구현 간단
- ✅ Azure External ID 표준 방식
- ✅ 사용자에게 명확한 안내 메시지 표시

**UI 개선**:
- 회원가입 버튼 클릭 시 팝업이 열리면 "계정이 없나요? 계정 만들기" 링크를 클릭하도록 안내
- 로그인 화면에서 회원가입 링크가 명확하게 표시됨

### 옵션 2: 별도의 Sign Up User Flow 생성 (복잡)

Azure Portal에서 별도의 "signup" User Flow를 생성하고, MSAL에서 다른 authority를 사용:

```typescript
// authConfig.ts
const signupAuthority = `https://${tenantName}.ciamlogin.com/${tenantId}/signup`;
```

**단점**:
- ❌ User Flow를 두 개 관리해야 함 (signin, signup)
- ❌ 설정 복잡도 증가
- ❌ 일반적으로 권장되지 않음 (Microsoft 문서에서도 signupsignin 사용 권장)

### 옵션 3: 커스텀 UI 구현 (가장 좋지만 복잡)

프론트엔드에서 직접 이메일/비밀번호 입력 폼을 제공하고, Microsoft Graph API 또는 Azure AD Graph API를 사용하여 계정 생성:

**단점**:
- ❌ API 권한 관리 복잡
- ❌ 보안 고려사항 많음
- ❌ Microsoft의 표준 방식과 다름
- ❌ 구현 복잡도 높음

## 결론

**현재 구현 방식(옵션 1)이 가장 적합합니다.**

Azure External ID의 설계 철학:
- 로그인과 회원가입을 하나의 흐름으로 처리
- 사용자가 같은 화면에서 로그인 또는 회원가입 선택
- 보안과 사용자 경험의 균형

**사용자 안내 개선**:
- 명확한 안내 메시지
- UI에서 "계정 만들기" 링크가 눈에 띄게 표시
- 회원가입 절차 안내

## 참고 자료

- [Azure AD B2C User Flows](https://learn.microsoft.com/en-us/azure/active-directory-b2c/user-flow-overview)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)


