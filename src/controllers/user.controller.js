const bcrypt = require('bcryptjs');
const path = require('path');
const prisma = require('../lib/prisma');

// ─── GET PROFILE ──────────────────────────────
async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id || req.user.id },
      select: {
        id: true, name: true, email: true, photo: true,
        bio: true, role: true, createdAt: true, emailVerified: true,
        _count: { select: { posts: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── UPDATE PROFILE ───────────────────────────
async function updateProfile(req, res) {
  try {
    const { name, bio } = req.body;
    const data = {};
    if (name && name.trim()) data.name = name.trim();
    if (bio !== undefined) data.bio = bio.trim();

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, photo: true, bio: true, role: true, emailVerified: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── UPLOAD PHOTO ─────────────────────────────
async function uploadPhoto(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const photoUrl = `/uploads/${req.file.filename}`;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { photo: photoUrl },
      select: { id: true, photo: true },
    });
    res.json({ photo: updated.photo });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── CHANGE PASSWORD ──────────────────────────
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 8)
      return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.password)
      return res.status(400).json({ error: 'Your account uses Google sign-in — no password to change' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── GET USER POSTS ───────────────────────────
async function getUserPosts(req, res) {
  try {
    const userId = req.params.id || req.user.id;
    const posts = await prisma.post.findMany({
      where: { authorId: userId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, excerpt: true, createdAt: true, views: true, _count: { select: { likes: true, comments: true } } },
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getProfile, updateProfile, uploadPhoto, changePassword, getUserPosts };
