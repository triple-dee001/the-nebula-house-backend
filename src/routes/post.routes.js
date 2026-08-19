const router = require('express').Router();
const { requireAuth, requireVerified, requireOwnerOrAdmin } = require('../middleware/auth');
const { getPosts, getPost, createPost, toggleLike, addComment, deleteComment, getMyPosts, updatePost, deletePost, getSharePage } = require('../controllers/post.controller');

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
router.get('/:id', optionalAuth, getPost);
// requireVerified now transparently allows admins through — no extra middleware needed
router.post('/', requireAuth, requireVerified, createPost);
router.put('/:id', requireAuth, requireVerified, requireOwnerOrAdmin, updatePost);
router.delete('/:id', requireAuth, requireOwnerOrAdmin, deletePost);
router.post('/:id/like', requireAuth, toggleLike);
router.post('/:id/comments', requireAuth, requireVerified, addComment);
router.delete('/:id/comments/:commentId', requireAuth, deleteComment);

module.exports = router;

