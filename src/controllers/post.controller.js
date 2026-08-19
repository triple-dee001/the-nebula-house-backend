const prisma = require('../lib/prisma');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

async function generateUniqueSlug(title) {
  let baseSlug = slugify(title);
  if (!baseSlug) baseSlug = 'story';
  
  let slug = baseSlug;
  let count = 1;
  while (true) {
    const existing = await prisma.post.findFirst({ where: { slug } });
    if (!existing) break;
    slug = `${baseSlug}-${count}`;
    count++;
  }
  return slug;
}

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
          author: { select: { id: true, name: true, photo: true, slug: true } },
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
    const { id } = req.params;
    const post = await prisma.post.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }
        ]
      },
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

// ─── CREATE POST ────────────────────────────
async function createPost(req, res) {
  try {
    const { title, subtitle, body, excerpt, tags, challengeId, coverImage } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

    // Admins publish directly; regular users go through review
    const isAdminUser = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    const status = isAdminUser ? 'PUBLISHED' : 'PENDING';

    const slug = await generateUniqueSlug(title);
    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        slug,
        subtitle: subtitle?.trim(),
        body,
        excerpt: excerpt?.trim(),
        tags: tags?.trim(),
        coverImage: coverImage?.trim() || null,
        authorId: req.user.id,
        status,
        approvedAt: isAdminUser ? new Date() : null,
        challengeId: challengeId || null,
      },
    });

    if (status === 'PUBLISHED') {
      notifyFollowersOfNewPost(post.id).catch(err => console.error('Failed to notify followers on direct post:', err));
    }

    const message = isAdminUser ? 'Story published!' : 'Story submitted for review';
    res.status(201).json({ message, post });
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

// ─── UPDATE POST (CMS Edit) ───────────────────
async function updatePost(req, res) {
  try {
    const { id } = req.params;
    const { title, subtitle, body, excerpt, tags, challengeId, coverImage } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Verify ownership or admin role
    if (post.authorId !== req.user.id && req.user.role === 'USER') {
      return res.status(403).json({ error: 'Not authorized to edit this story' });
    }

    // Determine new status: reset to PENDING if edited by a regular user,
    // keep as PUBLISHED if edited by an admin.
    const newStatus = (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') ? 'PUBLISHED' : 'PENDING';

    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: title.trim(),
        subtitle: subtitle?.trim(),
        body,
        excerpt: excerpt?.trim(),
        tags: tags?.trim(),
        coverImage: coverImage !== undefined ? (coverImage?.trim() || null) : undefined,
        challengeId: challengeId || null,
        status: newStatus,
        rejectReason: null,
      },
    });

    res.json({ message: 'Story updated successfully', post: updated });
  } catch (err) {
    console.error('Update post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── DELETE POST (Owner or Admin) ────────────────
async function deletePost(req, res) {
  try {
    // req.post is set by requireOwnerOrAdmin middleware
    const postId = req.post ? req.post.id : req.params.id;
    await prisma.post.delete({ where: { id: postId } });
    res.json({ message: 'Story deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function getSharePage(req, res) {
  try {
    const { slug } = req.params;
    const post = await prisma.post.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: { author: { select: { name: true } } },
    });

    if (!post) {
      return res.redirect('https://thenebulahouse.com/');
    }

    const title = post.title;
    const description = post.excerpt || post.subtitle || 'A story from The Nebula House ecosystem.';
    const imageUrl = post.coverImage || 'https://thenebulahouse.com/assets/images/room-icon.png';
    const postUrl = `https://thenebulahouse.com/story/${post.slug}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} | The Nebula House</title>
  
  <!-- OpenGraph Metadata -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${postUrl}">
  <meta property="og:type" content="article">
  
  <!-- Twitter Card Metadata -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Automatic Redirect Script -->
  <script>
    window.location.replace("https://thenebulahouse.com/story.html?slug=${post.slug}");
  </script>
</head>
<body style="background:#000; color:#fff; font-family:sans-serif; text-align:center; padding-top:20vh;">
  <p>Redirecting to The Nebula House...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Share page rendering error:', err);
    res.redirect('https://thenebulahouse.com/');
  }
}

async function notifyFollowersOfNewPost(postId) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true }
    });
    if (!post || post.status !== 'PUBLISHED') return;

    const { sendFollowerNewPostEmail } = require('../lib/email');

    const follows = await prisma.follow.findMany({
      where: { followingId: post.authorId },
      include: { follower: true }
    });

    console.log(`Notifying ${follows.length} followers of new post "${post.title}" by ${post.author.name}`);

    for (const f of follows) {
      await prisma.notification.create({
        data: {
          userId: f.followerId,
          type: 'POST_STATUS',
          title: 'New Story Published',
          message: `${post.author.name} published a new story: "${post.title}"`,
        }
      }).catch(err => console.error('Failed to create follower in-app notification:', err));

      sendFollowerNewPostEmail(f.follower.email, f.follower.name, post.author.name, post.title, post.slug).catch(err => {
        console.error(`Failed to send email alert to follower ${f.follower.email}:`, err);
      });
    }
  } catch (err) {
    console.error('Failed to notify followers of new post:', err);
  }
}

module.exports = { getPosts, getPost, createPost, toggleLike, addComment, deleteComment, getMyPosts, updatePost, deletePost, getSharePage, notifyFollowersOfNewPost };
