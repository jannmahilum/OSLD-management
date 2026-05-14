CREATE TABLE IF NOT EXISTS public.notification_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_by TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notification_id, read_by)
);

CREATE INDEX IF NOT EXISTS idx_notification_read_status_notification_id ON public.notification_read_status(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_read_status_read_by ON public.notification_read_status(read_by);
