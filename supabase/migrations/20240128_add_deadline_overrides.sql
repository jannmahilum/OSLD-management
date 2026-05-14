-- Add columns to store overridden deadline dates for when appeals are approved
ALTER TABLE osld_events ADD COLUMN IF NOT EXISTS accomplishment_deadline_override TEXT;
ALTER TABLE osld_events ADD COLUMN IF NOT EXISTS liquidation_deadline_override TEXT;
