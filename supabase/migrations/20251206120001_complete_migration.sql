-- ========================================================
-- 기존 프로젝트 관련 마이그레이션 (이미 실행되었다면 건너뛰기)
-- ========================================================

-- Service role access 정책 (이미 있다면 재생성)
DROP POLICY IF EXISTS "Service role access" ON public.projects;
DROP POLICY IF EXISTS "Service role access" ON public.project_stages;
DROP POLICY IF EXISTS "Service role access" ON public.project_ai_results;

CREATE POLICY "Service role access" ON public.projects FOR ALL USING (true);
CREATE POLICY "Service role access" ON public.project_stages FOR ALL USING (true);
CREATE POLICY "Service role access" ON public.project_ai_results FOR ALL USING (true);

-- projects 테이블에 누락된 칼럼 추가
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS education_stage TEXT DEFAULT 'elementary',
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS education_duration TEXT,
ADD COLUMN IF NOT EXISTS education_course TEXT,
ADD COLUMN IF NOT EXISTS education_session INTEGER,
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- project_templates 테이블 생성
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

-- project_templates RLS 활성화
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- project_templates 정책 설정
DROP POLICY IF EXISTS "Users can view their own templates" ON public.project_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON public.project_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.project_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.project_templates;

CREATE POLICY "Users can view their own templates"
ON public.project_templates FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
ON public.project_templates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.project_templates FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.project_templates FOR DELETE USING (auth.uid() = user_id);

-- UUID 생성 함수가 없으면 확장 설치
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- projects 테이블 id 타입 확인 및 수정 (TEXT -> UUID)
-- 기존 데이터가 TEXT 타입인 경우 UUID로 변환
DO $$
DECLARE
  constraint_record RECORD;
  table_record RECORD;
BEGIN
  -- projects.id가 TEXT 타입인 경우 UUID로 변경
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'id' 
    AND data_type = 'text'
  ) THEN
    -- 1단계: projects.id를 참조하는 모든 외래 키 제약 조건 제거
    FOR constraint_record IN
      SELECT 
        tc.table_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
        AND rc.unique_constraint_schema = ccu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND ccu.table_name = 'projects'
        AND ccu.column_name = 'id'
    LOOP
      EXECUTE format('ALTER TABLE IF EXISTS public.%I DROP CONSTRAINT IF EXISTS %I', 
        constraint_record.table_name, 
        constraint_record.constraint_name);
    END LOOP;
    
    -- 2단계: projects.id를 UUID로 변환
    ALTER TABLE public.projects 
    ALTER COLUMN id TYPE UUID USING 
      CASE 
        WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid
        ELSE gen_random_uuid() -- 유효하지 않은 형식이면 새 UUID 생성
      END;
    
    -- 3단계: 관련된 모든 테이블의 project_id 컬럼도 UUID로 변환
    FOR table_record IN
      SELECT DISTINCT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'project_id'
        AND data_type = 'text'
    LOOP
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN project_id TYPE UUID USING 
        CASE 
          WHEN project_id ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN project_id::uuid
          ELSE NULL
        END', table_record.table_name);
    END LOOP;
    
    -- 4단계: projects.id 기본값 설정
    ALTER TABLE public.projects 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
    
    -- 5단계: 외래 키 제약 조건 재생성
    -- project_stages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_stages') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_stages_project_id_fkey'
      ) THEN
        ALTER TABLE public.project_stages 
        ADD CONSTRAINT project_stages_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
      END IF;
    END IF;
    
    -- project_ai_results
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_ai_results') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_ai_results_project_id_fkey'
      ) THEN
        ALTER TABLE public.project_ai_results 
        ADD CONSTRAINT project_ai_results_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
      END IF;
    END IF;
    
    -- course_deployments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_deployments') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'course_deployments_project_id_fkey'
      ) THEN
        ALTER TABLE public.course_deployments 
        ADD CONSTRAINT course_deployments_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
      END IF;
    END IF;
    
    -- course_feedbacks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_feedbacks') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'course_feedbacks_project_id_fkey'
      ) THEN
        ALTER TABLE public.course_feedbacks 
        ADD CONSTRAINT course_feedbacks_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
      END IF;
    END IF;
  ELSE
    -- 이미 UUID 타입이면 기본값만 설정
    ALTER TABLE public.projects
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

-- 이미 null로 남은 행이 있다면 채우기
UPDATE public.projects
  SET id = gen_random_uuid()
  WHERE id IS NULL;

-- not null 유지
ALTER TABLE public.projects
  ALTER COLUMN id SET NOT NULL;

-- ========================================================
-- Course Builder 마이그레이션 (새로 추가)
-- ========================================================

-- Create courses table for Course Builder feature
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT,               -- beginner / intermediate / advanced 등
  target_audience TEXT,     -- 타겟 학습자 설명
  total_duration TEXT,      -- "4주", "12시간" 등
  status TEXT NOT NULL DEFAULT 'draft', -- draft / in_review / published / archived
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course_modules table
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table
-- 주의: projects.id가 TEXT 타입인 경우를 대비해 외래 키는 나중에 추가
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  project_id UUID, -- 외래 키는 나중에 추가
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  learning_objectives TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- projects.id가 UUID 타입인 경우에만 외래 키 추가
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
  ) THEN
    -- 외래 키 제약 조건 추가
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'lessons_project_id_fkey'
    ) THEN
      ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_project_id_fkey 
      FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- RLS Policies for courses
-- ========================================================

-- Users can view their own courses or admin can view all
DROP POLICY IF EXISTS "Users can view their own courses" ON public.courses;
CREATE POLICY "Users can view their own courses"
ON public.courses
FOR SELECT
USING (
  auth.uid() = owner_id 
  OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
);

-- Users can create their own courses
DROP POLICY IF EXISTS "Users can create their own courses" ON public.courses;
CREATE POLICY "Users can create their own courses"
ON public.courses
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Users can update their own courses or admin can update all
DROP POLICY IF EXISTS "Users can update their own courses" ON public.courses;
CREATE POLICY "Users can update their own courses"
ON public.courses
FOR UPDATE
USING (
  auth.uid() = owner_id 
  OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
)
WITH CHECK (
  auth.uid() = owner_id 
  OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
);

-- Users can delete their own courses or admin can delete all
DROP POLICY IF EXISTS "Users can delete their own courses" ON public.courses;
CREATE POLICY "Users can delete their own courses"
ON public.courses
FOR DELETE
USING (
  auth.uid() = owner_id 
  OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
);

-- ========================================================
-- RLS Policies for course_modules
-- ========================================================

-- Users can view modules of their own courses
DROP POLICY IF EXISTS "Users can view modules of their own courses" ON public.course_modules;
CREATE POLICY "Users can view modules of their own courses"
ON public.course_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_modules.course_id
    AND (
      courses.owner_id = auth.uid() 
      OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  )
);

-- Users can create modules for their own courses
DROP POLICY IF EXISTS "Users can create modules for their own courses" ON public.course_modules;
CREATE POLICY "Users can create modules for their own courses"
ON public.course_modules
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_modules.course_id
    AND courses.owner_id = auth.uid()
  )
);

-- Users can update modules of their own courses
DROP POLICY IF EXISTS "Users can update modules of their own courses" ON public.course_modules;
CREATE POLICY "Users can update modules of their own courses"
ON public.course_modules
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_modules.course_id
    AND (
      courses.owner_id = auth.uid() 
      OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_modules.course_id
    AND (
      courses.owner_id = auth.uid() 
      OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  )
);

-- Users can delete modules of their own courses
DROP POLICY IF EXISTS "Users can delete modules of their own courses" ON public.course_modules;
CREATE POLICY "Users can delete modules of their own courses"
ON public.course_modules
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_modules.course_id
    AND (
      courses.owner_id = auth.uid() 
      OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  )
);

-- ========================================================
-- RLS Policies for lessons
-- ========================================================

-- Users can view lessons of their own courses
DROP POLICY IF EXISTS "Users can view lessons of their own courses" ON public.lessons;
CREATE POLICY "Users can view lessons of their own courses"
ON public.lessons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    INNER JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.module_id
    AND (
      c.owner_id = auth.uid() 
      OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  )
);

-- Users can create lessons for their own courses
DROP POLICY IF EXISTS "Users can create lessons for their own courses" ON public.lessons;
CREATE POLICY "Users can create lessons for their own courses"
ON public.lessons
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    INNER JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.module_id
    AND c.owner_id = auth.uid()
  )
);

-- Users can update lessons of their own courses
DROP POLICY IF EXISTS "Users can update lessons of their own courses" ON public.lessons;
CREATE POLICY "Users can update lessons of their own courses"
ON public.lessons
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    INNER JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.module_id
    AND (
      c.owner_id = auth.uid() 
      OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    INNER JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.module_id
    AND (
      c.owner_id = auth.uid() 
      OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  )
);

-- Users can delete lessons of their own courses
DROP POLICY IF EXISTS "Users can delete lessons of their own courses" ON public.lessons;
CREATE POLICY "Users can delete lessons of their own courses"
ON public.lessons
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    INNER JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.module_id
    AND (
      c.owner_id = auth.uid() 
      OR (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  )
);

-- ========================================================
-- Triggers for automatic timestamp updates
-- ========================================================

DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_modules_updated_at ON public.course_modules;
CREATE TRIGGER update_course_modules_updated_at
BEFORE UPDATE ON public.course_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON public.lessons;
CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================
-- Indexes for better query performance
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_courses_owner_id ON public.courses(owner_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON public.course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_order_index ON public.course_modules(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_project_id ON public.lessons(project_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order_index ON public.lessons(module_id, order_index);

