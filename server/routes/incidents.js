// routes/incidents.js
const express = require('express');
const router = express.Router();
const queries = require('../queries');

// GET /api/incidents?year=2026&month=Jan
// ดึงข้อมูลทั้งหมด (filter ปี/เดือนแบบหยาบ ๆ ทำใน SQL ได้ ส่วน filter ละเอียด
// เรื่องแผนก/level/topic ฯลฯ ให้ frontend กรองต่อฝั่ง client เหมือนเดิม
// เพื่อให้ dropdown filter แบบ multi-select เดิมทำงานได้โดยไม่ต้องแก้ frontend เยอะ)
router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    const data = await queries.getIncidents({ year, month });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ดึงข้อมูลไม่สำเร็จ', detail: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await queries.getIncidentById(req.params.id);
    if (!item) return res.status(404).json({ error: 'ไม่พบข้อมูล' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ดึงข้อมูลไม่สำเร็จ', detail: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const created = await queries.createIncident(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'บันทึกข้อมูลไม่สำเร็จ', detail: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await queries.updateIncident(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'แก้ไขข้อมูลไม่สำเร็จ', detail: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await queries.deleteIncident(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ลบข้อมูลไม่สำเร็จ', detail: err.message });
  }
});

module.exports = router;
