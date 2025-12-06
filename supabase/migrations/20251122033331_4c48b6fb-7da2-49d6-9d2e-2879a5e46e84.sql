-- Add ai_model column to project_stages table
ALTER TABLE public.project_stages 
ADD COLUMN IF NOT EXISTS ai_model TEXT NOT NULL DEFAULT 'gemini';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_stages_project_ai ON public.project_stages(project_id, ai_model);

-- Create table for storing AI model results
CREATE TABLE IF NOT EXISTS public.project_ai_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  ai_model TEXT NOT NULL,
  generated_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, ai_model)
);

-- Enable Row Level Security
ALTER TABLE public.project_ai_results ENABLE ROW LEVEL SECURITY;

-- Create policies for project_ai_results
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_ai_results' AND policyname = 'Users can view AI results for their own projects'
  ) THEN
    CREATE POLICY "Users can view AI results for their own projects"
    ON public.project_ai_results
    FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_ai_results.project_id 
      AND projects.user_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_ai_results' AND policyname = 'Users can insert AI results for their own projects'
  ) THEN
    CREATE POLICY "Users can insert AI results for their own projects"
    ON public.project_ai_results
    FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_ai_results.project_id 
      AND projects.user_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_ai_results' AND policyname = 'Users can update AI results for their own projects'
  ) THEN
    CREATE POLICY "Users can update AI results for their own projects"
    ON public.project_ai_results
    FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_ai_results.project_id 
      AND projects.user_id = auth.uid()
    ));
  END IF;
END $$;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_project_ai_results_updated_at ON public.project_ai_results;
CREATE TRIGGER update_project_ai_results_updated_at
BEFORE UPDATE ON public.project_ai_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();