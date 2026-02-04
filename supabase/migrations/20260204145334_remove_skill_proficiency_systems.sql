/*
  # Remove Skill Proficiency Systems

  This migration removes all legacy skill proficiency tracking systems from the database.

  ## Changes

  1. **Drop operator_capabilities table**
     - Contains legacy N/B/C/S skill ratings
     - No longer needed as skills are simplified to best_suited_areas

  2. **Drop SKAP (Skills Knowledge Advancement Program) tables**
     - skill_levels
     - skill_tasks
     - operator_skill_progress
     - operator_skill_levels
     - skap_position_requirements

  3. **Remove skill proficiency columns from operators table**
     - skill_proficiency (JSONB) - Complex proficiency tracking
     - priority_areas (JSONB) - Area priority assignments

  4. **Keep best_suited_areas column**
     - This simplified boolean map remains for quick operator assignment

  ## Note
  All data in these tables/columns will be permanently deleted.
*/

-- Drop operator_capabilities table (legacy N/B/C/S ratings)
DROP TABLE IF EXISTS operator_capabilities CASCADE;

-- Drop SKAP tables
DROP TABLE IF EXISTS operator_skill_progress CASCADE;
DROP TABLE IF EXISTS operator_skill_levels CASCADE;
DROP TABLE IF EXISTS skap_position_requirements CASCADE;
DROP TABLE IF EXISTS skill_tasks CASCADE;
DROP TABLE IF EXISTS skill_levels CASCADE;

-- Remove skill proficiency columns from operators
ALTER TABLE operators DROP COLUMN IF EXISTS skill_proficiency;
ALTER TABLE operators DROP COLUMN IF EXISTS priority_areas;

-- best_suited_areas column is kept as it's the simplified system we're using
