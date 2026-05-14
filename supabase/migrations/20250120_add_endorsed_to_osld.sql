-- Add endorsed_to_osld column to submissions table
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS endorsed_to_osld BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_endorsed_to_osld
ON submissions(endorsed_to_osld);
