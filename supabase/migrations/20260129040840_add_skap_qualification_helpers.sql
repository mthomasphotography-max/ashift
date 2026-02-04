/*
  # Add SKAP Qualification Helper Functions and Views

  1. New Functions
    - `get_operator_qualified_positions(operator_id)` - Returns positions operator is qualified for
    - `is_operator_qualified_for_position(operator_id, position_name)` - Checks if operator meets requirements

  2. New Views
    - `operator_position_qualifications` - Shows which operators are qualified for which positions

  3. Purpose
    - Simplify checking operator qualifications
    - Enable filtering allocations by SKAP requirements
    - Provide easy access to qualification data for UI
*/

-- Function to check if operator is qualified for a position
CREATE OR REPLACE FUNCTION is_operator_qualified_for_position(
  p_operator_id uuid,
  p_position_name text
) RETURNS boolean AS $$
DECLARE
  required_level_id uuid;
  operator_has_level boolean;
BEGIN
  -- Get the required skill level for this position
  SELECT minimum_skill_level_id INTO required_level_id
  FROM position_skill_requirements
  WHERE position_name = p_position_name AND is_required = true
  LIMIT 1;

  -- If no requirement exists, operator is qualified
  IF required_level_id IS NULL THEN
    RETURN true;
  END IF;

  -- Check if operator has achieved this level or higher
  SELECT EXISTS (
    SELECT 1
    FROM operator_skill_levels osl
    JOIN skill_levels sl ON osl.skill_level_id = sl.id
    WHERE osl.operator_id = p_operator_id
      AND osl.achieved = true
      AND sl.sort_order >= (SELECT sort_order FROM skill_levels WHERE id = required_level_id)
  ) INTO operator_has_level;

  RETURN operator_has_level;
END;
$$ LANGUAGE plpgsql;

-- Function to get all qualified positions for an operator
CREATE OR REPLACE FUNCTION get_operator_qualified_positions(
  p_operator_id uuid
) RETURNS TABLE(position_name text, required_level text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    psr.position_name,
    sl.name as required_level
  FROM position_skill_requirements psr
  JOIN skill_levels sl ON psr.minimum_skill_level_id = sl.id
  WHERE is_operator_qualified_for_position(p_operator_id, psr.position_name) = true
  ORDER BY psr.position_name;
END;
$$ LANGUAGE plpgsql;

-- Create a materialized view for operator qualifications (for performance)
CREATE OR REPLACE VIEW operator_position_qualifications AS
SELECT 
  o.id as operator_id,
  o.name as operator_name,
  psr.position_name,
  sl.name as required_skill_level,
  sl.sort_order as required_level_order,
  COALESCE(
    EXISTS (
      SELECT 1
      FROM operator_skill_levels osl
      JOIN skill_levels achieved_sl ON osl.skill_level_id = achieved_sl.id
      WHERE osl.operator_id = o.id
        AND osl.achieved = true
        AND achieved_sl.sort_order >= sl.sort_order
    ),
    false
  ) as is_qualified
FROM operators o
CROSS JOIN position_skill_requirements psr
JOIN skill_levels sl ON psr.minimum_skill_level_id = sl.id
WHERE psr.is_required = true
  AND o.is_agency = false
ORDER BY o.name, psr.position_name;

COMMENT ON VIEW operator_position_qualifications IS 
  'Shows which operators are qualified for which positions based on their achieved SKAP skill levels';

COMMENT ON FUNCTION is_operator_qualified_for_position IS 
  'Returns true if operator has achieved the required SKAP skill level for a position';

COMMENT ON FUNCTION get_operator_qualified_positions IS 
  'Returns all positions an operator is qualified for based on their SKAP levels';
