-- ========================================================
-- lesson_contents 테이블 생성 스크립트
-- Azure Database for PostgreSQL에서 실행
-- ========================================================

-- 1. lesson_contents 테이블 생성
CREATE TABLE IF NOT EXISTS lesson_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL,
  content_type VARCHAR(100) NOT NULL, -- 'lesson_plan', 'slides', 'assessment', 'hands_on_activity' 등
  ai_model VARCHAR(50) NOT NULL, -- 'gemini', 'claude', 'chatgpt'
  content JSONB NOT NULL, -- 실제 콘텐츠 데이터
  markdown TEXT, -- Markdown 형식 콘텐츠 (있는 경우)
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Foreign Key 제약조건
DO $$ BEGIN
  ALTER TABLE lesson_contents ADD CONSTRAINT fk_lesson_contents_lesson_id
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_lesson_contents_lesson_id ON lesson_contents(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_contents_type_model ON lesson_contents(lesson_id, content_type, ai_model);
CREATE INDEX IF NOT EXISTS idx_lesson_contents_created_at ON lesson_contents(created_at DESC);

-- 4. Unique 제약조건 (UPSERT용)
DO $$ BEGIN
  ALTER TABLE lesson_contents ADD CONSTRAINT uq_lesson_contents_lesson_type_model
    UNIQUE (lesson_id, content_type, ai_model);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS trg_lesson_contents_updated_at ON lesson_contents;
CREATE TRIGGER trg_lesson_contents_updated_at
  BEFORE UPDATE ON lesson_contents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'lesson_contents 테이블이 성공적으로 생성되었습니다.';
END $$;
