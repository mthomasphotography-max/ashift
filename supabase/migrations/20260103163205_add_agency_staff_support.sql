/*
  # Add Agency Staff Support

  1. Changes
    - Add `is_agency` column to operators table to distinguish agency staff
    - Agency staff don't follow the normal 4-week shift pattern
    - They can work any shift unless specifically marked as unavailable

  2. Details
    - `is_agency` defaults to false (regular staff)
    - Agency staff will be managed through Settings page
    - Their availability is handled separately in the staff plan
*/

-- Add is_agency column to operators table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'is_agency'
  ) THEN
    ALTER TABLE operators ADD COLUMN is_agency boolean DEFAULT false;
  END IF;
END $$;

-- Add comment to document this field
COMMENT ON COLUMN operators.is_agency IS 
  'True for agency staff who do not follow the regular 4-week shift pattern and can work any shift unless marked unavailable';
