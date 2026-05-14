ALTER TABLE IF EXISTS submissions ADD COLUMN IF NOT EXISTS endorsed_to_coa BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_submissions_endorsed_to_coa ON public.submissions(endorsed_to_coa);
