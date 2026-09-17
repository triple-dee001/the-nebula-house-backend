const router = require('express').Router();
const { optionalAuth } = require('../middleware/auth');
const { toggleCommentLike } = require('../controllers/post.controller');

router.post('/:commentId/like', optionalAuth, (req, res, next) => {
  toggleCommentLike(req, res).catch(next);
});

module.exports = router;
