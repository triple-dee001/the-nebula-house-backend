const router = require('express').Router();
const { requireAuth, requireVerified, requireOwnerOrAdmin } = require('../middleware/auth');
const { getPosts, getPost, createPost, toggleLike, addComment, deleteComment, getMyPosts, updatePost, deletePost, getSharePage, getPostShareImage } = require('../controllers/post.controller');

// Optional auth middleware — attaches user if token present but doesn't block
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const { verifyToken } = require('../lib/jwt');
      const prisma = require('../lib/prisma');
      const payload = verifyToken(header.split(' ')[1]);
      req.user = await prisma.user.findUnique({ where: { id: payload.userId } });
    }
  } catch (e) {}
  next();
};

router.get('/', getPosts);
router.get('/mine', requireAuth, getMyPosts);
router.get('/share/:slug', getSharePage);
router.get('/share-image/:slug', getPostShareImage);
router.get('/:id', optionalAuth, (req, res, next) => { getPost(req, res).catch(next); });
// requireVerified now transparently allows admins through — no extra middleware needed
router.post('/', requireAuth, requireVerified, (req, res, next) => { createPost(req, res).catch(next); });
router.put('/:id', requireAuth, requireVerified, requireOwnerOrAdmin, (req, res, next) => { updatePost(req, res).catch(next); });
router.delete('/:id', requireAuth, requireOwnerOrAdmin, (req, res, next) => { deletePost(req, res).catch(next); });
router.post('/:id/like', optionalAuth, (req, res, next) => {
  toggleLike(req, res).catch(err => {
    console.error('Unhandled toggleLike route error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  });
});
router.post('/:id/comments', requireAuth, requireVerified, addComment);
router.delete('/:id/comments/:commentId', requireAuth, deleteComment);

module.exports = router;

