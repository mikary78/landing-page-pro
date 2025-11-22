-- Add education-related columns to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS education_duration TEXT,
ADD COLUMN IF NOT EXISTS education_course TEXT,
ADD COLUMN IF NOT EXISTS education_session INTEGER;