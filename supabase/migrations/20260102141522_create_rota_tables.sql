/*
  # Weekly Rota Allocator - Database Schema

  ## Overview
  Creates all tables needed for the weekly rota allocation system, including operators,
  their capabilities, weekly plans, and generated allocations.

  ## Tables Created

  ### 1. operators
  Stores operator/staff member information
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Operator's full name
  - `shift` (text) - Either 'days' or 'nights'
  - `is_active` (boolean) - Whether operator is currently active
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. operator_capabilities
  Stores skill ratings for each operator across different areas
  - `operator_id` (uuid, foreign key) - Links to operators table
  - Rating columns (text): flt, canning, mab1, mab2, corona, kegging_inside, 
    kegging_outside, wms, sap, say, packaging, loaders, pilots
  - Ratings: 'N' (No skill), 'B' (Basic), 'C' (Competent), 'S' (Specialist)
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. weekly_staff_plan
  Records operator availability for each week
  - `id` (uuid, primary key)
  - `week_commencing` (date) - Monday of the week
  - `shift` (text) - 'days' or 'nights'
  - `operator_id` (uuid, foreign key)
  - Availability columns: day1, day2, night1, night2
  - Values: 'Y' (working), 'H' (holiday), null/empty (not applicable)
  - `created_at` (timestamptz)

  ### 4. weekly_line_plan
  Defines which production lines are running each week
  - `week_commencing` (date)
  - `shift` (text)
  - Boolean flags for each line: mak1_running, mac1_running, mac2_running,
    mab1_running, mab2_running, mab3_running, corona_running, packaging_running, tents_running
  - Special flags: canning_reduced, loaders_busy
  - Primary key: (week_commencing, shift)

  ### 5. weekly_rota_allocation
  Stores the generated allocation results
  - `id` (uuid, primary key)
  - `week_commencing` (date)
  - `shift` (text)
  - `operator_id` (uuid, foreign key)
  - `area` (text) - Assigned work area
  - `score` (numeric) - Allocation score
  - `created_at` (timestamptz)

  ### 6. weekly_rota_gaps
  Tracks staffing gaps when operators are unavailable
  - `id` (uuid, primary key)
  - `week_commencing` (date)
  - `shift` (text)
  - `shift_block` (text) - DAY1, DAY2, NIGHT1, NIGHT2
  - `area` (text) - Area with gap
  - `missing_count` (integer) - Number of missing operators
  - `recommendations` (jsonb) - Suggested replacement operators
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Public read access for all tables (suitable for internal tools)
  - Authenticated users can perform all operations
  - In production, policies should be adjusted based on roles
*/

-- Create operators table
CREATE TABLE IF NOT EXISTS operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  shift text NOT NULL CHECK (shift IN ('days', 'nights')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view operators"
  ON operators FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert operators"
  ON operators FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update operators"
  ON operators FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete operators"
  ON operators FOR DELETE
  TO authenticated
  USING (true);

-- Create operator_capabilities table
CREATE TABLE IF NOT EXISTS operator_capabilities (
  operator_id uuid PRIMARY KEY REFERENCES operators(id) ON DELETE CASCADE,
  flt text DEFAULT 'N',
  canning text DEFAULT 'N',
  mab1 text DEFAULT 'N',
  mab2 text DEFAULT 'N',
  corona text DEFAULT 'N',
  kegging_inside text DEFAULT 'N',
  kegging_outside text DEFAULT 'N',
  wms text DEFAULT 'N',
  sap text DEFAULT 'N',
  say text DEFAULT 'N',
  packaging text DEFAULT 'N',
  loaders text DEFAULT 'N',
  pilots text DEFAULT 'N',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE operator_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view capabilities"
  ON operator_capabilities FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert capabilities"
  ON operator_capabilities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update capabilities"
  ON operator_capabilities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete capabilities"
  ON operator_capabilities FOR DELETE
  TO authenticated
  USING (true);

-- Create weekly_staff_plan table
CREATE TABLE IF NOT EXISTS weekly_staff_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_commencing date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('days', 'nights')),
  operator_id uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  day1 text,
  day2 text,
  night1 text,
  night2 text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(week_commencing, shift, operator_id)
);

ALTER TABLE weekly_staff_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view staff plan"
  ON weekly_staff_plan FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert staff plan"
  ON weekly_staff_plan FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update staff plan"
  ON weekly_staff_plan FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete staff plan"
  ON weekly_staff_plan FOR DELETE
  TO authenticated
  USING (true);

-- Create weekly_line_plan table
CREATE TABLE IF NOT EXISTS weekly_line_plan (
  week_commencing date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('days', 'nights')),
  mak1_running boolean DEFAULT false,
  mac1_running boolean DEFAULT false,
  mac2_running boolean DEFAULT false,
  mab1_running boolean DEFAULT false,
  mab2_running boolean DEFAULT false,
  mab3_running boolean DEFAULT false,
  corona_running boolean DEFAULT false,
  packaging_running boolean DEFAULT false,
  tents_running boolean DEFAULT false,
  canning_reduced boolean DEFAULT false,
  loaders_busy boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (week_commencing, shift)
);

ALTER TABLE weekly_line_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view line plan"
  ON weekly_line_plan FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert line plan"
  ON weekly_line_plan FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update line plan"
  ON weekly_line_plan FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete line plan"
  ON weekly_line_plan FOR DELETE
  TO authenticated
  USING (true);

-- Create weekly_rota_allocation table
CREATE TABLE IF NOT EXISTS weekly_rota_allocation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_commencing date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('days', 'nights')),
  operator_id uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  area text NOT NULL,
  score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_rota_allocation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view allocations"
  ON weekly_rota_allocation FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert allocations"
  ON weekly_rota_allocation FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update allocations"
  ON weekly_rota_allocation FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete allocations"
  ON weekly_rota_allocation FOR DELETE
  TO authenticated
  USING (true);

-- Create weekly_rota_gaps table
CREATE TABLE IF NOT EXISTS weekly_rota_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_commencing date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('days', 'nights')),
  shift_block text NOT NULL CHECK (shift_block IN ('DAY1', 'DAY2', 'NIGHT1', 'NIGHT2')),
  area text NOT NULL,
  missing_count integer DEFAULT 0,
  recommendations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_rota_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gaps"
  ON weekly_rota_gaps FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert gaps"
  ON weekly_rota_gaps FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update gaps"
  ON weekly_rota_gaps FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete gaps"
  ON weekly_rota_gaps FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_plan_week_shift ON weekly_staff_plan(week_commencing, shift);
CREATE INDEX IF NOT EXISTS idx_allocation_week_shift ON weekly_rota_allocation(week_commencing, shift);
CREATE INDEX IF NOT EXISTS idx_gaps_week_shift ON weekly_rota_gaps(week_commencing, shift);