-- Create courses table for Course Builder feature
CREATE TABLE public.courses (
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
CREATE TABLE public.course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  learning_objectives TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- RLS Policies for courses
-- ========================================================

-- Users can view their own courses or admin can view all
CREATE POLICY "Users can view their own courses"
ON public.courses
FOR SELECT
USING (
  auth.uid() = owner_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Users can create their own courses
CREATE POLICY "Users can create their own courses"
ON public.courses
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Users can update their own courses or admin can update all
CREATE POLICY "Users can update their own courses"
ON public.courses
FOR UPDATE
USING (
  auth.uid() = owner_id 
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  auth.uid() = owner_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Users can delete their own courses or admin can delete all
CREATE POLICY "Users can delete their own courses"
ON public.courses
FOR DELETE
USING (
  auth.uid() = owner_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- ========================================================
-- RLS Policies for course_modules
-- ========================================================

-- Users can view modules of their own courses
CREATE POLICY "Users can view modules of their own courses"
ON public.course_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_modules.course_id
    AND (courses.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Users can create modules for their own courses
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
CREATE POLICY "Users can update modules of their own courses"
ON public.course_modules
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_modules.course_id
    AND (courses.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_modules.course_id
    AND (courses.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Users can delete modules of their own courses
CREATE POLICY "Users can delete modules of their own courses"
ON public.course_modules
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_modules.course_id
    AND (courses.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- ========================================================
-- RLS Policies for lessons
-- ========================================================

-- Users can view lessons of their own courses
CREATE POLICY "Users can view lessons of their own courses"
ON public.lessons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    INNER JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.module_id
    AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Users can create lessons for their own courses
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
CREATE POLICY "Users can update lessons of their own courses"
ON public.lessons
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    INNER JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.module_id
    AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    INNER JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.module_id
    AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Users can delete lessons of their own courses
CREATE POLICY "Users can delete lessons of their own courses"
ON public.lessons
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    INNER JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.module_id
    AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- ========================================================
-- Triggers for automatic timestamp updates
-- ========================================================

CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_modules_updated_at
BEFORE UPDATE ON public.course_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================
-- Indexes for better query performance
-- ========================================================

CREATE INDEX idx_courses_owner_id ON public.courses(owner_id);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_course_modules_course_id ON public.course_modules(course_id);
CREATE INDEX idx_course_modules_order_index ON public.course_modules(course_id, order_index);
CREATE INDEX idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX idx_lessons_project_id ON public.lessons(project_id);
CREATE INDEX idx_lessons_order_index ON public.lessons(module_id, order_index);






