const express = require('express');
const router = express.Router();
const multer = require('multer');
const readSheet = require('read-excel-file/node').readSheet;
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
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
    const ext = path.extname(file.originalname);
    cb(null, `seating_${crypto.randomUUID()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.xlsx', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel (.xlsx) and CSV files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Upload seating file
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { exam_name, exam_date } = req.body || {};
  if (typeof exam_name !== 'string' || !exam_name.trim() || exam_name.length > 150) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'An exam name of no more than 150 characters is required.' });
  }
  if (exam_date !== undefined && exam_date !== '' && (typeof exam_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(exam_date) || Number.isNaN(Date.parse(`${exam_date}T00:00:00Z`)) || new Date(`${exam_date}T00:00:00Z`).toISOString().slice(0, 10) !== exam_date)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Exam date must be a valid date in YYYY-MM-DD format.' });
  }

  try {
    const extension = path.extname(req.file.originalname).toLowerCase();
    let rawData;
    try {
      if (extension === '.csv') {
        rawData = parse(fs.readFileSync(req.file.path, 'utf8'), {
          columns: headers => headers.map(header => String(header).trim()),
          bom: true,
          skip_empty_lines: true,
          trim: true,
          max_record_size: 1024 * 1024
        });
      } else {
        const sheetRows = await readSheet(req.file.path);
        if (!sheetRows.length || sheetRows.length > 10001) {
          throw new Error('The worksheet exceeds supported size limits.');
        }
        const headers = sheetRows[0].map(value => String(value ?? '').trim());
        if (headers.length > 100) throw new Error('The worksheet exceeds supported size limits.');
        rawData = sheetRows.slice(1).map(row => Object.fromEntries(
          headers.map((header, index) => [header, row[index] instanceof Date ? row[index].toISOString() : String(row[index] ?? '')])
        )).filter(record => Object.values(record).some(value => value.trim() !== ''));
      }
    } catch (fileError) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.warn('Rejected invalid seating upload:', fileError.message);
      return res.status(400).json({ error: 'The uploaded file is invalid or exceeds supported limits.' });
    }

    if (rawData.length > 10000) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Uploads are limited to 10,000 student records.' });
    }

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

    if (normalizedData.some(row => Object.values(row).some(value => value.length > 500))) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'A cell exceeds the 500 character limit.' });
    }

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
    res.status(500).json({ error: 'The seating upload could not be completed.' });
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
