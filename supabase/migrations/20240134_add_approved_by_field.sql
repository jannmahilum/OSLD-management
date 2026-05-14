-- Add approved_by field to track the organization that originally approved the submission
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS approved_by VARCHAR(50);

-- Backfill approved_by with the current submitted_to values
UPDATE submissions SET approved_by = submitted_to WHERE status = 'Approved' AND approved_by IS NULL;
