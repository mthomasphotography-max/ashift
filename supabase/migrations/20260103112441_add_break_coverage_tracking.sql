/*
  # Add Break Coverage Tracking

  1. Changes
    - Add `is_break_cover` boolean column to `weekly_rota_allocation` table
    - Add `hours_required` column to track partial coverage hours
    - Defaults to false and null respectively

  2. Purpose
    - Track which allocations are for break coverage vs primary assignments
    - Store hours needed for partial coverage (e.g., Can Line with 3 ops needs 3 hours)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_rota_allocation' AND column_name = 'is_break_cover'
  ) THEN
    ALTER TABLE weekly_rota_allocation ADD COLUMN is_break_cover boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_rota_allocation' AND column_name = 'hours_required'
  ) THEN
    ALTER TABLE weekly_rota_allocation ADD COLUMN hours_required decimal(4,2) DEFAULT NULL;
  END IF;
END $$;