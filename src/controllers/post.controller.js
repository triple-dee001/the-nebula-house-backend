const prisma = require('../lib/prisma');

// ─── GET ALL PUBLISHED POSTS ──────────────────
async function getPosts(req, res) {
  try {
    const { page = 1, limit = 20, tag } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { status: 'PUBLISHED', ...(tag ? { tags: { contains: tag } } : {}) };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, subtitle: true, excerpt: true,
          tags: true, coverImage: true, views: true, createdAt: true,
          author: { select: { id: true, name: true, photo: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ posts, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── GET SINGLE POST ──────────────────────────
async function getPost(req, res) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, photo: true, bio: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true, photo: true } } },
        },
        _count: { select: { likes: true } },
      },
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.status !== 'PUBLISHED') {
      // Only author or admin can see non-published posts
      const user = req.user;
      if (!user || (user.id !== post.authorId && user.role === 'USER')) {
        return res.status(404).json({ error: 'Post not found' });
      }
    }

    // Increment views
    await prisma.post.update({ where: { id: post.id }, data: { views: { increment: 1 } } });

    // Check if current user liked
    let liked = false;
    if (req.user) {
      const like = await prisma.like.findUnique({
        where: { postId_userId: { postId: post.id, userId: req.user.id } },
      });
      liked = !!like;
    }

    res.json({ ...post, liked });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── CREATE POST ──────────────────────────────
async function createPost(req, res) {
  try {
    const { title, subtitle, body, excerpt, tags } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        subtitle: subtitle?.trim(),
        body,
        excerpt: excerpt?.trim(),
        tags: tags?.trim(),
        authorId: req.user.id,
        status: 'PENDING',
      },
    });

    res.status(201).json({ message: 'Story submitted for review', post });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── TOGGLE LIKE ─────────────────────────────
async function toggleLike(req, res) {
  try {
    const { id: postId } = req.params;
    const userId = req.user.id;

    const existing = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      const count = await prisma.like.count({ where: { postId } });
      return res.json({ liked: false, count });
    } else {
      await prisma.like.create({ data: { postId, userId } });
      const count = await prisma.like.count({ where: { postId } });
      return res.json({ liked: true, count });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── ADD COMMENT ─────────────────────────────
async function addComment(req, res) {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

    const comment = await prisma.comment.create({
      data: { body: body.trim(), postId: req.params.id, authorId: req.user.id },
      include: { author: { select: { id: true, name: true, photo: true } } },
    });
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── DELETE COMMENT ───────────────────────────
async function deleteComment(req, res) {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.authorId !== req.user.id && req.user.role === 'USER') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await prisma.comment.delete({ where: { id: comment.id } });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── GET MY POSTS (any status) ────────────────
async function getMyPosts(req, res) {
  try {
    const posts = await prisma.post.findMany({
      where: { authorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, status: true, rejectReason: true,
        createdAt: true, views: true,
        _count: { select: { likes: true, comments: true } },
      },
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getPosts, getPost, createPost, toggleLike, addComment, deleteComment, getMyPosts };
