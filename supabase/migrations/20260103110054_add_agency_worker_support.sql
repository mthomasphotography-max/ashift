/*
  # Add Agency Worker Support

  1. Changes
    - Make `operator_id` nullable in `weekly_rota_allocation` table
    - Add `assigned_to` field to track "Agency" assignments
    - Update the `shift_block` field to the allocation table for better tracking
    
  2. Purpose
    - Allow assignments to be made to "Agency" workers instead of specific operators
    - When `assigned_to` is "Agency", the `operator_id` will be null
    - This frees up regular operators to cover other gaps
*/

-- Make operator_id nullable and add assigned_to field
DO $$
BEGIN
  -- Drop the NOT NULL constraint on operator_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weekly_rota_allocation' 
    AND column_name = 'operator_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE weekly_rota_allocation 
    ALTER COLUMN operator_id DROP NOT NULL;
  END IF;

  -- Add assigned_to column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weekly_rota_allocation' 
    AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE weekly_rota_allocation 
    ADD COLUMN assigned_to text;
  END IF;

  -- Add constraint: either operator_id or assigned_to must be set, but not both
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'allocation_assignment_check'
  ) THEN
    ALTER TABLE weekly_rota_allocation
    ADD CONSTRAINT allocation_assignment_check 
    CHECK (
      (operator_id IS NOT NULL AND assigned_to IS NULL) OR
      (operator_id IS NULL AND assigned_to IS NOT NULL)
    );
  END IF;
END $$;