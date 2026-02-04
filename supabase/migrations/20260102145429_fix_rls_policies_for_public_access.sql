/*
  # Fix RLS Policies for Public Access

  1. Changes
    - Update all RLS policies to allow public (anon) access
    - This is an internal tool, so authenticated-only restrictions are removed
    
  2. Tables Updated
    - operators
    - operator_capabilities
    - weekly_staff_plan
    - weekly_line_plan
    - weekly_rota_allocation
    - weekly_rota_gaps
*/

-- Update operators policies
DROP POLICY IF EXISTS "Authenticated users can insert operators" ON operators;
DROP POLICY IF EXISTS "Authenticated users can update operators" ON operators;
DROP POLICY IF EXISTS "Authenticated users can delete operators" ON operators;

CREATE POLICY "Anyone can insert operators"
  ON operators FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update operators"
  ON operators FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete operators"
  ON operators FOR DELETE
  USING (true);

-- Update operator_capabilities policies
DROP POLICY IF EXISTS "Authenticated users can insert capabilities" ON operator_capabilities;
DROP POLICY IF EXISTS "Authenticated users can update capabilities" ON operator_capabilities;
DROP POLICY IF EXISTS "Authenticated users can delete capabilities" ON operator_capabilities;

CREATE POLICY "Anyone can insert capabilities"
  ON operator_capabilities FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update capabilities"
  ON operator_capabilities FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete capabilities"
  ON operator_capabilities FOR DELETE
  USING (true);

-- Update weekly_staff_plan policies
DROP POLICY IF EXISTS "Authenticated users can insert staff plan" ON weekly_staff_plan;
DROP POLICY IF EXISTS "Authenticated users can update staff plan" ON weekly_staff_plan;
DROP POLICY IF EXISTS "Authenticated users can delete staff plan" ON weekly_staff_plan;

CREATE POLICY "Anyone can insert staff plan"
  ON weekly_staff_plan FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update staff plan"
  ON weekly_staff_plan FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete staff plan"
  ON weekly_staff_plan FOR DELETE
  USING (true);

-- Update weekly_line_plan policies
DROP POLICY IF EXISTS "Authenticated users can insert line plan" ON weekly_line_plan;
DROP POLICY IF EXISTS "Authenticated users can update line plan" ON weekly_line_plan;
DROP POLICY IF EXISTS "Authenticated users can delete line plan" ON weekly_line_plan;

CREATE POLICY "Anyone can insert line plan"
  ON weekly_line_plan FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update line plan"
  ON weekly_line_plan FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete line plan"
  ON weekly_line_plan FOR DELETE
  USING (true);

-- Update weekly_rota_allocation policies
DROP POLICY IF EXISTS "Authenticated users can insert allocations" ON weekly_rota_allocation;
DROP POLICY IF EXISTS "Authenticated users can update allocations" ON weekly_rota_allocation;
DROP POLICY IF EXISTS "Authenticated users can delete allocations" ON weekly_rota_allocation;

CREATE POLICY "Anyone can insert allocations"
  ON weekly_rota_allocation FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update allocations"
  ON weekly_rota_allocation FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete allocations"
  ON weekly_rota_allocation FOR DELETE
  USING (true);

-- Update weekly_rota_gaps policies
DROP POLICY IF EXISTS "Authenticated users can insert gaps" ON weekly_rota_gaps;
DROP POLICY IF EXISTS "Authenticated users can update gaps" ON weekly_rota_gaps;
DROP POLICY IF EXISTS "Authenticated users can delete gaps" ON weekly_rota_gaps;

CREATE POLICY "Anyone can insert gaps"
  ON weekly_rota_gaps FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update gaps"
  ON weekly_rota_gaps FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete gaps"
  ON weekly_rota_gaps FOR DELETE
  USING (true);
