ALTER TABLE submissions ADD COLUMN IF NOT EXISTS coa_reviewed BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_submissions_coa_reviewed ON public.submissions(coa_reviewed);
