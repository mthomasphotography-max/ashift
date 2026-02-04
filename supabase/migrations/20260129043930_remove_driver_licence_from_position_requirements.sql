/*
  # Remove Driver Licence from Position Requirements

  1. Changes
    - Remove Driver Licence as a position requirement
    - Driver Licence is for knowledge/training purposes only
    - Does not affect rota assignments or work allocations
    
  2. Rationale
    - Driver Licence SKAP level teaches basic understanding of FLT operations
    - It is not a qualification that impacts which positions operators can be assigned to
    - Position assignments should be based on operational skills, not driving knowledge
*/

-- Remove Driver Licence position requirements
DELETE FROM position_skill_requirements
WHERE minimum_skill_level_id IN (
  SELECT id FROM skill_levels WHERE name = 'Drivers Licence'
);
