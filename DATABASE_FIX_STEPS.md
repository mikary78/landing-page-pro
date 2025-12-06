# Supabase 데이터베이스 스키마 수정 가이드

## 현재 문제
- `projects` 테이블에 `user_id` 칼럼이 없음
- `project_templates` 테이블이 존재하지 않음
- 마이그레이션이 제대로 적용되지 않음

## 해결책

### 1단계: Supabase 콘솔에서 SQL 에디터 열기
1. https://app.supabase.com/ 접속
2. 프로젝트 `nzedvnncozntizujvktb` 선택
3. 좌측 메뉴 → **SQL Editor** 클릭
4. **New Query** 버튼 클릭

### 2단계: 다음 SQL 실행 (순서대로)

```sql
-- 1. projects 테이블에 user_id 칼럼 추가
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. projects 테이블에 다른 누락된 칼럼 추가
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS education_stage TEXT DEFAULT 'elementary',
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS education_duration TEXT,
ADD COLUMN IF NOT EXISTS education_course TEXT,
ADD COLUMN IF NOT EXISTS education_session INTEGER;

-- 3. project_templates 테이블 생성
CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  education_session INTEGER,
  education_duration TEXT,
  education_course TEXT,
  ai_model TEXT NOT NULL DEFAULT 'gemini',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. project_templates RLS 활성화
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- 5. project_templates 정책 생성
CREATE POLICY "Users can view their own templates"
ON public.project_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
ON public.project_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.project_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.project_templates FOR DELETE
USING (auth.uid() = user_id);

-- 6. project_templates 트리거 생성
CREATE OR REPLACE TRIGGER update_project_templates_updated_at
BEFORE UPDATE ON public.project_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. project_stages 및 project_ai_results 테이블 생성 (확인용)
CREATE TABLE IF NOT EXISTS public.project_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  content TEXT,
  feedback TEXT,
  ai_model TEXT DEFAULT 'gemini',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, stage_order)
);

CREATE TABLE IF NOT EXISTS public.project_ai_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ai_model TEXT NOT NULL,
  generated_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, ai_model)
);

-- 8. RLS 활성화
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_ai_results ENABLE ROW LEVEL SECURITY;
```

### 3단계: 확인
각 쿼리를 실행한 후 "Execute" 버튼을 누르면 성공 메시지가 나타납니다.

## 완료 후
1. 브라우저를 강제 새로고침 (Ctrl+Shift+R)
2. 대시보드와 프로젝트 생성 페이지가 정상 작동하는지 확인
3. 프로젝트를 새로 생성해보기
