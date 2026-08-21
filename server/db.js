// db.js
// สร้าง connection pool ไปยัง MySQL ของโรงพยาบาล
// ค่าการเชื่อมต่อทั้งหมดอ่านจากไฟล์ .env (ดูตัวอย่างใน .env.example)

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // ให้ MySQL ส่งวันที่กลับมาเป็น string ตรง ๆ ไม่ต้อง parse timezone เอง
});

module.exports = pool;
