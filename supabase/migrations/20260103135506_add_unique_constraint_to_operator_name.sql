/*
  # Add Unique Constraint to Operator Name

  1. Purpose
    - Prevent duplicate operator names from being created
    - Ensures data integrity for CSV uploads
  
  2. Changes
    - Add unique constraint on operators.name column
    - This will make upsert operations work correctly in the future
*/

-- Add unique constraint to operator name
ALTER TABLE operators 
ADD CONSTRAINT operators_name_unique UNIQUE (name);