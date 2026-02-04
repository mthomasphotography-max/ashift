/*
  # Re-add work_areas column to skill_tasks

  1. Changes
    - Add `work_areas` column back to `skill_tasks` table (was removed when table was dropped and recreated)
    - Array of text values representing which work areas each task applies to
    
  2. Work Areas
    - Keg line - inside
    - Keg line - outside
    - Keg loading
    - Can lines
    - Bot lines
    - Packaging
    - Piloting
    - Loading
*/

-- Add work_areas column to skill_tasks
ALTER TABLE skill_tasks 
ADD COLUMN IF NOT EXISTS work_areas text[] DEFAULT '{}';

-- Add index for work area queries
CREATE INDEX IF NOT EXISTS idx_skill_tasks_work_areas 
  ON skill_tasks USING GIN(work_areas);
