-- Add generated_content column to store full AI-generated educational content
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS generated_content TEXT;