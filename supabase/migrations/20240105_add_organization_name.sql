-- Add organization_name column for Accredited Organizations
ALTER TABLE org_accounts ADD COLUMN IF NOT EXISTS organization_name TEXT;
