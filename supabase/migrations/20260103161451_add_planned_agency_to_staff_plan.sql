/*
  # Add planned agency workers to staff plan

  1. Changes
    - Add agency planning fields to `weekly_staff_plan` table
      - `agency_day1` (integer, default 0) - Number of planned agency workers for Day 1
      - `agency_day2` (integer, default 0) - Number of planned agency workers for Day 2
      - `agency_night1` (integer, default 0) - Number of planned agency workers for Night 1
      - `agency_night2` (integer, default 0) - Number of planned agency workers for Night 2
  
  2. Purpose
    - Allow planners to specify how many agency workers are planned for each shift
    - These agency workers will be automatically allocated to can lines during rota generation
    - Contributes to total shift headcount for staffing calculations
*/

-- Add agency planning columns to weekly_staff_plan
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_staff_plan' AND column_name = 'agency_day1'
  ) THEN
    ALTER TABLE weekly_staff_plan ADD COLUMN agency_day1 integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_staff_plan' AND column_name = 'agency_day2'
  ) THEN
    ALTER TABLE weekly_staff_plan ADD COLUMN agency_day2 integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_staff_plan' AND column_name = 'agency_night1'
  ) THEN
    ALTER TABLE weekly_staff_plan ADD COLUMN agency_night1 integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_staff_plan' AND column_name = 'agency_night2'
  ) THEN
    ALTER TABLE weekly_staff_plan ADD COLUMN agency_night2 integer DEFAULT 0;
  END IF;
END $$;