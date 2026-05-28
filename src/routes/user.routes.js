const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getProfile, updateProfile, uploadPhoto, changePassword, getUserPosts } = require('../controllers/user.controller');

router.get('/me', requireAuth, getProfile);
router.put('/me', requireAuth, updateProfile);
router.post('/me/photo', requireAuth, upload.single('photo'), uploadPhoto);
router.put('/me/password', requireAuth, changePassword);
router.get('/me/posts', requireAuth, getUserPosts);
router.get('/:id', getProfile);
router.get('/:id/posts', getUserPosts);

module.exports = router;
