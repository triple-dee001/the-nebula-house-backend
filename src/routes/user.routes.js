const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getProfile, getProfileBySlug, updateProfile, uploadPhoto, changePassword, getUserPosts, getWriters } = require('../controllers/user.controller');

router.get('/me', requireAuth, getProfile);
router.put('/me', requireAuth, updateProfile);
router.post('/me/photo', requireAuth, uploadPhoto);
router.put('/me/password', requireAuth, changePassword);
router.get('/me/posts', requireAuth, getUserPosts);
router.get('/', getWriters);

// Follow System
const { toggleFollow, getFollowers, getFollowing } = require('../controllers/follow.controller');
router.post('/:id/follow', requireAuth, toggleFollow);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

const { optionalAuth } = require('../middleware/auth');
router.get('/slug/:slug', optionalAuth, getProfileBySlug);
router.get('/:id', optionalAuth, getProfile);
router.get('/:id/posts', getUserPosts);

module.exports = router;
