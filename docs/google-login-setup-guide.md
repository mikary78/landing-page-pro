# Google 로그인 설정 가이드

Azure External ID에 Google Identity Provider를 추가하여 Google 계정으로 로그인할 수 있도록 설정하는 방법입니다.

---

## 🎯 전체 흐름

1. **Google Cloud Console**에서 OAuth 2.0 클라이언트 생성
2. **Azure Portal**에서 Google Identity Provider 추가
3. **User Flow**에 Google 연결

---

## 📋 Part 1: Google Cloud Console 설정

### Step 1-1: Google Cloud Console 접속

1. 브라우저에서 **https://console.cloud.google.com** 접속
2. Google 계정으로 로그인

### Step 1-2: 프로젝트 선택 또는 생성

**프로젝트가 없는 경우:**
1. 상단 메뉴바에서 **프로젝트 선택 드롭다운** 클릭 (현재 프로젝트 이름 옆)
2. **"새 프로젝트"** 클릭
3. 프로젝트 이름 입력 (예: `landing-page-pro`)
4. **"만들기"** 클릭
5. 프로젝트가 생성될 때까지 대기 (1-2분)

**프로젝트가 있는 경우:**
- 상단 메뉴바에서 원하는 프로젝트 선택

### Step 1-3: OAuth 동의 화면 설정

1. 왼쪽 햄버거 메뉴(☰) 클릭
2. **"API 및 서비스"** → **"OAuth 동의 화면"** 클릭
3. 사용자 유형 선택:
   - **"외부"** 선택 (일반 사용자)
   - **"만들기"** 클릭

4. **앱 정보** 입력:
   - **앱 이름**: `Landing Page Pro` (원하는 이름)
   - **사용자 지원 이메일**: 본인 이메일 선택
   - **앱 로고**: (선택사항) 업로드 가능
   - **앱 도메인**: (선택사항)
   - **개발자 연락처 정보**: 본인 이메일 입력
   - **"저장 후 계속"** 클릭

5. **범위** 설정:
   - 기본 범위 그대로 두고 **"저장 후 계속"** 클릭

6. **테스트 사용자** (선택사항):
   - **"저장 후 계속"** 클릭

7. **요약**:
   - 내용 확인 후 **"대시보드로 돌아가기"** 클릭

### Step 1-4: OAuth 2.0 클라이언트 ID 생성

1. 왼쪽 메뉴에서 **"API 및 서비스"** → **"사용자 인증 정보"** 클릭
   - 또는 상단 검색창에서 "사용자 인증 정보" 검색

2. 상단의 **"+ 사용자 인증 정보 만들기"** 클릭
3. 드롭다운에서 **"OAuth 클라이언트 ID"** 선택

4. **애플리케이션 유형** 선택:
   - **"웹 애플리케이션"** 선택

5. **이름** 입력:
   - 예: `Landing Page Pro - Azure External ID`

6. **승인된 리디렉션 URI** 추가:
   - **"+ URI 추가"** 클릭
   - 다음 URI를 정확히 입력:
     ```
     https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp
     ```
   - ⚠️ **주의**: 
     - HTTP가 아닌 **HTTPS** 사용
     - 끝에 슬래시(/) 없이 정확히 입력
     - 공백 없이 입력

7. **"만들기"** 클릭

8. **팝업 창이 나타남**:
   - **Client ID** (긴 문자열) 복사
   - **Client Secret** (긴 문자열) 복사
   - ⚠️ **중요**: 이 두 값을 안전한 곳에 저장하세요! (나중에 Azure Portal에서 사용)

9. **"확인"** 클릭하여 팝업 닫기

### ✅ Google Cloud Console 설정 완료

이제 다음 정보를 확보했습니다:
- ✅ **Client ID**: `xxxxx.apps.googleusercontent.com`
- ✅ **Client Secret**: `GOCSPX-xxxxx`

이 두 값을 Azure Portal에서 사용합니다.

---

## 📋 Part 2: Azure Portal 설정

### Step 2-1: Azure Portal 접속

1. 브라우저에서 **https://portal.azure.com** 접속
2. Microsoft 계정으로 로그인

### Step 2-2: Microsoft Entra ID 메뉴 이동

1. 상단 검색창에 **"Microsoft Entra ID"** 입력
2. **"Microsoft Entra ID"** 클릭
3. 또는 왼쪽 메뉴에서 **"Microsoft Entra ID"** 선택

### Step 2-3: External Identities 메뉴 이동

1. 왼쪽 메뉴에서 **"External Identities"** 클릭
   - 메뉴가 보이지 않으면 **"관리"** 섹션을 펼쳐보세요

### Step 2-4: All identity providers 메뉴 이동

1. **"External Identities"** 페이지에서
2. 왼쪽 메뉴에서 **"All identity providers"** 클릭

### Step 2-5: Google Identity Provider 추가

1. 상단의 **"+ Google"** 버튼 클릭
   - 또는 **"+ 새 ID 공급자"** → **"Google"** 선택

2. **"Google"** 설정 페이지가 열림

3. **Client ID** 입력:
   - Google Cloud Console에서 복사한 **Client ID** 붙여넣기
   - 예: `123456789-abcdefg.apps.googleusercontent.com`

4. **Client Secret** 입력:
   - Google Cloud Console에서 복사한 **Client Secret** 붙여넣기
   - 예: `GOCSPX-1234567890abcdef`

5. 하단의 **"저장"** 버튼 클릭

6. 저장 완료 메시지 확인

### ✅ Google Identity Provider 추가 완료

---

## 📋 Part 3: User Flow에 Google 연결

### Step 3-1: User Flow 메뉴 이동

1. Azure Portal에서 **Microsoft Entra ID** 메뉴로 돌아가기
2. 왼쪽 메뉴에서 **"External Identities"** 클릭
3. **"User flows"** 클릭

### Step 3-2: signupsignin User Flow 선택

1. User flows 목록에서 **"signupsignin"** 클릭
   - 목록이 보이지 않으면 새로고침

### Step 3-3: Identity providers 설정

1. 왼쪽 메뉴에서 **"Settings"** → **"Identity providers"** 클릭
   - 또는 **"설정"** → **"ID 공급자"**

2. **Identity providers** 목록이 표시됨:
   - ✅ **Email with password** (이미 체크되어 있음)
   - ☐ **Google** (아직 체크 안됨)

3. **Google** 체크박스 ✅ 클릭

4. 상단의 **"저장"** 버튼 클릭

5. 저장 완료 메시지 확인

### ✅ User Flow 설정 완료

---

## 🧪 테스트 방법

### Step 1: 개발 서버 실행

```bash
npm run dev
```

### Step 2: 브라우저에서 테스트

1. **http://localhost:5173/auth** 접속
2. **"이메일로 로그인"** 버튼 클릭
3. 로그인 팝업 창이 열림
4. 화면에 **"Google로 계속하기"** 또는 **"Continue with Google"** 버튼이 표시되는지 확인

### Step 3: Google 로그인 테스트

1. **"Google로 계속하기"** 버튼 클릭
2. Google 계정 선택 화면 표시
3. Google 계정 선택
4. 권한 승인
5. 로그인 완료

---

## ⚠️ 문제 해결

### 문제 1: "Google로 계속하기" 버튼이 보이지 않음

**원인**: User Flow에 Google이 연결되지 않음

**해결**:
1. Azure Portal → User flows → signupsignin → Identity providers
2. Google 체크박스가 ✅ 체크되어 있는지 확인
3. 저장 버튼 클릭

### 문제 2: Google 로그인 시 "redirect_uri_mismatch" 에러

**원인**: Google Cloud Console의 Redirect URI가 잘못됨

**해결**:
1. Google Cloud Console → APIs & Services → Credentials
2. OAuth 2.0 Client ID 클릭
3. "승인된 리디렉션 URI" 확인:
   ```
   https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/oauth2/authresp
   ```
4. 정확히 일치하는지 확인 (HTTPS, 슬래시 없음)

### 문제 3: Azure Portal에서 "Google" 옵션이 보이지 않음

**원인**: External Identities 메뉴가 활성화되지 않음

**해결**:
1. Azure Portal → Microsoft Entra ID → Overview
2. "External Identities" 메뉴가 보이는지 확인
3. 보이지 않으면 Azure 구독/라이선스 확인 필요

### 문제 4: Client Secret을 잃어버림

**해결**:
1. Google Cloud Console → APIs & Services → Credentials
2. OAuth 2.0 Client ID 클릭
3. **"키 삭제"** → 새 Client Secret 생성
4. Azure Portal에서 새 Client Secret으로 업데이트

---

## 📝 체크리스트

Google 로그인 설정 완료 체크리스트:

- [ ] Google Cloud Console 프로젝트 생성
- [ ] OAuth 동의 화면 설정 완료
- [ ] OAuth 2.0 Client ID 생성
- [ ] Redirect URI 정확히 입력
- [ ] Client ID 복사
- [ ] Client Secret 복사
- [ ] Azure Portal → All identity providers → Google 추가
- [ ] Client ID 입력
- [ ] Client Secret 입력
- [ ] User flows → signupsignin → Identity providers → Google 체크
- [ ] 저장 완료
- [ ] 브라우저에서 테스트

---

## 🔗 참고 자료

- [Azure External ID - Google 설정 공식 문서](https://learn.microsoft.com/en-us/azure/active-directory/external-identities/google-federation)
- [Google Cloud Console](https://console.cloud.google.com)
- [Azure Portal](https://portal.azure.com)

---

**작성일**: 2025-12-31
**작성자**: Claude Code

