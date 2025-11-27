-- 배포 테이블 생성
CREATE TABLE public.course_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  deployment_url TEXT,
  deployment_status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 피드백 수집 테이블 생성
CREATE TABLE public.course_feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deployment_id UUID REFERENCES public.course_deployments(id) ON DELETE CASCADE,
  user_email TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  feedback_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.course_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_feedbacks ENABLE ROW LEVEL SECURITY;

-- course_deployments RLS 정책
CREATE POLICY "Users can view their own deployments"
ON public.course_deployments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deployments"
ON public.course_deployments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deployments"
ON public.course_deployments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deployments"
ON public.course_deployments
FOR DELETE
USING (auth.uid() = user_id);

-- course_feedbacks RLS 정책
CREATE POLICY "Users can view feedbacks for their projects"
ON public.course_feedbacks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = course_feedbacks.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can create feedback"
ON public.course_feedbacks
FOR INSERT
WITH CHECK (true);

-- 업데이트 트리거 추가
CREATE TRIGGER update_course_deployments_updated_at
BEFORE UPDATE ON public.course_deployments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 인덱스 생성
CREATE INDEX idx_course_deployments_project_id ON public.course_deployments(project_id);
CREATE INDEX idx_course_deployments_user_id ON public.course_deployments(user_id);
CREATE INDEX idx_course_feedbacks_project_id ON public.course_feedbacks(project_id);
CREATE INDEX idx_course_feedbacks_deployment_id ON public.course_feedbacks(deployment_id);