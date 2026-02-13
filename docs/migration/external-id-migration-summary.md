# Microsoft Entra External ID 마이그레이션 완료 요약

**날짜**: 2025-12-30
**목적**: 일반 사용자들이 이메일/비밀번호로 회원가입 및 로그인할 수 있도록 Microsoft Entra External ID로 전환

**참고**: Azure AD B2C는 2025년 5월 1일부로 신규 판매 중단되었으며, Microsoft Entra External ID가 후속 서비스입니다.

## 변경 사항 요약

### 1. Frontend 변경사항

#### 수정된 파일:
1. **[src/config/authConfig.ts](../src/config/authConfig.ts)**
   - External ID 테넌트 설정 추가
   - External ID Policies (User Flows) 정의
   - 도메인 변경: `b2clogin.com` → `ciamlogin.com`
   - User Flow 이름 단순화 (B2C_1_ prefix 제거)

2. **[src/hooks/useAzureAuth.tsx](../src/hooks/useAzureAuth.tsx)**
   - `resetPassword()` - External ID 비밀번호 재설정 플로우 지원
   - `editProfile()` - External ID 프로필 편집 플로우 지원
   - External ID policies import 추가
   - 주석 업데이트 (B2C → External ID)

3. **[src/pages/Auth.tsx](../src/pages/Auth.tsx)**
   - Supabase 인증 제거
   - External ID 전용 로그인/회원가입 UI로 변경
   - Sign In / Sign Up 버튼 분리
   - loginPopup 사용 (리다이렉트 대신)

### 2. Backend 변경사항

#### 수정된 파일:
1. **[azure-functions/src/middleware/auth.ts](../azure-functions/src/middleware/auth.ts)**
   - External ID JWKS URI 지원: `https://{tenant}.ciamlogin.com/{tenant}.onmicrosoft.com/discovery/v2.0/keys`
   - External ID issuer 형식 지원: `https://{tenant}.ciamlogin.com/{tenantId}/v2.0`
   - External ID audience 형식 지원
   - 일반 Entra ID와 External ID 모두 지원하도록 하위호환성 유지

### 3. 환경 변수 변경

#### Frontend (.env)
```env
# 변경 전 (일반 Entra ID)
VITE_ENTRA_TENANT_ID="tenant-id"
VITE_ENTRA_CLIENT_ID="client-id"
VITE_ENTRA_AUTHORITY="https://login.microsoftonline.com/{tenantId}"

# 변경 후 (Microsoft Entra External ID)
VITE_ENTRA_TENANT_NAME="parandurume"
VITE_ENTRA_CLIENT_ID="client-id"
VITE_EXTERNAL_ID_SIGNUP_SIGNIN="signupsignin"
VITE_EXTERNAL_ID_PROFILE_EDIT="profileediting"
VITE_EXTERNAL_ID_PASSWORD_RESET="passwordreset"
VITE_EXTERNAL_ID_KNOWN_AUTHORITIES="parandurume.ciamlogin.com"
```

#### Backend (Azure Functions Application Settings)
```env
# 추가 필요
ENTRA_TENANT_NAME="parandurume"
ENTRA_TENANT_ID="your-external-id-tenant-id"
ENTRA_CLIENT_ID="your-external-id-client-id"
```

## Azure Portal 설정 단계

### 필수 설정 (순서대로 진행)

1. ✅ **[External ID 테넌트 생성](entra-external-id-setup-guide.md#2-external-id-테넌트-생성)**
   - Organization name 입력
   - Initial domain name 설정 (고유해야 함)
   - Tenant type: **External (customers)** 선택
   - 리소스 그룹 선택

2. ✅ **[앱 등록](entra-external-id-setup-guide.md#3-애플리케이션-등록)**
   - 앱 이름 설정
   - Redirect URIs 추가 (http://localhost:5173, production URL)
   - Platform: **Single-page application (SPA)**
   - API scope 추가 (`access_as_user`)

3. ✅ **[User Flows 생성](entra-external-id-setup-guide.md#4-사용자-플로우-구성)**
   - Sign up and sign in: `signupsignin`
   - Profile editing: `profileediting`
   - Password reset: `passwordreset`

4. ⏭️ **[소셜 로그인 추가](entra-external-id-setup-guide.md#5-소셜-로그인-설정-선택사항)** (선택사항)
   - Google
   - Facebook
   - Apple

## 다음 단계

### 즉시 해야 할 일:

1. **Azure Portal에서 External ID 설정** (30-60분 소요)
   - [설정 가이드 전체 문서](entra-external-id-setup-guide.md) 참조
   - 각 단계마다 체크리스트 확인

2. **환경 변수 업데이트**
   - Frontend: `.env` 파일 수정 ([예시 파일](.env.external-id.example) 참조)
   - Backend: Azure Functions Application Settings 업데이트

3. **테스트**
   ```bash
   # Frontend
   npm run dev

   # 테스트 시나리오:
   # 1. http://localhost:5173/auth 접속
   # 2. "회원가입" 버튼 클릭
   # 3. 이메일/비밀번호로 회원가입
   # 4. "로그인" 버튼으로 로그인 테스트
   # 5. 프로필 편집 테스트
   # 6. 비밀번호 재설정 테스트
   ```

4. **Azure Functions 배포**
   ```bash
   cd azure-functions
   npm run build
   func azure functionapp publish func-landing-page-pro --javascript
   ```

## 주요 기능

### 사용자 관점:
- ✅ 이메일/비밀번호로 회원가입
- ✅ 이메일/비밀번호로 로그인
- ✅ 비밀번호 재설정
- ✅ 프로필 편집
- ⏭️ 소셜 로그인 (Google, Facebook 등) - 선택사항

### 개발자 관점:
- ✅ Microsoft에서 인증 관리 (보안, 비밀번호 해싱, MFA 등)
- ✅ 월 50,000 활성 사용자 무료
- ✅ Supabase 의존성 제거 가능
- ✅ 단일 데이터베이스 (Azure PostgreSQL)
- ✅ 확장 가능한 아키텍처
- ✅ B2C보다 향상된 UI 및 관리 기능

## 비용 예상

### Microsoft Entra External ID:
- **무료**: 월 50,000 활성 사용자 (MAU)
- **유료**: 50,000+ MAU 시 사용자당 ~$0.00325

### 예시:
- 10,000 users/month: **무료**
- 100,000 users/month: ~$162.50/month
- 500,000 users/month: ~$1,462.50/month

## B2C와 External ID 차이점

| 기능 | Azure AD B2C | Entra External ID |
|------|--------------|-------------------|
| 도메인 | `*.b2clogin.com` | `*.ciamlogin.com` |
| User Flows | `B2C_1_*` prefix | 간단한 이름 |
| 관리 UI | 복잡함 | 단순하고 직관적 |
| 가격 | MAU 기반 | 동일 (50K 무료) |
| 신규 생성 | ❌ 불가능 (2025.05.01+) | ✅ 가능 |
| 커스터마이징 | 제한적 | 향상됨 |

## 백업 및 롤백 계획

### 현재 코드 백업:
```bash
# 현재 브랜치 백업
git branch feature/admin-page-backup-before-external-id

# 롤백이 필요한 경우:
git checkout feature/admin-page-backup-before-external-id
```

### Supabase와 병행 운영:
현재 코드는 Supabase를 완전히 제거하지 않았으므로, 필요 시 다시 활성화 가능합니다.

## 문제 해결

### Q: "회원가입" 버튼을 눌러도 아무 일도 일어나지 않아요
**A**:
1. 브라우저 콘솔에서 에러 확인
2. `.env` 파일의 `VITE_ENTRA_TENANT_NAME` 확인
3. Azure Portal에서 Redirect URI 설정 확인
4. External ID 테넌트가 제대로 생성되었는지 확인

### Q: 로그인 후 401 Unauthorized 에러가 발생해요
**A**:
1. Azure Functions Application Settings에 `ENTRA_TENANT_NAME` 추가 확인
2. Backend JWKS URI가 `ciamlogin.com`을 사용하는지 확인
3. Token audience와 issuer 확인

### Q: 회원가입 페이지가 영어로 나와요
**A**:
Azure Portal → User flows → 해당 flow → Language customization에서 한국어 추가

### Q: "ciamlogin.com" 도메인을 찾을 수 없어요
**A**:
External ID 테넌트가 제대로 생성되었는지 확인하세요. 테넌트 타입이 "External (customers)"인지 확인.

## 추가 문서

- **[Microsoft Entra External ID 설정 가이드 (전체)](entra-external-id-setup-guide.md)**
- **[환경 변수 예시](.env.external-id.example)**
- **[이전 작업 히스토리](../history/2025-12-30_azure-authentication-and-ai-configuration.md)**

## 체크리스트

### Azure Portal 설정:
- [ ] External ID 테넌트 생성 완료
- [ ] 앱 등록 완료 (Client ID 확보)
- [ ] Redirect URIs 추가 완료 (SPA 플랫폼)
- [ ] API Scope 추가 완료 (`access_as_user`)
- [ ] User Flow: Sign up/Sign in 생성 완료
- [ ] User Flow: Profile editing 생성 완료
- [ ] User Flow: Password reset 생성 완료

### 코드 설정:
- [x] Frontend authConfig.ts 업데이트 (ciamlogin.com)
- [x] Frontend useAzureAuth.tsx 업데이트
- [x] Frontend Auth.tsx 업데이트 (Sign In/Up 분리)
- [x] Backend auth.ts 업데이트 (ciamlogin.com)
- [x] .env.external-id.example 생성
- [ ] Frontend .env 파일 업데이트
- [ ] Backend Application Settings 업데이트

### 테스트:
- [ ] 회원가입 테스트
- [ ] 로그인 테스트
- [ ] 로그아웃 테스트
- [ ] 비밀번호 재설정 테스트
- [ ] 프로필 편집 테스트
- [ ] Azure Functions API 호출 테스트

### 배포:
- [ ] Frontend 환경 변수 프로덕션 설정
- [ ] Backend 환경 변수 프로덕션 설정
- [ ] Azure Functions 배포
- [ ] Production 도메인 Redirect URI 추가
- [ ] Production 테스트

---

**작성자**: Claude Code
**최종 업데이트**: 2025-12-30
**마이그레이션 이유**: Azure AD B2C 신규 생성 불가 (2025년 5월 1일 이후)
