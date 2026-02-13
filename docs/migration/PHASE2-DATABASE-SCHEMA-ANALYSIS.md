# Supabase Database Schema Analysis

**날짜**: 2025-12-17
**목적**: Azure SQL 마이그레이션을 위한 완전한 스키마 분석

---

## 📊 데이터베이스 ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth - Azure AD B2C로 대체)
│   - id (UUID)   │
└────────┬────────┘
         │
         │ 1:1
         ↓
┌─────────────────────┐         ┌──────────────────┐
│     profiles        │←────────│   user_roles     │
│   - id (UUID) PK    │  1:N    │  - id (UUID) PK  │
│   - user_id (UUID)  │         │  - user_id (UUID)│
│   - display_name    │         │  - role (ENUM)   │
│   - avatar_url      │         │                  │
└──────────┬──────────┘         └──────────────────┘
           │
           │ 1:N (owner)
           ↓
┌─────────────────────────────┐
│        projects             │
│   - id (UUID) PK            │
│   - user_id (UUID) FK       │
│   - title                   │
│   - document_content (TEXT) │
│   - ai_model                │
│   - education_stage         │
│   - status                  │
└─────┬───────────────────────┘
      │
      │ 1:N
      ├──────────────────────────────┐
      │                              │
      ↓                              ↓
┌──────────────────┐      ┌──────────────────────┐
│ project_stages   │      │ project_ai_results   │
│  - id (UUID) PK  │      │  - id (UUID) PK      │
│  - project_id FK │      │  - project_id FK     │
│  - stage_name    │      │  - ai_model          │
│  - content       │      │  - prompt            │
│  - status        │      │  - result            │
│  - order_index   │      └──────────────────────┘
└──────────────────┘
      │
      │ 1:N
      ├──────────────────────────────┐
      ↓                              ↓
┌──────────────────────┐   ┌──────────────────┐
│ course_deployments   │   │ course_feedbacks │
│  - id (UUID) PK      │   │  - id (UUID) PK  │
│  - project_id FK     │   │  - project_id FK │
│  - deployment_url    │   │  - feedback_text │
│  - status            │   │  - rating        │
└──────────────────────┘   └──────────────────┘


┌─────────────────────────────┐
│        courses              │ (Course Builder)
│   - id (UUID) PK            │
│   - owner_id (UUID) FK      │←─── profiles.user_id
│   - title                   │
│   - description             │
│   - level                   │
│   - status                  │
└─────┬───────────────────────┘
      │
      │ 1:N
      ↓
┌──────────────────────────┐
│    course_modules        │
│   - id (UUID) PK         │
│   - course_id (UUID) FK  │
│   - title                │
│   - summary              │
│   - order_index          │
└─────┬────────────────────┘
      │
      │ 1:N
      ↓
┌──────────────────────────────┐
│         lessons              │
│   - id (UUID) PK             │
│   - module_id (UUID) FK      │
│   - project_id (UUID) FK ────┼──→ projects.id
│   - title                    │
│   - learning_objectives      │
│   - order_index              │
│   - selected_ai_model        │
└──────────────────────────────┘


┌──────────────────────────┐
│   project_templates      │ (User Templates)
│   - id (UUID) PK         │
│   - user_id (UUID) FK    │
│   - template_name        │
│   - ai_model             │
│   - education_duration   │
└──────────────────────────┘
```

---

## 📋 테이블 상세 분석

### 1. **profiles** (사용자 프로필)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**용도**: Supabase Auth 사용자와 1:1 매핑
**Azure 전환**: Azure AD B2C User ObjectId → user_id

---

### 2. **user_roles** (사용자 역할)
```sql
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
```
**용도**: RBAC (Role-Based Access Control)
**Azure 전환**: Azure AD B2C Custom Attributes 또는 별도 테이블 유지

---

### 3. **projects** (교육 프로젝트)
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  document_content TEXT,        -- 브리프 원본
  document_url TEXT,
  ai_model TEXT DEFAULT 'gemini',
  education_stage TEXT DEFAULT 'elementary',
  subject TEXT,
  duration_minutes INTEGER,
  education_duration TEXT,      -- "4주", "12시간"
  education_course TEXT,
  education_session INTEGER,
  status TEXT DEFAULT 'draft',  -- draft, in_progress, completed, failed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**용도**: AI로 생성할 교육 콘텐츠의 메타데이터
**특이사항**: `document_content` 컬럼이 매우 큼 (TEXT)

---

### 4. **project_stages** (프로젝트 생성 단계)
```sql
CREATE TABLE project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,         -- "커리큘럼 설계", "수업안 작성" 등
  content TEXT,                     -- AI 생성 결과
  status TEXT DEFAULT 'pending',    -- pending, in_progress, completed, failed
  order_index INTEGER NOT NULL,
  feedback TEXT,                    -- 사용자 피드백
  regeneration_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**용도**: 5단계 AI 생성 프로세스 추적
**단계**: 커리큘럼 설계 → 수업안 작성 → 슬라이드 구성 → 평가/퀴즈 → 최종 검토

---

### 5. **project_ai_results** (AI 호출 결과)
```sql
CREATE TABLE project_ai_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  ai_model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  result TEXT,
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**용도**: AI API 호출 이력 및 디버깅
**특이사항**: `prompt`, `result` 컬럼이 매우 큼

---

### 6. **courses** (코스 빌더)
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT,                   -- beginner, intermediate, advanced
  target_audience TEXT,
  total_duration TEXT,          -- "4주", "12시간"
  status TEXT DEFAULT 'draft',  -- draft, in_review, published, archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**용도**: 구조화된 코스 관리 (여러 프로젝트를 묶음)
**관계**: 1 Course → N Modules → N Lessons

---

### 7. **course_modules** (코스 모듈)
```sql
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**용도**: 코스 내 큰 단위 구분 (예: "Week 1: 기초", "Week 2: 심화")

---

### 8. **lessons** (레슨)
```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  learning_objectives TEXT,
  selected_ai_model TEXT,       -- 이 레슨 생성에 사용한 AI 모델
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**용도**: 실제 수업 단위
**특이사항**: `project_id`로 projects 테이블과 연결 (1 lesson = 1 project)

---

### 9. **project_templates** (사용자 템플릿)
```sql
CREATE TABLE project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  education_session INTEGER,
  education_duration TEXT,
  education_course TEXT,
  ai_model TEXT DEFAULT 'gemini',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**용도**: 자주 사용하는 설정 저장

---

### 10. **course_deployments** (배포 관리)
```sql
CREATE TABLE course_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  deployment_url TEXT,
  deployment_status TEXT DEFAULT 'pending',
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 11. **course_feedbacks** (피드백)
```sql
CREATE TABLE course_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  feedback_text TEXT,
  rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔑 인덱스

```sql
-- Courses
CREATE INDEX idx_courses_owner_id ON courses(owner_id);
CREATE INDEX idx_courses_status ON courses(status);

-- Course Modules
CREATE INDEX idx_course_modules_course_id ON course_modules(course_id);
CREATE INDEX idx_course_modules_order_index ON course_modules(course_id, order_index);

-- Lessons
CREATE INDEX idx_lessons_module_id ON lessons(module_id);
CREATE INDEX idx_lessons_project_id ON lessons(project_id);
CREATE INDEX idx_lessons_order_index ON lessons(module_id, order_index);

-- Projects
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
```

---

## 🔐 RLS (Row Level Security) 정책

### profiles
- ✅ 모든 사용자가 모든 프로필 조회 가능
- ✅ 자신의 프로필만 수정 가능

### user_roles
- ✅ 자신의 역할만 조회 가능
- ✅ admin만 모든 역할 관리 가능

### projects
- ✅ 자신의 프로젝트만 CRUD
- ✅ admin은 모든 프로젝트 접근 가능

### courses, course_modules, lessons
- ✅ owner 또는 admin만 접근
- ✅ 계층적 권한 전파 (course → module → lesson)

---

## 🔧 함수 (Functions)

### 1. `handle_new_user()`
```sql
CREATE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', new.email));

  INSERT INTO user_roles (user_id, role)
  VALUES (new.id, 'user');

  RETURN new;
END;
$$;
```
**용도**: 새 사용자 가입 시 자동으로 프로필 생성 및 'user' 역할 할당
**Azure 전환**: Azure Functions HTTP Trigger로 대체

---

### 2. `update_updated_at_column()`
```sql
CREATE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```
**용도**: UPDATE 시 자동으로 `updated_at` 갱신
**Azure SQL**: `AFTER UPDATE` 트리거로 대체

---

### 3. `has_role(_user_id UUID, _role app_role)`
```sql
CREATE FUNCTION has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```
**용도**: RLS 정책에서 역할 확인
**Azure SQL**: Inline Table-Valued Function으로 변환

---

## 📊 데이터 볼륨 예상

| 테이블 | 예상 행 수 (1년) | 크기 예상 |
|--------|------------------|-----------|
| profiles | 1,000 | 100KB |
| user_roles | 1,500 | 50KB |
| projects | 10,000 | **50MB** (document_content 때문) |
| project_stages | 50,000 | **200MB** (content 때문) |
| project_ai_results | 100,000 | **500MB** (prompt, result 때문) |
| courses | 500 | 200KB |
| course_modules | 2,000 | 500KB |
| lessons | 10,000 | **20MB** |
| **총합** | | **~770MB** |

---

## 🚨 마이그레이션 주의사항

### 1. **PostgreSQL 특화 기능**
- `UUID` 타입 → Azure SQL: `UNIQUEIDENTIFIER`
- `TIMESTAMPTZ` → Azure SQL: `DATETIMEOFFSET`
- `TEXT` → Azure SQL: `NVARCHAR(MAX)`
- `ENUM` 타입 → Azure SQL: `CHECK` 제약 조건 또는 별도 테이블
- `gen_random_uuid()` → Azure SQL: `NEWID()`
- `now()` → Azure SQL: `SYSDATETIMEOFFSET()`

### 2. **RLS (Row Level Security)**
PostgreSQL RLS는 Azure SQL에 직접 대응 기능 없음
**대안:**
- **Option 1**: Application-level security (권장)
- **Option 2**: Views + `SESSION_CONTEXT`
- **Option 3**: Azure SQL Database Dynamic Data Masking

### 3. **Triggers & Functions**
- PostgreSQL `RETURNS TRIGGER` → Azure SQL `AFTER/INSTEAD OF` 트리거
- `SECURITY DEFINER` → Azure SQL: Stored Procedure with `EXECUTE AS OWNER`

### 4. **auth.users 테이블**
Supabase의 `auth.users`는 Azure AD B2C로 대체
- `auth.uid()` → `SESSION_CONTEXT(N'UserId')`
- 애플리케이션에서 JWT에서 User ID 추출 후 설정

---

## 📝 다음 단계

1. ✅ 스키마 분석 완료
2. ⏭️ Azure SQL 마이그레이션 스크립트 생성
3. ⏭️ 데이터 마이그레이션 도구 설정
4. ⏭️ RLS → Application Security 전환
5. ⏭️ 테스트 데이터 마이그레이션

---

**작성일**: 2025-12-17
**다음**: PHASE2-AZURE-SQL-MIGRATION-SCRIPT.sql
