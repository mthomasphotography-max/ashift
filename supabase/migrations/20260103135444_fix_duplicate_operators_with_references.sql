/*
  # Fix Duplicate Operators and Update References

  1. Problem
    - Multiple duplicate operator records exist
    - Some duplicates are referenced in weekly_staff_plan
    - Need to preserve data relationships
  
  2. Solution
    - First, update all references to point to the keeper record (highest sort_order)
    - Then delete the duplicate operators
    - Uses CTEs for safe, atomic operation
  
  3. Data Integrity
    - Preserves all staff plan allocations
    - Maintains referential integrity
*/

-- Step 1: Create a mapping of duplicate IDs to keeper IDs
WITH keeper_operators AS (
  SELECT DISTINCT ON (name) 
    id as keeper_id,
    name
  FROM operators
  ORDER BY name, sort_order DESC, created_at DESC
),
duplicate_to_keeper_mapping AS (
  SELECT 
    o.id as duplicate_id,
    ko.keeper_id
  FROM operators o
  JOIN keeper_operators ko ON ko.name = o.name
  WHERE o.id != ko.keeper_id
)
-- Step 2: Update weekly_staff_plan to point to keeper operators
UPDATE weekly_staff_plan
SET operator_id = dtk.keeper_id
FROM duplicate_to_keeper_mapping dtk
WHERE weekly_staff_plan.operator_id = dtk.duplicate_id;

-- Step 3: Delete duplicate operators (CASCADE will handle operator_capabilities)
WITH keeper_operators AS (
  SELECT DISTINCT ON (name) 
    id as keeper_id,
    name
  FROM operators
  ORDER BY name, sort_order DESC, created_at DESC
)
DELETE FROM operators
WHERE id NOT IN (SELECT keeper_id FROM keeper_operators);