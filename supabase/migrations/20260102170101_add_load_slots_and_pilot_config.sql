/*
  # Add Load Slots and Pilot Configuration
  
  1. New Columns Added to weekly_line_plan
    - `mak1_load_slots` (integer) - Number of load slots planned for Magor 1
    - `tents_load_slots` (integer) - Number of load slots planned for Tents
    - `pilots_required` (integer) - Number of pilots required (1 or 2)
    
  2. Business Logic
    - If total load slots (mak1 + tents) exceed 50, automatically require 2 pilots
    - If under 50, user can choose 1 or 2 pilots
    - Default values ensure backward compatibility
    
  3. Notes
    - Load slots help determine workload for pilot areas
    - Pilots manage both Magor 1 and Tents areas
*/

-- Add load slot tracking and pilot configuration columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_line_plan' AND column_name = 'mak1_load_slots'
  ) THEN
    ALTER TABLE weekly_line_plan ADD COLUMN mak1_load_slots integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_line_plan' AND column_name = 'tents_load_slots'
  ) THEN
    ALTER TABLE weekly_line_plan ADD COLUMN tents_load_slots integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_line_plan' AND column_name = 'pilots_required'
  ) THEN
    ALTER TABLE weekly_line_plan ADD COLUMN pilots_required integer DEFAULT 2 CHECK (pilots_required IN (1, 2));
  END IF;
END $$;