ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_org TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_target_org ON public.notifications(target_org);
