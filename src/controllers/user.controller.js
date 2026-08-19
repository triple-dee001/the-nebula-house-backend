const bcrypt = require('bcryptjs');
const path = require('path');
const prisma = require('../lib/prisma');

// ─── GET PROFILE ──────────────────────────────
async function getProfile(req, res) {
  try {
    const targetId = req.params.id || req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true, name: true, email: true, photo: true,
        bio: true, role: true, slug: true, createdAt: true, emailVerified: true, isWriter: true,
        _count: { select: { posts: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch follow counts
    const followersCount = await prisma.follow.count({ where: { followingId: targetId } });
    const followingCount = await prisma.follow.count({ where: { followerId: targetId } });

    // Check if the current user is following the target user
    let following = false;
    if (req.user && req.user.id !== targetId) {
      const isFollowing = await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: req.user.id, followingId: targetId },
        },
      });
      following = !!isFollowing;
    }

    res.json({ ...user, followersCount, followingCount, following });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── GET PROFILE BY SLUG ───────────────────
async function getProfileBySlug(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true, name: true, photo: true,
        bio: true, role: true, slug: true, createdAt: true,
        _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Writer not found' });

    const targetId = user.id;
    // Fetch follow counts
    const followersCount = await prisma.follow.count({ where: { followingId: targetId } });
    const followingCount = await prisma.follow.count({ where: { followerId: targetId } });

    // Check if the current user is following the target user
    let following = false;
    if (req.user && req.user.id !== targetId) {
      const isFollowing = await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: req.user.id, followingId: targetId },
        },
      });
      following = !!isFollowing;
    }

    res.json({ ...user, followersCount, followingCount, following });
  } catch (err) {
    console.error('getProfileBySlug error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── UPDATE PROFILE ───────────────────────────
async function updateProfile(req, res) {
  try {
    const { name, bio, isWriter } = req.body;
    const data = {};
    if (name && name.trim()) data.name = name.trim();
    if (bio !== undefined) data.bio = bio.trim();
    if (isWriter !== undefined) data.isWriter = isWriter === true || isWriter === 'true';

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, photo: true, bio: true, role: true, emailVerified: true, isWriter: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── UPLOAD PHOTO ─────────────────────────────
async function uploadPhoto(req, res) {
  try {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ error: 'No photo data provided' });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { photo },
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

// ─── GET ALL WRITERS (Community Directory) ────
async function getWriters(req, res) {
  try {
    const users = await prisma.user.findMany({
      where: { isWriter: true },
      select: {
        id: true,
        name: true,
        photo: true,
        bio: true,
        role: true,
        slug: true,
        createdAt: true,
        _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error('Get writers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getProfile, getProfileBySlug, updateProfile, uploadPhoto, changePassword, getUserPosts, getWriters };
