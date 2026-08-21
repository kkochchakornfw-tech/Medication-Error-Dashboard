// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const incidentsRouter = require('./routes/incidents');

const app = express();
app.use(cors());
app.use(express.json());

// เสิร์ฟหน้าเว็บ frontend (public/index.html) ตรง ๆ จาก server เดียวกัน
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/incidents', incidentsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Medication Error Dashboard API running on http://localhost:${PORT}`);
});
