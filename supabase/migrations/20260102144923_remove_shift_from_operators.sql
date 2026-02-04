/*
  # Remove Shift Constraint from Operators

  1. Changes
    - Remove NOT NULL constraint from `shift` column in `operators` table
    - Remove CHECK constraint on shift values
    - Operators can now work any shift based on weekly staff plan

  2. Reasoning
    - Staff plan defines when operators work each week
    - Operators don't have fixed shifts
    - More flexible scheduling
*/

-- Remove the check constraint and make shift nullable
DO $$
BEGIN
  -- Drop the existing check constraint if it exists
  ALTER TABLE operators DROP CONSTRAINT IF EXISTS operators_shift_check;
  
  -- Make shift column nullable
  ALTER TABLE operators ALTER COLUMN shift DROP NOT NULL;
END $$;
