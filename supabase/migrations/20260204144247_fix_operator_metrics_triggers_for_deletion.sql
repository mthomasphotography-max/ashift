/*
  # Fix Operator Metrics Triggers for Cascade Deletion

  1. Problem
    - When an operator is deleted, CASCADE deletes their operator_metrics records
    - Then CASCADE deletes their weekly_rota_allocation records
    - The DELETE trigger on weekly_rota_allocation tries to update operator_metrics
    - This causes a foreign key violation because the operator no longer exists

  2. Solution
    - Modify the trigger functions to check if the operator exists before updating metrics
    - Skip metric updates if the operator has been deleted
*/

-- Fix the update_operator_metrics function to handle deleted operators
CREATE OR REPLACE FUNCTION update_operator_metrics()
RETURNS TRIGGER AS $$
DECLARE
  target_year integer;
  target_operator_id uuid;
  operator_exists boolean;
BEGIN
  -- Determine the year from week_commencing
  IF TG_OP = 'DELETE' THEN
    target_year := EXTRACT(YEAR FROM OLD.week_commencing::date);
    target_operator_id := OLD.operator_id;
  ELSE
    target_year := EXTRACT(YEAR FROM NEW.week_commencing::date);
    target_operator_id := NEW.operator_id;
  END IF;

  -- Only process if operator_id exists
  IF target_operator_id IS NOT NULL THEN
    -- Check if the operator still exists (not being deleted)
    SELECT EXISTS(SELECT 1 FROM operators WHERE id = target_operator_id)
    INTO operator_exists;
    
    -- Only update metrics if operator still exists
    IF operator_exists THEN
      -- Recalculate shifts_worked for this operator/year
      INSERT INTO operator_metrics (operator_id, year, shifts_worked, last_updated)
      SELECT 
        target_operator_id,
        target_year,
        COUNT(*),
        now()
      FROM weekly_rota_allocation
      WHERE operator_id = target_operator_id
        AND EXTRACT(YEAR FROM week_commencing::date) = target_year
      ON CONFLICT (operator_id, year)
      DO UPDATE SET
        shifts_worked = EXCLUDED.shifts_worked,
        last_updated = now();
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fix the update_operator_attendance function to handle deleted operators
CREATE OR REPLACE FUNCTION update_operator_attendance()
RETURNS TRIGGER AS $$
DECLARE
  target_year integer;
  target_operator_id uuid;
  holiday_count integer;
  sick_count integer;
  operator_exists boolean;
BEGIN
  -- Determine the year from week_commencing
  IF TG_OP = 'DELETE' THEN
    target_year := EXTRACT(YEAR FROM OLD.week_commencing::date);
    target_operator_id := OLD.operator_id;
  ELSE
    target_year := EXTRACT(YEAR FROM NEW.week_commencing::date);
    target_operator_id := NEW.operator_id;
  END IF;

  -- Check if the operator still exists (not being deleted)
  SELECT EXISTS(SELECT 1 FROM operators WHERE id = target_operator_id)
  INTO operator_exists;
  
  -- Only update metrics if operator still exists
  IF operator_exists THEN
    -- Count holidays and sick days for this operator/year
    SELECT 
      COUNT(*) FILTER (WHERE 
        UPPER(TRIM(day1)) = 'H' OR 
        UPPER(TRIM(day2)) = 'H' OR 
        UPPER(TRIM(night1)) = 'H' OR 
        UPPER(TRIM(night2)) = 'H'
      ),
      COUNT(*) FILTER (WHERE 
        UPPER(TRIM(day1)) = 'SICK' OR 
        UPPER(TRIM(day2)) = 'SICK' OR 
        UPPER(TRIM(night1)) = 'SICK' OR 
        UPPER(TRIM(night2)) = 'SICK'
      )
    INTO holiday_count, sick_count
    FROM weekly_staff_plan
    WHERE operator_id = target_operator_id
      AND EXTRACT(YEAR FROM week_commencing::date) = target_year;

    -- Update metrics
    INSERT INTO operator_metrics (operator_id, year, holidays_used, sick_days, last_updated)
    VALUES (target_operator_id, target_year, holiday_count, sick_count, now())
    ON CONFLICT (operator_id, year)
    DO UPDATE SET
      holidays_used = EXCLUDED.holidays_used,
      sick_days = EXCLUDED.sick_days,
      last_updated = now();
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
