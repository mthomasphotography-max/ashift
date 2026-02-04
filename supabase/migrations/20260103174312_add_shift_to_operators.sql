/*
  # Add shift identifier to operators

  1. Changes
    - Add `shift` column to `operators` table
      - Values: 'A', 'B', 'C', 'D', or NULL for no specific shift
      - Used to identify operators from other shifts doing overtime
    
  2. Notes
    - NULL shift means the operator is not assigned to a specific shift group
    - This allows tracking when operators from shifts A, B, C, or D do overtime
*/

-- Add shift column to operators table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'shift'
  ) THEN
    ALTER TABLE operators ADD COLUMN shift text;
  END IF;
END $$;

-- Add check constraint to ensure only valid shift values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'operators_shift_check'
  ) THEN
    ALTER TABLE operators ADD CONSTRAINT operators_shift_check 
    CHECK (shift IS NULL OR shift IN ('A', 'B', 'C', 'D'));
  END IF;
END $$;