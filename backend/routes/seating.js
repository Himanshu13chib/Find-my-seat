const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// Lookup seating by roll number
router.get('/lookup', (req, res) => {
  const { roll, exam_id } = req.query;

  if (!roll || roll.trim() === '') {
    return res.status(400).json({ error: 'Roll number is required.' });
  }

  const db = getDb();
  const rollUpper = roll.trim().toUpperCase();

  let query, params;

  if (exam_id) {
    query = `
      SELECT s.*, e.exam_name, e.exam_date
      FROM seating s
      JOIN exams e ON s.exam_id = e.id
      WHERE s.roll_number = ? AND s.exam_id = ?
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
      roll: rollUpper
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
