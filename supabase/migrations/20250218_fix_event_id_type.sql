ALTER TABLE public.submissions ALTER COLUMN event_id TYPE TEXT USING event_id::TEXT;
