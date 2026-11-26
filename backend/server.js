const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// Security headers. Inline styles are used by the existing admin UI; scripts stay same-origin only.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false
}));

// Middleware
// The frontend is served by this same origin. Do not enable cross-origin API access by default.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const seatingRoutes = require('./routes/seating');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/seating', seatingRoutes);
app.use('/api/admin', adminRoutes);

// Initialize the database during startup so unsafe legacy credentials are caught immediately.
require('./database').getDb();

// Serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Request failed:', err);
  const status = err.status && err.status < 500 ? err.status : 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error.' : err.message });
});

app.listen(PORT, HOST, () => {
  console.log(`MIET Seating Server running at http://${HOST}:${PORT}`);
  console.log(`Student Portal: http://${HOST}:${PORT}`);
  console.log(`Admin Portal:   http://${HOST}:${PORT}/admin`);
});
