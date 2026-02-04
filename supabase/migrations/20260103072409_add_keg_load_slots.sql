/*
  # Add Keg Load Slots Tracking
  
  1. Changes to weekly_line_plan table
    - Add `keg_load_slots` (integer) - Number of keg load orders (large pack)
    
  2. Business Rules
    - Keg slots (large pack): Average 6 orders per operator per 12 hours
    - Major 1 slots (small pack): Average 15 orders per operator per 12 hours
    - Production lines: 1 line = 1 operator
    - Pilots: Total slots over 40 requires 2 pilots
    - Keg line doesn't run weekends, focus on load orders
    
  3. Notes
    - Keg loads are separate from Major 1 loads
    - Each has different productivity rates
    - Used for calculating required operator counts
*/

-- Add keg load slots tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_line_plan' AND column_name = 'keg_load_slots'
  ) THEN
    ALTER TABLE weekly_line_plan ADD COLUMN keg_load_slots integer DEFAULT 0;
  END IF;
END $$;