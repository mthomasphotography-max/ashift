/*
  # Add Sort Order to Operators

  1. Changes
    - Add `sort_order` column to operators table
    - This allows operators to be displayed in a specific order for planning
    - Default sort_order is based on creation time
*/

-- Add sort_order column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE operators ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Set sort_order for existing operators based on their creation time
UPDATE operators
SET sort_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM operators
) AS subquery
WHERE operators.id = subquery.id;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_operators_sort_order ON operators(sort_order);
