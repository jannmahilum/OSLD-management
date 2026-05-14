-- Add base deadline columns for accomplishment and liquidation reports
ALTER TABLE osld_events ADD COLUMN IF NOT EXISTS accomplishment_deadline TEXT;
ALTER TABLE osld_events ADD COLUMN IF NOT EXISTS liquidation_deadline TEXT;
