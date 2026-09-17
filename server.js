require('dotenv').config();
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Enable trust proxy for rate limiting behind Render's load balancer
app.set('trust proxy', 1);

// Enable gzip/brotli payload compression
app.use(compression());

// ─── SECURITY ─────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ─── CORS ─────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://the-nebula-house-website.vercel.app',
  'https://thenebulahouse.com',
  'https://www.thenebulahouse.com',
  'https://triple-dee001.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-ID', 'Pragma', 'Cache-Control', 'Expires'],
  credentials: true,
}));

// ─── RATE LIMITING ────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

app.use('/api/auth', authLimiter);
// app.use('/api', generalLimiter);

// ─── BODY PARSING ─────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── STATIC FILES (uploaded photos) ──────────
app.use('/uploads', express.static(path.join(__dirname, 'src/uploads')));

// ─── HEALTH CHECK ─────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.1.0-comments', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ─── ROUTES ───────────────────────────────────
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/posts', require('./src/routes/post.routes'));
app.use('/api/comments', require('./src/routes/comment.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));
app.use('/api/notifications', require('./src/routes/notification.routes'));
app.use('/api/ai', require('./src/routes/ai.routes'));
app.use('/api/challenges', require('./src/routes/challenge.routes'));
app.use('/api/mentorship', require('./src/routes/mentorship.routes'));
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
  res.status(500).json({ error: 'Server error', message: err.message, stack: err.stack });
});

// ─── START ────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Nebula House API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

  // Run raw SQL schema check to guarantee guest columns exist in PostgreSQL & optional user IDs
  try {
    const prisma = require('./src/lib/prisma');
    await prisma.$executeRawUnsafe(`ALTER TABLE likes ADD COLUMN IF NOT EXISTS "guestId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE likes ALTER COLUMN "userId" DROP NOT NULL;`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "likes_postId_guestId_key" ON likes("postId", "guestId");`);
    
    await prisma.$executeRawUnsafe(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS "guestName" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE comments ALTER COLUMN "authorId" DROP NOT NULL;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS "parentId" TEXT;`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id TEXT PRIMARY KEY,
        "commentId" TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
        "guestId" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "comment_likes_commentId_userId_key" ON comment_likes("commentId", "userId");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "comment_likes_commentId_guestId_key" ON comment_likes("commentId", "guestId");`);

    console.log('✅ Database schema verified (guest likes, comments, replies & comment_likes ready)');
  } catch (err) {
    console.error('Schema init error (non-fatal):', err.message);
  }
});

module.exports = app;
