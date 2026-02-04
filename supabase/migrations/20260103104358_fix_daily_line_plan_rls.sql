/*
  # Fix Daily Line Plan RLS Policies for Public Access

  1. Changes
    - Update all RLS policies on daily_line_plan to allow public (anon) access
    - This is an internal tool, so authenticated-only restrictions are removed
    
  2. Tables Updated
    - daily_line_plan
*/

-- Update daily_line_plan policies
DROP POLICY IF EXISTS "Authenticated users can insert daily line plan" ON daily_line_plan;
DROP POLICY IF EXISTS "Authenticated users can update daily line plan" ON daily_line_plan;
DROP POLICY IF EXISTS "Authenticated users can delete daily line plan" ON daily_line_plan;

CREATE POLICY "Anyone can insert daily line plan"
  ON daily_line_plan FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update daily line plan"
  ON daily_line_plan FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete daily line plan"
  ON daily_line_plan FOR DELETE
  USING (true);
