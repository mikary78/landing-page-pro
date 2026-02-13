# Google 로그인 redirect_uri_mismatch 에러 해결

## 🔴 에러 원인

`Error 400: redirect_uri_mismatch`는 Google Cloud Console에 등록한 Redirect URI와 실제 요청에서 보내는 URI가 일치하지 않을 때 발생합니다.

## 🔍 해결 방법

### Step 1: Google Cloud Console에서 현재 등록된 URI 확인

1. **Google Cloud Console** 접속: https://console.cloud.google.com
2. 프로젝트 선택
3. **"API 및 서비스"** → **"사용자 인증 정보"** 클릭
4. 방금 만든 **OAuth 2.0 클라이언트 ID** 클릭
5. **"승인된 리디렉션 URI"** 섹션 확인
   - 현재 등록된 URI가 무엇인지 확인

### Step 2: Azure External ID가 실제로 사용하는 URI 확인

Azure External ID는 다음 형식의 Redirect URI를 사용합니다:

```
https://{tenant-name}.ciamlogin.com/{tenant-id}/oauth2/authresp
```

**현재 프로젝트의 정확한 값:**
- Tenant name: `landingpage` (소문자)
- Tenant ID: `64425cef-1c32-4713-bb61-7dcd4939e326`

**정확한 Redirect URI:**
```
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp
```

### Step 3: Google Cloud Console에서 URI 수정

1. **OAuth 2.0 클라이언트 ID** 편집 페이지에서
2. **"승인된 리디렉션 URI"** 섹션
3. 기존 URI가 있다면:
   - ❌ 잘못된 URI 삭제 (휴지통 아이콘 클릭)
4. **"+ URI 추가"** 클릭
5. 다음 URI를 **정확히** 입력:
   ```
   https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp
   ```
6. **"저장"** 클릭

### Step 4: 확인 사항 체크리스트

다음 항목들을 정확히 확인하세요:

- [ ] **HTTPS** 사용 (HTTP 아님)
- [ ] **소문자** `landingpage` (대문자 아님)
- [ ] **슬래시 없음**: 끝에 `/` 없음
- [ ] **공백 없음**: URI 전체에 공백 없음
- [ ] **정확한 경로**: `/oauth2/authresp` (다른 경로 아님)
- [ ] **Tenant ID 정확**: `64425cef-1c32-4713-bb61-7dcd4939e326`

### Step 5: 변경사항 적용 대기

Google Cloud Console의 변경사항은 **5분에서 몇 시간** 걸릴 수 있습니다.

**빠른 테스트:**
1. 5분 대기
2. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
3. 다시 로그인 시도

## 🔧 자주 발생하는 실수

### ❌ 잘못된 예시들:

```
# 대문자 사용
https://Landingpage.ciamlogin.com/...

# 끝에 슬래시
https://landingpage.ciamlogin.com/.../oauth2/authresp/

# HTTP 사용
http://landingpage.ciamlogin.com/...

# 잘못된 경로
https://landingpage.ciamlogin.com/.../oauth2/authorize
https://landingpage.ciamlogin.com/.../oauth2/callback

# 공백 포함
https://landingpage.ciamlogin.com/ 64425cef.../oauth2/authresp
```

### ✅ 올바른 예시:

```
https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp
```

## 🧪 테스트 방법

1. **Google Cloud Console**에서 URI 저장
2. **5분 대기** (변경사항 적용 시간)
3. **브라우저 캐시 삭제**
4. **시크릿 모드**에서 테스트 (캐시 영향 제거)
5. **http://localhost:5173/auth** 접속
6. **"이메일로 로그인"** 클릭
7. **"Google로 계속하기"** 클릭
8. 에러 없이 Google 로그인 화면이 나타나는지 확인

## 📝 추가 확인 사항

### Azure Portal에서도 확인

1. **Azure Portal** → **Microsoft Entra ID** → **External Identities**
2. **All identity providers** → **Google** 클릭
3. **Client ID**와 **Client Secret**이 올바르게 입력되어 있는지 확인

## 💡 팁

- URI는 **대소문자를 구분**합니다
- URI는 **정확히 일치**해야 합니다 (공백, 슬래시 등 모든 문자)
- 변경사항 적용에는 **시간이 걸릴 수 있습니다** (최대 몇 시간)

---

**작성일**: 2025-12-31
**작성자**: Claude Code

