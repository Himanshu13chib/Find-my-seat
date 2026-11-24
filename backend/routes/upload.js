const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database');
const { verifyToken } = require('./auth');

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `seating_${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Upload seating file
router.post('/', verifyToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { exam_name, exam_date } = req.body;
  if (!exam_name) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Exam name is required.' });
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'The uploaded file is empty or has no valid data.' });
    }

    // Normalize column headers (case-insensitive, trim spaces)
    const normalizedData = rawData.map(row => {
      const normalized = {};
      Object.keys(row).forEach(key => {
        normalized[key.trim().toLowerCase().replace(/\s+/g, '_')] = String(row[key]).trim();
      });
      return normalized;
    });

    // Detect columns flexibly
    const sample = normalizedData[0];
    const colMap = detectColumns(sample);

    if (!colMap.roll_number || !colMap.room_no) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Could not find required columns (Roll Number, Room No) in the file.',
        detectedColumns: Object.keys(sample),
        hint: 'Ensure your file has columns named: Roll No, Room No, Floor, Row, Desk. See sample template for reference.'
      });
    }

    const db = getDb();

    // Create exam record
    const examResult = db.prepare(
      'INSERT INTO exams (exam_name, exam_date, uploaded_by) VALUES (?, ?, ?)'
    ).run(exam_name.trim(), exam_date || null, req.user.username);

    const examId = examResult.lastInsertRowid;

    // Insert seating data in a transaction
    const insertSeating = db.prepare(`
      INSERT INTO seating (exam_id, roll_number, student_name, branch, semester, room_no, floor_no, row_no, desk_no, block)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((records) => {
      let inserted = 0;
      let skipped = 0;
      for (const row of records) {
        const roll = row[colMap.roll_number];
        if (!roll || roll === '' || roll === 'undefined') { skipped++; continue; }

        insertSeating.run(
          examId,
          roll.toUpperCase(),
          colMap.student_name ? row[colMap.student_name] : '',
          colMap.branch ? row[colMap.branch] : '',
          colMap.semester ? row[colMap.semester] : '',
          colMap.room_no ? row[colMap.room_no] : '',
          colMap.floor_no ? row[colMap.floor_no] : '',
          colMap.row_no ? row[colMap.row_no] : '',
          colMap.desk_no ? row[colMap.desk_no] : '',
          colMap.block ? row[colMap.block] : ''
        );
        inserted++;
      }
      return { inserted, skipped };
    });

    const result = insertMany(normalizedData);

    // Clean up uploaded file after processing
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Seating data uploaded successfully for "${exam_name}".`,
      examId,
      stats: {
        total: rawData.length,
        inserted: result.inserted,
        skipped: result.skipped
      }
    });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process file: ' + err.message });
  }
});

// Detect column names from spreadsheet headers
function detectColumns(sample) {
  const keys = Object.keys(sample);
  const colMap = {};

  const matchers = {
    roll_number: /roll|roll_no|roll_number|enrollment|enroll|student_id|reg_no|registration/i,
    student_name: /name|student_name|candidate/i,
    branch: /branch|dept|department|course/i,
    semester: /sem|semester|year/i,
    room_no: /room|hall|classroom|venue|room_no/i,
    floor_no: /floor|storey|level/i,
    row_no: /row|line|bench_row/i,
    desk_no: /desk|seat|bench|position|seat_no/i,
    block: /block|wing|section/i
  };

  for (const [field, pattern] of Object.entries(matchers)) {
    const match = keys.find(k => pattern.test(k));
    if (match) colMap[field] = match;
  }

  return colMap;
}

module.exports = router;
