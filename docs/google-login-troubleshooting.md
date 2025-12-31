# Google 로그인 redirect_uri_mismatch 에러 상세 해결

## 🔍 실제 요청 URI 확인 방법

### Step 1: Google 에러 페이지에서 실제 URI 확인

1. **에러 페이지**에서 **"see error details"** 링크 클릭
2. 또는 브라우저 개발자 도구(F12) → **Network** 탭 확인
3. Google OAuth 요청의 **실제 redirect_uri** 확인

### Step 2: Azure Portal에서 Google 설정 확인

Azure Portal에서 Google Identity Provider 설정을 확인해야 합니다:

1. **Azure Portal** → **Microsoft Entra ID** → **External Identities**
2. **All identity providers** → **Google** 클릭
3. 설정 확인:
   - Client ID가 올바른지
   - Client Secret이 올바른지
   - **추가 설정이 있는지 확인**

## 🔧 가능한 원인들

### 원인 1: Azure External ID가 다른 형식의 URI 사용

Azure External ID는 때때로 다음 형식을 사용할 수 있습니다:

```
https://{tenant}.ciamlogin.com/{tenantId}/oauth2/v2.0/authorize
```

또는:

```
https://{tenant}.ciamlogin.com/{tenantId}/oauth2/callback
```

**해결 방법**: Google Cloud Console에 **여러 URI를 모두 추가**:

```
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/callback
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/v2.0/authorize
```

### 원인 2: Google Cloud Console 변경사항 미적용

Google Cloud Console의 변경사항은 **최대 몇 시간** 걸릴 수 있습니다.

**해결 방법**:
1. **24시간 대기** (최악의 경우)
2. 또는 **새 OAuth 클라이언트 ID 생성** (빠른 해결)

### 원인 3: Azure Portal에서 Google 설정 오류

Azure Portal에서 Google Identity Provider를 추가할 때 문제가 있을 수 있습니다.

**해결 방법**:
1. Azure Portal → **All identity providers** → **Google** 삭제
2. 다시 추가:
   - Client ID 입력
   - Client Secret 입력
   - **저장**

### 원인 4: 테넌트 이름 대소문자 문제

Azure External ID는 테넌트 이름을 소문자로 변환하지만, 때때로 대소문자 문제가 발생할 수 있습니다.

**해결 방법**: Google Cloud Console에 **대소문자 변형도 추가**:

```
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp
https://Landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp
```

## 🧪 단계별 디버깅

### Step 1: 실제 요청 URI 확인

1. 브라우저에서 **F12** (개발자 도구 열기)
2. **Network** 탭 선택
3. **"이메일로 로그인"** → **"Google로 계속하기"** 클릭
4. Network 탭에서 **Google OAuth 요청** 찾기
5. **Request URL** 확인 → `redirect_uri` 파라미터 확인

예시:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=...
  &redirect_uri=https://landingpage.ciamlogin.com/.../oauth2/authresp
  &...
```

**이 `redirect_uri` 값**을 Google Cloud Console에 정확히 추가하세요.

### Step 2: Google Cloud Console에서 모든 가능한 URI 추가

Google Cloud Console → OAuth 2.0 클라이언트 ID → 승인된 리디렉션 URI에 **다음 URI들을 모두 추가**:

```
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/callback
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/v2.0/authorize
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/v2.0/token
```

### Step 3: 새 OAuth 클라이언트 ID 생성 (권장)

기존 클라이언트 ID에 문제가 있을 수 있으므로 **새로 생성**하는 것을 권장합니다:

1. Google Cloud Console → **사용자 인증 정보**
2. 기존 OAuth 클라이언트 ID **삭제** (또는 그대로 두고 새로 생성)
3. **"+ 사용자 인증 정보 만들기"** → **"OAuth 클라이언트 ID"**
4. **웹 애플리케이션** 선택
5. **승인된 리디렉션 URI**에 위 URI들 모두 추가
6. **만들기** 클릭
7. **새 Client ID와 Client Secret** 복사
8. **Azure Portal**에서 Google 설정 업데이트:
   - All identity providers → Google → 편집
   - 새 Client ID 입력
   - 새 Client Secret 입력
   - 저장

### Step 4: 캐시 완전 삭제

1. 브라우저 **캐시 삭제** (Ctrl+Shift+Delete)
2. **시크릿 모드**에서 테스트
3. 또는 **다른 브라우저**에서 테스트

## 📝 체크리스트

- [ ] Google Cloud Console에서 실제 요청 URI 확인 (Network 탭)
- [ ] Google Cloud Console에 여러 가능한 URI 모두 추가
- [ ] 새 OAuth 클라이언트 ID 생성
- [ ] Azure Portal에서 Google 설정 업데이트
- [ ] 브라우저 캐시 삭제
- [ ] 시크릿 모드에서 테스트

## 💡 최종 해결 방법 (가장 확실한 방법)

### 방법 1: 새 OAuth 클라이언트 ID 생성

1. **Google Cloud Console** → 새 OAuth 클라이언트 ID 생성
2. **승인된 리디렉션 URI**에 다음 URI들 **모두 추가**:
   ```
   https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp
   https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/callback
   ```
3. **새 Client ID와 Secret** 복사
4. **Azure Portal** → Google 설정 업데이트
5. **24시간 대기** 또는 즉시 테스트

### 방법 2: Azure Portal에서 Google 설정 재설정

1. Azure Portal → **All identity providers** → **Google** 삭제
2. **+ Google** 클릭
3. **새 Client ID와 Secret** 입력
4. **저장**
5. **User flows** → **signupsignin** → **Identity providers** → **Google** 체크
6. **저장**

---

**작성일**: 2025-12-31
**작성자**: Claude Code

