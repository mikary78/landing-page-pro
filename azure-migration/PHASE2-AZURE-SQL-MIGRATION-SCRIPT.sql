-- ========================================================
-- Azure SQL Migration Script
-- From: Supabase PostgreSQL
-- To: Azure SQL Database / Azure Database for PostgreSQL
-- Date: 2025-12-17
-- ========================================================

-- ========================================================
-- PART 1: SCHEMA CREATION
-- ========================================================

-- Enable UUID generation (Azure SQL)
-- For PostgreSQL Flexible Server, use pgcrypto extension instead
-- IF SERVERPROPERTY('ProductVersion') LIKE '12%' -- SQL Server
-- BEGIN
--   CREATE FUNCTION dbo.NEWSEQUENTIALID() RETURNS UNIQUEIDENTIFIER AS BEGIN RETURN NEWID() END
-- END

-- For PostgreSQL:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 1. ENUM TYPES (PostgreSQL) or CHECK CONSTRAINTS (SQL Server)
-- ========================================================

-- PostgreSQL: ENUM 사용
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

-- SQL Server 대안: CHECK 제약 조건 (아래 테이블 생성 시 적용)
-- ALTER TABLE user_roles ADD CONSTRAINT chk_role CHECK (role IN ('admin', 'moderator', 'user'));

-- ========================================================
-- 2. CORE TABLES
-- ========================================================

-- 2.1 profiles (사용자 프로필)
CREATE TABLE profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,  -- Azure AD B2C ObjectId
  display_name NVARCHAR(255),
  avatar_url NVARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- SQL Server 버전:
-- CREATE TABLE profiles (
--   id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
--   user_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
--   display_name NVARCHAR(255),
--   avatar_url NVARCHAR(500),
--   created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
--   updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
-- );

-- --------------------------------------------------------

-- 2.2 user_roles (사용자 역할)
CREATE TABLE user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,  -- PostgreSQL ENUM
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_role UNIQUE (user_id, role),
  CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- SQL Server 버전:
-- CREATE TABLE user_roles (
--   id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
--   user_id UNIQUEIDENTIFIER NOT NULL,
--   role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
--   created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
--   CONSTRAINT uq_user_role UNIQUE (user_id, role),
--   CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
-- );

-- --------------------------------------------------------

-- 2.3 projects (교육 프로젝트)
CREATE TABLE projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title NVARCHAR(500),
  description TEXT,
  document_content TEXT,  -- Large text field
  document_url NVARCHAR(1000),
  ai_model NVARCHAR(50) DEFAULT 'gemini',
  education_stage NVARCHAR(50) DEFAULT 'elementary',
  subject NVARCHAR(200),
  duration_minutes INTEGER,
  education_duration NVARCHAR(100),
  education_course NVARCHAR(200),
  education_session INTEGER,
  status NVARCHAR(20) DEFAULT 'draft',  -- draft, in_progress, completed, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_projects_user_id FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- SQL Server 버전:
-- document_content TEXT → NVARCHAR(MAX)
-- TIMESTAMPTZ → DATETIMEOFFSET

-- --------------------------------------------------------

-- 2.4 project_stages (프로젝트 생성 단계)
CREATE TABLE project_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  stage_name NVARCHAR(100) NOT NULL,
  content TEXT,  -- AI 생성 결과 (large)
  status NVARCHAR(20) DEFAULT 'pending',
  order_index INTEGER NOT NULL,
  feedback TEXT,
  regeneration_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_project_stages_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_project_stages_project_id ON project_stages(project_id);
CREATE INDEX idx_project_stages_status ON project_stages(status);
CREATE INDEX idx_project_stages_order ON project_stages(project_id, order_index);

-- --------------------------------------------------------

-- 2.5 project_ai_results (AI 호출 결과)
CREATE TABLE project_ai_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  ai_model NVARCHAR(50) NOT NULL,
  prompt TEXT NOT NULL,  -- Large
  result TEXT,  -- Large
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_project_ai_results_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_project_ai_results_project_id ON project_ai_results(project_id);
CREATE INDEX idx_project_ai_results_created_at ON project_ai_results(created_at DESC);

-- --------------------------------------------------------

-- 2.6 project_templates (사용자 템플릿)
CREATE TABLE project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name NVARCHAR(200) NOT NULL,
  description TEXT,
  education_session INTEGER,
  education_duration NVARCHAR(100),
  education_course NVARCHAR(200),
  ai_model NVARCHAR(50) DEFAULT 'gemini',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_project_templates_user_id FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_project_templates_user_id ON project_templates(user_id);

-- --------------------------------------------------------

-- 2.7 course_deployments (배포 관리)
CREATE TABLE course_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  deployment_url NVARCHAR(1000),
  deployment_status NVARCHAR(20) DEFAULT 'pending',
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_course_deployments_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_course_deployments_project_id ON course_deployments(project_id);

-- --------------------------------------------------------

-- 2.8 course_feedbacks (피드백)
CREATE TABLE course_feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID,
  feedback_text TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_course_feedbacks_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_course_feedbacks_user_id FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_course_feedbacks_project_id ON course_feedbacks(project_id);
CREATE INDEX idx_course_feedbacks_user_id ON course_feedbacks(user_id);

-- ========================================================
-- 3. COURSE BUILDER TABLES
-- ========================================================

-- 3.1 courses (코스)
CREATE TABLE courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title NVARCHAR(500) NOT NULL,
  description TEXT,
  level NVARCHAR(20),  -- beginner, intermediate, advanced
  target_audience TEXT,
  total_duration NVARCHAR(100),
  status NVARCHAR(20) DEFAULT 'draft',  -- draft, in_review, published, archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_courses_owner_id FOREIGN KEY (owner_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_courses_owner_id ON courses(owner_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);

-- --------------------------------------------------------

-- 3.2 course_modules (코스 모듈)
CREATE TABLE course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  title NVARCHAR(500) NOT NULL,
  summary TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_course_modules_course_id FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_course_modules_course_id ON course_modules(course_id);
CREATE INDEX idx_course_modules_order_index ON course_modules(course_id, order_index);

-- --------------------------------------------------------

-- 3.3 lessons (레슨)
CREATE TABLE lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL,
  project_id UUID,  -- Optional link to projects
  title NVARCHAR(500) NOT NULL,
  order_index INTEGER NOT NULL,
  learning_objectives TEXT,
  selected_ai_model NVARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_lessons_module_id FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
  CONSTRAINT fk_lessons_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX idx_lessons_module_id ON lessons(module_id);
CREATE INDEX idx_lessons_project_id ON lessons(project_id);
CREATE INDEX idx_lessons_order_index ON lessons(module_id, order_index);

-- ========================================================
-- PART 2: FUNCTIONS & TRIGGERS
-- ========================================================

-- 2.1 Auto-update updated_at column (PostgreSQL)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_project_stages_updated_at BEFORE UPDATE ON project_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_project_templates_updated_at BEFORE UPDATE ON project_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_course_modules_updated_at BEFORE UPDATE ON course_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SQL Server 버전:
-- CREATE TRIGGER trg_profiles_updated_at ON profiles AFTER UPDATE AS
-- BEGIN
--   UPDATE profiles SET updated_at = SYSDATETIMEOFFSET() WHERE id IN (SELECT id FROM inserted);
-- END;

-- --------------------------------------------------------

-- 2.2 Check if user has role (helper function)
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$ LANGUAGE SQL STABLE;

-- SQL Server 버전:
-- CREATE FUNCTION dbo.has_role (@user_id UNIQUEIDENTIFIER, @role NVARCHAR(20))
-- RETURNS BIT AS
-- BEGIN
--   RETURN CASE WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = @user_id AND role = @role) THEN 1 ELSE 0 END
-- END;

-- ========================================================
-- PART 3: APPLICATION-LEVEL SECURITY
-- (RLS 대신 애플리케이션에서 처리)
-- ========================================================

-- PostgreSQL RLS 정책은 Azure SQL에 직접 대응되지 않음
-- 대신 애플리케이션 레벨에서 WHERE user_id = @CurrentUserId 추가

-- 예시: View로 구현
CREATE VIEW v_user_projects AS
SELECT p.*
FROM projects p
WHERE p.user_id = CAST(COALESCE(current_setting('app.current_user_id', TRUE), '00000000-0000-0000-0000-000000000000') AS UUID);

-- 애플리케이션에서 사용:
-- SET app.current_user_id = 'user-uuid-from-jwt';
-- SELECT * FROM v_user_projects;

-- ========================================================
-- PART 4: INITIAL DATA
-- ========================================================

-- 샘플 프로필 (테스트용)
-- INSERT INTO profiles (user_id, display_name) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'Test User Admin');

-- 샘플 역할
-- INSERT INTO user_roles (user_id, role) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'admin');

-- ========================================================
-- PART 5: PERFORMANCE TUNING
-- ========================================================

-- 통계 업데이트 (PostgreSQL)
ANALYZE profiles;
ANALYZE user_roles;
ANALYZE projects;
ANALYZE project_stages;
ANALYZE courses;
ANALYZE course_modules;
ANALYZE lessons;

-- SQL Server:
-- UPDATE STATISTICS profiles WITH FULLSCAN;
-- UPDATE STATISTICS projects WITH FULLSCAN;

-- ========================================================
-- PART 6: BACKUP & RECOVERY
-- ========================================================

-- PostgreSQL: pg_dump 사용
-- pg_dump -U postgres -d landingpagepro -F c -b -v -f backup.dump

-- Azure SQL: Automated backups (기본 제공)
-- 복원: Azure Portal → Restore

-- ========================================================
-- MIGRATION CHECKLIST
-- ========================================================

-- [ ] Azure SQL Database 또는 PostgreSQL Flexible Server 생성 완료
-- [ ] 연결 문자열 확인 (.env.azure 파일)
-- [ ] 이 스크립트 실행 (테이블 생성)
-- [ ] Supabase 데이터 백업 (pg_dump 또는 Supabase Dashboard)
-- [ ] 데이터 마이그레이션 도구 실행 (Azure Data Migration Service 또는 pg_dump/pg_restore)
-- [ ] 인덱스 및 통계 확인
-- [ ] 애플리케이션 연결 테스트
-- [ ] RLS → Application Security 전환 검증
-- [ ] 성능 테스트

-- ========================================================
-- NOTES
-- ========================================================

-- 1. UUID vs UNIQUEIDENTIFIER
--    PostgreSQL: UUID 타입 사용
--    SQL Server: UNIQUEIDENTIFIER 타입 사용 (호환됨)

-- 2. TIMESTAMPTZ vs DATETIMEOFFSET
--    PostgreSQL: TIMESTAMPTZ (timezone-aware)
--    SQL Server: DATETIMEOFFSET (동일 기능)

-- 3. TEXT vs NVARCHAR(MAX)
--    PostgreSQL: TEXT 타입
--    SQL Server: NVARCHAR(MAX) (최대 2GB)

-- 4. ENUM vs CHECK Constraints
--    PostgreSQL: CREATE TYPE ... AS ENUM
--    SQL Server: CHECK (column IN ('value1', 'value2'))

-- 5. gen_random_uuid() vs NEWID()
--    PostgreSQL: gen_random_uuid() (pgcrypto extension)
--    SQL Server: NEWID()

-- 6. NOW() vs SYSDATETIMEOFFSET()
--    PostgreSQL: NOW() 또는 CURRENT_TIMESTAMP
--    SQL Server: SYSDATETIMEOFFSET() 또는 GETUTCDATE()

-- ========================================================
-- END OF MIGRATION SCRIPT
-- ========================================================
