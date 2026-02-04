/*
  # Restructure Skill Levels for SKAP System
  
  This migration replaces the old skill level structure with the proper SKAP module structure.
  
  ## Changes
  
  1. Old Structure (to be removed):
    - Drivers Licence
    - Warehouse Op Intermediate
    - Warehouse Op Advanced
    - Distribution Op Intermediate
    - Distribution Op Advanced
    - Logistics MOP
  
  2. New SKAP Module Structure:
    - New Starter (Level 1)
    - Beginner (Level 2)
    - Intermediate (Level 3)
    - Advanced (Level 4)
    - Advanced Plus (Level 4+)
    - MOP (Level 6)
  
  ## Security
  - Maintains RLS policies
  - Preserves cascade relationships
*/

-- Clear existing skill tasks first
DELETE FROM skill_tasks;

-- Clear existing skill levels
DELETE FROM skill_levels;

-- Insert new SKAP module structure
INSERT INTO skill_levels (name, description, sort_order) VALUES
  ('New Starter', 'Foundation level covering FLT operations, WMS basics, safety procedures, and warehouse fundamentals', 1),
  ('Beginner', 'Risk assessments, R&R procedures, control procedures, safety systems, and basic warehouse operations', 2),
  ('Intermediate', 'EMCS, VPO systems, stock management, and green line procedures', 3),
  ('Advanced', 'Logistics handbook understanding, VPO tools, process management, and shift management', 4),
  ('Advanced Plus', 'Critical processes, VPO tools, BD/PM/PDCA, form completion, and operational meetings', 5),
  ('MOP', 'Shift handover, FLM support, EES quality, communication, OPLs, task forces, and quality checks', 6);
