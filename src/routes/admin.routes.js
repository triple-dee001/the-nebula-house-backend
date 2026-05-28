const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getStats, getAllUsers, updateUserRole, deleteUser,
  getAllPosts, approvePost, rejectPost, deletePost,
  getNewsletter, getNominations,
} = require('../controllers/admin.controller');

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// Stats
router.get('/stats', getStats);

// Users
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Posts
router.get('/posts', getAllPosts);
router.put('/posts/:id/approve', approvePost);
router.put('/posts/:id/reject', rejectPost);
router.delete('/posts/:id', deletePost);

// Newsletter
router.get('/newsletter', getNewsletter);

// Nominations
router.get('/nominations', getNominations);

module.exports = router;
