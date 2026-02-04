/*
  # Remove Shift Column from Weekly Staff Plan

  ## Changes Made
  1. Drop the unique constraint that includes shift
  2. Remove the shift column from weekly_staff_plan table
  3. Add new unique constraint without shift (week_commencing + operator_id only)

  ## Rationale
  Operators have a fixed shift (stored in operators table), so we don't need to duplicate
  this information in the weekly staff plan. Availability is per operator per week, not
  per operator per shift per week.

  ## Important Notes
  - This is a breaking change for existing data
  - Any existing data with the same operator appearing twice in the same week (once for days, once for nights) will need to be reconciled
  - The unique constraint ensures one plan entry per operator per week
*/

-- Drop the old unique constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_staff_plan_week_commencing_shift_operator_id_key'
  ) THEN
    ALTER TABLE weekly_staff_plan DROP CONSTRAINT weekly_staff_plan_week_commencing_shift_operator_id_key;
  END IF;
END $$;

-- Drop the shift column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_staff_plan' AND column_name = 'shift'
  ) THEN
    ALTER TABLE weekly_staff_plan DROP COLUMN shift;
  END IF;
END $$;

-- Add new unique constraint without shift
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_staff_plan_week_commencing_operator_id_key'
  ) THEN
    ALTER TABLE weekly_staff_plan ADD CONSTRAINT weekly_staff_plan_week_commencing_operator_id_key 
      UNIQUE(week_commencing, operator_id);
  END IF;
END $$;

-- Drop the old index if it exists
DROP INDEX IF EXISTS idx_staff_plan_week_shift;

-- Create new index without shift
CREATE INDEX IF NOT EXISTS idx_staff_plan_week ON weekly_staff_plan(week_commencing);