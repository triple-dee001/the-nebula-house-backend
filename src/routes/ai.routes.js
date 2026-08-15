const router = require('express').Router();
const { requireAuth, requireVerified } = require('../middleware/auth');
const { suggestImprovements } = require('../controllers/ai.controller');

router.post('/ai-assist', requireAuth, requireVerified, suggestImprovements);

module.exports = router;
