/*
  # Fix Position Skill Requirements References

  1. Problem
    - The position_skill_requirements table has outdated skill_level_id references
    - These IDs don't match the current skill_levels table after it was dropped and recreated
    - This causes the qualified positions feature to not work

  2. Solution
    - Clear existing position requirements
    - Recreate them with correct skill level IDs based on the current skill_levels table
    
  3. Position Requirements Setup
    - Canning: Beginner level
    - MAB1, MAB2, Corona: Beginner level
    - Kegging Inside/Outside: Intermediate level
    - Packaging: Intermediate level
    - Pilots: Advanced level
    - Keg Loading: Advanced level
*/

-- Clear existing position requirements
TRUNCATE TABLE position_skill_requirements;

-- Get current skill level IDs and insert correct mappings
DO $$
DECLARE
  new_starter_id uuid;
  beginner_id uuid;
  intermediate_id uuid;
  advanced_id uuid;
  advanced_plus_id uuid;
  mop_id uuid;
BEGIN
  -- Get current skill level IDs
  SELECT id INTO new_starter_id FROM skill_levels WHERE name = 'New Starter';
  SELECT id INTO beginner_id FROM skill_levels WHERE name = 'Beginner';
  SELECT id INTO intermediate_id FROM skill_levels WHERE name = 'Intermediate';
  SELECT id INTO advanced_id FROM skill_levels WHERE name = 'Advanced';
  SELECT id INTO advanced_plus_id FROM skill_levels WHERE name = 'Advanced Plus';
  SELECT id INTO mop_id FROM skill_levels WHERE name = 'MOP';

  -- Insert position requirements with correct skill level IDs
  INSERT INTO position_skill_requirements (position_name, minimum_skill_level_id, is_required) VALUES
    -- Beginner level positions
    ('Canning', beginner_id, true),
    ('MAB1', beginner_id, true),
    ('MAB2', beginner_id, true),
    ('Corona', beginner_id, true),
    
    -- Intermediate level positions
    ('Kegging - Inside', intermediate_id, true),
    ('Kegging - Outside', intermediate_id, true),
    ('Packaging', intermediate_id, true),
    
    -- Advanced level positions
    ('Pilots', advanced_id, true),
    ('Keg Loading', advanced_id, true);
END $$;
