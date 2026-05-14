-- Add audit_type column to submissions table to distinguish between Initial and Final audits
ALTER TABLE public.submissions
ADD COLUMN audit_type TEXT DEFAULT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_audit_type ON public.submissions(audit_type);
