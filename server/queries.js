// queries.js
//
// ==========================================================================
// ⚠️ จุดที่ต้องแก้เมื่อได้ schema จริงจากทีม DB ⚠️
// ==========================================================================
// ตอนนี้ยังไม่เห็นโครงสร้างตารางจริงของ med_err / med_err_medicine /
// med_err_process ผมจึง "สมมติ" ชื่อคอลัมน์ไว้ตามที่มักพบทั่วไป
// (ดูรายการสมมติฐานด้านล่าง) ให้แก้เฉพาะไฟล์นี้ไฟล์เดียว
// ส่วน routes/ และ frontend ไม่ต้องแตะ เพราะรับข้อมูลผ่าน field name
// มาตรฐาน (Date_Occ, month, year, Level, ...) ที่ mapRowToFrontend()
// เป็นคนแปลงให้เสมอ
//
// สมมติฐานตอนนี้:
//   med_err
//     id, date_occ, month, year, department, level,
//     sub_topic1, sub_topic2, hn, detail, had_lasa, created_at
//   med_err_medicine   (1 แถวต่อ 1 รายการยาที่เกี่ยวข้อง)
//     id, med_err_id (FK -> med_err.id), medication_name, seq
//   med_err_process    (ยังไม่ได้ใช้ในแดชบอร์ดนี้ - เผื่อว้ตามที่ต้องใช้ภายหลัง)
//
// เมื่อได้ schema จริงแล้ว ให้แก้:
//   1. ชื่อ COLUMN ใน SELECT ของแต่ละ query ด้านล่าง
//   2. ถ้าโครงสร้างจริงต่างจากนี้มาก (เช่น ไม่มี med_err_medicine
//      แยกตาราง แต่ฝัง medication1..medication6 ไว้ใน med_err เลย)
//      ให้แก้เฉพาะ getIncidents() ตัวเดียว โดยไม่ต้องเปลี่ยน mapRowToFrontend()
// ==========================================================================

const pool = require('./db');

const TBL_MAIN = process.env.TABLE_MED_ERR || 'med_err';
const TBL_MED = process.env.TABLE_MED_ERR_MEDICINE || 'med_err_medicine';

/**
 * ดึง incident ทั้งหมด พร้อม join รายการยาที่เกี่ยวข้องมารวมกัน
 * คืนค่าเป็น array of object ที่มี field ตรงกับที่ frontend เดิมใช้
 * (Date_Occ, month, year, หน่วยงานที่ต้องแก้ไข-1, Level, Sub Topic 1, ...)
 */
async function getIncidents({ year, month } = {}) {
  // ---- 1) ดึงข้อมูลหลักจาก med_err ----
  let sql = `
    SELECT
      id,
      date_occ,
      month,
      year,
      department,
      level,
      sub_topic1,
      sub_topic2,
      hn,
      detail,
      had_lasa
    FROM ${TBL_MAIN}
    WHERE 1 = 1
  `;
  const params = [];
  if (year) {
    sql += ' AND year = ?';
    params.push(year);
  }
  if (month) {
    sql += ' AND month = ?';
    params.push(month);
  }
  sql += ' ORDER BY date_occ DESC';

  const [rows] = await pool.query(sql, params);
  if (rows.length === 0) return [];

  // ---- 2) ดึงรายการยาทั้งหมดของ incident เหล่านี้ในทีเดียว (กัน N+1 query) ----
  const ids = rows.map((r) => r.id);
  const [medRows] = await pool.query(
    `SELECT med_err_id, medication_name, seq
     FROM ${TBL_MED}
     WHERE med_err_id IN (?)
     ORDER BY med_err_id, seq`,
    [ids]
  );

  const medsByIncident = {};
  medRows.forEach((m) => {
    if (!medsByIncident[m.med_err_id]) medsByIncident[m.med_err_id] = [];
    medsByIncident[m.med_err_id].push(m.medication_name);
  });

  // ---- 3) map เป็น field name เดิมที่ frontend คุ้นเคย ----
  return rows.map((row) => mapRowToFrontend(row, medsByIncident[row.id] || []));
}

async function getIncidentById(id) {
  const [rows] = await pool.query(`SELECT * FROM ${TBL_MAIN} WHERE id = ?`, [id]);
  if (rows.length === 0) return null;
  const [medRows] = await pool.query(
    `SELECT medication_name FROM ${TBL_MED} WHERE med_err_id = ? ORDER BY seq`,
    [id]
  );
  return mapRowToFrontend(rows[0], medRows.map((m) => m.medication_name));
}

async function createIncident(data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO ${TBL_MAIN}
        (date_occ, month, year, department, level, sub_topic1, sub_topic2, hn, detail, had_lasa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.Date_Occ || null,
        data.month || data.Month || null,
        data.year || data.Year || null,
        data['หน่วยงานที่ต้องแก้ไข-1'] || null,
        data.Level || null,
        data['Sub Topic 1'] || null,
        data['Sub Topic 2'] || null,
        data.HN || null,
        data['รายละเอียด'] || null,
        data['HAD / LASA'] || null,
      ]
    );
    const newId = result.insertId;

    const meds = extractMedications(data);
    for (let i = 0; i < meds.length; i++) {
      await conn.query(
        `INSERT INTO ${TBL_MED} (med_err_id, medication_name, seq) VALUES (?, ?, ?)`,
        [newId, meds[i], i + 1]
      );
    }

    await conn.commit();
    return getIncidentById(newId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateIncident(id, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE ${TBL_MAIN} SET
        date_occ = ?, month = ?, year = ?, department = ?, level = ?,
        sub_topic1 = ?, sub_topic2 = ?, hn = ?, detail = ?, had_lasa = ?
       WHERE id = ?`,
      [
        data.Date_Occ || null,
        data.month || data.Month || null,
        data.year || data.Year || null,
        data['หน่วยงานที่ต้องแก้ไข-1'] || null,
        data.Level || null,
        data['Sub Topic 1'] || null,
        data['Sub Topic 2'] || null,
        data.HN || null,
        data['รายละเอียด'] || null,
        data['HAD / LASA'] || null,
        id,
      ]
    );

    // แทนที่รายการยาทั้งหมดของ incident นี้ใหม่ (ลบเก่า ใส่ใหม่ ง่ายกว่า diff)
    await conn.query(`DELETE FROM ${TBL_MED} WHERE med_err_id = ?`, [id]);
    const meds = extractMedications(data);
    for (let i = 0; i < meds.length; i++) {
      await conn.query(
        `INSERT INTO ${TBL_MED} (med_err_id, medication_name, seq) VALUES (?, ?, ?)`,
        [id, meds[i], i + 1]
      );
    }

    await conn.commit();
    return getIncidentById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteIncident(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM ${TBL_MED} WHERE med_err_id = ?`, [id]);
    await conn.query(`DELETE FROM ${TBL_MAIN} WHERE id = ?`, [id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// -------------------- helpers --------------------

function mapRowToFrontend(row, medications) {
  const out = {
    _id: row.id,
    Date_Occ: row.date_occ,
    month: row.month,
    year: row.year,
    'หน่วยงานที่ต้องแก้ไข-1': row.department,
    Level: row.level,
    'Sub Topic 1': row.sub_topic1,
    'Sub Topic 2': row.sub_topic2,
    HN: row.hn,
    รายละเอียด: row.detail,
    'HAD / LASA': row.had_lasa,
  };
  // เติม Medication 1..6 ให้ตรงกับที่ frontend เดิมใช้ (renderTable/renderDashboard)
  for (let i = 0; i < 6; i++) {
    out[`Medication ${i + 1}`] = medications[i] || '';
  }
  return out;
}

function extractMedications(data) {
  const meds = [];
  for (let i = 1; i <= 6; i++) {
    const val = data[`Medication ${i}`];
    if (val && String(val).trim() !== '' && String(val).trim() !== '-') {
      meds.push(String(val).trim());
    }
  }
  return meds;
}

module.exports = {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
};
