CREATE TABLE IF NOT EXISTS org_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('memorandum', 'announcement', 'functional_chart')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_documents_organization ON org_documents(organization);
CREATE INDEX IF NOT EXISTS idx_org_documents_type ON org_documents(document_type);

ALTER TABLE org_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to org_documents" ON org_documents;
CREATE POLICY "Allow all access to org_documents"
  ON org_documents FOR ALL
  USING (true)
  WITH CHECK (true);
