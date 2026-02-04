/*
  # Add SKAP Skill Level Requirements for Positions

  1. New Tables
    - `position_skill_requirements`
      - `id` (uuid, primary key)
      - `position_name` (text) - Work position name (e.g., "Canning", "MAB1")
      - `minimum_skill_level_id` (uuid) - Foreign key to skill_levels
      - `is_required` (boolean) - Whether this is a hard requirement
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on table
    - Add policies for public access

  3. Changes
    - Maps SKAP skill levels to work positions
    - Allows system to check if operator has required skill level for a position
    - Supports both hard requirements and recommended levels

  4. Default Mappings
    - Drivers Licence → Magor 1 Loading, Tents (loading operations)
    - Warehouse Op Intermediate → Canning (intermediate level)
    - Warehouse Op Advanced → MAB1, MAB2, Corona (advanced can lines)
    - Distribution Op Intermediate → Kegging - Inside (distribution start)
    - Distribution Op Advanced → Kegging - Outside, Packaging (advanced distribution)
    - Logistics MOP → Pilots, Keg Loading (logistics operations)
*/

-- Create position_skill_requirements table
CREATE TABLE IF NOT EXISTS position_skill_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_name text NOT NULL,
  minimum_skill_level_id uuid REFERENCES skill_levels(id) ON DELETE CASCADE NOT NULL,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(position_name, minimum_skill_level_id)
);

-- Enable RLS
ALTER TABLE position_skill_requirements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to position_skill_requirements"
  ON position_skill_requirements FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access to position_skill_requirements"
  ON position_skill_requirements FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_position_skill_requirements_position 
  ON position_skill_requirements(position_name);

-- Insert default mappings
-- Get skill level IDs first for reference
DO $$
DECLARE
  drivers_licence_id uuid;
  warehouse_intermediate_id uuid;
  warehouse_advanced_id uuid;
  distribution_intermediate_id uuid;
  distribution_advanced_id uuid;
  logistics_mop_id uuid;
BEGIN
  -- Get skill level IDs
  SELECT id INTO drivers_licence_id FROM skill_levels WHERE name = 'Drivers Licence';
  SELECT id INTO warehouse_intermediate_id FROM skill_levels WHERE name = 'Warehouse Op Intermediate';
  SELECT id INTO warehouse_advanced_id FROM skill_levels WHERE name = 'Warehouse Op Advanced';
  SELECT id INTO distribution_intermediate_id FROM skill_levels WHERE name = 'Distribution Op Intermediate';
  SELECT id INTO distribution_advanced_id FROM skill_levels WHERE name = 'Distribution Op Advanced';
  SELECT id INTO logistics_mop_id FROM skill_levels WHERE name = 'Logistics MOP';

  -- Drivers Licence required for loading operations
  INSERT INTO position_skill_requirements (position_name, minimum_skill_level_id, is_required) VALUES
    ('Magor 1 Loading', drivers_licence_id, true),
    ('Tents', drivers_licence_id, true)
  ON CONFLICT (position_name, minimum_skill_level_id) DO NOTHING;

  -- Warehouse Op Intermediate for basic can line work
  INSERT INTO position_skill_requirements (position_name, minimum_skill_level_id, is_required) VALUES
    ('Canning', warehouse_intermediate_id, true)
  ON CONFLICT (position_name, minimum_skill_level_id) DO NOTHING;

  -- Warehouse Op Advanced for advanced can lines
  INSERT INTO position_skill_requirements (position_name, minimum_skill_level_id, is_required) VALUES
    ('MAB1', warehouse_advanced_id, true),
    ('MAB2', warehouse_advanced_id, true),
    ('Corona', warehouse_advanced_id, true)
  ON CONFLICT (position_name, minimum_skill_level_id) DO NOTHING;

  -- Distribution Op Intermediate for kegging inside
  INSERT INTO position_skill_requirements (position_name, minimum_skill_level_id, is_required) VALUES
    ('Kegging - Inside', distribution_intermediate_id, true)
  ON CONFLICT (position_name, minimum_skill_level_id) DO NOTHING;

  -- Distribution Op Advanced for advanced distribution
  INSERT INTO position_skill_requirements (position_name, minimum_skill_level_id, is_required) VALUES
    ('Kegging - Outside', distribution_advanced_id, true),
    ('Packaging', distribution_advanced_id, true)
  ON CONFLICT (position_name, minimum_skill_level_id) DO NOTHING;

  -- Logistics MOP for logistics operations
  INSERT INTO position_skill_requirements (position_name, minimum_skill_level_id, is_required) VALUES
    ('Pilots', logistics_mop_id, true),
    ('Keg Loading', logistics_mop_id, true)
  ON CONFLICT (position_name, minimum_skill_level_id) DO NOTHING;
END $$;
