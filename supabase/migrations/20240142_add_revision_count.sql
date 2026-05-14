-- Add revision_count column to submissions table to track number of remarks
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 1;

-- Update existing records to have revision_count = 1
UPDATE submissions SET revision_count = 1 WHERE revision_count IS NULL;
