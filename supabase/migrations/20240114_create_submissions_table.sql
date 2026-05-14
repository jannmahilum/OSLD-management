CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  activity_title TEXT NOT NULL,
  activity_duration TEXT NOT NULL,
  activity_venue TEXT NOT NULL,
  activity_participants TEXT NOT NULL,
  activity_funds TEXT NOT NULL,
  activity_budget TEXT NOT NULL,
  activity_sdg TEXT NOT NULL,
  activity_likha TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  revision_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_submissions_organization ON public.submissions(organization);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON public.submissions(submission_type);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
