# 2025-12-31: Microsoft Entra External ID 인증 구현 및 문제 해결

## 작업 개요
Microsoft Entra External ID (B2C 후속 서비스)를 사용한 이메일/비밀번호 인증 구현 및 여러 문제 해결 시도

## 주요 작업 내용

### 1. User Flows 발견 및 구성
- Azure Portal에서 **signupsignin** User flow 생성 완료
- Identity providers: Email with password 설정
- User attributes: Email Address, Display Name 설정
- 위치: External Identities → User flows

### 2. App Registration 설정
**문제**: App registrations에 landing-page-pro 앱이 없음
**해결**: 새로운 App Registration 생성
- 앱 이름: landing-page-pro
- Client ID: `9222c648-3066-455a-aa7e-49cdd9782943`
- Redirect URI: `http://localhost:5173` (Single-page application)
- Authentication 설정:
  - Implicit grant: Access tokens, ID tokens 체크
  - Supported account types: External ID 사용자 허용

### 3. 환경 변수 업데이트
`.env` 파일 수정:
```env
VITE_ENTRA_TENANT_NAME="Landingpage"
VITE_ENTRA_TENANT_ID="64425cef-1c32-4713-bb61-7dcd4939e326"
VITE_ENTRA_CLIENT_ID="9222c648-3066-455a-aa7e-49cdd9782943"
VITE_ENTRA_REDIRECT_URI="http://localhost:5173"
```

### 4. 인증 방식 변경
**Popup → Redirect → Popup**으로 여러 번 시도

최종적으로 Popup 방식 사용:
- `src/pages/Auth.tsx`: `loginPopup()` 사용
- Cross-Origin-Opener-Policy 에러 발생으로 인한 문제

### 5. 리다이렉트 로직 수정
`src/pages/Auth.tsx`의 로그인 후 리다이렉트 구현:

```typescript
useEffect(() => {
  console.log('[Auth] Checking redirect:', { isAuthenticated, user, loading });
  if (isAuthenticated && user && user.id) {
    console.log('[Auth] User authenticated, redirecting to home...');
    navigate('/', { replace: true });
  }
}, [isAuthenticated, user, navigate]);
```

**변경 이력**:
1. `isAuthenticated && user` 체크
2. `isAuthenticated && !loading` 체크
3. `isAuthenticated && user && user.email` 체크
4. `isAuthenticated && user && user.id` 체크 (최종)

**이유**: user 객체의 email이 빈 문자열("")로 로드됨

### 6. 포트 충돌 해결
- 여러 npm 프로세스가 5173 포트 사용 중
- `taskkill //F //PID 36088`로 프로세스 종료
- 서버 재시작으로 정상 포트(5173) 사용

## 발생한 문제들

### 문제 1: 로그인 버튼 클릭 시 팝업창이 나타났다가 사라짐
**원인**: Cross-Origin-Opener-Policy 에러
```
Cross-Origin-Opener-Policy policy would block the window.closed call.
await in acquireTokenPopupAsync
```

**시도한 해결책**:
- Redirect 방식으로 변경 → 사용자 경험 저하
- Popup 방식으로 복귀 → 여전히 에러 발생

### 문제 2: 로그인 성공 후 페이지 리다이렉트 안 됨
**증상**:
```javascript
isAuthenticated: true
user: { id: "2c121ffe-f922-4f76-b050-4f78171fecdb", displayName: "sungje", email: "" }
```
로그인은 성공했으나 `/auth` 페이지에 머무름

**원인**:
- `user` 객체가 `null` → 객체로 변경될 때 useEffect가 재실행되지 않음
- `user.email`이 빈 문자열로 validation 실패

**해결 시도**:
- useEffect dependency에 `user` 추가
- `user.email` 체크 → `user.id` 체크로 변경

### 문제 3: 회원가입 시 "계정을 찾을 수 없습니다" 에러
**원인**: Self-service sign-up이 제대로 구성되지 않음
**상태**: 미해결 - User flow는 생성되었으나 앱과 연결 필요

### 문제 4: "앱이 게시되지 않음" 경고
**원인**: Enterprise application 설정 필요
**해결책**:
- Enterprise applications → landing-page-pro → Properties
- Assignment required? → No 설정

## 현재 상태

### 작동하는 것
- ✅ User flow (signupsignin) 생성 완료
- ✅ App registration 설정 완료
- ✅ MSAL 초기화 성공
- ✅ 로그인 팝업 창 열림
- ✅ 로그인 성공 및 토큰 획득
- ✅ 사용자 정보 저장 (`isAuthenticated: true`, `user.id` 존재)

### 작동하지 않는 것
- ❌ 로그인 팝업창이 즉시 닫힘 (Cross-Origin 에러)
- ❌ 로그인 후 자동 리다이렉트 안 됨
- ❌ 회원가입 플로우 (계정 등록 링크는 작동, 회원가입 버튼은 로그인과 동일)
- ❌ `/auth` 페이지에서 홈으로 리다이렉트 안 됨 (로그인된 상태에서)

## 콘솔 로그 분석

### 성공적인 로그인 로그
```javascript
[Auth] Checking redirect: {
  isAuthenticated: true,
  user: {
    displayName: "sungje",
    email: "",
    id: "2c121ffe-f922-4f76-b050-4f78171fecdb",
    name: ""
  },
  loading: false
}
```

### 리다이렉트 시도 로그
```
[Auth] User authenticated, redirecting to home...
```

하지만 실제로 리다이렉트되지 않음 (원인 불명)

## 관련 파일

### 수정된 파일
1. **src/config/authConfig.ts**
   - External ID authority 설정
   - MSAL configuration

2. **src/components/AuthProvider.tsx**
   - MSAL instance 싱글톤 패턴
   - 초기화 로직 중복 방지

3. **src/pages/Auth.tsx**
   - 로그인/회원가입 핸들러
   - 리다이렉트 로직 (여러 번 수정)

4. **src/hooks/useAzureAuth.tsx**
   - loginPopup, loginRedirect 함수
   - 사용자 정보 추출 로직

5. **.env**
   - 새 Client ID 설정

### 생성된 문서
1. `docs/external-id-user-flows-guide.md`
   - User flows 찾기 및 구성 가이드
   - Self-service sign-up 활성화 방법

## 미해결 이슈

### 1. Cross-Origin-Opener-Policy 에러
**에러 메시지**:
```
Cross-Origin-Opener-Policy policy would block the window.closed call.
await in acquireTokenPopupAsync
```

**영향**: 로그인 팝업이 열렸다가 즉시 닫힘

**해결 필요**:
- Azure Portal에서 CORS 설정 확인
- App Registration → Authentication → Platform configurations 재확인
- Redirect URI가 올바르게 설정되었는지 확인

### 2. 리다이렉트 실행 안 됨
**증상**: `navigate('/', { replace: true })` 호출되지만 페이지 이동 없음

**가능한 원인**:
- React Router 설정 문제
- useEffect 실행 타이밍 문제
- 다른 effect와의 충돌

**시도해볼 것**:
- `window.location.href = '/'` 직접 사용
- `useNavigate` 대신 `<Navigate>` 컴포넌트 사용

### 3. 회원가입 버튼과 로그인 버튼이 같은 동작
**원인**: External ID의 User flow는 로그인/회원가입을 하나의 플로우로 처리

**화면에서 확인된 것**:
- "계정 등록" 링크 클릭 → 회원가입 화면으로 이동 (정상)
- "회원가입" 버튼 클릭 → 로그인 팝업 (같은 동작)

**해결 방법**:
- User flow를 앱에 연결
- External Identities → User flows → signupsignin → Applications → Add application

## 다음 단계

1. **Azure Portal 설정 재확인**
   - App Registration → Authentication → Redirect URIs
   - App Registration → Authentication → Implicit grant 설정
   - User flows → signupsignin → Applications에 앱 연결

2. **리다이렉트 문제 해결**
   - Auth.tsx에서 다른 방식의 리다이렉트 시도
   - React Router 라우팅 확인

3. **Cross-Origin 에러 해결**
   - Redirect 방식으로 완전히 전환 고려
   - 또는 Azure Portal CORS 설정 추가

4. **회원가입 플로우 개선**
   - "계정 등록" 링크가 작동하므로 UI 안내 추가
   - 또는 "회원가입" 버튼도 같은 링크로 연결

## 기술 스택
- **인증**: Microsoft Entra External ID (CIAM)
- **라이브러리**: @azure/msal-browser, @azure/msal-react
- **프레임워크**: React, React Router
- **빌드 도구**: Vite

## 참고 자료
- [External ID User Flows Guide](../docs/external-id-user-flows-guide.md)
- [External ID Detailed Setup](../docs/external-id-detailed-setup.md)
- [Azure Authentication Config](../docs/external-id-migration-summary.md)
