const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { subscribe, submitNomination } = require('../controllers/misc.controller');

const rateLimit = require('express-rate-limit');

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 subscription attempts per IP per hour
  message: { error: 'Too many subscription attempts from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Newsletter — no auth needed to subscribe, protected by rate limiting
router.post('/newsletter/subscribe', newsletterLimiter, subscribe);

// Nominations — must be logged in
router.post('/nominations', requireAuth, submitNomination);

module.exports = router;
