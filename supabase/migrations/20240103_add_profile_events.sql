CREATE TABLE IF NOT EXISTS osld_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accreditation_status TEXT DEFAULT 'Not Accredited',
  officers JSONB DEFAULT '[]'::jsonb,
  advisers JSONB DEFAULT '[]'::jsonb,
  platforms JSONB DEFAULT '{"facebook": "", "other": ""}'::jsonb,
  contact_email TEXT,
  contact_phone TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS osld_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE osld_profile;
ALTER PUBLICATION supabase_realtime ADD TABLE osld_events;
