const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const {
  register, verifyEmail, resendVerification,
  login, googleAuth,
  forgotPassword, resetPassword,
  getMe,
} = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, getMe);

module.exports = router;
