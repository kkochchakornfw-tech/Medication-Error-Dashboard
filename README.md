# Medication Error Dashboard — เวอร์ชันเชื่อมต่อฐานข้อมูล (MySQL)

โครงสร้างนี้แปลงมาจาก `occ.html` เดิม (ที่ import จากไฟล์ Excel) ให้ backend
ดึงข้อมูลจาก MySQL ผ่าน REST API แทน โดย **ไม่ได้เปลี่ยน UI/กราฟ/ตาราง
แนวโน้ม/ตัวกรองใด ๆ** — เปลี่ยนแค่แหล่งที่มาของข้อมูล

```
med-error-dashboard/
├── server/                  # Backend (Node.js + Express + MySQL)
│   ├── index.js              # entrypoint
│   ├── db.js                 # connection pool
│   ├── queries.js            # ★ จุดที่ต้องแก้ให้ตรง schema จริง ★
│   ├── routes/incidents.js   # REST endpoints
│   ├── schema_assumed.sql    # โครงสร้างตารางที่ "สมมติ" ไว้ทดสอบ
│   ├── .env.example
│   └── package.json
└── public/
    └── index.html            # หน้าเว็บ (ของเดิม แก้แค่ส่วนดึง/บันทึกข้อมูล)
```

## ทำไมต้องแก้แค่ไฟล์เดียว (queries.js)

ตอนนี้ยังไม่รู้โครงสร้างจริงของ `med_err`, `med_err_medicine`,
`med_err_process` และตารางอื่น ๆ ที่โรงพยาบาลมี ผมเลย **สมมติชื่อคอลัมน์
ไว้ก่อน** (ดูคอมเมนต์หัวไฟล์ `server/queries.js`) แล้วให้ทุกอย่างในระบบ —
ทั้ง routes และหน้าเว็บ — คุยกันด้วยชื่อ field มาตรฐานเดิม
(`Date_Occ`, `Level`, `Sub Topic 1`, `HAD / LASA`, `Medication 1..6` ฯลฯ)
ผ่านฟังก์ชัน `mapRowToFrontend()` เสมอ

**พอได้ schema จริงแล้ว สิ่งที่ต้องทำมีแค่:**
1. เปิด `server/queries.js`
2. แก้ชื่อคอลัมน์ใน `SELECT` / `INSERT` / `UPDATE` ของแต่ละฟังก์ชันให้ตรงกับ
   ตารางจริง (เช่นถ้า `med_err` จริงมีคอลัมน์ชื่อ `hospital_dept` แทน
   `department` ก็แก้แค่บรรทัดนั้น)
3. ถ้าโครงสร้างจริงต่างจากที่สมมติไว้มาก (เช่น medication ไม่ได้แยกตาราง
   แต่ฝังเป็น `med1..med6` อยู่ใน `med_err` เลย) ให้แก้เฉพาะฟังก์ชัน
   `getIncidents()` / `createIncident()` / `updateIncident()` โดยไม่ต้องยุ่ง
   กับ `mapRowToFrontend()` — หน้าเว็บจะไม่รู้สึกอะไรเลย เพราะรับ field
   name หน้าตาเดิมเป๊ะ ๆ

ไม่ต้องแตะ `routes/incidents.js` หรือ `public/index.html` เลย นอกจากจะ
เปลี่ยน business logic จริง ๆ

## วิธีรันทดสอบ (local)

```bash
cd server
cp .env.example .env
# แก้ .env ใส่ DB_HOST / DB_USER / DB_PASSWORD / DB_NAME ของจริง (หรือจะ
# ลองรันกับ MySQL ในเครื่องตัวเองก่อนก็ได้ โดย import schema_assumed.sql
# เข้าไปทดสอบ flow ทั้งระบบก่อน)

npm install
npm start
# เปิด http://localhost:4000
```

`public/index.html` จะถูก serve ออกจาก backend เดียวกันเลย (ผ่าน
`express.static`) ไม่ต้องตั้ง web server แยก

## REST API ที่มีให้

| Method | Path                     | ใช้ทำอะไร                          |
|--------|--------------------------|-------------------------------------|
| GET    | `/api/incidents`         | ดึงข้อมูลทั้งหมด (query `?year=&month=` ได้) |
| GET    | `/api/incidents/:id`     | ดึงรายการเดียว                      |
| POST   | `/api/incidents`         | เพิ่มข้อมูลใหม่                     |
| PUT    | `/api/incidents/:id`     | แก้ไขข้อมูล                         |
| DELETE | `/api/incidents/:id`     | ลบข้อมูล                            |

Filter อื่น ๆ (แผนก, level, sub topic, HAD) หน้าเว็บยังกรองฝั่ง client
เหมือนเดิม (เพราะข้อมูลทั้งหมดโหลดมาไว้ในเบราว์เซอร์ตอน refresh อยู่แล้ว
เท่าที่ปริมาณข้อมูลระดับพัน ๆ แถวต่อปียังไม่มีปัญหาเรื่อง performance)

## เรื่อง HAD / LASA Detection (ยังไม่ได้ทำ)

ตามที่คุยกันไว้ว่ายังไม่ต้องทำตอนนี้ — ผมเว้น field `HAD / LASA` ไว้ใน
schema และ mapping แล้ว พอมีรายชื่อ/เกณฑ์ยาที่ต้องตรวจจับ (HAD, LASA list)
แนะนำให้เพิ่ม logic ที่ฝั่ง backend ตอนบันทึกข้อมูล (ใน `createIncident`/
`updateIncident` ของ `queries.js`) เพื่อให้ตรวจจับสม่ำเสมอไม่ว่าข้อมูล
จะเข้ามาทางไหน (ฟอร์มในเว็บนี้ หรือ import จากระบบอื่น)

## สิ่งที่ยังต้องยืนยันจากทีม DB โรงพยาบาล

- [ ] ชื่อคอลัมน์จริงทั้งหมดใน `med_err`
- [ ] โครงสร้าง `med_err_medicine` (แยกตารางจริงไหม เก็บกี่รายการต่อ 1 incident)
- [ ] `med_err_process` เก็บอะไร เกี่ยวข้องกับแดชบอร์ดนี้หรือไม่
- [ ] มี field อื่นที่ควรโชว์เพิ่มจากที่มีใน dashboard เดิมไหม
