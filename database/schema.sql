-- ============================================================
--  Smart Farm — MySQL 8.0 Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS smartfarm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartfarm;

-- Drop ตามลำดับ (ลบ child ก่อน parent)
DROP TABLE IF EXISTS SensorReadings;
DROP TABLE IF EXISTS AutomationRules;
DROP TABLE IF EXISTS IrrigationSchedules;
DROP TABLE IF EXISTS IrrigationDevices;
DROP TABLE IF EXISTS Tasks;
DROP TABLE IF EXISTS Batches;
DROP TABLE IF EXISTS CropStages;
DROP TABLE IF EXISTS CropTemplates;
DROP TABLE IF EXISTS ZoneDetails;
DROP TABLE IF EXISTS Zones;

-- ============================================================
--  ZONES
-- ============================================================
CREATE TABLE Zones (
  zone_id   INT           PRIMARY KEY AUTO_INCREMENT,
  zone_code VARCHAR(20)   NOT NULL UNIQUE,
  zone_name VARCHAR(100)  NOT NULL,
  zone_type VARCHAR(30)   NOT NULL
            CHECK (zone_type IN ('hydroponics','soil_bed','perennial_tree')),
  status    VARCHAR(30)   NOT NULL DEFAULT 'vacant'
            CHECK (status IN ('vacant','preparing','growing','ready_harvest','maintenance')),
  area_sqm  DECIMAL(10,2),
  map_x     INT           DEFAULT 0,
  map_y     INT           DEFAULT 0,
  map_w     INT           DEFAULT 2,
  map_h     INT           DEFAULT 2,
  notes     VARCHAR(500),
  created_at DATETIME     DEFAULT NOW(),
  updated_at DATETIME     DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  ZONE DETAILS
-- ============================================================
CREATE TABLE ZoneDetails (
  detail_id               INT          PRIMARY KEY AUTO_INCREMENT,
  zone_id                 INT          NOT NULL,
  ec_level                DECIMAL(5,2),
  ph_level                DECIMAL(4,2),
  water_cycle_minutes     INT,
  soil_moisture_pct       DECIMAL(5,2),
  last_tilled_date        DATE,
  last_fertilized_date    DATE,
  last_pruned_date        DATE,
  fertilize_interval_days INT          DEFAULT 30,
  prune_interval_days     INT          DEFAULT 90,
  updated_at              DATETIME     DEFAULT NOW(),
  FOREIGN KEY (zone_id) REFERENCES Zones(zone_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  CROP TEMPLATES
-- ============================================================
CREATE TABLE CropTemplates (
  template_id   INT          PRIMARY KEY AUTO_INCREMENT,
  template_name VARCHAR(100) NOT NULL,
  crop_category VARCHAR(50),
  total_days    INT          NOT NULL,
  zone_type     VARCHAR(30)  DEFAULT 'any'
                CHECK (zone_type IN ('hydroponics','soil_bed','perennial_tree','any')),
  description   VARCHAR(500),
  color_tag     VARCHAR(20)  DEFAULT '#52b788',
  is_active     TINYINT(1)   DEFAULT 1,
  created_at    DATETIME     DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  CROP STAGES
-- ============================================================
CREATE TABLE CropStages (
  stage_id         INT          PRIMARY KEY AUTO_INCREMENT,
  template_id      INT          NOT NULL,
  stage_order      INT          NOT NULL,
  stage_name       VARCHAR(100) NOT NULL,
  day_start        INT          NOT NULL,
  day_end          INT          NOT NULL,
  task_title       VARCHAR(200) NOT NULL,
  task_description VARCHAR(500),
  task_type        VARCHAR(30)  DEFAULT 'general'
                   CHECK (task_type IN ('sow','transplant','water','fertilize',
                                        'harvest','prune','check','general')),
  FOREIGN KEY (template_id) REFERENCES CropTemplates(template_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  BATCHES
-- ============================================================
CREATE TABLE Batches (
  batch_id              INT           PRIMARY KEY AUTO_INCREMENT,
  lot_number            VARCHAR(50)   NOT NULL UNIQUE,
  zone_id               INT,
  template_id           INT,
  start_date            DATE          NOT NULL,
  expected_harvest_date DATE,
  actual_harvest_date   DATE,
  status                VARCHAR(20)   DEFAULT 'active'
                        CHECK (status IN ('active','harvested','failed','cancelled')),
  quantity_planted      INT,
  quantity_harvested    DECIMAL(10,2),
  harvest_unit          VARCHAR(20)   DEFAULT 'kg',
  notes                 TEXT,
  created_at            DATETIME      DEFAULT NOW(),
  updated_at            DATETIME      DEFAULT NOW(),
  FOREIGN KEY (zone_id)     REFERENCES Zones(zone_id)         ON DELETE SET NULL,
  FOREIGN KEY (template_id) REFERENCES CropTemplates(template_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  TASKS
-- ============================================================
CREATE TABLE Tasks (
  task_id      INT          PRIMARY KEY AUTO_INCREMENT,
  batch_id     INT,
  zone_id      INT,
  title        VARCHAR(200) NOT NULL,
  description  VARCHAR(500),
  due_date     DATE         NOT NULL,
  status       VARCHAR(20)  DEFAULT 'pending'
               CHECK (status IN ('pending','in_progress','completed','skipped')),
  priority     VARCHAR(10)  DEFAULT 'normal'
               CHECK (priority IN ('low','normal','high','urgent')),
  task_type    VARCHAR(30)  DEFAULT 'general',
  completed_at DATETIME,
  created_at   DATETIME     DEFAULT NOW(),
  FOREIGN KEY (batch_id) REFERENCES Batches(batch_id) ON DELETE SET NULL,
  FOREIGN KEY (zone_id)  REFERENCES Zones(zone_id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  IRRIGATION DEVICES
-- ============================================================
CREATE TABLE IrrigationDevices (
  device_id      INT          PRIMARY KEY AUTO_INCREMENT,
  zone_id        INT,
  device_name    VARCHAR(100) NOT NULL,
  device_type    VARCHAR(30)
                 CHECK (device_type IN ('water_pump','mist_nozzle','led_light','fan','valve')),
  device_code    VARCHAR(50)  UNIQUE,
  current_state  VARCHAR(10)  DEFAULT 'off'
                 CHECK (current_state IN ('on','off')),
  is_online      TINYINT(1)   DEFAULT 1,
  last_triggered DATETIME,
  created_at     DATETIME     DEFAULT NOW(),
  FOREIGN KEY (zone_id) REFERENCES Zones(zone_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  IRRIGATION SCHEDULES
-- ============================================================
CREATE TABLE IrrigationSchedules (
  schedule_id      INT          PRIMARY KEY AUTO_INCREMENT,
  device_id        INT          NOT NULL,
  schedule_name    VARCHAR(100),
  trigger_time     TIME         NOT NULL,
  days_of_week     CHAR(7)      DEFAULT '1111111',
  duration_minutes INT          NOT NULL DEFAULT 10,
  is_enabled       TINYINT(1)   DEFAULT 1,
  created_at       DATETIME     DEFAULT NOW(),
  FOREIGN KEY (device_id) REFERENCES IrrigationDevices(device_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  AUTOMATION RULES
-- ============================================================
CREATE TABLE AutomationRules (
  rule_id            INT           PRIMARY KEY AUTO_INCREMENT,
  zone_id            INT,
  device_id          INT,
  rule_name          VARCHAR(100)  NOT NULL,
  sensor_parameter   VARCHAR(50)
                     CHECK (sensor_parameter IN ('temperature','humidity','soil_moisture',
                            'ec_level','ph_level','light_intensity')),
  condition_operator VARCHAR(5)    CHECK (condition_operator IN ('<','<=','>','>=')),
  threshold_value    DECIMAL(10,2) NOT NULL,
  action             VARCHAR(10)   CHECK (action IN ('turn_on','turn_off')),
  duration_minutes   INT           DEFAULT 5,
  cooldown_minutes   INT           DEFAULT 30,
  is_enabled         TINYINT(1)    DEFAULT 1,
  last_triggered     DATETIME,
  created_at         DATETIME      DEFAULT NOW(),
  FOREIGN KEY (zone_id)   REFERENCES Zones(zone_id)             ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES IrrigationDevices(device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  SENSOR READINGS
-- ============================================================
CREATE TABLE SensorReadings (
  reading_id     INT           PRIMARY KEY AUTO_INCREMENT,
  zone_id        INT,
  parameter_type VARCHAR(50)   NOT NULL,
  value          DECIMAL(10,2) NOT NULL,
  unit           VARCHAR(20),
  recorded_at    DATETIME      DEFAULT NOW(),
  FOREIGN KEY (zone_id) REFERENCES Zones(zone_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  INDEXES
-- ============================================================
CREATE INDEX IX_Tasks_DueDate    ON Tasks(due_date);
CREATE INDEX IX_Tasks_Status     ON Tasks(status);
CREATE INDEX IX_Tasks_ZoneId     ON Tasks(zone_id);
CREATE INDEX IX_Batches_ZoneId   ON Batches(zone_id);
CREATE INDEX IX_Batches_Status   ON Batches(status);
CREATE INDEX IX_Sensor_Zone_Time ON SensorReadings(zone_id, recorded_at DESC);
CREATE INDEX IX_Sched_DeviceId   ON IrrigationSchedules(device_id);

-- ============================================================
--  STORED PROCEDURE — auto-generate tasks from crop template
-- ============================================================
DROP PROCEDURE IF EXISTS sp_GenerateBatchTasks;

DELIMITER $$
CREATE PROCEDURE sp_GenerateBatchTasks(IN p_batch_id INT)
BEGIN
  DECLARE v_start_date  DATE;
  DECLARE v_zone_id     INT;
  DECLARE v_template_id INT;

  SELECT start_date, zone_id, template_id
  INTO   v_start_date, v_zone_id, v_template_id
  FROM   Batches WHERE batch_id = p_batch_id;

  -- Remove old auto-generated tasks
  DELETE FROM Tasks WHERE batch_id = p_batch_id;

  -- Insert one task per stage
  INSERT INTO Tasks (batch_id, zone_id, title, description, due_date, task_type, priority)
  SELECT
    p_batch_id,
    v_zone_id,
    cs.task_title,
    cs.task_description,
    DATE_ADD(v_start_date, INTERVAL (cs.day_start - 1) DAY),
    cs.task_type,
    CASE cs.task_type
      WHEN 'harvest'    THEN 'high'
      WHEN 'transplant' THEN 'high'
      ELSE 'normal'
    END
  FROM  CropStages cs
  WHERE cs.template_id = v_template_id
  ORDER BY cs.stage_order;
END$$
DELIMITER ;
