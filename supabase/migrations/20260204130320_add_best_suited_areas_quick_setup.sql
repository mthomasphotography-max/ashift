/*
  # Add Quick Setup for Operator Best Suited Areas

  1. Changes
    - Add `best_suited_areas` JSONB column to operators table for quick skill assignment
    - This allows managers to quickly tick boxes for areas operators can work
    - Allocation logic will heavily prioritize these selections

  2. Purpose
    - Provides a fast, simple way to set up operator assignments
    - Complements the detailed SKAP system which will be used later
    - Reduces initial setup time from detailed skill ratings to simple checkboxes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'best_suited_areas'
  ) THEN
    ALTER TABLE operators ADD COLUMN best_suited_areas JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;