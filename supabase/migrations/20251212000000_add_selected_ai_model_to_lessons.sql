-- ========================================================
-- Phase 1: lessons 테이블에 selected_ai_model 컬럼 추가
-- ========================================================

-- lessons 테이블에 selected_ai_model 컬럼 추가
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS selected_ai_model TEXT;

-- 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN public.lessons.selected_ai_model IS '사용자가 최종 선택한 AI 모델 (gemini, claude, chatgpt 중 하나)';

