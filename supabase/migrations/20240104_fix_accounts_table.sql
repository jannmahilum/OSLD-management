-- Make role column nullable since we removed it from the form
ALTER TABLE org_accounts ALTER COLUMN role DROP NOT NULL;
