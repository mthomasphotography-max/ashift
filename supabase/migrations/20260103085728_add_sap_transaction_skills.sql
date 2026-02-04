/*
  # Add SAP Transaction Skills

  1. Changes to `operator_capabilities` table
    - Add SAP transaction skill columns with N/B/C/S proficiency ratings:
      
      **Packaging Transactions:**
      - `sap_vl31n` (text): Create inbound delivery
      - `sap_vt01n` (text): Create shipment
      
      **Distop/Pilot Transactions:**
      - `sap_vl71` (text): Reprint delivery notes
      - `sap_vl33n` (text): Display inbound delivery
      - `sap_vl03n` (text): Display outbound delivery
      - `sap_vt03n` (text): Display outbound shipment
      - `sap_cor3` (text): Display process order
      - `sap_zc30` (text): Progress monitor/yield reports
  
  2. Purpose
    - Track operator proficiency in specific SAP transactions
    - Enable skill-based allocation considering SAP transaction knowledge
    - Support training planning and skill development tracking
    - Link SAP skills to specific job areas (Packaging, Distop/Pilot)
  
  3. Notes
    - All columns default to 'N' (Not trained)
    - Rating system: N=Not trained, B=Basic, C=Competent, S=Specialist
    - VL31N and VT01N are relevant to both Packaging and Distop/Pilot roles
*/

-- Add SAP transaction columns to operator_capabilities table
DO $$
BEGIN
  -- Packaging transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operator_capabilities' AND column_name = 'sap_vl31n'
  ) THEN
    ALTER TABLE operator_capabilities ADD COLUMN sap_vl31n text DEFAULT 'N';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operator_capabilities' AND column_name = 'sap_vt01n'
  ) THEN
    ALTER TABLE operator_capabilities ADD COLUMN sap_vt01n text DEFAULT 'N';
  END IF;

  -- Distop/Pilot transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operator_capabilities' AND column_name = 'sap_vl71'
  ) THEN
    ALTER TABLE operator_capabilities ADD COLUMN sap_vl71 text DEFAULT 'N';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operator_capabilities' AND column_name = 'sap_vl33n'
  ) THEN
    ALTER TABLE operator_capabilities ADD COLUMN sap_vl33n text DEFAULT 'N';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operator_capabilities' AND column_name = 'sap_vl03n'
  ) THEN
    ALTER TABLE operator_capabilities ADD COLUMN sap_vl03n text DEFAULT 'N';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operator_capabilities' AND column_name = 'sap_vt03n'
  ) THEN
    ALTER TABLE operator_capabilities ADD COLUMN sap_vt03n text DEFAULT 'N';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operator_capabilities' AND column_name = 'sap_cor3'
  ) THEN
    ALTER TABLE operator_capabilities ADD COLUMN sap_cor3 text DEFAULT 'N';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operator_capabilities' AND column_name = 'sap_zc30'
  ) THEN
    ALTER TABLE operator_capabilities ADD COLUMN sap_zc30 text DEFAULT 'N';
  END IF;
END $$;