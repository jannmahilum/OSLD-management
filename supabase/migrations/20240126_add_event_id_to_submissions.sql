ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS event_id UUID;

CREATE INDEX IF NOT EXISTS idx_submissions_event_id ON public.submissions(event_id);
