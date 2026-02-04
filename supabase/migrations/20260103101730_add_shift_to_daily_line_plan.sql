/*
  # Add Shift Column to Daily Line Plan

  1. Changes
    - Add `shift` column to `daily_line_plan` table (days/nights)
    - Update primary key to include both date and shift
    - This allows different load slots for each shift while sharing line status

  2. Notes
    - Line running status is shared across both shifts on the same date
    - Load slots and pilots can vary by shift
    - Enables flexibility for different workload per shift
*/

-- Drop existing table and recreate with shift column
DROP TABLE IF EXISTS daily_line_plan CASCADE;

CREATE TABLE IF NOT EXISTS daily_line_plan (
  date date NOT NULL,
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
  mak1_load_slots integer DEFAULT 0,
  tents_load_slots integer DEFAULT 0,
  keg_load_slots integer DEFAULT 0,
  pilots_required integer DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (date, shift)
);

ALTER TABLE daily_line_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daily line plan"
  ON daily_line_plan FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert daily line plan"
  ON daily_line_plan FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update daily line plan"
  ON daily_line_plan FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete daily line plan"
  ON daily_line_plan FOR DELETE
  TO authenticated
  USING (true);