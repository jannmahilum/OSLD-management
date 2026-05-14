CREATE TABLE IF NOT EXISTS form_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization VARCHAR(50) NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by VARCHAR(255),
  UNIQUE(organization, template_type)
);

ALTER TABLE form_templates DISABLE ROW LEVEL SECURITY;
