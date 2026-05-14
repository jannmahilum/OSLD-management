-- Add gdrive_link column to submissions table for quick submission links
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS gdrive_link TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_gdrive_link ON submissions(gdrive_link);
