# 🌱 Smart Farm — ระบบจัดการฟาร์มอัจฉริยะ

## Tech Stack
| Layer    | Technology |
|----------|------------|
| Frontend | React 18, React Router v6, Tailwind CSS, Recharts, Lucide React |
| Backend  | Node.js, Express.js, node-cron |
| Database | SQL Server (mssql) |

---

## โครงสร้างโปรเจกต์

```
Smart_fram/
├── database/
│   ├── schema.sql        ← สร้างตาราง + Stored Procedure
│   └── seed.sql          ← ข้อมูลตัวอย่าง
├── backend/
│   ├── .env.example
│   ├── server.js
│   ├── config/
│   │   └── database.js
│   └── routes/
│       ├── dashboard.js
│       ├── zones.js
│       ├── crops.js
│       ├── batches.js
│       ├── tasks.js
│       ├── irrigation.js
│       └── sensors.js
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── context/FarmContext.jsx
    │   ├── services/api.js
    │   ├── components/
    │   │   ├── Layout/Sidebar.jsx
    │   │   ├── Layout/Header.jsx
    │   │   └── Notification.jsx
    │   └── pages/
    │       ├── Dashboard.jsx
    │       ├── ZoneManagement.jsx
    │       ├── CropPlanner.jsx
    │       └── IrrigationControl.jsx
    └── ...
```

---

## วิธีติดตั้งและรัน

### 1. ตั้งค่า Database

เปิด SQL Server Management Studio (SSMS) แล้วรันตามลำดับ:

```sql
-- 1. สร้าง Database ก่อน
CREATE DATABASE SmartFarm;
GO
USE SmartFarm;
GO

-- 2. รัน schema
-- (เปิดไฟล์ database/schema.sql แล้วกด Execute)

-- 3. รัน seed data
-- (เปิดไฟล์ database/seed.sql แล้วกด Execute)
```

### 2. ตั้งค่า Backend

```bash
cd backend

# คัดลอกไฟล์ .env
copy .env.example .env

# แก้ไข .env ให้ตรงกับ SQL Server ของคุณ
# DB_SERVER=localhost
# DB_DATABASE=SmartFarm
# DB_USER=sa
# DB_PASSWORD=รหัสผ่านของคุณ

# ติดตั้ง dependencies
npm install

# รัน (development)
npm run dev

# รัน (production)
npm start
```

Backend จะรันที่ `http://localhost:5000`

### 3. ตั้งค่า Frontend

```bash
cd frontend

# ติดตั้ง dependencies
npm install

# รัน
npm start
```

Frontend จะรันที่ `http://localhost:3000`

---

## API Endpoints

### Dashboard
| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/dashboard/summary` | ข้อมูลสรุปทั้งหมด |

### Zones
| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/zones` | ดึงทุกโซน |
| POST | `/api/zones` | เพิ่มโซนใหม่ |
| PUT | `/api/zones/:id` | แก้ไขโซน |
| DELETE | `/api/zones/:id` | ลบโซน |

### Crops (Templates)
| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/crops` | ดึงทุก Template |
| POST | `/api/crops` | เพิ่ม Template ใหม่ |
| PUT | `/api/crops/:id` | แก้ไข Template |
| DELETE | `/api/crops/:id` | ลบ Template |

### Batches
| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/batches` | ดึงทุก Batch |
| POST | `/api/batches` | เริ่มรอบการปลูกใหม่ (auto-gen tasks) |
| PUT | `/api/batches/:id/harvest` | บันทึกการเก็บเกี่ยว |
| DELETE | `/api/batches/:id` | ยกเลิก Batch |

### Tasks
| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/tasks/today` | ภารกิจวันนี้ |
| GET | `/api/tasks/upcoming?days=7` | ภารกิจ 7 วันข้างหน้า |
| POST | `/api/tasks` | เพิ่มภารกิจ manual |
| PATCH | `/api/tasks/:id/status` | อัปเดตสถานะ |

### Irrigation
| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/irrigation/devices` | รายการอุปกรณ์ |
| PATCH | `/api/irrigation/devices/:id/toggle` | สลับ ON/OFF |
| GET | `/api/irrigation/schedules` | รายการตาราง |
| POST | `/api/irrigation/schedules` | เพิ่มตาราง |
| GET | `/api/irrigation/rules` | กฎอัตโนมัติ |
| POST | `/api/irrigation/rules` | เพิ่มกฎ |

### Sensors
| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/sensors/latest` | ค่าล่าสุดทุกโซน |
| GET | `/api/sensors/:zoneId/history` | ประวัติค่าเซนเซอร์ |
| POST | `/api/sensors` | รับค่าจาก IoT device |

---

## ฟีเจอร์หลัก

### หน้าหลัก (Dashboard)
- Daily Missions — ภารกิจวันนี้พร้อม Progress bar
- Farm Overview Stats — จำนวนโซน, อุปกรณ์, ภารกิจ
- Upcoming Harvest — รายการพืชที่ใกล้ถึงเวลาเก็บ
- กราฟอุณหภูมิ + ความชื้น 12 ชั่วโมง
- Sensor widget รวมทุกโซน

### จัดการพื้นที่ (Zone Management)
- Visual Map — แผนผังฟาร์มแบบกริด
- สถานะแต่ละโซน color-coded
- แยก 3 ประเภท: ไฮโดรโปนิกส์ / แปลงดิน / ยืนต้น
- ค่า EC, pH, รอบน้ำ, ความชื้นดิน

### แผนการปลูก (Crop Planner)
- Crop Templates พร้อมขั้นตอน (stages)
- Batch Tracking ติดตาม Lot
- Progress bar วันที่ผ่านไป vs เก็บเกี่ยว
- Auto-generate ภารกิจเมื่อเริ่มรอบใหม่

### ระบบน้ำ & IoT (Irrigation Control)
- Manual toggle ON/OFF อุปกรณ์
- Schedule — ตั้งเวลาให้น้ำรายวัน
- Automation Rules — ตั้งกฎตามค่าเซนเซอร์
- ปิดอุปกรณ์ทั้งหมดด้วยปุ่มเดียว

---

## การต่อกับ IoT จริง

ส่ง sensor reading มาที่ API:
```http
POST /api/sensors
Content-Type: application/json

{
  "zone_id": 1,
  "parameter_type": "soil_moisture",
  "value": 35.5,
  "unit": "%"
}
```

ระบบจะตรวจ Automation Rules และสั่งงานอุปกรณ์อัตโนมัติ
คำสั่งรัน 
1. net start MySQL80          ← เปิด MySQL (ถ้ายังไม่ได้เปิด)
2. CMD หน้า 1  →  cd backend  →  npm run dev
3. CMD หน้า 2  →  cd frontend →  npm start
4. เปิดเบราว์เซอร์  →  http://localhost:3000
