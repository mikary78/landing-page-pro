-- Create project_stages table for pipeline management
CREATE TABLE public.project_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  content TEXT,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, stage_order)
);

-- Enable RLS
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view stages of their own projects"
ON public.project_stages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_stages.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert stages for their own projects"
ON public.project_stages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_stages.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update stages of their own projects"
ON public.project_stages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_stages.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_project_stages_updated_at
BEFORE UPDATE ON public.project_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();