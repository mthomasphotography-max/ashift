/*
  # Add shift-specific tracking to rota allocations

  1. Changes
    - Add `shift_block` column to `weekly_rota_allocation` table
    - Values: 'DAY1', 'DAY2', 'NIGHT1', 'NIGHT2'
    - This allows tracking which specific shifts an operator is assigned to an area
    - An operator can now have multiple allocation records (one per shift) for the same week

  2. Notes
    - Existing data without shift_block will be treated as weekly assignments
    - New allocations will specify the exact shift
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_rota_allocation' AND column_name = 'shift_block'
  ) THEN
    ALTER TABLE weekly_rota_allocation 
    ADD COLUMN shift_block text CHECK (shift_block IN ('DAY1', 'DAY2', 'NIGHT1', 'NIGHT2'));
  END IF;
END $$;