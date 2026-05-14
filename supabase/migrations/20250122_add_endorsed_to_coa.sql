-- Add endorsed_to_coa column to submissions table
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS endorsed_to_coa BOOLEAN DEFAULT FALSE;
