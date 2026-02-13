# Phase 3: Azure AD B2C 인증 시스템 구축

**날짜**: 2025-12-17
**목적**: Supabase Auth → Azure AD B2C 전환

---

## 📋 사전 준비

- [x] Azure 구독 활성화
- [x] Azure Portal 접근 권한
- [ ] 도메인 이름 결정 (예: `landingpagepro`)

---

## 🏗️ Step 1: Azure AD B2C 테넌트 생성

### 1.1 Azure Portal에서 생성

1. **Azure Portal** 접속: https://portal.azure.com

2. **리소스 만들기** → "Azure Active Directory B2C" 검색

3. **"만들기"** 클릭

4. **"새 Azure AD B2C 테넌트 만들기"** 선택

5. 설정 입력:
   ```
   조직 이름: Landing Page Pro
   초기 도메인 이름: landingpagepro
   국가/지역: 대한민국
   구독: Founders Hub Sponsorship
   리소스 그룹: rg-landing-page-pro (기존 선택)
   ```

6. **검토 + 만들기** → **만들기**

7. ⏱️ 생성 완료 대기 (1-2분)

8. **디렉터리 전환**:
   - Portal 우측 상단 프로필 → "디렉터리 전환"
   - `landingpagepro.onmicrosoft.com` 선택

---

### 1.2 테넌트 정보 확인

생성 후 다음 정보를 기록하세요:

```
Tenant Name: landingpagepro
Tenant ID: <복사해서 기록>
Domain: landingpagepro.onmicrosoft.com
```

---

## 👤 Step 2: 사용자 플로우 생성

### 2.1 가입 및 로그인 플로우

1. Azure AD B2C 메뉴 → **"사용자 흐름"** → **"새 사용자 흐름"**

2. **"가입 및 로그인"** 선택

3. 버전: **추천** 선택

4. 설정:
   ```
   이름: B2C_1_signupsignin
   ID 공급자: 이메일 가입 ✅
   다단계 인증: 사용 안 함 (나중에 활성화 가능)
   ```

5. **사용자 특성 및 토큰 클레임** 선택:

   **수집할 특성** (가입 시):
   - ✅ 표시 이름 (Display Name)
   - ✅ 이메일 주소 (Email Address)
   - ✅ 이름 (Given Name) - 선택사항
   - ✅ 성 (Surname) - 선택사항

   **반환할 클레임** (JWT 토큰에 포함):
   - ✅ 표시 이름 (Display Name)
   - ✅ 이메일 주소 (Email Addresses)
   - ✅ ID 공급자 (Identity Provider)
   - ✅ 사용자의 개체 ID (User's Object ID)

6. **만들기** 클릭

---

### 2.2 프로필 편집 플로우 (선택사항)

1. **"새 사용자 흐름"** → **"프로필 편집"**

2. 설정:
   ```
   이름: B2C_1_profileedit
   ID 공급자: 로컬 계정 로그인
   ```

3. 특성: 표시 이름, 이메일 주소 수정 허용

4. **만들기**

---

### 2.3 비밀번호 재설정 플로우 (선택사항)

1. **"새 사용자 흐름"** → **"비밀번호 재설정"**

2. 설정:
   ```
   이름: B2C_1_passwordreset
   ```

3. **만들기**

---

## 📱 Step 3: 애플리케이션 등록

### 3.1 SPA 애플리케이션 등록

1. Azure AD B2C → **"앱 등록"** → **"새 등록"**

2. 설정:
   ```
   이름: Landing Page Pro - Web App
   지원되는 계정 유형: 이 조직 디렉터리의 계정만 (landingpagepro만)
   리디렉션 URI:
     - 플랫폼: 단일 페이지 애플리케이션 (SPA)
     - URI: http://localhost:5173/auth/callback
   ```

3. **등록** 클릭

4. 앱 등록 완료 후 **개요** 페이지에서 확인:
   ```
   애플리케이션 (클라이언트) ID: <복사해서 기록>
   디렉터리 (테넌트) ID: <복사해서 기록>
   ```

---

### 3.2 리디렉션 URI 추가 (프로덕션용)

1. **인증** 메뉴 → **플랫폼 구성** → **단일 페이지 애플리케이션**

2. URI 추가:
   ```
   http://localhost:5173/auth/callback
   https://app-landing-page-pro.azurewebsites.net/auth/callback
   ```

3. **로그아웃 URL**:
   ```
   http://localhost:5173
   https://app-landing-page-pro.azurewebsites.net
   ```

4. **암시적 허용 및 하이브리드 흐름**:
   - ✅ 액세스 토큰 (SPA용)
   - ✅ ID 토큰 (SPA용)

5. **저장**

---

### 3.3 API 권한 설정 (선택사항)

1. **API 권한** 메뉴 → **권한 추가**

2. **내 API** → (나중에 백엔드 API 등록 시 추가)

3. 기본 권한 확인:
   - `openid`
   - `offline_access`
   - `profile`

---

## 🔑 Step 4: 클라이언트 시크릿 생성 (백엔드용)

### 4.1 시크릿 생성

1. **인증서 및 비밀** 메뉴 → **새 클라이언트 암호**

2. 설정:
   ```
   설명: Backend API Secret
   만료: 24개월
   ```

3. **추가** 클릭

4. **⚠️ 중요**: 생성된 값(Value) 즉시 복사 (다시 볼 수 없음)
   ```
   클라이언트 암호 값: <복사해서 안전하게 보관>
   ```

---

## 📝 Step 5: .env.azure 파일 업데이트

생성한 정보를 `.env.azure` 파일에 추가하세요:

```env
# ==============================================
# Azure AD B2C Authentication
# ==============================================
AZURE_AD_B2C_TENANT_NAME=landingpagepro
AZURE_AD_B2C_TENANT_ID=<Step 1.2에서 복사한 Tenant ID>
AZURE_AD_B2C_DOMAIN=landingpagepro.b2clogin.com

# Application (Client) Registration
AZURE_AD_B2C_CLIENT_ID=<Step 3.1에서 복사한 Client ID>
AZURE_AD_B2C_CLIENT_SECRET=<Step 4.1에서 복사한 Secret>

# User Flows
AZURE_AD_B2C_POLICY_SIGNIN=B2C_1_signupsignin
AZURE_AD_B2C_POLICY_PROFILE_EDIT=B2C_1_profileedit
AZURE_AD_B2C_POLICY_PASSWORD_RESET=B2C_1_passwordreset

# Redirect URIs
AZURE_AD_B2C_REDIRECT_URI=http://localhost:5173/auth/callback
AZURE_AD_B2C_POST_LOGOUT_REDIRECT_URI=http://localhost:5173

# 프론트엔드용 (VITE_ 접두사)
VITE_AZURE_AD_B2C_CLIENT_ID=<Client ID>
VITE_AZURE_AD_B2C_TENANT_NAME=landingpagepro
VITE_AZURE_AD_B2C_POLICY_SIGNIN=B2C_1_signupsignin
VITE_AZURE_AD_B2C_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_AZURE_AD_B2C_AUTHORITY=https://landingpagepro.b2clogin.com/landingpagepro.onmicrosoft.com/B2C_1_signupsignin
```

---

## 🧪 Step 6: 테스트 사용자 생성 (선택사항)

### 6.1 수동으로 테스트 사용자 생성

1. Azure AD B2C → **"사용자"** → **"새 사용자"**

2. **"Azure AD B2C 사용자 만들기"** 선택

3. 설정:
   ```
   사용자 이름: testuser@landingpagepro.onmicrosoft.com
   이름: Test
   표시 이름: Test User
   암호: TempPassword123!
   ```

4. **만들기**

---

### 6.2 사용자 플로우 테스트

1. **"사용자 흐름"** → **B2C_1_signupsignin** 선택

2. **"사용자 흐름 실행"** 클릭

3. 설정:
   ```
   애플리케이션: Landing Page Pro - Web App
   회신 URL: http://localhost:5173/auth/callback
   ```

4. **"사용자 흐름 실행"** 버튼 클릭

5. 브라우저에서 가입/로그인 테스트

6. 성공 시 Redirect URI로 이동 + JWT 토큰 확인

---

## 🎨 Step 7: 사용자 인터페이스 커스터마이징 (선택사항)

### 7.1 페이지 레이아웃 커스터마이징

1. **"회사 브랜딩"** → **"페이지 레이아웃 사용자 지정"**

2. 로고, 배경색, 배너 이미지 업로드

3. HTML/CSS 템플릿 수정 (고급)

---

## ✅ 체크리스트

### Azure Portal 작업
- [ ] Azure AD B2C 테넌트 생성
- [ ] 디렉터리 전환 확인
- [ ] 사용자 플로우 3개 생성 (가입/로그인, 프로필 편집, 비밀번호 재설정)
- [ ] 애플리케이션 등록
- [ ] 리디렉션 URI 설정
- [ ] 클라이언트 시크릿 생성

### 정보 수집
- [ ] Tenant ID 기록
- [ ] Client ID 기록
- [ ] Client Secret 기록
- [ ] `.env.azure` 파일 업데이트

### 테스트
- [ ] 테스트 사용자 생성
- [ ] 사용자 플로우 실행 테스트
- [ ] JWT 토큰 발급 확인

---

## 📊 예상 소요 시간

| 단계 | 시간 |
|------|------|
| 테넌트 생성 | 5분 |
| 사용자 플로우 설정 | 10분 |
| 애플리케이션 등록 | 5분 |
| 테스트 | 5분 |
| **총계** | **25분** |

---

## 🔍 다음 단계

Phase 3 완료 후:
1. ⏭️ 프론트엔드 MSAL 라이브러리 통합
2. ⏭️ 백엔드 JWT 검증 로직
3. ⏭️ Supabase Auth 제거

---

## 🆘 문제 해결

### 문제 1: "테넌트를 만들 수 없습니다"
**원인**: 구독 제한
**해결**: Azure 지원팀 문의 (무료 구독은 1개 B2C만 가능)

### 문제 2: "리디렉션 URI 불일치"
**원인**: 정확한 URI 미등록
**해결**: `http://localhost:5173/auth/callback` 정확히 입력 (슬래시 주의)

### 문제 3: "토큰을 검증할 수 없습니다"
**원인**: Authority URL 오류
**해결**: `https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}` 형식 확인

---

**작성일**: 2025-12-17
**다음**: PHASE3-MSAL-INTEGRATION.md (프론트엔드 통합 가이드)
