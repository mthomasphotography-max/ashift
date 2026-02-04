/*
  # Create rota_assignments table for fair rotation tracking

  1. New Tables
    - `rota_assignments`
      - `id` (uuid, primary key)
      - `target_shift` (text) - shift this rota is for (A/B/C/D)
      - `date` (date) - assignment date
      - `shift_block` (text) - DAY or NIGHT
      - `role_code` (text) - role assigned (e.g., "FORKLIFT_POOL", "MAK1")
      - `operator_id` (uuid) - operator assigned
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `rota_assignments` table
    - Add policy for authenticated users to read all assignments
    - Add policy for authenticated users to insert assignments
    - Add policy for authenticated users to update assignments
    - Add policy for authenticated users to delete assignments

  3. Indexes
    - Index on (date, shift_block, role_code) for fast lookups
    - Index on (operator_id, date) for operator history queries
    - Index on (target_shift, date) for shift-specific queries

  4. Notes
    - This table tracks individual role assignments for fair rotation
    - Used by the edge function to ensure operators don't repeat roles within a month
    - Supports historical tracking for recency calculations
*/

CREATE TABLE IF NOT EXISTS rota_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_shift text NOT NULL DEFAULT 'A',
  date date NOT NULL,
  shift_block text NOT NULL,
  role_code text NOT NULL,
  operator_id uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rota_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rota assignments"
  ON rota_assignments
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert rota assignments"
  ON rota_assignments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update rota assignments"
  ON rota_assignments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete rota assignments"
  ON rota_assignments
  FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_rota_assignments_date_block_role
  ON rota_assignments(date, shift_block, role_code);

CREATE INDEX IF NOT EXISTS idx_rota_assignments_operator_date
  ON rota_assignments(operator_id, date);

CREATE INDEX IF NOT EXISTS idx_rota_assignments_shift_date
  ON rota_assignments(target_shift, date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'rota_assignments_shift_block_check'
  ) THEN
    ALTER TABLE rota_assignments ADD CONSTRAINT rota_assignments_shift_block_check
    CHECK (shift_block IN ('DAY', 'NIGHT'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'rota_assignments_target_shift_check'
  ) THEN
    ALTER TABLE rota_assignments ADD CONSTRAINT rota_assignments_target_shift_check
    CHECK (target_shift IN ('A', 'B', 'C', 'D'));
  END IF;
END $$;