/*
  # Store Shift Pattern Configuration

  1. New Table
    - `shift_pattern_config`
      - `id` (integer, primary key) - Single row table
      - `anchor_date` (date) - The reference date for shift calculations
      - `anchor_shift` (text) - The shift type on the anchor date
      - `cycle_length` (integer) - Number of days in the rotation cycle
      - `pattern_description` (jsonb) - Full pattern description
      - `updated_at` (timestamptz) - Last update timestamp

  2. Initial Data
    - Inserts the current shift pattern with anchor date 2026-01-02

  3. Security
    - Enable RLS with public read access
    - Authenticated users can update configuration
*/

CREATE TABLE IF NOT EXISTS shift_pattern_config (
  id integer PRIMARY KEY DEFAULT 1,
  anchor_date date NOT NULL,
  anchor_shift text NOT NULL CHECK (anchor_shift IN ('DAYS', 'NIGHTS', 'OFF')),
  cycle_length integer NOT NULL DEFAULT 8,
  pattern_description jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE shift_pattern_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shift pattern config"
  ON shift_pattern_config FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update shift pattern config"
  ON shift_pattern_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert shift pattern config"
  ON shift_pattern_config FOR INSERT
  TO authenticated
  WITH CHECK (id = 1);

INSERT INTO shift_pattern_config (id, anchor_date, anchor_shift, cycle_length, pattern_description)
VALUES (
  1,
  '2026-01-02',
  'DAYS',
  8,
  '[
    {"day": 0, "shift": "DAYS"},
    {"day": 1, "shift": "DAYS"},
    {"day": 2, "shift": "NIGHTS"},
    {"day": 3, "shift": "NIGHTS"},
    {"day": 4, "shift": "OFF"},
    {"day": 5, "shift": "OFF"},
    {"day": 6, "shift": "OFF"},
    {"day": 7, "shift": "OFF"}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
