CREATE TABLE IF NOT EXISTS org_social_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization TEXT NOT NULL UNIQUE,
  facebook_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_social_contacts_organization ON org_social_contacts(organization);

ALTER TABLE org_social_contacts DISABLE ROW LEVEL SECURITY;
