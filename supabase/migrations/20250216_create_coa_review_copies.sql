CREATE TABLE IF NOT EXISTS coa_review_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  organization TEXT NOT NULL,
  year INTEGER NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('1st', '2nd')),
  audit_type TEXT NOT NULL CHECK (audit_type IN ('initial', 'final')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  copied_at TIMESTAMPTZ DEFAULT NOW(),
  original_submission_date TIMESTAMPTZ,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coa_review_copies_org ON coa_review_copies(organization);
CREATE INDEX IF NOT EXISTS idx_coa_review_copies_year ON coa_review_copies(year);
CREATE INDEX IF NOT EXISTS idx_coa_review_copies_semester ON coa_review_copies(semester);
CREATE INDEX IF NOT EXISTS idx_coa_review_copies_audit_type ON coa_review_copies(audit_type);

ALTER TABLE coa_review_copies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to coa_review_copies" ON coa_review_copies;
CREATE POLICY "Allow all access to coa_review_copies"
  ON coa_review_copies FOR ALL
  USING (true)
  WITH CHECK (true);
