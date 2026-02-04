/*
  # Add Work Area Associations to SKAP Tasks

  1. Changes
    - Add `work_areas` column to `skill_tasks` table
    - This is an array of text values representing which work areas each task applies to
    - Enables better matching of operator training to position requirements during rota allocation
    
  2. Work Areas
    - Keg line - inside (taking full kegs from line to location)
    - Keg line - outside (placing empty kegs onto line)
    - Keg loading
    - Can lines
    - Bot lines
    - Packaging
    - Piloting
    - Loading
    
  3. Purpose
    - Allows system to determine if an operator's completed tasks are relevant for a specific position
    - Example: "Identify different keg types/variants" task can be associated with both "Keg loading" and "Keg line - inside"
*/

-- Add work_areas column to skill_tasks
ALTER TABLE skill_tasks 
ADD COLUMN IF NOT EXISTS work_areas text[] DEFAULT '{}';

-- Add index for work area queries
CREATE INDEX IF NOT EXISTS idx_skill_tasks_work_areas 
  ON skill_tasks USING GIN(work_areas);
