-- schema_assumed.sql
-- นี่คือโครงสร้างตารางที่ queries.js "สมมติ" ไว้ตอนนี้
-- ไม่ใช่ของจริง! ใช้รันเพื่อทดสอบระบบเฉย ๆ ถ้ายังไม่มี DB จริงให้ทดลองต่อ
-- เมื่อได้ schema จริงจากทีม DB โรงพยาบาลแล้ว ให้ไปแก้ queries.js ให้ตรงกับของจริงแทน

CREATE TABLE IF NOT EXISTS med_err (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  date_occ      DATE,
  month         VARCHAR(10),
  year          INT,
  department    VARCHAR(255),
  level         VARCHAR(5),
  sub_topic1    VARCHAR(255),
  sub_topic2    VARCHAR(255),
  hn            VARCHAR(50),
  detail        TEXT,
  had_lasa      VARCHAR(255),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS med_err_medicine (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  med_err_id       INT NOT NULL,
  medication_name  VARCHAR(255),
  seq              INT DEFAULT 1,
  FOREIGN KEY (med_err_id) REFERENCES med_err(id) ON DELETE CASCADE
);

-- ตัวอย่างข้อมูลทดสอบ
INSERT INTO med_err (date_occ, month, year, department, level, sub_topic1, sub_topic2, hn, detail, had_lasa)
VALUES ('2025-12-25', 'Dec', 2025, 'Outreach Clinic', 'B', 'Dispensing error OPD', 'Wrong quantity', '67-25-031589', 'ตัวอย่างรายละเอียดเหตุการณ์', '-');

INSERT INTO med_err_medicine (med_err_id, medication_name, seq) VALUES (LAST_INSERT_ID(), 'Bioflor', 1);
