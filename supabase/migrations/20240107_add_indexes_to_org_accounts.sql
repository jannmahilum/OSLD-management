CREATE INDEX IF NOT EXISTS idx_org_accounts_organization ON org_accounts(organization);
CREATE INDEX IF NOT EXISTS idx_org_accounts_email_org ON org_accounts(email, organization);
