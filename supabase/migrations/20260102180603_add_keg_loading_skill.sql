/*
  # Add Keg Loading Skill

  1. Changes to `operator_capabilities` table
    - Add `keg_loading` (text): Track keg loading capability using N/B/C/S rating system
  
  2. Purpose
    - Enable tracking of keg loading skills in both legacy and new proficiency systems
    - Provide consistent skill tracking across all operational areas
*/

-- Add keg_loading column to operator_capabilities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operator_capabilities' AND column_name = 'keg_loading'
  ) THEN
    ALTER TABLE operator_capabilities ADD COLUMN keg_loading text DEFAULT 'N';
  END IF;
END $$;