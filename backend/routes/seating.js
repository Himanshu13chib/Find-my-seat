const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getDb } = require('../database');
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many seat lookups. Try again in 15 minutes.' }
});
const publicLookupEnabled = process.env.PUBLIC_SEAT_LOOKUP_ENABLED === 'true';

// Lookup seating by roll number
router.get('/lookup', lookupLimiter, (req, res) => {
  if (!publicLookupEnabled) {
    return res.status(503).json({ error: 'Student seat lookup has not been enabled by the institution.' });
  }

  const { roll, exam_id } = req.query;

  if (typeof roll !== 'string' || roll.trim() === '' || roll.length > 64) {
    return res.status(400).json({ error: 'Roll number is required.' });
  }
  if (exam_id !== undefined && (typeof exam_id !== 'string' || !/^\d{1,10}$/.test(exam_id))) {
    return res.status(400).json({ error: 'Invalid examination selection.' });
  }

  const db = getDb();
  const rollUpper = roll.trim().toUpperCase();

  let query, params;

  if (exam_id) {
    query = `
      SELECT s.*, e.exam_name, e.exam_date
      FROM seating s
      JOIN exams e ON s.exam_id = e.id
      WHERE s.roll_number = ? AND s.exam_id = ? AND e.is_active = 1
    `;
    params = [rollUpper, exam_id];
  } else {
    // Get result from the most recently active exam
    query = `
      SELECT s.*, e.exam_name, e.exam_date
      FROM seating s
      JOIN exams e ON s.exam_id = e.id
      WHERE s.roll_number = ? AND e.is_active = 1
      ORDER BY e.uploaded_at DESC
      LIMIT 1
    `;
    params = [rollUpper];
  }

  const result = db.prepare(query).get(...params);

  if (!result) {
    return res.status(404).json({
      error: 'No seating arrangement found for this roll number.',
    });
  }

  res.json({
    success: true,
    data: {
      roll_number: result.roll_number,
      student_name: result.student_name || 'N/A',
      branch: result.branch || 'N/A',
      semester: result.semester || 'N/A',
      exam_name: result.exam_name,
      exam_date: result.exam_date || 'N/A',
      room_no: result.room_no,
      floor_no: result.floor_no || 'N/A',
      row_no: result.row_no || 'N/A',
      desk_no: result.desk_no || 'N/A',
      block: result.block || 'N/A'
    }
  });
});

// Get all active exams (for dropdown)
router.get('/exams', (req, res) => {
  const db = getDb();
  const exams = db.prepare(`
    SELECT id, exam_name, exam_date, uploaded_at
    FROM exams
    WHERE is_active = 1
    ORDER BY uploaded_at DESC
  `).all();

  res.json({ success: true, exams });
});

module.exports = router;
