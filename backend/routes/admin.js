const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { verifyToken } = require('./auth');

// Get all exams
router.get('/exams', verifyToken, (req, res) => {
  const db = getDb();
  const exams = db.prepare(`
    SELECT e.*, COUNT(s.id) as student_count
    FROM exams e
    LEFT JOIN seating s ON e.id = s.exam_id
    GROUP BY e.id
    ORDER BY e.uploaded_at DESC
  `).all();

  res.json({ success: true, exams });
});

// Toggle exam active/inactive
router.patch('/exams/:id/toggle', verifyToken, (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const newStatus = exam.is_active === 1 ? 0 : 1;
  db.prepare('UPDATE exams SET is_active = ? WHERE id = ?').run(newStatus, id);

  res.json({
    success: true,
    message: `Exam "${exam.exam_name}" is now ${newStatus === 1 ? 'active' : 'inactive'}.`,
    is_active: newStatus
  });
});

// Delete an exam and all its seating data
router.delete('/exams/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  db.prepare('DELETE FROM seating WHERE exam_id = ?').run(id);
  db.prepare('DELETE FROM exams WHERE id = ?').run(id);

  res.json({ success: true, message: `Exam "${exam.exam_name}" and all seating data deleted.` });
});

// Get seating data for an exam (with pagination)
router.get('/exams/:id/seats', verifyToken, (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  const db = getDb();

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  let countQuery, dataQuery, params;

  if (search) {
    countQuery = 'SELECT COUNT(*) as cnt FROM seating WHERE exam_id = ? AND (roll_number LIKE ? OR student_name LIKE ?)';
    dataQuery = 'SELECT * FROM seating WHERE exam_id = ? AND (roll_number LIKE ? OR student_name LIKE ?) ORDER BY roll_number LIMIT ? OFFSET ?';
    const like = `%${search.toUpperCase()}%`;
    params = [id, like, like];
  } else {
    countQuery = 'SELECT COUNT(*) as cnt FROM seating WHERE exam_id = ?';
    dataQuery = 'SELECT * FROM seating WHERE exam_id = ? ORDER BY roll_number LIMIT ? OFFSET ?';
    params = [id];
  }

  const total = db.prepare(countQuery).get(...params).cnt;
  const seats = db.prepare(dataQuery).all(...params, limit, offset);

  res.json({
    success: true,
    exam,
    seats,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// Dashboard stats
router.get('/stats', verifyToken, (req, res) => {
  const db = getDb();

  const totalExams = db.prepare('SELECT COUNT(*) as cnt FROM exams').get().cnt;
  const activeExams = db.prepare('SELECT COUNT(*) as cnt FROM exams WHERE is_active = 1').get().cnt;
  const totalStudents = db.prepare('SELECT COUNT(*) as cnt FROM seating').get().cnt;
  const recentExams = db.prepare('SELECT * FROM exams ORDER BY uploaded_at DESC LIMIT 5').all();

  res.json({
    success: true,
    stats: { totalExams, activeExams, totalStudents },
    recentExams
  });
});

// Get room-wise summary for an exam
router.get('/exams/:id/rooms', verifyToken, (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const rooms = db.prepare(`
    SELECT room_no, floor_no, block,
           COUNT(*) as student_count,
           GROUP_CONCAT(DISTINCT branch) as branches,
           MIN(roll_number) as min_roll,
           MAX(roll_number) as max_roll
    FROM seating
    WHERE exam_id = ?
    GROUP BY room_no
    ORDER BY room_no ASC
  `).all(id);

  res.json({ success: true, exam, rooms });
});

// Get students for a specific room in an exam
router.get('/exams/:id/rooms/:room_no', verifyToken, (req, res) => {
  const { id, room_no } = req.params;
  const db = getDb();

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const seats = db.prepare(`
    SELECT * FROM seating
    WHERE exam_id = ? AND room_no = ?
    ORDER BY row_no ASC, desk_no ASC, roll_number ASC
  `).all(id, room_no);

  res.json({ success: true, exam, room_no, seats });
});

// Export all seats for an exam as CSV
router.get('/exams/:id/export', verifyToken, (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const seats = db.prepare(`
    SELECT roll_number, student_name, branch, semester, room_no, floor_no, row_no, desk_no, block
    FROM seating
    WHERE exam_id = ?
    ORDER BY room_no ASC, row_no ASC, desk_no ASC
  `).all(id);

  const headers = ['Roll No', 'Student Name', 'Branch', 'Semester', 'Room No', 'Floor', 'Row', 'Desk', 'Block'];
  const rows = seats.map(s => [
    `"${s.roll_number || ''}"`,
    `"${(s.student_name || '').replace(/"/g, '""')}"`,
    `"${s.branch || ''}"`,
    `"${s.semester || ''}"`,
    `"${s.room_no || ''}"`,
    `"${s.floor_no || ''}"`,
    `"${s.row_no || ''}"`,
    `"${s.desk_no || ''}"`,
    `"${s.block || ''}"`
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\r\n');
  const filename = `seating_${exam.exam_name.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// Add a single seat manually
router.post('/exams/:id/seats', verifyToken, (req, res) => {
  const { id } = req.params;
  const { roll_number, student_name, branch, semester, room_no, floor_no, row_no, desk_no, block } = req.body;

  if (!roll_number || !room_no) {
    return res.status(400).json({ error: 'Roll number and Room number are required.' });
  }

  const db = getDb();
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const result = db.prepare(`
    INSERT INTO seating (exam_id, roll_number, student_name, branch, semester, room_no, floor_no, row_no, desk_no, block)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    roll_number.trim().toUpperCase(),
    student_name ? student_name.trim() : '',
    branch ? branch.trim() : '',
    semester ? semester.trim() : '',
    room_no.trim(),
    floor_no ? floor_no.trim() : '',
    row_no ? row_no.trim() : '',
    desk_no ? desk_no.trim() : '',
    block ? block.trim() : ''
  );

  res.json({ success: true, message: 'Seat added successfully.', seatId: result.lastInsertRowid });
});

// Update a single seat
router.put('/seats/:seatId', verifyToken, (req, res) => {
  const { seatId } = req.params;
  const { roll_number, student_name, branch, semester, room_no, floor_no, row_no, desk_no, block } = req.body;

  if (!roll_number || !room_no) {
    return res.status(400).json({ error: 'Roll number and Room number are required.' });
  }

  const db = getDb();
  const seat = db.prepare('SELECT * FROM seating WHERE id = ?').get(seatId);
  if (!seat) return res.status(404).json({ error: 'Seat record not found.' });

  db.prepare(`
    UPDATE seating
    SET roll_number = ?, student_name = ?, branch = ?, semester = ?,
        room_no = ?, floor_no = ?, row_no = ?, desk_no = ?, block = ?
    WHERE id = ?
  `).run(
    roll_number.trim().toUpperCase(),
    student_name ? student_name.trim() : '',
    branch ? branch.trim() : '',
    semester ? semester.trim() : '',
    room_no.trim(),
    floor_no ? floor_no.trim() : '',
    row_no ? row_no.trim() : '',
    desk_no ? desk_no.trim() : '',
    block ? block.trim() : '',
    seatId
  );

  res.json({ success: true, message: 'Seat updated successfully.' });
});

// Delete a single seat
router.delete('/seats/:seatId', verifyToken, (req, res) => {
  const { seatId } = req.params;
  const db = getDb();

  const seat = db.prepare('SELECT * FROM seating WHERE id = ?').get(seatId);
  if (!seat) return res.status(404).json({ error: 'Seat record not found.' });

  db.prepare('DELETE FROM seating WHERE id = ?').run(seatId);
  res.json({ success: true, message: 'Seat removed successfully.' });
});

module.exports = router;
