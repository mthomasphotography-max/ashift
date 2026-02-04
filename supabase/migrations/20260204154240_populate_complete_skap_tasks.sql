/*
  # Populate Complete SKAP Tasks
  
  This migration populates all 131 detailed tasks across the 6 SKAP modules.
  
  ## Task Structure
  
  ### New Starter (L1-001 to L1-029)
  - 29 foundational tasks covering FLT operations, WMS basics, safety procedures, and warehouse fundamentals
  
  ### Beginner (L2-030 to L2-065)
  - 36 tasks covering risk assessments, R&R procedures, control procedures, safety systems, and basic warehouse operations
  
  ### Intermediate (L3-066 to L3-075)
  - 10 tasks covering EMCS, VPO systems, stock management, and green line procedures
  
  ### Advanced (L4-076 to L4-095)
  - 20 tasks covering logistics handbook understanding, VPO tools, process management, and shift management
  
  ### Advanced Plus (L4-096 to L4-115)
  - 20 tasks covering critical processes, VPO tools, BD/PM/PDCA, form completion, and operational meetings
  
  ### MOP (L6-116 to L6-131)
  - 16 tasks covering shift handover, FLM support, EES quality, communication, OPLs, task forces, and quality checks
*/

DO $$
DECLARE
  new_starter_id uuid;
  beginner_id uuid;
  intermediate_id uuid;
  advanced_id uuid;
  advanced_plus_id uuid;
  mop_id uuid;
BEGIN
  -- Get skill level IDs
  SELECT id INTO new_starter_id FROM skill_levels WHERE name = 'New Starter';
  SELECT id INTO beginner_id FROM skill_levels WHERE name = 'Beginner';
  SELECT id INTO intermediate_id FROM skill_levels WHERE name = 'Intermediate';
  SELECT id INTO advanced_id FROM skill_levels WHERE name = 'Advanced';
  SELECT id INTO advanced_plus_id FROM skill_levels WHERE name = 'Advanced Plus';
  SELECT id INTO mop_id FROM skill_levels WHERE name = 'MOP';

  -- New Starter tasks (L1-001 to L1-029)
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (new_starter_id, 'L1-001', 'Complete the FLT induction assessment and on-boarding', 1),
    (new_starter_id, 'L1-002', 'Knows and understands safety procedures around FLT.', 2),
    (new_starter_id, 'L1-003', 'Complete the pre-assessment questionnaire & assessment given RT/TR instructor.', 3),
    (new_starter_id, 'L1-004', 'Review and understand the FLT theory test & practical test and understand/pass the manual refresher', 4),
    (new_starter_id, 'L1-005', 'Knows and understand the basic controls and guidance plus the general principal & purpose of VPO.', 5),
    (new_starter_id, 'L1-006', 'Knows and understands basic warehouse layout and traffic paths.', 6),
    (new_starter_id, 'L1-007', 'Knows and understands safe working techniques and use of ASRS.', 7),
    (new_starter_id, 'L1-008', 'Understands and has basic operational understanding of WMS terminals and IT introduction.', 8),
    (new_starter_id, 'L1-009', 'Understanding PPE requirements for all logistics areas', 9),
    (new_starter_id, 'L1-010', 'Understands basic hand hygiene, cleaning process and Code of Practice', 10),
    (new_starter_id, 'L1-011', 'Understands the risks associated with the storage and handling of Chemical substances.', 11),
    (new_starter_id, 'L1-012', 'Understands the operational controls & emergency response procedures regarding fire evacuation.', 12),
    (new_starter_id, 'L1-013', 'Understands and apply the Incident/accident procedures and reporting. How the pauses in Logistics.', 13),
    (new_starter_id, 'L1-014', 'Understands the applicable procedures, recording standards, and near miss process related to task specific safety.', 14),
    (new_starter_id, 'L1-015', 'Knows and understands basic information around Quality and awareness of EES Process', 15),
    (new_starter_id, 'L1-016', 'Understands the basic controls and guidance plus the general principal & purpose of VPO. Awareness of the VPO introduction training document', 16),
    (new_starter_id, 'L1-017', 'Able to identify and deal with hazards, operational controls, and preventative measures during normal warehouse operations.', 17),
    (new_starter_id, 'L1-018', 'Understands the Red zone policy and general transport safety procedures.', 18),
    (new_starter_id, 'L1-019', 'Understands basic SB principles and cleaning procedures within department.', 19),
    (new_starter_id, 'L1-020', 'Knows and understands the process of waste segregation, netting operation at source, storage and disposal.', 20),
    (new_starter_id, 'L1-021', 'Understands the environmental hazards and risks in Logistics (i.e., safety data sheet and relevant MSD) related to normal operations.', 21),
    (new_starter_id, 'L1-022', 'The material handling procedure throughout the logistics area', 22),
    (new_starter_id, 'L1-023', 'Understands the principal of safe storage, all products and how this can be applied daily.', 23),
    (new_starter_id, 'L1-024', 'Knows and understand how to identify key hot tasks in all process – moving to docks, opening trailer curtains & doors, working at height etc.', 24),
    (new_starter_id, 'L1-025', 'Understands the site safety & environmental policy and how it applies in their role.', 25),
    (new_starter_id, 'L1-026', 'Active againt breaks/controls in Logistics by reporting hazards, and be involved in the solution to correct.', 26),
    (new_starter_id, 'L1-027', 'Knows and understands material handling procedures and guidelines, and the controls related to improper manual handling.', 27),
    (new_starter_id, 'L1-028', 'Know and apply the principals of trailer safety - Safety whilst docker / counterbalance.', 28),
    (new_starter_id, 'L1-029', 'Transfer of the basic concepts of Modern of Logistics for key learnings are tasks PTE (De-wrap bottles applicable to BBG.', 29);

  -- Beginner tasks (L2-030 to L2-065)
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (beginner_id, 'L2-030', 'Understanding one form/standard of Risk Assessments for the tasks undertaken.', 30),
    (beginner_id, 'L2-031', 'Understands and has the confidence of LODO for the relevant area in which the development & ASRS could be involved.', 31),
    (beginner_id, 'L2-032', 'Knows and understands how to access a specific FLT SOP to measure all non-compliant product.', 32),
    (beginner_id, 'L2-033', 'Knows and applies the incoming control procedures when receiving goods from suppliers or other sites. Able to check to ensure that staging locations are in', 33),
    (beginner_id, 'L2-034', 'Understands basic departmental SOP + size how to find and understand them also can explain any steps in a process (Longchamps Acacia system', 34),
    (beginner_id, 'L2-035', 'Know the safety indicators related to their role (LTI, MTI, FAI).', 35),
    (beginner_id, 'L2-036', 'Understands the low normal impact of beer / ale (water, energy, & spill management).', 36),
    (beginner_id, 'L2-037', 'Know and understand FIFO principles', 37),
    (beginner_id, 'L2-038', 'Return material control / segregt on by duo/len types / loading correct pallets into live magazine', 38),
    (beginner_id, 'L2-039', 'Know and understands loading and unloading procedures with load audit functionality', 39),
    (beginner_id, 'L2-040', 'Knows and understands how to operate storage racking systems', 40),
    (beginner_id, 'L2-041', 'Knows and understands what to perform hot tasks', 41),
    (beginner_id, 'L2-042', 'Know and understands daily / weekly PRs & MRs', 42),
    (beginner_id, 'L2-043', 'Knows and understands how to repeat an inbound delivery into WMS', 43),
    (beginner_id, 'L2-044', 'Uses tip, what and one/ex working Creating Loan, knowing and understanding of SOP/Safety implications', 44),
    (beginner_id, 'L2-045', 'Knows and understands how to deal with basic stock system queries with WMS / SAP', 45),
    (beginner_id, 'L2-046', 'Knows and understands how to service a dock-pig (the - removing pallets of out-export loads from the traes', 46),
    (beginner_id, 'L2-047', 'Knows and understands how to deliver pallets of dry goods to/from the Lines', 47),
    (beginner_id, 'L2-048', 'Knows and understands how to deal with spillages & breakages - system-call call by pre practical', 48),
    (beginner_id, 'L2-049', 'Knows and understands how to check a return pallet is within quality tolerances and alenderes are acceptable', 49),
    (beginner_id, 'L2-050', 'Knows and understands how to manage damaged pallets', 50),
    (beginner_id, 'L2-051', 'Knows and understands boxing and packaging materials, stacking heights and locations.', 51),
    (beginner_id, 'L2-052', 'Knows and Understands how to perform 360 degree empty can pallet checks', 52),
    (beginner_id, 'L2-053', 'Knows and understands Red Zone Safety rules', 53),
    (beginner_id, 'L2-054', 'Knows and understand how to follow procedures and tool for Safety', 54),
    (beginner_id, 'L2-055', 'Knows and understands loading/unloading responsibilities', 55),
    (beginner_id, 'L2-056', 'Know and understands how to operate storage racking systems', 56),
    (beginner_id, 'L2-057', 'Knows and understands how to operate the keg area FLT with different foe cals/achenda – specifically FLcct and load weights.', 57),
    (beginner_id, 'L2-058', 'Knows and understands the infra saftey rules associated with operating within the keg ares in the.', 58),
    (beginner_id, 'L2-059', 'Knows and understands how to safely apply daily checks on a keg washer', 59),
    (beginner_id, 'L2-060', 'Knows and understands how to identify different keg full products for loading and unloading', 60),
    (beginner_id, 'L2-061', 'Know and understand routing and Empty plan into staging been valders vsuty to PPL', 61),
    (beginner_id, 'L2-062', 'Knows and understands manual hand-lift of kegs', 62),
    (beginner_id, 'L2-063', 'Knows and understands loading / unloading decanting area and load / weight application', 63),
    (beginner_id, 'L2-064', 'Understands and apply the Principals of effective VPO implementation in our next link to our PUSH -v with the Excellence programme definitions', 64),
    (beginner_id, 'L2-065', 'EMCS & T1 Export document creation', 65);

  -- Intermediate tasks (L3-066 to L3-075)
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (intermediate_id, 'L3-066', 'Standard and advance use of EMCS', 66),
    (intermediate_id, 'L3-067', 'Processing shortages / chasing research on missing stock items', 67),
    (intermediate_id, 'L3-068', 'VPO operation via advanced overview of system architecture within operation awareness', 68),
    (intermediate_id, 'L3-069', 'Resuming despatck rules and system investigation for wise checking.', 69),
    (intermediate_id, 'L3-070', 'Rum point application of PPO with the department to quality for us using courgency for', 70),
    (intermediate_id, 'L3-071', 'Able to Manage a Greens line (also must complete the relevant Greens line competencies pamper fos.', 71),
    (intermediate_id, 'L3-072', 'Linking with SPL Service providers - on & off site Transport. Materials suppliers, Inventory Deployment & external warehouse teams', 72),
    (intermediate_id, 'L3-073', 'Proficient PRs / Customer demurrage & loading at scheduled attainment and green line profyle.', 73),
    (intermediate_id, 'L3-074', 'Removal of LPs from TPP and asufyty to charge WMS locations.', 74),
    (intermediate_id, 'L3-075', 'Ability to reliable RF of justified & WMS', 75);

  -- Advanced tasks (L4-076 to L4-095)
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (advanced_id, 'L4-076', 'Understanding and able to instruct others in our processes including supporting the t sue of early tools and process routines', 76),
    (advanced_id, 'L4-077', 'Understanding and able to demonstrate clear awareness of the Logistics Pillar Handbook or BD, PM, PDCA & all Critical process within Logistics VPO.', 77),
    (advanced_id, 'L4-078', 'Completion of SV / RCA / Problem solving / Data compilation t owes to VPO Tools & GCP -s', 78),
    (advanced_id, 'L4-079', 'Update daily / weekly KPI boards & folders', 79),
    (advanced_id, 'L4-080', 'Able to Comply per cada laws bucling GM SWO & PtG process', 80),
    (advanced_id, 'L4-081', 'Use / completion / understanding of ESW & GWD process', 81),
    (advanced_id, 'L4-082', 'Pilot ign duties of all areas with fluency', 82),
    (advanced_id, 'L4-083', 'Revision invest gets in & expecting with knowledge of form completion to ABI / BBG standards, aware of Crisis Management control', 83),
    (advanced_id, 'L4-084', 'Able to control JPA. Enter equity, empty keg quality, counting-manpower across areas to act workforce land delivering SL & ACT', 84),
    (advanced_id, 'L4-085', 'Understands and ability to review, validate and complete yules', 85),
    (advanced_id, 'L4-086', 'Attend and contribute to Operational Meetings if needed', 86),
    (advanced_id, 'L4-087', 'Able to manage and communicate clearly at the debrief of any goods process', 87),
    (advanced_id, 'L4-088', 'Block c stock report compilation and c check / recording of errors and cost to end-understanding', 88),
    (advanced_id, 'L4-089', 'PV slick On / Off', 89),
    (advanced_id, 'L4-090', 'Export Container Controls loading patterns and paperwork', 90),
    (advanced_id, 'L4-091', 'SLOG control', 91),
    (advanced_id, 'L4-092', 'Invest gation of failed delivery notes and inbound products', 92),
    (advanced_id, 'L4-093', 'Application of inbound and outbound orders', 93),
    (advanced_id, 'L4-094', 'Application of ZD22 - manuals mode controls', 94),
    (advanced_id, 'L4-095', 'Understanding and able to instruct others in our processes including encouraging and supporting the t use of early tools and process routines', 95);

  -- Advanced Plus tasks (L4-096 to L4-115)
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (advanced_plus_id, 'L4-096', 'Understanding and able to demonstrate clear awareness of BD, PM, PDCA & all critical process within Logistics VPO.', 96),
    (advanced_plus_id, 'L4-097', 'Completion of SV / RCA / Problem solving / Data compilation t owes to VPO Tools', 97),
    (advanced_plus_id, 'L4-098', 'Update daily / weekly KPI boards & folders', 98),
    (advanced_plus_id, 'L4-099', 'Use / completion / understanding of ESW & GWD process', 99),
    (advanced_plus_id, 'L4-100', 'Knowing & understands Ipower up within the FM nc troubleshooting', 100),
    (advanced_plus_id, 'L4-101', 'Piloting duties of all areas with fluency', 101),
    (advanced_plus_id, 'L4-102', 'Revision invest gets in & expecting with knowledge of form completion to ABI / BBG standards.', 102),
    (advanced_plus_id, 'L4-103', 'Able to control JPA. Enter equity, empty keg quality, counting-manpower', 103),
    (advanced_plus_id, 'L4-104', 'Understanding and ability to review, validate and complete yules', 104),
    (advanced_plus_id, 'L4-105', 'Attend and contribute to own t op and externally operations meetings if needed', 105),
    (advanced_plus_id, 'L4-106', 'Able to manage and communicate clearly at the debrief of any goods process', 106),
    (advanced_plus_id, 'L4-107', 'Block c stock report compilation and c check / recording of errors and cost to end-understanding', 107),
    (advanced_plus_id, 'L4-108', 'PV slick On / Off', 108),
    (advanced_plus_id, 'L4-109', 'Export Container Controls', 109),
    (advanced_plus_id, 'L4-110', 'SLOG control', 110),
    (advanced_plus_id, 'L4-111', 'Invest gation of failed delivery notes and inbound products', 111),
    (advanced_plus_id, 'L4-112', 'Application of inbound and outbound orders', 112),
    (advanced_plus_id, 'L4-113', 'Application of ZD22 - manuals mode controls', 113),
    (advanced_plus_id, 'L4-114', 'EMCS interface automation', 114),
    (advanced_plus_id, 'L4-115', 'Understanding and able to instruct others in our processes including encouraging and supporting the t use of early tools and process routines with a view and Support to AhH', 115);

  -- MOP tasks (L6-116 to L6-131)
  INSERT INTO skill_tasks (skill_level_id, task_name, task_description, sort_order) VALUES
    (mop_id, 'L6-116', 'Undertive the shift handover when coworaging for the FLM and ensure that all relevant reports have been updated', 116),
    (mop_id, 'L6-117', 'Receives ar accounts for how the process wor ks per the relevant shift / area with in a role potentially responsible for subsequent accident/incident investig', 117),
    (mop_id, 'L6-118', 'Conduct handover to the oncoming FLM/Mult. Operator, proving details on all relevant shift issues.', 118),
    (mop_id, 'L6-119', 'Contribution to Support with an individual basis to be included with Infeed EES, Quality and all relevant shift issues gets solved and unresolved.', 119),
    (mop_id, 'L6-120', 'Managing any areas of opportunity (AoO) for in the Shift Improvements as they occur with areas to cover all relevant shifts.', 120),
    (mop_id, 'L6-121', 'Facilitate effective communication if briefing plan priorities across the team and across site', 121),
    (mop_id, 'L6-122', 'Completion of new format form into the Point Lessons (OPLs)', 122),
    (mop_id, 'L6-123', 'Contribute to departmental Improvement Task Force (ITF) initiatives.', 123),
    (mop_id, 'L6-124', 'Attend and participate in any meetings as key team member.', 124),
    (mop_id, 'L6-125', 'Is able to collaborate (and train/guide people) across match/automatically completion', 125),
    (mop_id, 'L6-126', 'Carry out Quality Block Stock c he cks where necessary and disc vigilentials prince as rornsed ay Quality.', 126),
    (mop_id, 'L6-127', 'Check that inbound/single exceptions are main lined throughout the shift in one chart/visually register he WMS work queue for prioritization of tasks.', 127),
    (mop_id, 'L6-128', 'Monitor SIGMA throughout the shift to ensure Logistics are providing the service required and not incurring any downtime.', 128),
    (mop_id, 'L6-129', 'Ensure all Logistics areas work together to priorities.', 129),
    (mop_id, 'L6-130', 'Ensure all Logistics related assets including FLT, s are returns and operated via audit manner', 130),
    (mop_id, 'L6-131', 'Demonstrate shift ownership behaviour, responsibility and ensure food hygiene safety regulations as defined by policy or legislat', 131);

END $$;
