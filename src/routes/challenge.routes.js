const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getChallenges, createChallenge, getChallenge } = require('../controllers/challenge.controller');

router.get('/', getChallenges);
router.get('/:id', getChallenge);
router.post('/', requireAuth, requireAdmin, createChallenge);

module.exports = router;
