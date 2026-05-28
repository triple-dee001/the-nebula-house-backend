const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { subscribe, submitNomination } = require('../controllers/misc.controller');

// Newsletter — no auth needed to subscribe
router.post('/newsletter/subscribe', subscribe);

// Nominations — must be logged in
router.post('/nominations', requireAuth, submitNomination);

module.exports = router;
