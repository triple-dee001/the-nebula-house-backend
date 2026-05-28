const prisma = require('../lib/prisma');
const { sendPostStatusEmail } = require('../lib/email');

// ─── DASHBOARD STATS ─────────────────────────
async function getStats(req, res) {
  try {
    const [
      totalUsers, verifiedUsers, totalPosts, publishedPosts,
      pendingPosts, totalComments, totalNewsletter, totalNominations
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.post.count(),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.post.count({ where: { status: 'PENDING' } }),
      prisma.comment.count(),
      prisma.newsletter.count(),
      prisma.nomination.count(),
    ]);

    res.json({
      users: { total: totalUsers, verified: verifiedUsers, unverified: totalUsers - verifiedUsers },
      posts: { total: totalPosts, published: publishedPosts, pending: pendingPosts, rejected: totalPosts - publishedPosts - pendingPosts },
      comments: totalComments,
      newsletter: totalNewsletter,
      nominations: totalNominations,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── ALL USERS ────────────────────────────────
async function getAllUsers(req, res) {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, photo: true,
          emailVerified: true, createdAt: true, bio: true,
          _count: { select: { posts: true, comments: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── UPDATE USER ROLE ─────────────────────────
async function updateUserRole(req, res) {
  try {
    const { role } = req.body;
    const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    // Prevent demoting yourself
    if (req.params.id === req.user.id && role !== req.user.role) {
      return res.status(400).json({ error: "You can't change your own role" });
    }

    // Only SUPER_ADMIN can assign SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only super admins can assign super admin role' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── DELETE USER ─────────────────────────────
async function deleteUser(req, res) {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: "You can't delete your own account from here" });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── ALL POSTS (any status) ───────────────────
async function getAllPosts(req, res) {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { author: { name: { contains: search, mode: 'insensitive' } } }] } : {}),
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, email: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ posts, total });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── APPROVE POST ─────────────────────────────
async function approvePost(req, res) {
  try {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED', approvedAt: new Date(), rejectReason: null },
      include: { author: true },
    });
    // Notify author
    sendPostStatusEmail(post.author.email, post.author.name, post.title, 'PUBLISHED').catch(console.error);
    res.json({ message: 'Post approved and published', post });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── REJECT POST ─────────────────────────────
async function rejectPost(req, res) {
  try {
    const { reason } = req.body;
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', rejectReason: reason || null },
      include: { author: true },
    });
    sendPostStatusEmail(post.author.email, post.author.name, post.title, 'REJECTED', reason).catch(console.error);
    res.json({ message: 'Post rejected', post });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── DELETE POST ─────────────────────────────
async function deletePost(req, res) {
  try {
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── NEWSLETTER ───────────────────────────────
async function getNewsletter(req, res) {
  try {
    const subs = await prisma.newsletter.findMany({
      orderBy: { subscribedAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── NOMINATIONS ─────────────────────────────
async function getNominations(req, res) {
  try {
    const noms = await prisma.nomination.findMany({
      orderBy: { submittedAt: 'desc' },
      include: { submitter: { select: { name: true, email: true } } },
    });
    res.json(noms);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getStats, getAllUsers, updateUserRole, deleteUser,
  getAllPosts, approvePost, rejectPost, deletePost,
  getNewsletter, getNominations,
};
