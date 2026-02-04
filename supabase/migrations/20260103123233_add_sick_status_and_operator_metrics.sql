/*
  # Add Sick Status and Operator Metrics Tracking

  1. Changes
    - Add documentation for sick status support (S) in weekly_staff_plan
    - Create operator_metrics table to track performance and attendance
    - Add triggers to automatically update metrics based on allocations and staff plans

  2. New Tables
    - `operator_metrics`
      - `operator_id` (uuid, foreign key to operators)
      - `year` (integer) - Year for tracking
      - `holidays_used` (integer) - Count of holiday days taken
      - `shifts_worked` (integer) - Count of shifts worked
      - `sick_days` (integer) - Count of sick days
      - `last_updated` (timestamp)
      - Primary key: (operator_id, year)

  3. Status Values
    - Weekly staff plan columns (day1, day2, night1, night2) now support:
      - N/B/C/S = Available (skill ratings)
      - H = Holiday (unavailable)
      - S in text field = Sick (unavailable) - NOTE: conflicts with S rating, handled by "SICK" keyword
      - Empty = Not scheduled

  4. Security
    - Enable RLS on operator_metrics table
    - Add policies for public read access
*/

-- Create operator_metrics table
CREATE TABLE IF NOT EXISTS operator_metrics (
  operator_id uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  year integer NOT NULL,
  holidays_used integer DEFAULT 0,
  shifts_worked integer DEFAULT 0,
  sick_days integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  PRIMARY KEY (operator_id, year)
);

-- Enable RLS
ALTER TABLE operator_metrics ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view operator metrics"
  ON operator_metrics FOR SELECT
  TO public
  USING (true);

-- Public write access (for automatic updates)
CREATE POLICY "Anyone can insert operator metrics"
  ON operator_metrics FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update operator metrics"
  ON operator_metrics FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Function to update operator metrics
CREATE OR REPLACE FUNCTION update_operator_metrics()
RETURNS TRIGGER AS $$
DECLARE
  target_year integer;
  target_operator_id uuid;
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

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update metrics when allocations change
DROP TRIGGER IF EXISTS trigger_update_operator_metrics ON weekly_rota_allocation;
CREATE TRIGGER trigger_update_operator_metrics
  AFTER INSERT OR UPDATE OR DELETE ON weekly_rota_allocation
  FOR EACH ROW
  EXECUTE FUNCTION update_operator_metrics();

-- Function to update holiday and sick day counts
CREATE OR REPLACE FUNCTION update_operator_attendance()
RETURNS TRIGGER AS $$
DECLARE
  target_year integer;
  target_operator_id uuid;
  holiday_count integer;
  sick_count integer;
BEGIN
  -- Determine the year from week_commencing
  IF TG_OP = 'DELETE' THEN
    target_year := EXTRACT(YEAR FROM OLD.week_commencing::date);
    target_operator_id := OLD.operator_id;
  ELSE
    target_year := EXTRACT(YEAR FROM NEW.week_commencing::date);
    target_operator_id := NEW.operator_id;
  END IF;

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

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update attendance when staff plan changes
DROP TRIGGER IF EXISTS trigger_update_operator_attendance ON weekly_staff_plan;
CREATE TRIGGER trigger_update_operator_attendance
  AFTER INSERT OR UPDATE OR DELETE ON weekly_staff_plan
  FOR EACH ROW
  EXECUTE FUNCTION update_operator_attendance();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_operator_metrics_year ON operator_metrics(year);
CREATE INDEX IF NOT EXISTS idx_weekly_staff_plan_week ON weekly_staff_plan(week_commencing);
