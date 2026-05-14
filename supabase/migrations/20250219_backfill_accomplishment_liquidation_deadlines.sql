-- Backfill accomplishment and liquidation deadline columns based on end_date
-- Accomplishment: 3 working days after event end
-- Liquidation: 7 working days after event end (for AO) or 5 working days (for LSG)

-- Helper function to add working days (considering weekends)
CREATE OR REPLACE FUNCTION add_working_days(start_date DATE, num_days INT) RETURNS DATE AS $$
DECLARE
    result_date DATE := start_date;
    days_added INT := 0;
BEGIN
    WHILE days_added < num_days LOOP
        result_date := result_date + INTERVAL '1 day';
        -- Check if the day is not Saturday (6) or Sunday (0)
        IF EXTRACT(DOW FROM result_date) NOT IN (0, 6) THEN
            days_added := days_added + 1;
        END IF;
    END LOOP;
    RETURN result_date;
END;
$$ LANGUAGE plpgsql;

-- Update accomplishment_deadline (3 working days after end_date) for events that require it
UPDATE osld_events
SET accomplishment_deadline = (add_working_days(end_date::DATE, 3))::TEXT
WHERE require_accomplishment = true AND accomplishment_deadline IS NULL;

-- Update liquidation_deadline (7 working days after end_date) for events that require it  
UPDATE osld_events
SET liquidation_deadline = (add_working_days(end_date::DATE, 7))::TEXT
WHERE require_liquidation = true AND liquidation_deadline IS NULL;
