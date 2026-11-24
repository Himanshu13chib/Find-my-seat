const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'miet_seating.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_name TEXT NOT NULL,
      exam_date TEXT,
      uploaded_by TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS seating (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      roll_number TEXT NOT NULL,
      student_name TEXT,
      branch TEXT,
      semester TEXT,
      room_no TEXT NOT NULL,
      floor_no TEXT NOT NULL,
      row_no TEXT NOT NULL,
      desk_no TEXT NOT NULL,
      block TEXT,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_seating_roll ON seating(roll_number);
    CREATE INDEX IF NOT EXISTS idx_seating_exam ON seating(exam_id);
  `);

  // Insert default admin if none exists
  const adminCount = db.prepare('SELECT COUNT(*) as cnt FROM admins').get();
  if (adminCount.cnt === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log('Default admin created: username=admin, password=admin123');
  }
}

module.exports = { getDb };
