# Database Schema Analysis and Azure Migration Planning

**날짜**: 2025-12-17
**작업자**: Claude (AI Assistant)
**관련 작업**: Supabase → Azure 데이터베이스 마이그레이션 준비

---

## 📋 작업 개요

1. **Supabase 데이터베이스 스키마 완전 분석**: 11개 테이블, 관계, 인덱스, RLS 정책
2. **Azure SQL/PostgreSQL 마이그레이션 스크립트 생성**: 300+ 라인 SQL
3. **데이터 마이그레이션 가이드 작성**: Step-by-step 실행 매뉴얼

---

## 🗄️ 데이터베이스 스키마 분석 결과

### 테이블 구조 (11개)

#### 1. 사용자 관리 (2개)
- **profiles**: 사용자 프로필 (1,000명 예상)
- **user_roles**: RBAC 역할 (admin, moderator, user)

#### 2. 프로젝트 관리 (6개)
- **projects**: 교육 프로젝트 메인 (10,000개 예상, ~50MB)
- **project_stages**: 5단계 생성 프로세스 (50,000개, ~200MB)
- **project_ai_results**: AI 호출 이력 (100,000개, ~500MB)
- **project_templates**: 사용자 템플릿
- **course_deployments**: 배포 관리
- **course_feedbacks**: 사용자 피드백

#### 3. 코스 빌더 (3개)
- **courses**: 코스 메타데이터
- **course_modules**: 코스 내 모듈
- **lessons**: 실제 수업 (project_id로 연결)

### 데이터 관계 (ERD)

```
auth.users (Supabase)
    ↓ 1:1
profiles ← user_roles (N:1)
    ↓ 1:N
projects
    ↓ 1:N
    ├─ project_stages
    ├─ project_ai_results
    ├─ course_deployments
    └─ course_feedbacks

courses (owner_id → profiles.user_id)
    ↓ 1:N
course_modules
    ↓ 1:N
lessons (project_id → projects.id)
```

### 주요 특징

1. **대용량 TEXT 컬럼**:
   - `projects.document_content`: 브리프 원본
   - `project_stages.content`: AI 생성 결과
   - `project_ai_results.prompt`, `result`: AI 호출 데이터
   - **예상 총 크기**: ~770MB (1년 기준)

2. **복잡한 RLS 정책**:
   - 계층적 권한 전파 (course → module → lesson)
   - `has_role()` 함수로 admin 체크
   - 총 20개 이상의 RLS 정책

3. **자동화 트리거**:
   - `update_updated_at_column()`: 7개 테이블에 적용
   - `handle_new_user()`: 신규 가입 시 프로필 생성

---

## 📄 생성된 문서

### 1. PHASE2-DATABASE-SCHEMA-ANALYSIS.md

**내용**:
- 완전한 ERD 다이어그램 (ASCII art)
- 11개 테이블 상세 분석 (컬럼, 타입, 제약 조건)
- 인덱스 목록 및 성능 최적화 전략
- RLS 정책 요약
- 데이터 볼륨 예상 (770MB/1년)
- PostgreSQL → Azure SQL 변환 시 주의사항

**파일 크기**: ~15KB
**라인 수**: 400+

---

### 2. PHASE2-AZURE-SQL-MIGRATION-SCRIPT.sql

**내용**:
```sql
-- PostgreSQL 버전과 SQL Server 버전 병행 제공
CREATE TABLE profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name NVARCHAR(255),
  avatar_url NVARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SQL Server 대안:
-- id UNIQUEIDENTIFIER DEFAULT NEWID()
-- created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
```

**주요 기능**:
1. **테이블 생성** (11개):
   - PostgreSQL 타입 사용
   - SQL Server 주석 병기
   - 외래 키, 인덱스, 제약 조건 포함

2. **함수 및 트리거**:
   - `update_updated_at_column()`: 자동 timestamp 갱신
   - `has_role()`: RBAC 헬퍼 함수

3. **Application-Level Security**:
   - RLS 대신 View + `current_setting()` 사용
   - 예시: `v_user_projects`

4. **타입 매핑**:
   - UUID ↔ UNIQUEIDENTIFIER
   - TIMESTAMPTZ ↔ DATETIMEOFFSET
   - TEXT ↔ NVARCHAR(MAX)
   - ENUM ↔ CHECK constraint

**파일 크기**: ~18KB
**라인 수**: 550+

---

### 3. PHASE2-DATA-MIGRATION-GUIDE.md

**내용**:
Step-by-step 마이그레이션 매뉴얼

**마이그레이션 옵션**:
1. ⭐ **Option 1: PostgreSQL → Azure PostgreSQL** (추천)
   - 완벽한 호환성
   - `pg_dump` / `pg_restore` 사용
   - RLS 그대로 유지

2. 🟡 **Option 2: PostgreSQL → Azure SQL**
   - 엔터프라이즈급 성능
   - Azure Data Migration Service 사용
   - 문법 변환 필요

3. 🟢 **Option 3: 하이브리드**
   - Supabase 유지 + Azure Functions
   - 점진적 전환

**단계별 가이드**:

**Step 1: Supabase 백업**
```bash
pg_dump \
  -h db.nzedvnncozntizujvktb.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -b \
  -v \
  -f supabase_backup_20251217.dump
```

**Step 2: Azure 스키마 생성**
```bash
psql \
  -h psql-landing-page-pro.postgres.database.azure.com \
  -U pgadmin \
  -d landingpagepro \
  -f PHASE2-AZURE-SQL-MIGRATION-SCRIPT.sql
```

**Step 3: 데이터 복원**
```bash
pg_restore \
  -h psql-landing-page-pro.postgres.database.azure.com \
  -U pgadmin \
  -d landingpagepro \
  --no-owner \
  --no-acl \
  supabase_backup_20251217.dump
```

**Step 4: auth.users 마이그레이션**
- Supabase `auth.users` → CSV 추출
- Azure AD B2C ObjectId 매핑

**Step 5: 검증**
```sql
-- 행 수 비교
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'projects', COUNT(*) FROM projects;

-- 무결성 확인
SELECT COUNT(*) FROM profiles WHERE user_id IS NULL;
```

**도구**:
- pgAdmin (GUI)
- Azure Data Studio (MS 공식)
- DBeaver (무료)
- Custom Script (Python/Node.js 예시 제공)

**트러블슈팅**:
- "relation does not exist" → 스키마 먼저 생성
- "permission denied" → 방화벽 규칙 추가
- "SSL required" → `?sslmode=require`

**예상 소요 시간**: 30-60분

**파일 크기**: ~12KB
**라인 수**: 400+

---

## 🔍 기술적 도전 과제

### 1. PostgreSQL 특화 기능 변환

**문제**: Supabase/PostgreSQL 고유 기능
- `auth.users` 테이블 (Supabase 내부)
- RLS (Row Level Security)
- `ENUM` 타입
- `gen_random_uuid()`, `now()`

**해결책**:
```sql
-- PostgreSQL ENUM
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

-- SQL Server 대안
ALTER TABLE user_roles
ADD CONSTRAINT chk_role
CHECK (role IN ('admin', 'moderator', 'user'));
```

```sql
-- PostgreSQL
id UUID DEFAULT gen_random_uuid()
created_at TIMESTAMPTZ DEFAULT NOW()

-- SQL Server
id UNIQUEIDENTIFIER DEFAULT NEWID()
created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
```

---

### 2. RLS → Application Security 전환

**문제**: Azure SQL에 RLS 직접 대응 없음

**Supabase RLS 예시**:
```sql
CREATE POLICY "Users can view their own courses"
ON courses FOR SELECT
USING (auth.uid() = owner_id);
```

**Azure 해결책 (3가지)**:

**Option A: Application-Level (추천)**
```typescript
// 애플리케이션에서 필터링
const userId = getUserIdFromJWT(req.headers.authorization);
const courses = await db.query(
  'SELECT * FROM courses WHERE owner_id = $1',
  [userId]
);
```

**Option B: View + SESSION_CONTEXT**
```sql
CREATE VIEW v_user_courses AS
SELECT * FROM courses
WHERE owner_id = CAST(SESSION_CONTEXT(N'UserId') AS UNIQUEIDENTIFIER);

-- 애플리케이션에서 설정
EXEC sp_set_session_context 'UserId', @userId;
SELECT * FROM v_user_courses;
```

**Option C: Stored Procedure**
```sql
CREATE PROCEDURE sp_GetUserCourses
  @userId UNIQUEIDENTIFIER
AS
BEGIN
  SELECT * FROM courses WHERE owner_id = @userId;
END;
```

---

### 3. auth.users 마이그레이션

**문제**: Supabase `auth.users`는 마이그레이션 불가

**데이터 추출**:
```sql
-- Supabase에서 실행
SELECT
  id as user_id,
  email,
  raw_user_meta_data->>'display_name' as display_name,
  created_at
FROM auth.users;

-- CSV 저장
\copy (...) TO 'users_export.csv' CSV HEADER;
```

**Azure AD B2C 연동 후**:
```typescript
// 신규 가입 시 ObjectId → profiles.user_id 매핑
async function handleB2CSignup(objectId: string, email: string) {
  await db.query(
    'INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)',
    [objectId, email]
  );
}
```

---

## 📊 파일 요약

| 파일명 | 크기 | 라인 | 용도 |
|--------|------|------|------|
| PHASE2-DATABASE-SCHEMA-ANALYSIS.md | 15KB | 400+ | 스키마 분석 및 ERD |
| PHASE2-AZURE-SQL-MIGRATION-SCRIPT.sql | 18KB | 550+ | 마이그레이션 SQL |
| PHASE2-DATA-MIGRATION-GUIDE.md | 12KB | 400+ | 실행 매뉴얼 |
| **총계** | **45KB** | **1,350+** | |

---

## ✅ 완료된 작업

- [x] Supabase migrations 폴더 12개 SQL 파일 분석
- [x] 11개 테이블 구조 완전 파악
- [x] ERD 다이어그램 생성 (ASCII art)
- [x] 인덱스 및 제약 조건 목록 작성
- [x] RLS 정책 20개 분석
- [x] PostgreSQL → Azure SQL 타입 매핑 테이블
- [x] 550+ 라인 마이그레이션 SQL 스크립트 작성
- [x] pg_dump/restore 가이드 작성
- [x] 트러블슈팅 섹션 추가
- [x] Python/Node.js 마이그레이션 스크립트 예시

---

## 🚀 다음 단계

### Phase 3: Azure AD B2C 인증 (예정)
- [ ] Azure AD B2C 테넌트 생성
- [ ] 사용자 플로우 설정 (가입/로그인)
- [ ] 애플리케이션 등록
- [ ] JWT 토큰 검증 로직
- [ ] Supabase Auth → Azure AD B2C 전환

### Phase 4: Edge Functions → Azure Functions (예정)
- [ ] `process-document` 함수 전환
- [ ] `generate-curriculum` 함수 전환
- [ ] HTTP 트리거 설정
- [ ] AI API 키 Azure Key Vault 이동

### Phase 5: 프론트엔드 연동 (예정)
- [ ] Supabase Client → Azure SDK
- [ ] 인증 플로우 테스트
- [ ] API 엔드포인트 교체
- [ ] E2E 테스트

---

## 💡 교훈

### 잘한 점
1. **완전한 문서화**: 향후 팀원도 쉽게 따라할 수 있음
2. **양방향 지원**: PostgreSQL + SQL Server 모두 대응
3. **실전 예시**: 실제 명령어와 스크립트 제공
4. **트러블슈팅**: 예상 오류 및 해결책 미리 문서화

### 개선 필요
1. **자동화 스크립트**: 현재 수동 실행, Shell/PowerShell 자동화 필요
2. **롤백 계획**: 마이그레이션 실패 시 복구 절차 미흡
3. **성능 테스트**: 대용량 데이터 마이그레이션 부하 테스트 없음
4. **CI/CD 통합**: GitHub Actions 마이그레이션 파이프라인 미구축

---

## 📝 참고 자료

### Supabase
- [Supabase Database Backups](https://supabase.com/docs/guides/database/backups)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

### Azure
- [Azure Database for PostgreSQL](https://learn.microsoft.com/azure/postgresql/)
- [Azure SQL Database](https://learn.microsoft.com/azure/azure-sql/)
- [Azure Data Migration Service](https://learn.microsoft.com/azure/dms/)

### PostgreSQL
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [pg_restore Documentation](https://www.postgresql.org/docs/current/app-pgrestore.html)

---

**작성일**: 2025-12-17
**다음 리뷰 예정**: Phase 2 실행 후
