-- ============================================================
--  Smart Farm — MySQL Seed Data
-- ============================================================
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
USE smartfarm;

-- ---- ZONES --------------------------------------------------
INSERT INTO Zones (zone_code,zone_name,zone_type,status,area_sqm,map_x,map_y,map_w,map_h,notes) VALUES
('T-01','โต๊ะไฮโดรโปนิกส์ 1','hydroponics','growing',      6.0, 0,0,2,2,'ผักสลัดกรีนโอ๊ค'),
('T-02','โต๊ะไฮโดรโปนิกส์ 2','hydroponics','growing',      6.0, 2,0,2,2,'ผักสลัดเรดโอ๊ค'),
('T-03','โต๊ะไฮโดรโปนิกส์ 3','hydroponics','ready_harvest',6.0, 4,0,2,2,'บัตเตอร์เฮด'),
('T-04','โต๊ะไฮโดรโปนิกส์ 4','hydroponics','vacant',       6.0, 6,0,2,2,NULL),
('T-05','โต๊ะไฮโดรโปนิกส์ 5','hydroponics','preparing',    6.0, 8,0,2,2,'เตรียมรับกล้าใหม่'),
('B-01','แปลงดิน A',          'soil_bed',   'growing',     20.0, 0,2,3,3,'ผักชี + ต้นหอม'),
('B-02','แปลงดิน B',          'soil_bed',   'growing',     20.0, 3,2,3,3,'มะเขือเทศ'),
('B-03','แปลงดิน C',          'soil_bed',   'maintenance', 20.0, 6,2,3,3,'ปรับปรุงดิน'),
('P-01','ต้นไม้ยืนต้น โซน A', 'perennial_tree','growing',  50.0, 0,5,4,3,'มะนาว 8 ต้น'),
('P-02','ต้นไม้ยืนต้น โซน B', 'perennial_tree','growing',  50.0, 4,5,4,3,'มะม่วง 4 ต้น');

-- ---- ZONE DETAILS -------------------------------------------
INSERT INTO ZoneDetails (zone_id,ec_level,ph_level,water_cycle_minutes)
  SELECT zone_id,1.8,6.2,15 FROM Zones WHERE zone_code='T-01';
INSERT INTO ZoneDetails (zone_id,ec_level,ph_level,water_cycle_minutes)
  SELECT zone_id,2.0,6.0,15 FROM Zones WHERE zone_code='T-02';
INSERT INTO ZoneDetails (zone_id,ec_level,ph_level,water_cycle_minutes)
  SELECT zone_id,1.9,6.3,15 FROM Zones WHERE zone_code='T-03';
INSERT INTO ZoneDetails (zone_id,ec_level,ph_level,water_cycle_minutes)
  SELECT zone_id,0.5,7.0,0  FROM Zones WHERE zone_code='T-04';
INSERT INTO ZoneDetails (zone_id,ec_level,ph_level,water_cycle_minutes)
  SELECT zone_id,0.8,6.8,10 FROM Zones WHERE zone_code='T-05';
INSERT INTO ZoneDetails (zone_id,soil_moisture_pct,last_tilled_date)
  SELECT zone_id,62.5,DATE_SUB(CURDATE(),INTERVAL 5 DAY) FROM Zones WHERE zone_code='B-01';
INSERT INTO ZoneDetails (zone_id,soil_moisture_pct,last_tilled_date)
  SELECT zone_id,58.0,DATE_SUB(CURDATE(),INTERVAL 3 DAY) FROM Zones WHERE zone_code='B-02';
INSERT INTO ZoneDetails (zone_id,soil_moisture_pct,last_tilled_date)
  SELECT zone_id,30.0,DATE_SUB(CURDATE(),INTERVAL 1 DAY) FROM Zones WHERE zone_code='B-03';
INSERT INTO ZoneDetails (zone_id,last_fertilized_date,last_pruned_date,fertilize_interval_days,prune_interval_days)
  SELECT zone_id,DATE_SUB(CURDATE(),INTERVAL 14 DAY),DATE_SUB(CURDATE(),INTERVAL 30 DAY),30,90
  FROM Zones WHERE zone_code='P-01';
INSERT INTO ZoneDetails (zone_id,last_fertilized_date,last_pruned_date,fertilize_interval_days,prune_interval_days)
  SELECT zone_id,DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_SUB(CURDATE(),INTERVAL 45 DAY),30,90
  FROM Zones WHERE zone_code='P-02';

-- ---- CROP TEMPLATES -----------------------------------------
INSERT INTO CropTemplates (template_name,crop_category,total_days,zone_type,description,color_tag) VALUES
('กรีนโอ๊ค (Hydroponics)', 'vegetable', 45,'hydroponics',  'เพาะเมล็ด → ย้ายกล้า → เก็บเกี่ยว','#4ade80'),
('เรดโอ๊ค (Hydroponics)',  'vegetable', 45,'hydroponics',  'ผักสลัดเรดโอ๊ค สีแดงม่วง',           '#f87171'),
('บัตเตอร์เฮด (Hydroponics)','vegetable',50,'hydroponics', 'ผักสลัดบัตเตอร์เฮด นุ่มหวาน',        '#facc15'),
('ผักชี (Soil Bed)',        'herb',      35,'soil_bed',     'ผักชีไทย เพาะตรงในแปลง',             '#86efac'),
('มะเขือเทศราชินี',         'vegetable', 90,'soil_bed',     'มะเขือเทศราชินีลูกเล็ก',              '#fb923c'),
('มะนาว (ยืนต้น)',          'fruit',    365,'perennial_tree','มะนาวแป้น ดูแลรายปี',               '#d9f99d'),
('มะม่วง (ยืนต้น)',         'fruit',    365,'perennial_tree','มะม่วงน้ำดอกไม้ ดูแลรายปี',         '#fde68a');

-- ---- CROP STAGES --------------------------------------------
-- กรีนโอ๊ค
SET @tpl = (SELECT template_id FROM CropTemplates WHERE template_name='กรีนโอ๊ค (Hydroponics)');
INSERT INTO CropStages (template_id,stage_order,stage_name,day_start,day_end,task_title,task_description,task_type) VALUES
(@tpl,1,'เพาะเมล็ด',       1, 1,'เพาะเมล็ดกรีนโอ๊คในถาดเพาะ',     'ใช้ rockwool หรือ coco peat','sow'),
(@tpl,2,'ดูแลกล้า',        2,14,'ตรวจสอบความชื้นและแสงกล้า',        'รักษา EC 0.5–0.8 ระยะกล้า', 'check'),
(@tpl,3,'ย้ายกล้า',       14,14,'ย้ายกล้ากรีนโอ๊คลงโต๊ะปลูก',      'ปรับ EC เป็น 1.5–2.0',       'transplant'),
(@tpl,4,'ระยะเจริญเติบโต',15,44,'ตรวจ EC/pH และรอบน้ำ',             'EC 1.8–2.2 / pH 6.0–6.5',   'check'),
(@tpl,5,'เก็บเกี่ยว',     45,45,'เก็บเกี่ยวผักสลัดกรีนโอ๊ค',        'ตัดโคน ล้างน้ำ ชั่งน้ำหนัก','harvest');

-- เรดโอ๊ค
SET @tpl = (SELECT template_id FROM CropTemplates WHERE template_name='เรดโอ๊ค (Hydroponics)');
INSERT INTO CropStages (template_id,stage_order,stage_name,day_start,day_end,task_title,task_type) VALUES
(@tpl,1,'เพาะเมล็ด', 1, 1,'เพาะเมล็ดเรดโอ๊คในถาดเพาะ','sow'),
(@tpl,2,'ดูแลกล้า',  2,14,'ตรวจสอบความชื้นและแสงกล้าเรดโอ๊ค','check'),
(@tpl,3,'ย้ายกล้า', 14,14,'ย้ายกล้าเรดโอ๊คลงโต๊ะปลูก','transplant'),
(@tpl,4,'ระยะเจริญเติบโต',15,44,'ตรวจ EC/pH — เรดโอ๊คต้องการแสงสูง','check'),
(@tpl,5,'เก็บเกี่ยว',45,45,'เก็บเกี่ยวผักสลัดเรดโอ๊ค','harvest');

-- ผักชี
SET @tpl = (SELECT template_id FROM CropTemplates WHERE template_name='ผักชี (Soil Bed)');
INSERT INTO CropStages (template_id,stage_order,stage_name,day_start,day_end,task_title,task_description,task_type) VALUES
(@tpl,1,'เพาะเมล็ด',1, 1,'หว่านเมล็ดผักชีในแปลงดิน',  'ระยะห่าง 5–10 ซม.',          'sow'),
(@tpl,2,'รดน้ำ',     2,10,'รดน้ำแปลงผักชีช่วงเช้า',      'รักษาความชื้น 60–70%',        'water'),
(@tpl,3,'ใส่ปุ๋ย',  15,15,'ผสมปุ๋ยบำรุงแปลงผักชี',        'ปุ๋ย 15-15-15 20g/ตร.ม.',    'fertilize'),
(@tpl,4,'เก็บเกี่ยว',35,35,'เก็บเกี่ยวผักชี',              'ตัดเหนือโคน 2 ซม.',          'harvest');

-- มะนาว
SET @tpl = (SELECT template_id FROM CropTemplates WHERE template_name='มะนาว (ยืนต้น)');
INSERT INTO CropStages (template_id,stage_order,stage_name,day_start,day_end,task_title,task_type) VALUES
(@tpl,1,'ใส่ปุ๋ยรอบ 1',  30,  30,'ใส่ปุ๋ยบำรุงต้นมะนาว',          'fertilize'),
(@tpl,2,'ตัดแต่งกิ่ง',   90,  90,'ตัดแต่งกิ่งมะนาว',              'prune'),
(@tpl,3,'ใส่ปุ๋ยรอบ 2', 180, 180,'ใส่ปุ๋ยบำรุงต้นมะนาวรอบ 2',     'fertilize'),
(@tpl,4,'ตัดแต่งกิ่ง 2',270, 270,'ตัดแต่งกิ่งมะนาวรอบ 2',         'prune');

-- ---- BATCHES ------------------------------------------------
INSERT INTO Batches (lot_number,zone_id,template_id,start_date,expected_harvest_date,status,quantity_planted)
SELECT 'LOT-2025-001',
  (SELECT zone_id FROM Zones WHERE zone_code='T-01'),
  (SELECT template_id FROM CropTemplates WHERE template_name='กรีนโอ๊ค (Hydroponics)'),
  DATE_SUB(CURDATE(),INTERVAL 20 DAY),
  DATE_ADD(CURDATE(),INTERVAL 25 DAY),
  'active', 200;

INSERT INTO Batches (lot_number,zone_id,template_id,start_date,expected_harvest_date,status,quantity_planted)
SELECT 'LOT-2025-002',
  (SELECT zone_id FROM Zones WHERE zone_code='T-02'),
  (SELECT template_id FROM CropTemplates WHERE template_name='เรดโอ๊ค (Hydroponics)'),
  DATE_SUB(CURDATE(),INTERVAL 15 DAY),
  DATE_ADD(CURDATE(),INTERVAL 30 DAY),
  'active', 200;

INSERT INTO Batches (lot_number,zone_id,template_id,start_date,expected_harvest_date,status,quantity_planted)
SELECT 'LOT-2025-003',
  (SELECT zone_id FROM Zones WHERE zone_code='T-03'),
  (SELECT template_id FROM CropTemplates WHERE template_name='บัตเตอร์เฮด (Hydroponics)'),
  DATE_SUB(CURDATE(),INTERVAL 44 DAY),
  DATE_ADD(CURDATE(),INTERVAL 6 DAY),
  'active', 180;

INSERT INTO Batches (lot_number,zone_id,template_id,start_date,expected_harvest_date,status,quantity_planted)
SELECT 'LOT-2025-004',
  (SELECT zone_id FROM Zones WHERE zone_code='B-01'),
  (SELECT template_id FROM CropTemplates WHERE template_name='ผักชี (Soil Bed)'),
  DATE_SUB(CURDATE(),INTERVAL 10 DAY),
  DATE_ADD(CURDATE(),INTERVAL 25 DAY),
  'active', 500;

-- Auto-generate tasks
CALL sp_GenerateBatchTasks(1);
CALL sp_GenerateBatchTasks(2);
CALL sp_GenerateBatchTasks(3);
CALL sp_GenerateBatchTasks(4);

-- ---- IRRIGATION DEVICES -------------------------------------
INSERT INTO IrrigationDevices (zone_id,device_name,device_type,device_code,current_state,is_online)
  SELECT zone_id,'ปั๊มน้ำ T-01',    'water_pump', 'DEV-T01-PUMP','off',1 FROM Zones WHERE zone_code='T-01';
INSERT INTO IrrigationDevices (zone_id,device_name,device_type,device_code,current_state,is_online)
  SELECT zone_id,'ปั๊มน้ำ T-02',    'water_pump', 'DEV-T02-PUMP','off',1 FROM Zones WHERE zone_code='T-02';
INSERT INTO IrrigationDevices (zone_id,device_name,device_type,device_code,current_state,is_online)
  SELECT zone_id,'ไฟ LED T-01',     'led_light',  'DEV-T01-LED', 'on', 1 FROM Zones WHERE zone_code='T-01';
INSERT INTO IrrigationDevices (zone_id,device_name,device_type,device_code,current_state,is_online)
  SELECT zone_id,'พ่นหมอก B-01',   'mist_nozzle','DEV-B01-MIST','off',1 FROM Zones WHERE zone_code='B-01';
INSERT INTO IrrigationDevices (zone_id,device_name,device_type,device_code,current_state,is_online)
  SELECT zone_id,'วาล์วน้ำ B-02',  'valve',      'DEV-B02-VALVE','off',1 FROM Zones WHERE zone_code='B-02';
INSERT INTO IrrigationDevices (zone_id,device_name,device_type,device_code,current_state,is_online)
  SELECT zone_id,'น้ำหยด P-01',    'valve',      'DEV-P01-DRIP','off', 1 FROM Zones WHERE zone_code='P-01';

-- ---- SCHEDULES ----------------------------------------------
INSERT INTO IrrigationSchedules (device_id,schedule_name,trigger_time,days_of_week,duration_minutes)
  SELECT device_id,'รดน้ำเช้า','08:00:00','1111111',15 FROM IrrigationDevices WHERE device_code='DEV-T01-PUMP';
INSERT INTO IrrigationSchedules (device_id,schedule_name,trigger_time,days_of_week,duration_minutes)
  SELECT device_id,'รดน้ำเย็น','16:00:00','1111111',15 FROM IrrigationDevices WHERE device_code='DEV-T01-PUMP';
INSERT INTO IrrigationSchedules (device_id,schedule_name,trigger_time,days_of_week,duration_minutes)
  SELECT device_id,'รดน้ำเช้า','08:00:00','1111111',15 FROM IrrigationDevices WHERE device_code='DEV-T02-PUMP';
INSERT INTO IrrigationSchedules (device_id,schedule_name,trigger_time,days_of_week,duration_minutes)
  SELECT device_id,'ไฟ LED เช้า','06:00:00','1111111',720 FROM IrrigationDevices WHERE device_code='DEV-T01-LED';
INSERT INTO IrrigationSchedules (device_id,schedule_name,trigger_time,days_of_week,duration_minutes)
  SELECT device_id,'รดน้ำแปลง B-01','07:00:00','1111111',10 FROM IrrigationDevices WHERE device_code='DEV-B01-MIST';

-- ---- AUTOMATION RULES ---------------------------------------
INSERT INTO AutomationRules (zone_id,device_id,rule_name,sensor_parameter,condition_operator,threshold_value,action,duration_minutes,cooldown_minutes)
SELECT z.zone_id, d.device_id,
  'รดน้ำอัตโนมัติเมื่อดินแห้ง B-01',
  'soil_moisture','<',40.0,'turn_on',5,30
FROM Zones z, IrrigationDevices d
WHERE z.zone_code='B-01' AND d.device_code='DEV-B01-MIST';

INSERT INTO AutomationRules (zone_id,device_id,rule_name,sensor_parameter,condition_operator,threshold_value,action,duration_minutes,cooldown_minutes)
SELECT z.zone_id, d.device_id,
  'เปิดพัดลมเมื่ออุณหภูมิสูง',
  'temperature','>',35.0,'turn_on',10,60
FROM Zones z, IrrigationDevices d
WHERE z.zone_code='T-01' AND d.device_code='DEV-T01-PUMP';

-- ---- SENSOR READINGS (ตัวอย่าง 24 ชม.) ---------------------
DROP PROCEDURE IF EXISTS InsertSampleSensors;
DELIMITER $$
CREATE PROCEDURE InsertSampleSensors()
BEGIN
  DECLARE i INT DEFAULT 0;
  DECLARE z1 INT;
  DECLARE z2 INT;
  SELECT zone_id INTO z1 FROM Zones WHERE zone_code='T-01';
  SELECT zone_id INTO z2 FROM Zones WHERE zone_code='B-01';
  WHILE i < 24 DO
    INSERT INTO SensorReadings (zone_id,parameter_type,value,unit,recorded_at) VALUES
    (z1,'temperature',  ROUND(28 + RAND()*4,  1), '°C',   DATE_SUB(NOW(),INTERVAL i HOUR)),
    (z1,'humidity',     ROUND(65 + RAND()*15, 1), '%',    DATE_SUB(NOW(),INTERVAL i HOUR)),
    (z1,'ec_level',     ROUND(1.7 + RAND()*0.4,2),'mS/cm',DATE_SUB(NOW(),INTERVAL i HOUR)),
    (z1,'ph_level',     ROUND(6.0 + RAND()*0.5,2),'pH',   DATE_SUB(NOW(),INTERVAL i HOUR)),
    (z2,'soil_moisture',ROUND(50 + RAND()*25, 1), '%',    DATE_SUB(NOW(),INTERVAL i HOUR)),
    (z2,'temperature',  ROUND(29 + RAND()*5,  1), '°C',   DATE_SUB(NOW(),INTERVAL i HOUR));
    SET i = i + 1;
  END WHILE;
END$$
DELIMITER ;

CALL InsertSampleSensors();
DROP PROCEDURE InsertSampleSensors;
