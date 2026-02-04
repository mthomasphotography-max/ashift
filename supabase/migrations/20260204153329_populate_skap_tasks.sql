/*
  # Populate SKAP Tasks

  This migration populates the skill_tasks table with all required tasks for each skill level.

  ## Tasks Added
  
  ### Drivers Licence
  - Basic driving tasks and qualifications
  
  ### Warehouse Op Intermediate
  - Intermediate warehouse operation tasks
  
  ### Warehouse Op Advanced
  - Advanced warehouse operation tasks
  
  ### Distribution Op Intermediate
  - Intermediate distribution tasks
  
  ### Distribution Op Advanced
  - Advanced distribution tasks
  
  ### Logistics MOP
  - Logistics method of procedure tasks
*/

-- Get skill level IDs
DO $$
DECLARE
  drivers_licence_id uuid;
  warehouse_int_id uuid;
  warehouse_adv_id uuid;
  dist_int_id uuid;
  dist_adv_id uuid;
  logistics_mop_id uuid;
BEGIN
  -- Get all skill level IDs
  SELECT id INTO drivers_licence_id FROM skill_levels WHERE name = 'Drivers Licence';
  SELECT id INTO warehouse_int_id FROM skill_levels WHERE name = 'Warehouse Op Intermediate';
  SELECT id INTO warehouse_adv_id FROM skill_levels WHERE name = 'Warehouse Op Advanced';
  SELECT id INTO dist_int_id FROM skill_levels WHERE name = 'Distribution Op Intermediate';
  SELECT id INTO dist_adv_id FROM skill_levels WHERE name = 'Distribution Op Advanced';
  SELECT id INTO logistics_mop_id FROM skill_levels WHERE name = 'Logistics MOP';

  -- Delete existing tasks first
  DELETE FROM skill_tasks;

  -- Drivers Licence tasks
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (drivers_licence_id, 'Valid Driving Licence', 'Hold a valid UK driving licence', 1),
    (drivers_licence_id, 'FLT Licence', 'Complete forklift truck training and certification', 2),
    (drivers_licence_id, 'Site Induction', 'Complete site safety induction', 3);

  -- Warehouse Op Intermediate tasks
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (warehouse_int_id, 'Basic FLT Operations', 'Operate counterbalance forklift safely', 1),
    (warehouse_int_id, 'Stock Management', 'Understand basic stock control procedures', 2),
    (warehouse_int_id, 'WMS System', 'Use warehouse management system for basic tasks', 3),
    (warehouse_int_id, 'Quality Checks', 'Perform basic quality control checks', 4),
    (warehouse_int_id, 'Manual Handling', 'Safe manual handling practices', 5),
    (warehouse_int_id, 'Pallet Wrapping', 'Wrap and secure pallets correctly', 6);

  -- Warehouse Op Advanced tasks
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (warehouse_adv_id, 'Advanced FLT Operations', 'Operate all types of forklift equipment', 1),
    (warehouse_adv_id, 'Inventory Management', 'Manage inventory levels and stock rotation', 2),
    (warehouse_adv_id, 'SAP Transactions', 'Process goods movements in SAP', 3),
    (warehouse_adv_id, 'Problem Solving', 'Resolve warehouse operational issues', 4),
    (warehouse_adv_id, 'Team Coordination', 'Coordinate team activities effectively', 5),
    (warehouse_adv_id, 'Equipment Maintenance', 'Perform basic equipment maintenance checks', 6);

  -- Distribution Op Intermediate tasks
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (dist_int_id, 'Loading Bay Operations', 'Manage loading bay activities', 1),
    (dist_int_id, 'Vehicle Loading', 'Load vehicles efficiently and safely', 2),
    (dist_int_id, 'Delivery Documentation', 'Process delivery paperwork correctly', 3),
    (dist_int_id, 'Route Planning', 'Understand basic route planning', 4),
    (dist_int_id, 'Customer Service', 'Handle customer interactions professionally', 5),
    (dist_int_id, 'Load Security', 'Secure loads according to regulations', 6);

  -- Distribution Op Advanced tasks
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (dist_adv_id, 'Fleet Management', 'Manage fleet operations and scheduling', 1),
    (dist_adv_id, 'Advanced SAP', 'Process complex SAP transactions (VL31N, VT01N)', 2),
    (dist_adv_id, 'Driver Coordination', 'Coordinate driver schedules and routes', 3),
    (dist_adv_id, 'Compliance Management', 'Ensure transport compliance and regulations', 4),
    (dist_adv_id, 'Performance Monitoring', 'Monitor and report on distribution KPIs', 5),
    (dist_adv_id, 'Issue Resolution', 'Resolve complex distribution issues', 6);

  -- Logistics MOP tasks
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (logistics_mop_id, 'Full SAP Proficiency', 'Master all SAP logistics transactions', 1),
    (logistics_mop_id, 'Process Optimization', 'Identify and implement process improvements', 2),
    (logistics_mop_id, 'Training Delivery', 'Train and mentor other operators', 3),
    (logistics_mop_id, 'System Integration', 'Manage integration between warehouse and distribution systems', 4),
    (logistics_mop_id, 'Strategic Planning', 'Contribute to logistics strategic planning', 5),
    (logistics_mop_id, 'Cross-Functional Leadership', 'Lead cross-functional logistics projects', 6);

END $$;