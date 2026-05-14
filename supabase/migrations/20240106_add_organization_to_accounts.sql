ALTER TABLE accounts ADD COLUMN IF NOT EXISTS organization TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS password TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_organization ON accounts(organization);
CREATE INDEX IF NOT EXISTS idx_accounts_email_org ON accounts(email, organization);

CREATE INDEX IF NOT EXISTS idx_org_accounts_organization ON org_accounts(organization);
CREATE INDEX IF NOT EXISTS idx_org_accounts_email_org ON org_accounts(email, organization);