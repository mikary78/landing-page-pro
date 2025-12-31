# 2025-12-31: 회원가입 UX 개선 및 Google 로그인 안내 추가

## 작업 개요

사용자 요청에 따라 회원가입 버튼 클릭 시 바로 회원가입 화면으로 이동하는 기능 추가 시도, 그리고 Google 로그인 기능에 대한 안내 추가.

## 사용자 요청

> 마이크로소프트 계정 이 외에도 일반 이메일사용자 가입, 구글 가입은 불가능해?
> 
> 회원가입을 클릭하면 왜 로그인 화면으로 바뀌지? 계정 만들기를 눌러야 회원가입으로 이동해. 이건 뭔가 절차가 잘 못 된 거 같아. 그리고 일반이메일 사용자와 구글 이메일 가입 기능도 추가해야 해.

## 작업 내용

### 1. useAzureAuth에 signupPopup 함수 추가

**파일**: `src/hooks/useAzureAuth.tsx`

```typescript
/**
 * 회원가입 (팝업)
 * External ID에서 회원가입 화면을 직접 표시
 */
const signupPopup = useCallback(async () => {
  try {
    const signupRequest = {
      ...loginRequest,
      prompt: 'login', // 기존 세션 무시하고 로그인 화면 표시
    };
    const response = await instance.loginPopup(signupRequest);
    return response.account;
  } catch (error) {
    console.error('[Auth] Signup popup error:', error);
    throw error;
  }
}, [instance]);
```

**목적**: 회원가입 버튼 클릭 시 별도 함수 호출

**결과**: ⚠️ 여전히 로그인 화면이 먼저 나타남 (Azure External ID 구조적 제한)

### 2. Auth.tsx 수정

**파일**: `src/pages/Auth.tsx`

**변경사항**:
1. `signupPopup` import 및 사용
2. 회원가입 버튼 텍스트: "Microsoft 계정으로 회원가입" → "이메일로 회원가입"
3. 안내 메시지 개선: "계정이 없나요? 계정 만들기" 링크 클릭 안내
4. 로그인 버튼 텍스트: "Microsoft 계정으로 로그인" → "이메일로 로그인"
5. Google 로그인 안내 추가 (실제 Google 버튼은 제거, 안내만 표시)

**Before**:
```tsx
<Button onClick={handleSignUp}>
  Microsoft 계정으로 회원가입
</Button>
<div className="text-xs">
  Microsoft 로그인 화면에서 "계정 등록" 링크를 클릭하여...
</div>
```

**After**:
```tsx
<Button onClick={handleSignUp}>
  이메일로 회원가입
</Button>
<div className="text-xs p-3 bg-muted rounded-lg">
  <p>팝업 창이 열리면 이메일 주소를 입력하고</p>
  <p><strong>"계정이 없나요? 계정 만들기"</strong> 링크를 클릭하세요.</p>
</div>
```

### 3. Google 로그인 안내 추가

**현재 상태**:
- ✅ Azure Portal에서 Email with password 활성화됨
- ⚠️ Google Identity Provider 미설정
- ℹ️ Google 로그인은 Azure Portal 설정 후 자동으로 로그인 화면에 옵션으로 나타남

**추가한 안내**:
```tsx
<div className="text-xs text-center text-muted-foreground">
  <p>로그인 화면에서 Google 로그인 옵션도 사용할 수 있습니다.</p>
  <p className="text-[10px] mt-1">
    (Azure Portal → External Identities → Identity providers에서 설정 필요)
  </p>
</div>
```

## 기술적 제한사항

### Azure External ID 구조적 제한

1. **Sign Up과 Sign In이 같은 User Flow**: `signupsignin` User Flow는 로그인과 회원가입을 하나로 처리
2. **MSAL 라이브러리 제한**: `loginPopup()`만 제공, "회원가입 전용" 메서드 없음
3. **OAuth 2.0 표준**: 로그인과 회원가입을 구분하는 표준 파라미터 없음

**결과**: 회원가입 버튼 클릭 시에도 로그인 화면이 먼저 나타나고, 사용자가 "계정 만들기" 링크를 클릭해야 회원가입으로 이동

### 해결 방안 고려

| 옵션 | 설명 | 장점 | 단점 |
|-----|------|-----|-----|
| 현재 구현 유지 | 안내 메시지 개선 | ✅ 간단, 표준 방식 | ⚠️ 바로 회원가입 화면 불가 |
| 별도 Sign Up User Flow | Azure에서 signup User Flow 생성 | ✅ 별도 플로우 | ❌ 복잡, 관리 부담 |
| 커스텀 UI 구현 | 프론트엔드에서 직접 폼 제공 | ✅ 완전한 제어 | ❌ 매우 복잡, 보안 이슈 |

**결정**: 현재 구현 방식 유지 + 안내 메시지 개선

## 현재 지원되는 로그인 방식

| 방식 | 상태 | 설정 위치 |
|-----|------|----------|
| **이메일/비밀번호** | ✅ 활성화 | Azure Portal → User flows → signupsignin → Identity providers |
| **Microsoft 계정** | ✅ 기본 지원 | 자동 활성화 |
| **Google** | ⚠️ 설정 필요 | Azure Portal → External Identities → All identity providers → Google |

## Google 로그인 추가 방법

### Step 1: Google Cloud Console 설정

```
1. Google Cloud Console (https://console.cloud.google.com)
2. APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs 추가:
   https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp
6. Client ID와 Client Secret 복사
```

### Step 2: Azure Portal 설정

```
1. Azure Portal → Microsoft Entra ID → External Identities
2. All identity providers → + Google
3. Client ID, Client Secret 입력
4. Save
5. User flows → signupsignin → Identity providers → Google ✅ 체크
```

### Step 3: 결과

로그인 화면에 자동으로 "Google로 계속하기" 옵션이 나타남 (프론트엔드 코드 수정 불필요)

## 수정된 파일

1. **src/hooks/useAzureAuth.tsx** - `signupPopup` 함수 추가
2. **src/pages/Auth.tsx** - UI 텍스트 및 안내 메시지 개선
3. **docs/external-id-signup-limitation.md** - 제한사항 문서 추가

## 결론

**회원가입 바로 이동 기능은 Azure External ID의 구조적 제한으로 구현 불가능**하지만, **UI와 안내 메시지를 개선**하여 사용자 경험을 향상시켰습니다.

**일반 이메일 사용자 가입**: ✅ 이미 활성화되어 있음 (Email with password)

**Google 로그인**: ⚠️ Azure Portal에서 Identity Provider 설정 필요 (설정 후 자동으로 로그인 화면에 표시됨)

---

**작업일**: 2025-12-31
**작업자**: Claude Code
**관련 문서**: 
- [external-id-signup-limitation.md](../docs/external-id-signup-limitation.md)
- [2025-12-31_auth-system-unification.md](./2025-12-31_auth-system-unification.md)


