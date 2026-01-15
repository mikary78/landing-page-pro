-- 3.4 lesson_contents (레슨별 생성된 콘텐츠)
-- 여러 AI 모델로 생성된 다양한 콘텐츠 버전을 저장
CREATE TABLE IF NOT EXISTS lesson_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL,
  content_type VARCHAR(100) NOT NULL, -- 'slides', 'assessment', 'hands_on_activity' 등
  ai_model VARCHAR(50) NOT NULL, -- 'gemini', 'claude', 'chatgpt'
  content JSONB NOT NULL, -- 실제 콘텐츠 데이터
  markdown TEXT, -- Markdown 형식 콘텐츠 (있는 경우)
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE lesson_contents ADD CONSTRAINT fk_lesson_contents_lesson_id
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_lesson_contents_lesson_id ON lesson_contents(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_contents_type_model ON lesson_contents(lesson_id, content_type, ai_model);
CREATE INDEX IF NOT EXISTS idx_lesson_contents_created_at ON lesson_contents(created_at DESC);

-- Unique constraint for UPSERT
DO $$ BEGIN
  ALTER TABLE lesson_contents ADD CONSTRAINT uq_lesson_contents_lesson_type_model
    UNIQUE (lesson_id, content_type, ai_model);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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
