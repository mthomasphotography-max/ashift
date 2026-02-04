/*
  # SKAP (Skills Knowledge Advancement Program) System

  1. New Tables
    - `skill_levels`
      - `id` (uuid, primary key)
      - `name` (text) - e.g., "Drivers Licence", "Warehouse Op Intermediate"
      - `sort_order` (integer) - for ordering skill levels
      - `description` (text, optional)
      - `created_at` (timestamptz)
    
    - `skill_tasks`
      - `id` (uuid, primary key)
      - `skill_level_id` (uuid, foreign key to skill_levels)
      - `task_name` (text) - name of the task
      - `task_description` (text, optional)
      - `sort_order` (integer) - for ordering tasks
      - `created_at` (timestamptz)
    
    - `operator_skill_progress`
      - `id` (uuid, primary key)
      - `operator_id` (uuid, foreign key to operators)
      - `skill_task_id` (uuid, foreign key to skill_tasks)
      - `completed` (boolean) - whether task is completed
      - `completed_date` (date, optional) - when task was completed
      - `notes` (text, optional) - any notes about progress
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `operator_skill_levels`
      - `id` (uuid, primary key)
      - `operator_id` (uuid, foreign key to operators)
      - `skill_level_id` (uuid, foreign key to skill_levels)
      - `achieved` (boolean) - whether skill level is achieved
      - `achieved_date` (date, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (to be refined later with auth)

  3. Indexes
    - Add indexes for foreign keys and common queries
*/

-- Create skill_levels table
CREATE TABLE IF NOT EXISTS skill_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create skill_tasks table
CREATE TABLE IF NOT EXISTS skill_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_level_id uuid REFERENCES skill_levels(id) ON DELETE CASCADE NOT NULL,
  task_name text NOT NULL,
  task_description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create operator_skill_progress table
CREATE TABLE IF NOT EXISTS operator_skill_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES operators(id) ON DELETE CASCADE NOT NULL,
  skill_task_id uuid REFERENCES skill_tasks(id) ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false,
  completed_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(operator_id, skill_task_id)
);

-- Create operator_skill_levels table
CREATE TABLE IF NOT EXISTS operator_skill_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES operators(id) ON DELETE CASCADE NOT NULL,
  skill_level_id uuid REFERENCES skill_levels(id) ON DELETE CASCADE NOT NULL,
  achieved boolean DEFAULT false,
  achieved_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(operator_id, skill_level_id)
);

-- Enable RLS
ALTER TABLE skill_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_skill_levels ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to skill_levels"
  ON skill_levels FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access to skill_levels"
  ON skill_levels FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to skill_tasks"
  ON skill_tasks FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access to skill_tasks"
  ON skill_tasks FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to operator_skill_progress"
  ON operator_skill_progress FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access to operator_skill_progress"
  ON operator_skill_progress FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to operator_skill_levels"
  ON operator_skill_levels FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access to operator_skill_levels"
  ON operator_skill_levels FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_skill_tasks_skill_level ON skill_tasks(skill_level_id);
CREATE INDEX IF NOT EXISTS idx_operator_skill_progress_operator ON operator_skill_progress(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_skill_progress_task ON operator_skill_progress(skill_task_id);
CREATE INDEX IF NOT EXISTS idx_operator_skill_levels_operator ON operator_skill_levels(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_skill_levels_skill ON operator_skill_levels(skill_level_id);

-- Insert default skill levels
INSERT INTO skill_levels (name, sort_order, description) VALUES
  ('Drivers Licence', 1, 'Basic driving qualification'),
  ('Warehouse Op Intermediate', 2, 'Intermediate warehouse operations'),
  ('Warehouse Op Advanced', 3, 'Advanced warehouse operations'),
  ('Distribution Op Intermediate', 4, 'Intermediate distribution operations'),
  ('Distribution Op Advanced', 5, 'Advanced distribution operations'),
  ('Logistics MOP', 6, 'Logistics Method of Procedure')
ON CONFLICT (name) DO NOTHING;