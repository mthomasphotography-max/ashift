/*
  # Add Allocation History Tracking for Fair Rotation

  1. New Tables
    - `allocation_history`
      - `id` (uuid, primary key) - Unique identifier
      - `operator_id` (uuid, foreign key) - Reference to operator
      - `week_commencing` (date) - Week start date
      - `day_name` (text) - Day of week
      - `shift` (text) - Shift name (Day, Night, etc.)
      - `area` (text) - Area worked (Can Line, Bot Line, Keg Loading, etc.)
      - `position` (text) - Specific position worked
      - `allocation_id` (uuid, foreign key, nullable) - Reference to weekly_rota_allocation
      - `created_at` (timestamptz) - Record creation time

  2. Indexes
    - Index on operator_id and week_commencing for fast rotation queries
    - Index on area for area-specific queries

  3. Security
    - Enable RLS on `allocation_history` table
    - Add policies for public access (consistent with other tables)

  4. Purpose
    - Track where each operator has worked over time
    - Enable fair rotation by checking historical allocations
    - Prevent operators from repeating same areas unless necessary
    - Support rotation fairness metrics in UI
*/

CREATE TABLE IF NOT EXISTS allocation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  week_commencing date NOT NULL,
  day_name text NOT NULL,
  shift text NOT NULL,
  area text NOT NULL,
  position text NOT NULL,
  allocation_id uuid REFERENCES weekly_rota_allocation(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allocation_history_operator_week 
  ON allocation_history(operator_id, week_commencing DESC);

CREATE INDEX IF NOT EXISTS idx_allocation_history_area 
  ON allocation_history(area);

CREATE INDEX IF NOT EXISTS idx_allocation_history_allocation 
  ON allocation_history(allocation_id);

ALTER TABLE allocation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read allocation history"
  ON allocation_history FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert allocation history"
  ON allocation_history FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update allocation history"
  ON allocation_history FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete allocation history"
  ON allocation_history FOR DELETE
  TO public
  USING (true);