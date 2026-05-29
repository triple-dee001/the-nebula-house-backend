require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// ─── SECURITY ─────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ─── CORS ─────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://the-nebula-house-website.vercel.app',
  'https://triple-dee001.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow no-origin (Postman, curl) in dev
    if (!origin && process.env.NODE_ENV !== 'production') return cb(null, true);
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ─── RATE LIMITING ────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' },
});

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// ─── BODY PARSING ─────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── STATIC FILES (uploaded photos) ──────────
app.use('/uploads', express.static(path.join(__dirname, 'src/uploads')));

// ─── HEALTH CHECK ─────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ─── ROUTES ───────────────────────────────────
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/posts', require('./src/routes/post.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));
app.use('/api', require('./src/routes/misc.routes'));

// ─── 404 ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// ─── START ────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nebula House API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
