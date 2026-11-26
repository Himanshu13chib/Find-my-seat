const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET) < 32) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 bytes before starting the server.');
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' }
});
const sessionCookie = `miet_admin_session; HttpOnly; SameSite=Strict; Path=/api; Max-Age=3600${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

// Admin login
router.post('/login', loginLimiter, requireSameOrigin, (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password || username.length > 100 || password.length > 1024) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username.trim());

  if (!admin) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const valid = bcrypt.compareSync(password, admin.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = jwt.sign({ id: admin.id, username: admin.username, tokenVersion: admin.token_version }, JWT_SECRET, { expiresIn: '1h', issuer: 'miet-seating' });
  res.setHeader('Set-Cookie', `${sessionCookie.split(';')[0]}=${token}; ${sessionCookie.split(';').slice(1).join(';').trim()}`);
  res.json({ success: true, username: admin.username });
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${sessionCookie.split(';')[0]}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.json({ success: true });
});

// Change admin password
router.post('/change-password', verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword || newPassword.length > 1024) {
    return res.status(400).json({ error: 'Both current and new password are required.' });
  }

  if (newPassword.length < 12) {
    return res.status(400).json({ error: 'New password must be at least 12 characters.' });
  }

  const db = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.user.id);

  if (!admin) return res.status(401).json({ error: 'Admin account is no longer available.' });
  const valid = bcrypt.compareSync(currentPassword, admin.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE admins SET password_hash = ?, token_version = token_version + 1 WHERE id = ?').run(newHash, req.user.id);
  res.setHeader('Set-Cookie', `${sessionCookie.split(';')[0]}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.json({ success: true, message: 'Password changed successfully.' });
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const cookie = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('miet_admin_session='));
  const token = cookie && cookie.slice('miet_admin_session='.length);

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !hasSameOrigin(req)) {
    return res.status(403).json({ error: 'Cross-origin request rejected.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: 'miet-seating' });
    const admin = getDb().prepare('SELECT id, username, token_version FROM admins WHERE id = ?').get(decoded.id);
    if (!admin || admin.username !== decoded.username || admin.token_version !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Admin session is no longer valid.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function hasSameOrigin(req) {
  try {
    const origin = new URL(req.get('origin'));
    return origin.host === req.get('host');
  } catch {
    return false;
  }
}

function requireSameOrigin(req, res, next) {
  if (!hasSameOrigin(req)) return res.status(403).json({ error: 'Cross-origin request rejected.' });
  next();
}

module.exports = router;
module.exports.verifyToken = verifyToken;
