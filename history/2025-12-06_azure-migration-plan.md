# 2025-12-06 - Azure 마이그레이션 계획

## 사용자 요구사항
- 백엔드 환경을 MS Azure로 변경

## 현재 상태 분석

### 현재 사용 중인 Supabase 기능
1. **인증 (Authentication)**
   - 이메일/비밀번호 회원가입 및 로그인
   - Google OAuth 로그인
   - 비밀번호 재설정
   - 세션 관리 (localStorage 기반)

2. **데이터베이스 (PostgreSQL)**
   - 테이블: `projects`, `course_deployments`, `course_feedbacks`, `ai_results`, `user_roles`
   - Row Level Security (RLS) 정책 적용
   - UUID 기본 키 사용
   - 트리거 기반 자동 타임스탬프 업데이트

3. **Edge Functions (Deno)**
   - `process-document`: AI 기반 교육 콘텐츠 생성
   - CORS 설정 포함
   - Supabase 클라이언트를 통한 DB 업데이트

4. **스토리지 (추정)**
   - 파일 업로드 기능 (문서, 이미지 등)

## Azure 마이그레이션 전략

### 1. 데이터베이스 마이그레이션

#### 옵션 A: Azure Database for PostgreSQL
- **장점**: 
  - Supabase와 동일한 PostgreSQL이므로 마이그레이션 용이
  - RLS 정책 그대로 사용 가능
  - SQL 마이그레이션 파일 재사용 가능
- **단점**: 
  - RLS 정책을 Azure AD와 연동해야 함
  - 비용이 상대적으로 높을 수 있음

#### 옵션 B: Azure SQL Database
- **장점**: 
  - Microsoft 생태계와 완벽 통합
  - 강력한 보안 기능 (Row-Level Security 지원)
  - 비용 효율적
- **단점**: 
  - SQL 문법 차이로 마이그레이션 작업 필요
  - PostgreSQL 특화 기능 변환 필요

**권장**: Azure Database for PostgreSQL (옵션 A)
- 마이그레이션 리스크 최소화
- 기존 SQL 스크립트 재사용 가능

### 2. 인증 마이그레이션

#### Azure AD B2C (Azure Active Directory B2C)
- **기능**:
  - 이메일/비밀번호 인증
  - 소셜 로그인 (Google, Microsoft 등)
  - 비밀번호 재설정
  - 사용자 프로필 관리
- **구현 방법**:
  - `@azure/msal-browser` 또는 `@azure/msal-react` 사용
  - 기존 `useAuth` 훅을 Azure AD B2C용으로 재작성

**참고자료**:
- [Azure AD B2C 공식 문서](https://learn.microsoft.com/ko-kr/azure/active-directory-b2c/)
- [MSAL React 라이브러리](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react)

### 3. 서버리스 함수 마이그레이션

#### Azure Functions
- **현재**: Supabase Edge Functions (Deno)
- **변경**: Azure Functions (Node.js 또는 Python)
- **구현 방법**:
  - `supabase/functions/process-document/index.ts`를 Azure Functions로 변환
  - HTTP 트리거 사용
  - Azure Database for PostgreSQL 연결
  - Azure Key Vault에서 API 키 관리

**참고자료**:
- [Azure Functions 공식 문서](https://learn.microsoft.com/ko-kr/azure/azure-functions/)
- [Azure Functions Node.js 개발 가이드](https://learn.microsoft.com/ko-kr/azure/azure-functions/functions-reference-node)

### 4. 스토리지 마이그레이션

#### Azure Blob Storage
- **기능**: 파일 업로드, 다운로드, 관리
- **구현 방법**:
  - `@azure/storage-blob` SDK 사용
  - SAS (Shared Access Signature) 토큰으로 보안 접근
  - CDN 연동 가능

**참고자료**:
- [Azure Blob Storage 공식 문서](https://learn.microsoft.com/ko-kr/azure/storage/blobs/)

### 5. 시크릿 관리

#### Azure Key Vault
- **기능**: API 키, 데이터베이스 연결 문자열 등 시크릿 관리
- **구현 방법**:
  - Azure Functions에서 Key Vault 참조
  - 환경 변수 대신 Key Vault 사용

**참고자료**:
- [Azure Key Vault 공식 문서](https://learn.microsoft.com/ko-kr/azure/key-vault/)

## 마이그레이션 단계별 계획

### Phase 1: 인프라 준비 (1-2주)
1. Azure 구독 및 리소스 그룹 생성
2. Azure Database for PostgreSQL 인스턴스 생성
3. Azure AD B2C 테넌트 생성 및 설정
4. Azure Functions 앱 생성
5. Azure Blob Storage 계정 생성
6. Azure Key Vault 생성

### Phase 2: 데이터베이스 마이그레이션 (1주)
1. 기존 Supabase 데이터베이스 백업
2. Azure Database for PostgreSQL로 데이터 마이그레이션
3. RLS 정책을 Azure AD 기반으로 변환
4. 연결 테스트 및 검증

### Phase 3: 인증 시스템 마이그레이션 (1-2주)
1. Azure AD B2C 사용자 플로우 설정
   - 회원가입/로그인 플로우
   - 비밀번호 재설정 플로우
   - 소셜 로그인 연동 (Google)
2. 프론트엔드 인증 코드 재작성
   - `src/hooks/useAuth.tsx` 수정
   - `src/integrations/supabase/client.ts` → `src/integrations/azure/client.ts`로 변경
   - MSAL React 통합
3. 인증 테스트

### Phase 4: Edge Functions 마이그레이션 (1-2주)
1. `supabase/functions/process-document/index.ts` 분석
2. Azure Functions로 변환
   - Deno → Node.js 변환
   - Supabase 클라이언트 → PostgreSQL 직접 연결
   - CORS 설정
3. Azure Key Vault에서 API 키 가져오기
4. 함수 배포 및 테스트

### Phase 5: 스토리지 마이그레이션 (1주)
1. 기존 파일 마이그레이션 (있는 경우)
2. Azure Blob Storage SDK 통합
3. 파일 업로드/다운로드 기능 테스트

### Phase 6: 통합 테스트 및 최적화 (1-2주)
1. 전체 시스템 통합 테스트
2. 성능 최적화
3. 보안 검토
4. 문서화

## 예상 소요 시간
- **총 예상 기간**: 6-10주
- **인력**: 백엔드 개발자 1-2명, 프론트엔드 개발자 1명

## 비용 예상

### Azure 서비스 월 예상 비용 (한국 리전 기준)
1. **Azure Database for PostgreSQL** (Flexible Server, Basic Tier)
   - 약 $50-100/월 (사용량에 따라 변동)

2. **Azure AD B2C**
   - MAU (Monthly Active Users) 1,000명 기준: 약 $0.00525/MAU = $5.25/월
   - 10,000명 기준: 약 $52.5/월

3. **Azure Functions** (Consumption Plan)
   - 약 $0-20/월 (사용량에 따라 변동)

4. **Azure Blob Storage** (Hot Tier)
   - 약 $0.018/GB/월 + 트랜잭션 비용

5. **Azure Key Vault**
   - 약 $0.03/10,000 트랜잭션

**총 예상 비용**: 약 $100-200/월 (초기 단계, 사용량 낮을 때)

## 주요 변경 사항 요약

### 코드 변경
1. `src/integrations/supabase/client.ts` → `src/integrations/azure/client.ts`
2. `src/hooks/useAuth.tsx` - MSAL React로 재작성
3. 모든 `supabase.from()` 호출 → PostgreSQL 직접 연결 또는 REST API
4. `supabase/functions/` → Azure Functions 프로젝트로 변환

### 환경 변수 변경
```env
# 기존
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# 변경 후
VITE_AZURE_AD_B2C_TENANT=
VITE_AZURE_AD_B2C_CLIENT_ID=
VITE_AZURE_AD_B2C_SIGNUP_SIGNIN_POLICY=
VITE_AZURE_API_URL=
```

### 의존성 변경
```json
// 제거
"@supabase/supabase-js": "^2.84.0"

// 추가
"@azure/msal-browser": "^3.0.0",
"@azure/msal-react": "^2.0.0",
"@azure/storage-blob": "^12.0.0",
"pg": "^8.11.0" // PostgreSQL 직접 연결용
```

## 리스크 및 대응 방안

### 리스크 1: 데이터 마이그레이션 중 데이터 손실
- **대응**: 
  - 마이그레이션 전 전체 백업
  - 단계별 검증
  - 롤백 계획 수립

### 리스크 2: RLS 정책 변환 복잡도
- **대응**: 
  - Azure AD 기반 RLS 정책으로 점진적 변환
  - 충분한 테스트 기간 확보

### 리스크 3: 인증 플로우 변경으로 인한 사용자 경험 저하
- **대응**: 
  - 기존 플로우와 유사하게 구현
  - 사용자 테스트 진행

### 리스크 4: Azure Functions 성능 이슈
- **대응**: 
  - 성능 테스트 진행
  - 필요시 Premium Plan으로 업그레이드

## 다음 단계

1. **사용자 승인**: 이 계획에 대한 승인 요청
2. **Azure 구독 준비**: Azure 구독 및 리소스 그룹 생성
3. **POC (Proof of Concept)**: 소규모 기능으로 마이그레이션 테스트
4. **단계별 실행**: 위 Phase별로 순차적 진행

## 참고자료

### Microsoft 공식 문서
- [Azure Database for PostgreSQL](https://learn.microsoft.com/ko-kr/azure/postgresql/)
- [Azure AD B2C](https://learn.microsoft.com/ko-kr/azure/active-directory-b2c/)
- [Azure Functions](https://learn.microsoft.com/ko-kr/azure/azure-functions/)
- [Azure Blob Storage](https://learn.microsoft.com/ko-kr/azure/storage/blobs/)
- [Azure Key Vault](https://learn.microsoft.com/ko-kr/azure/key-vault/)

### 마이그레이션 가이드
- [Supabase to Azure 마이그레이션 가이드](https://learn.microsoft.com/ko-kr/azure/architecture/guide/cloud-native/supabase-to-azure)
- [PostgreSQL 마이그레이션 가이드](https://learn.microsoft.com/ko-kr/azure/postgresql/migrate/)

## 수정 내역 요약

### 문서 작성
- Azure 마이그레이션 계획 수립
- 현재 Supabase 사용 현황 분석
- 단계별 마이그레이션 계획 작성
- 비용 및 리스크 분석



