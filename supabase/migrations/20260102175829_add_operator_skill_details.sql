/*
  # Add Enhanced Operator Skill Details

  1. Changes to `operators` table
    - Add `role` (text): Primary role classification (Supervisor/Multi-op, Distop/Pilot, Kegging Specialist, Loader, Packaging, General Operator)
    - Add `skill_proficiency` (jsonb): Skill levels for each area with values: expert, competent, partial, or not_trained
    - Add `constraints` (text): Special notes about limitations (e.g., "Vision issues at night - FLT limitation")
    - Add `priority_areas` (jsonb): Priority levels for different areas (first_choice, second_choice, backup)
    - Add `notes` (text): Free-form notes for additional details
  
  2. Purpose
    - Enable more accurate rota generation based on skill proficiency
    - Track operator constraints and preferences
    - Improve cover suggestions based on expertise levels
    - Support better allocation decisions
*/

-- Add new columns to operators table
DO $$
BEGIN
  -- Add role column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'role'
  ) THEN
    ALTER TABLE operators ADD COLUMN role text DEFAULT 'General Operator';
  END IF;

  -- Add skill_proficiency column (stores proficiency level for each skill area)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'skill_proficiency'
  ) THEN
    ALTER TABLE operators ADD COLUMN skill_proficiency jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add constraints column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'constraints'
  ) THEN
    ALTER TABLE operators ADD COLUMN constraints text DEFAULT '';
  END IF;

  -- Add priority_areas column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'priority_areas'
  ) THEN
    ALTER TABLE operators ADD COLUMN priority_areas jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'notes'
  ) THEN
    ALTER TABLE operators ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;