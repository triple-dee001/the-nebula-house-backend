const router = require('express').Router();
const { requireAuth, requireVerified } = require('../middleware/auth');
const { getMentors, requestMentorship, getRequests, updateRequestStatus } = require('../controllers/mentorship.controller');

router.get('/mentors', getMentors);
router.get('/requests', requireAuth, getRequests);
router.post('/request', requireAuth, requireVerified, requestMentorship);
router.put('/requests/:id', requireAuth, requireVerified, updateRequestStatus);

module.exports = router;
