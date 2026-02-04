/*
  # Fix CASCADE Deletes for Operators

  1. Purpose
    - Ensure all foreign key constraints referencing operators table have ON DELETE CASCADE
    - This allows operators to be deleted without manual cleanup of related records

  2. Tables Updated
    - operator_capabilities: Already has CASCADE, verify it's applied
    - weekly_staff_plan: Already has CASCADE, verify it's applied
    - weekly_rota_allocation: Already has CASCADE, verify it's applied
    - operator_metrics: Already has CASCADE, verify it's applied
    - allocation_history: Already has CASCADE, verify it's applied
    - skap_operator_qualifications: Already has CASCADE, verify it's applied
    - skap_operator_training_status: Already has CASCADE, verify it's applied
    - rota_assignments: Already has CASCADE, verify it's applied

  3. Actions
    - Drop and recreate all foreign key constraints with proper CASCADE behavior
*/

-- Fix operator_capabilities foreign key
DO $$
BEGIN
  ALTER TABLE operator_capabilities 
    DROP CONSTRAINT IF EXISTS operator_capabilities_operator_id_fkey;
  
  ALTER TABLE operator_capabilities
    ADD CONSTRAINT operator_capabilities_operator_id_fkey
    FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE;
END $$;

-- Fix weekly_staff_plan foreign key
DO $$
BEGIN
  ALTER TABLE weekly_staff_plan
    DROP CONSTRAINT IF EXISTS weekly_staff_plan_operator_id_fkey;
  
  ALTER TABLE weekly_staff_plan
    ADD CONSTRAINT weekly_staff_plan_operator_id_fkey
    FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE;
END $$;

-- Fix weekly_rota_allocation foreign key
DO $$
BEGIN
  ALTER TABLE weekly_rota_allocation
    DROP CONSTRAINT IF EXISTS weekly_rota_allocation_operator_id_fkey;
  
  ALTER TABLE weekly_rota_allocation
    ADD CONSTRAINT weekly_rota_allocation_operator_id_fkey
    FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE;
END $$;

-- Fix operator_metrics foreign key
DO $$
BEGIN
  ALTER TABLE operator_metrics
    DROP CONSTRAINT IF EXISTS operator_metrics_operator_id_fkey;
  
  ALTER TABLE operator_metrics
    ADD CONSTRAINT operator_metrics_operator_id_fkey
    FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE;
END $$;

-- Fix allocation_history foreign key (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'allocation_history') THEN
    ALTER TABLE allocation_history
      DROP CONSTRAINT IF EXISTS allocation_history_operator_id_fkey;
    
    ALTER TABLE allocation_history
      ADD CONSTRAINT allocation_history_operator_id_fkey
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix skap_operator_qualifications foreign key (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'skap_operator_qualifications') THEN
    ALTER TABLE skap_operator_qualifications
      DROP CONSTRAINT IF EXISTS skap_operator_qualifications_operator_id_fkey;
    
    ALTER TABLE skap_operator_qualifications
      ADD CONSTRAINT skap_operator_qualifications_operator_id_fkey
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix skap_operator_training_status foreign key (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'skap_operator_training_status') THEN
    ALTER TABLE skap_operator_training_status
      DROP CONSTRAINT IF EXISTS skap_operator_training_status_operator_id_fkey;
    
    ALTER TABLE skap_operator_training_status
      ADD CONSTRAINT skap_operator_training_status_operator_id_fkey
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix rota_assignments foreign key (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rota_assignments') THEN
    ALTER TABLE rota_assignments
      DROP CONSTRAINT IF EXISTS rota_assignments_operator_id_fkey;
    
    ALTER TABLE rota_assignments
      ADD CONSTRAINT rota_assignments_operator_id_fkey
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE;
  END IF;
END $$;
