/*
  # Remove Shift Column from Tables

  ## Overview
  Removes the shift column from all tables since the system no longer needs to track
  day/night shifts separately. Each week will now have a single line plan, staff plan,
  and rota allocation.

  ## Changes Made

  ### 1. weekly_line_plan table
  - Drop shift column
  - Update primary key to be only week_commencing
  - Drop and recreate constraints

  ### 2. weekly_staff_plan table
  - Drop shift column
  - Update unique constraint to (week_commencing, operator_id)

  ### 3. weekly_rota_allocation table
  - Drop shift column
  - Drop and recreate index

  ### 4. weekly_rota_gaps table
  - Drop shift column
  - Drop and recreate index

  ## Data Safety
  - Uses IF EXISTS checks to prevent errors
  - Constraints are recreated after column removal
*/

-- Drop indexes that include shift
DROP INDEX IF EXISTS idx_staff_plan_week_shift;
DROP INDEX IF EXISTS idx_allocation_week_shift;
DROP INDEX IF EXISTS idx_gaps_week_shift;

-- weekly_line_plan: Remove shift and update primary key
DO $$
BEGIN
  -- Drop the existing primary key constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'weekly_line_plan'
    AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE weekly_line_plan DROP CONSTRAINT weekly_line_plan_pkey;
  END IF;

  -- Drop shift column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_line_plan' AND column_name = 'shift'
  ) THEN
    ALTER TABLE weekly_line_plan DROP COLUMN shift;
  END IF;

  -- Add new primary key
  ALTER TABLE weekly_line_plan ADD PRIMARY KEY (week_commencing);
END $$;

-- weekly_staff_plan: Remove shift and update unique constraint
DO $$
BEGIN
  -- Drop unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'weekly_staff_plan'
    AND constraint_name = 'weekly_staff_plan_week_commencing_shift_operator_id_key'
  ) THEN
    ALTER TABLE weekly_staff_plan DROP CONSTRAINT weekly_staff_plan_week_commencing_shift_operator_id_key;
  END IF;

  -- Drop shift column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_staff_plan' AND column_name = 'shift'
  ) THEN
    ALTER TABLE weekly_staff_plan DROP COLUMN shift;
  END IF;

  -- Add new unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'weekly_staff_plan'
    AND constraint_name = 'weekly_staff_plan_week_commencing_operator_id_key'
  ) THEN
    ALTER TABLE weekly_staff_plan ADD CONSTRAINT weekly_staff_plan_week_commencing_operator_id_key UNIQUE (week_commencing, operator_id);
  END IF;
END $$;

-- weekly_rota_allocation: Remove shift column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_rota_allocation' AND column_name = 'shift'
  ) THEN
    ALTER TABLE weekly_rota_allocation DROP COLUMN shift;
  END IF;
END $$;

-- weekly_rota_gaps: Remove shift column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_rota_gaps' AND column_name = 'shift'
  ) THEN
    ALTER TABLE weekly_rota_gaps DROP COLUMN shift;
  END IF;
END $$;

-- Recreate indexes without shift
CREATE INDEX IF NOT EXISTS idx_staff_plan_week ON weekly_staff_plan(week_commencing);
CREATE INDEX IF NOT EXISTS idx_allocation_week ON weekly_rota_allocation(week_commencing);
CREATE INDEX IF NOT EXISTS idx_gaps_week ON weekly_rota_gaps(week_commencing);
