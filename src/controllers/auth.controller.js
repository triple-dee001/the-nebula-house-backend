const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../lib/prisma');
const { signToken } = require('../lib/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../lib/email');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const SUPER_ADMINS = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

function getRoleForEmail(email) {
  return SUPER_ADMINS.includes(email.toLowerCase()) ? 'SUPER_ADMIN' : 'USER';
}

// ─── REGISTER ────────────────────────────────
async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'An account with this email already exists' });

    const hashed = await bcrypt.hash(password, 12);
    const verifyToken = uuidv4();
    const role = getRoleForEmail(email);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashed,
        role,
        verifyToken,
      },
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(user.email, user.name, verifyToken).catch(console.error);

    res.status(201).json({
      message: 'Account created. Please check your email to verify your account.',
      userId: user.id,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
}

// ─── VERIFY EMAIL ─────────────────────────────
async function verifyEmail(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token missing' });

    const user = await prisma.user.findFirst({ where: { verifyToken: token } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null },
    });

    // Redirect to site with success message
    res.redirect(`${process.env.FRONTEND_URL || '/'}?verified=true`);
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── RESEND VERIFICATION ──────────────────────
async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(404).json({ error: 'No account found with that email' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

    const verifyToken = uuidv4();
    await prisma.user.update({ where: { id: user.id }, data: { verifyToken } });
    await sendVerificationEmail(user.email, user.name, verifyToken);

    res.json({ message: 'Verification email resent' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── LOGIN ────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.password)
      return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken({ userId: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role,
        emailVerified: user.emailVerified,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
}

// ─── GOOGLE OAUTH ─────────────────────────────
async function googleAuth(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Google ID token required' });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email: email.toLowerCase() }] },
    });

    if (!user) {
      // New user via Google
      const role = getRoleForEmail(email);
      user = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          googleId,
          photo: picture,
          emailVerified: true, // Google already verified
          role,
        },
      });
    } else if (!user.googleId) {
      // Existing email user — link Google account
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, photo: user.photo || picture, emailVerified: true },
      });
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role,
        emailVerified: user.emailVerified,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
}

// ─── FORGOT PASSWORD ──────────────────────────
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always return success to prevent email enumeration
    if (user) {
      const token = uuidv4();
      const exp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExp: exp },
      });
      sendPasswordResetEmail(user.email, user.name, token).catch(console.error);
    }
    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── RESET PASSWORD ───────────────────────────
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: 'Token and new password required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExp: { gt: new Date() } },
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExp: null },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── GET CURRENT USER ─────────────────────────
async function getMe(req, res) {
  const user = req.user;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    photo: user.photo,
    role: user.role,
    emailVerified: user.emailVerified,
    bio: user.bio,
    createdAt: user.createdAt,
  });
}

module.exports = {
  register, verifyEmail, resendVerification,
  login, googleAuth,
  forgotPassword, resetPassword,
  getMe,
};
