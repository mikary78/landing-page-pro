
-- ========================================================
-- Azure SQL Migration Script
-- From: Supabase PostgreSQL
-- To: Azure Database for PostgreSQL
-- ========================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 1. ENUM TYPES
-- ========================================================

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ========================================================
-- 2. CORE TABLES
-- ========================================================

-- 2.1 profiles (사용자 프로필)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name VARCHAR(255),
  avatar_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 2.2 user_roles (사용자 역할)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_role UNIQUE (user_id, role)
);

DO $$ BEGIN
  ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_user_id
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- 2.3 projects (교육 프로젝트)
CREATE TABLE IF NOT EXISTS projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(500),
  description TEXT,
  document_content TEXT,
  document_url VARCHAR(1000),
  ai_model VARCHAR(50) DEFAULT 'gemini',
  education_stage VARCHAR(50) DEFAULT 'elementary',
  subject VARCHAR(200),
  duration_minutes INTEGER,
  education_duration VARCHAR(100),
  education_course VARCHAR(200),
  education_session INTEGER,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT fk_projects_user_id
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- 2.4 project_stages (프로젝트 생성 단계)
CREATE TABLE IF NOT EXISTS project_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  stage_name VARCHAR(100) NOT NULL,
  content TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  order_index INTEGER NOT NULL,
  -- 선택 AI 모델 구분(레거시 processDocument/코스 빌더 호환)
  ai_model VARCHAR(50) DEFAULT 'gemini',
  -- 표시/정렬용 별도 순서(레거시 호환). 없으면 order_index를 사용합니다.
  stage_order INTEGER,
  feedback TEXT,
  regeneration_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 기존 DB(이미 생성된 project_stages)에 컬럼을 공식 경로로 보강
ALTER TABLE project_stages ADD COLUMN IF NOT EXISTS ai_model VARCHAR(50) DEFAULT 'gemini';
ALTER TABLE project_stages ADD COLUMN IF NOT EXISTS stage_order INTEGER;
UPDATE project_stages SET ai_model = 'gemini' WHERE ai_model IS NULL;
UPDATE project_stages SET stage_order = order_index WHERE stage_order IS NULL;

DO $$ BEGIN
  ALTER TABLE project_stages ADD CONSTRAINT fk_project_stages_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_project_stages_project_id ON project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_status ON project_stages(status);
CREATE INDEX IF NOT EXISTS idx_project_stages_order ON project_stages(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_project_stages_ai_model ON project_stages(project_id, ai_model);

-- 2.5 project_ai_results (AI 호출 결과)
CREATE TABLE IF NOT EXISTS project_ai_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  ai_model VARCHAR(50) NOT NULL,
  prompt TEXT NOT NULL,
  result TEXT,
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE project_ai_results ADD CONSTRAINT fk_project_ai_results_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_project_ai_results_project_id ON project_ai_results(project_id);
CREATE INDEX IF NOT EXISTS idx_project_ai_results_created_at ON project_ai_results(created_at DESC);

-- 2.6 project_templates (사용자 템플릿)
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name VARCHAR(200) NOT NULL,
  description TEXT,
  education_session INTEGER,
  education_duration VARCHAR(100),
  education_course VARCHAR(200),
  ai_model VARCHAR(50) DEFAULT 'gemini',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE project_templates ADD CONSTRAINT fk_project_templates_user_id
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_project_templates_user_id ON project_templates(user_id);

-- 2.7 course_deployments (배포 관리)
CREATE TABLE IF NOT EXISTS course_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  deployment_url VARCHAR(1000),
  deployment_status VARCHAR(20) DEFAULT 'pending',
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE course_deployments ADD CONSTRAINT fk_course_deployments_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_course_deployments_project_id ON course_deployments(project_id);

-- 2.8 course_feedbacks (피드백)
CREATE TABLE IF NOT EXISTS course_feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID,
  feedback_text TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE course_feedbacks ADD CONSTRAINT fk_course_feedbacks_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE course_feedbacks ADD CONSTRAINT fk_course_feedbacks_user_id
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_course_feedbacks_project_id ON course_feedbacks(project_id);
CREATE INDEX IF NOT EXISTS idx_course_feedbacks_user_id ON course_feedbacks(user_id);

-- ========================================================
-- 2.9 generation_jobs / steps / artifacts (Agent 기반 생성 오케스트레이션)
-- ========================================================

-- generation_jobs: 프로젝트 단위 생성 작업(선택 산출물/옵션 포함)
CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  ai_model VARCHAR(50) NOT NULL DEFAULT 'gemini',
  requested_outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  current_step_index INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE generation_jobs ADD CONSTRAINT fk_generation_jobs_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE generation_jobs ADD CONSTRAINT fk_generation_jobs_user_id
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_generation_jobs_project_id ON generation_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON generation_jobs(created_at DESC);

-- generation_steps: 생성 작업의 단계별 진행/로그/입출력
CREATE TABLE IF NOT EXISTS generation_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  step_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  order_index INTEGER NOT NULL,
  input JSONB,
  output JSONB,
  log TEXT,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_generation_steps_job_order UNIQUE (job_id, order_index)
);

DO $$ BEGIN
  ALTER TABLE generation_steps ADD CONSTRAINT fk_generation_steps_job_id
    FOREIGN KEY (job_id) REFERENCES generation_jobs(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_generation_steps_job_id ON generation_steps(job_id);
CREATE INDEX IF NOT EXISTS idx_generation_steps_status ON generation_steps(status);
CREATE INDEX IF NOT EXISTS idx_generation_steps_order ON generation_steps(job_id, order_index);

-- generation_artifacts: 산출물(강의안/인포그래픽/슬라이드) 저장
CREATE TABLE IF NOT EXISTS generation_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  artifact_type VARCHAR(30) NOT NULL, -- 'document' | 'infographic' | 'slides'
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  content_text TEXT,
  content_json JSONB,
  assets JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_generation_artifacts_job_type UNIQUE (job_id, artifact_type)
);

DO $$ BEGIN
  ALTER TABLE generation_artifacts ADD CONSTRAINT fk_generation_artifacts_job_id
    FOREIGN KEY (job_id) REFERENCES generation_jobs(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_generation_artifacts_job_id ON generation_artifacts(job_id);
CREATE INDEX IF NOT EXISTS idx_generation_artifacts_type ON generation_artifacts(artifact_type);

-- ========================================================
-- 3. COURSE BUILDER TABLES
-- ========================================================

-- 3.1 courses (코스)
CREATE TABLE IF NOT EXISTS courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  level VARCHAR(20),
  target_audience TEXT,
  total_duration VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE courses ADD CONSTRAINT fk_courses_owner_id
    FOREIGN KEY (owner_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_courses_owner_id ON courses(owner_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);

-- 3.2 course_modules (코스 모듈)
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE course_modules ADD CONSTRAINT fk_course_modules_course_id
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_order_index ON course_modules(course_id, order_index);

-- 3.3 lessons (레슨)
CREATE TABLE IF NOT EXISTS lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL,
  project_id UUID,
  title VARCHAR(500) NOT NULL,
  order_index INTEGER NOT NULL,
  learning_objectives TEXT,
  selected_ai_model VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE lessons ADD CONSTRAINT fk_lessons_module_id
    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE lessons ADD CONSTRAINT fk_lessons_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_project_id ON lessons(project_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order_index ON lessons(module_id, order_index);

-- ========================================================
-- 4. FUNCTIONS & TRIGGERS
-- ========================================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (DROP first to avoid errors)
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_project_stages_updated_at ON project_stages;
CREATE TRIGGER trg_project_stages_updated_at BEFORE UPDATE ON project_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_project_templates_updated_at ON project_templates;
CREATE TRIGGER trg_project_templates_updated_at BEFORE UPDATE ON project_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_course_modules_updated_at ON course_modules;
CREATE TRIGGER trg_course_modules_updated_at BEFORE UPDATE ON course_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lessons_updated_at ON lessons;
CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_generation_jobs_updated_at ON generation_jobs;
CREATE TRIGGER trg_generation_jobs_updated_at BEFORE UPDATE ON generation_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_generation_steps_updated_at ON generation_steps;
CREATE TRIGGER trg_generation_steps_updated_at BEFORE UPDATE ON generation_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_generation_artifacts_updated_at ON generation_artifacts;
CREATE TRIGGER trg_generation_artifacts_updated_at BEFORE UPDATE ON generation_artifacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function: Check if user has role
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$ LANGUAGE SQL STABLE;

-- ========================================================
-- 5. ADDITIONAL COLUMNS (2026-01-10)
-- ========================================================

-- 교육대상(education_target) 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS education_target TEXT DEFAULT NULL;

-- 프로젝트 소스 타입 추가 (direct: 직접생성, from_course: 코스빌더에서 생성, imported: 외부 가져오기)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'direct';

-- 레슨에 콘텐츠 소스 추적 컬럼 추가
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_source TEXT DEFAULT 'manual';

-- ========================================================
-- 5.1 PROJECT-COURSE LINKS TABLE (2026-01-10)
-- 프로젝트와 코스 간 양방향 연결 추적
-- ========================================================

CREATE TABLE IF NOT EXISTS project_course_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  course_id UUID NOT NULL,
  link_type TEXT NOT NULL, -- 'project_to_course' | 'course_to_project'
  session_mapping JSONB, -- 세션-모듈 매핑 정보 저장
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_course_link UNIQUE (project_id, course_id)
);

DO $$ BEGIN
  ALTER TABLE project_course_links ADD CONSTRAINT fk_project_course_links_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE project_course_links ADD CONSTRAINT fk_project_course_links_course_id
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_project_course_links_project_id ON project_course_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_course_links_course_id ON project_course_links(course_id);

-- ========================================================
-- 5.2 CONTENT VERSIONS TABLE (2026-01-10)
-- 콘텐츠 버전 이력 관리
-- ========================================================

CREATE TABLE IF NOT EXISTS content_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL,
  project_id UUID,
  version_number INTEGER NOT NULL,
  content_type TEXT NOT NULL, -- 'slides' | 'quiz' | 'lab' | 'reading' | 'summary' | 'full'
  content_snapshot JSONB NOT NULL, -- 해당 시점의 콘텐츠 스냅샷
  created_by TEXT NOT NULL DEFAULT 'user', -- 'ai' | 'user' | 'import' | 'restore'
  ai_model TEXT, -- AI가 생성한 경우 모델명
  notes TEXT, -- 버전에 대한 메모
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE content_versions ADD CONSTRAINT fk_content_versions_lesson_id
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE content_versions ADD CONSTRAINT fk_content_versions_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_versions_lesson_id ON content_versions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_project_id ON content_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_created_at ON content_versions(lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_versions_version ON content_versions(lesson_id, content_type, version_number DESC);

-- lessons 테이블에 현재 버전 번호 컬럼 추가
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- ========================================================
-- 6. PERFORMANCE TUNING
-- ========================================================

ANALYZE profiles;
ANALYZE user_roles;
ANALYZE projects;
ANALYZE project_stages;
ANALYZE courses;
ANALYZE course_modules;
ANALYZE lessons;
ANALYZE content_versions;
