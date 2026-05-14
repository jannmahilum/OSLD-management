ALTER TABLE osld_events ADD COLUMN IF NOT EXISTS target_organization TEXT DEFAULT 'ALL';
ALTER TABLE osld_events ADD COLUMN IF NOT EXISTS require_accomplishment BOOLEAN DEFAULT false;
ALTER TABLE osld_events ADD COLUMN IF NOT EXISTS require_liquidation BOOLEAN DEFAULT false;
