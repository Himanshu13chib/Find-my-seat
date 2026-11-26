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
      token_version INTEGER NOT NULL DEFAULT 0,
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

  const adminColumns = db.prepare('PRAGMA table_info(admins)').all();
  if (!adminColumns.some(column => column.name === 'token_version')) {
    db.exec('ALTER TABLE admins ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0');
  }

  // Bootstrap an administrator only when explicit credentials are configured.
  const adminCount = db.prepare('SELECT COUNT(*) as cnt FROM admins').get();
  const bcrypt = require('bcryptjs');
  const defaultAdmin = db.prepare('SELECT id, password_hash FROM admins').all()
    .find(admin => bcrypt.compareSync('admin123', admin.password_hash));
  if (defaultAdmin && (!process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD.length < 12)) {
    throw new Error('The existing admin still uses the default password. Set ADMIN_INITIAL_PASSWORD (12+ characters) to rotate it before startup.');
  }
  if (defaultAdmin) {
    if (!process.env.ADMIN_USERNAME?.trim() || process.env.ADMIN_USERNAME.trim().length > 64) {
      throw new Error('Set ADMIN_USERNAME to a value between 1 and 64 characters to rotate the default account.');
    }
    const hash = bcrypt.hashSync(process.env.ADMIN_INITIAL_PASSWORD, 12);
    db.prepare('UPDATE admins SET username = ?, password_hash = ? WHERE id = ?')
      .run((process.env.ADMIN_USERNAME || 'admin').trim(), hash, defaultAdmin.id);
    console.log('Rotated the existing default administrator credentials from environment configuration.');
  }
  if (adminCount.cnt === 0 && (!process.env.ADMIN_USERNAME?.trim() || !process.env.ADMIN_INITIAL_PASSWORD)) {
    throw new Error('No admin account exists. Set ADMIN_USERNAME and ADMIN_INITIAL_PASSWORD before startup.');
  }
  if (adminCount.cnt === 0 && process.env.ADMIN_USERNAME && process.env.ADMIN_INITIAL_PASSWORD) {
    if (process.env.ADMIN_USERNAME.trim().length > 64 || process.env.ADMIN_INITIAL_PASSWORD.length < 12 || process.env.ADMIN_INITIAL_PASSWORD.length > 1024) {
      throw new Error('Set an admin username up to 64 characters and password between 12 and 1024 characters.');
    }
    const hash = bcrypt.hashSync(process.env.ADMIN_INITIAL_PASSWORD, 12);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(process.env.ADMIN_USERNAME.trim(), hash);
    console.log('Initial administrator created from environment configuration.');
  }
}

module.exports = { getDb };
