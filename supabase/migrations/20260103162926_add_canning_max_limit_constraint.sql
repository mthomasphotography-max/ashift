/*
  # Add Maximum Limit for Canning Area
  
  1. Changes
    - Add a database constraint to ensure Canning area can never have more than 4 operators per shift
    - This applies a hard limit at the database level that cannot be bypassed
    
  2. Details
    - Creates a function to count allocations for Canning area by shift block
    - Creates a check constraint that prevents insertion/update if count would exceed 4
    - This is enforced automatically by PostgreSQL for all data modifications
    
  3. Business Rule
    - Canning can have either 3 (reduced) or 4 (normal) operators
    - The system should NEVER allow more than 4 operators on Canning
*/

-- Create a function to check canning allocation count
CREATE OR REPLACE FUNCTION check_canning_allocation_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Only check if the area is 'Canning'
  IF NEW.area = 'Canning' THEN
    -- Count existing allocations for this area, shift, and week (excluding break covers and the current record if updating)
    SELECT COUNT(*)
    INTO current_count
    FROM weekly_rota_allocation
    WHERE area = 'Canning'
      AND shift_block = NEW.shift_block
      AND week_commencing = NEW.week_commencing
      AND (is_break_cover IS NULL OR is_break_cover = false)
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');
    
    -- Enforce maximum of 4 operators for Canning
    IF current_count >= 4 THEN
      RAISE EXCEPTION 'Canning area cannot have more than 4 operators per shift. Current count: %', current_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the limit
DROP TRIGGER IF EXISTS enforce_canning_max_limit ON weekly_rota_allocation;

CREATE TRIGGER enforce_canning_max_limit
  BEFORE INSERT OR UPDATE ON weekly_rota_allocation
  FOR EACH ROW
  EXECUTE FUNCTION check_canning_allocation_limit();

-- Add a comment documenting this constraint
COMMENT ON FUNCTION check_canning_allocation_limit() IS 
  'Enforces business rule: Canning area can have maximum 4 operators per shift block. This limit cannot be exceeded under any circumstances.';