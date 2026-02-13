# Google Redirect URI 미스매치 문제 해결 - 실제 URI 확인

## 🔍 문제 상황

Google Cloud Console에 URI를 정확히 입력했는데도 계속 `redirect_uri_mismatch` 에러가 발생합니다.

## 💡 해결 방법: 실제 요청 URI 확인

Azure External ID가 Google에 보내는 **실제 redirect URI**를 확인해야 합니다.

---

## 📋 Step 1: 브라우저 Network 탭에서 실제 URI 확인

### 방법 1: 개발자 도구 사용

1. **브라우저에서 F12** (개발자 도구 열기)
2. **Network** 탭 선택
3. **필터**: `google` 또는 `oauth` 입력
4. **"이메일로 로그인"** → **"Google로 계속하기"** 클릭
5. Network 탭에서 **Google OAuth 요청** 찾기:
   - `accounts.google.com/o/oauth2/v2/auth` 요청 찾기
6. 요청 클릭 → **Headers** 탭 → **Query String Parameters** 확인
7. **`redirect_uri`** 파라미터 값 확인

**예시**:
```
redirect_uri=https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/???
```

이 값이 **정확히** Google Cloud Console에 등록되어 있어야 합니다.

---

## 📋 Step 2: Azure Portal에서 확인

Azure Portal에서 Google Identity Provider 설정을 확인:

1. **Azure Portal** → **Microsoft Entra ID** → **External Identities**
2. **All identity providers** → **Google** 클릭
3. 설정 확인:
   - Client ID
   - Client Secret
   - **추가 설정이나 Redirect URI 필드가 있는지 확인**

---

## 📋 Step 3: Azure Portal "Run user flow"로 확인

1. **Azure Portal** → **Microsoft Entra ID** → **External Identities** → **User flows**
2. **signupsignin** 클릭
3. 상단의 **"Run user flow"** 버튼 클릭
4. 로그인 화면에서 **"Google로 계속하기"** 클릭
5. 브라우저 주소창의 **전체 URL** 복사
6. URL에서 `redirect_uri` 파라미터 확인

---

## 🔧 Step 4: Google Cloud Console에 정확한 URI 추가

Network 탭에서 확인한 **정확한 redirect_uri 값**을 Google Cloud Console에 추가:

1. **Google Cloud Console** → **사용자 인증 정보**
2. OAuth 2.0 클라이언트 ID 클릭
3. **승인된 리디렉션 URI** 섹션
4. **기존 URI 모두 삭제** (또는 그대로 두고 새로 추가)
5. Network 탭에서 확인한 **정확한 URI** 추가
6. **저장**

---

## ⚠️ 주의사항

### URI 형식 확인

Azure External ID가 사용하는 redirect URI는 다음 중 하나일 수 있습니다:

```
# 형식 1 (가장 일반적)
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp

# 형식 2
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/callback

# 형식 3
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/v2.0/authorize

# 형식 4 (User Flow 포함)
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/B2C_1_signupsignin/oauth2/authresp
```

**Network 탭에서 확인한 정확한 값**을 사용하세요!

---

## 🧪 테스트 방법

1. Network 탭에서 실제 redirect_uri 확인
2. Google Cloud Console에 정확히 추가
3. **5-10분 대기** (변경사항 적용)
4. 브라우저 캐시 삭제
5. 시크릿 모드에서 테스트

---

## 💡 최종 해결책

만약 위 방법으로도 해결되지 않으면:

1. **Google Cloud Console**에서 **새 OAuth 클라이언트 ID 생성**
2. Network 탭에서 확인한 **정확한 redirect_uri** 추가
3. **새 Client ID와 Secret** 복사
4. **Azure Portal** → Google 설정 업데이트
5. **24시간 대기** 후 테스트

---

**작성일**: 2025-12-31
**작성자**: Claude Code

