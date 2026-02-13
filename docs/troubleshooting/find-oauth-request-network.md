# Network 탭에서 OAuth redirect_uri 찾는 방법

## 🔍 올바른 요청 찾기

Network 탭에서 **많은 요청**이 표시되지만, 우리가 찾아야 하는 것은 **OAuth 인증 요청**입니다.

---

## 📋 Step-by-Step 가이드

### Step 1: Network 탭 준비

1. **F12** (개발자 도구 열기)
2. **Network** 탭 선택
3. **필터 입력창**에 다음 중 하나 입력:
   - `oauth`
   - `auth`
   - `accounts.google.com`

### Step 2: 로그인 시도

1. **"이메일로 로그인"** 버튼 클릭
2. 팝업 창이 열리면 **"Google로 계속하기"** 클릭
3. Network 탭을 확인

### Step 3: 올바른 요청 찾기

다음과 같은 요청을 찾으세요:

**올바른 요청의 특징:**
- ✅ **Name**: `o/oauth2/v2/auth` 또는 `oauth2/v2/auth` 포함
- ✅ **Domain**: `accounts.google.com`
- ✅ **Method**: `GET`
- ✅ **Type**: `document` 또는 `xhr`

**예시:**
```
Name: o/oauth2/v2/auth?client_id=...&redirect_uri=...
Domain: accounts.google.com
```

### Step 4: 요청 클릭하여 상세 확인

1. **올바른 요청 클릭**
2. **Headers** 탭 선택
3. **Query String Parameters** 섹션 찾기
4. **`redirect_uri`** 파라미터 확인

---

## 🔍 찾기 어려운 경우

### 방법 1: 필터 사용

Network 탭 상단의 **필터 입력창**에:
```
oauth2
```
또는
```
accounts.google.com/o/oauth2
```

입력하면 OAuth 관련 요청만 표시됩니다.

### 방법 2: Type 필터 사용

1. Network 탭 상단의 **Type 필터** 클릭
2. **"Doc"** 또는 **"XHR"** 선택
3. OAuth 요청 찾기

### 방법 3: 시간순 정렬

1. Network 탭에서 **"Time"** 컬럼 클릭 (시간순 정렬)
2. **"Google로 계속하기"** 클릭한 **직후**의 요청 확인
3. `accounts.google.com` 도메인의 요청 찾기

---

## ⚠️ 주의사항

다음 요청들은 **OAuth 요청이 아닙니다**:
- ❌ `gen204` (Google 분석)
- ❌ `contentscript.js` (확장 프로그램)
- ❌ `favicon.ico` (아이콘)
- ❌ `log?format=json` (로그)

**올바른 요청**은 반드시:
- ✅ `accounts.google.com/o/oauth2/v2/auth` 포함
- ✅ `redirect_uri` 파라미터 포함

---

## 💡 대안: 브라우저 주소창 확인

Network 탭에서 찾기 어려우면:

1. **"Google로 계속하기"** 클릭
2. Google 로그인 페이지가 열리면
3. **브라우저 주소창의 URL 전체** 복사
4. URL에서 `redirect_uri=` 부분 찾기

예시:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=...
  &redirect_uri=https://landingpage.ciamlogin.com/.../oauth2/authresp
  &...
```

이 `redirect_uri` 값이 정확한 값입니다!

---

## 📸 스크린샷 예시

올바른 요청은 다음과 같이 보입니다:

```
Name: o/oauth2/v2/auth?client_id=9222c648-3066-455a-aa7e-49cdd9782943&redirect_uri=https%3A%2F%2Flandingpage.ciamlogin.com%2F64425cef-1c32-4713-bb61-7dcd4939e326%2Foauth2%2Fauthresp&...
Domain: accounts.google.com
Type: document
Status: 302 (또는 다른 상태 코드)
```

---

**작성일**: 2025-12-31
**작성자**: Claude Code

