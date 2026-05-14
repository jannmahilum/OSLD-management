-- Add semester column to submissions table
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS semester TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_semester ON public.submissions(semester);
