/*
  # Add Daily Line Plan Table

  1. New Tables
    - `daily_line_plan`
      - `date` (date, primary key)
      - `mak1_running` (boolean) - MAK1 (Kegging) line status
      - `mac1_running` (boolean) - MAC1 (Canning) line status
      - `mac2_running` (boolean) - MAC2 (Canning) line status
      - `mab1_running` (boolean) - MAB1 line status
      - `mab2_running` (boolean) - MAB2 line status
      - `mab3_running` (boolean) - MAB3 (Canning) line status
      - `corona_running` (boolean) - Corona line status
      - `packaging_running` (boolean) - Packaging area status
      - `tents_running` (boolean) - Tents area status
      - `canning_reduced` (boolean) - Whether canning is reduced to 3 instead of 4
      - `mak1_load_slots` (integer) - Magor 1 load slots for the day
      - `tents_load_slots` (integer) - Tents load slots for the day
      - `keg_load_slots` (integer) - Keg load slots for the day
      - `pilots_required` (integer) - Number of pilots required
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `daily_line_plan` table
    - Add policy for anyone to view daily line plans
    - Add policy for authenticated users to insert/update daily line plans

  3. Notes
    - This allows day-by-day control of line availability
    - Users can specify different line statuses for each individual date
    - Load slots and pilot requirements can vary by day
*/

CREATE TABLE IF NOT EXISTS daily_line_plan (
  date date PRIMARY KEY,
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
  created_at timestamptz DEFAULT now()
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