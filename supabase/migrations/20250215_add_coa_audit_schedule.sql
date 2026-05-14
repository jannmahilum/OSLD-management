CREATE TABLE IF NOT EXISTS coa_audit_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester TEXT NOT NULL,
  audit_type TEXT NOT NULL,
  month INTEGER NOT NULL,
  month_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semester, audit_type)
);

INSERT INTO coa_audit_schedule (semester, audit_type, month, month_name, description)
VALUES
  ('1st Semester', 'Initial Audit', 10, 'October', 'COA Initial Audit - 1st Semester'),
  ('1st Semester', 'Final Audit', 12, 'December', 'COA Final Audit - 1st Semester'),
  ('2nd Semester', 'Initial Audit', 3, 'March', 'COA Initial Audit - 2nd Semester'),
  ('2nd Semester', 'Final Audit', 5, 'May', 'COA Final Audit - 2nd Semester')
ON CONFLICT DO NOTHING;
