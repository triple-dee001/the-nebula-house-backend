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

function extractFirstImage(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
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

    // Check if current user or guest liked
    let liked = false;
    const guestId = req.headers['x-guest-id'];
    try {
      if (req.user) {
        const check = await prisma.$queryRawUnsafe(
          `SELECT id FROM likes WHERE "postId" = $1 AND "userId" = $2 LIMIT 1`,
          post.id, req.user.id
        );
        liked = check && check.length > 0;
      } else if (guestId) {
        const check = await prisma.$queryRawUnsafe(
          `SELECT id FROM likes WHERE "postId" = $1 AND "guestId" = $2 LIMIT 1`,
          post.id, guestId
        );
        liked = check && check.length > 0;
      }
    } catch (likeErr) {
      console.error('Error checking like status in getPost:', likeErr.message);
    }

    res.json({ ...post, liked });
  } catch (err) {
    console.error('getPost detailed error:', err);
    res.status(500).json({ error: 'Server error', details: err.message, stack: err.stack });
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
        coverImage: coverImage?.trim() || extractFirstImage(body) || null,
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
    const crypto = require('crypto');
    const { id: paramId } = req.params;
    const userId = req.user?.id || null;
    const guestId = req.headers['x-guest-id'] || null;

    if (!userId && !guestId) {
      return res.status(400).json({ error: 'User or Guest ID required' });
    }

    // Resolve post by ID or slug
    const posts = await prisma.$queryRawUnsafe(
      `SELECT id FROM posts WHERE id = $1 OR slug = $1 LIMIT 1`,
      paramId
    );

    if (!posts || posts.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const postId = posts[0].id;

    let existing = [];
    if (userId) {
      existing = await prisma.$queryRawUnsafe(
        `SELECT id FROM likes WHERE "postId" = $1 AND "userId" = $2 LIMIT 1`,
        postId, userId
      );
    } else if (guestId) {
      existing = await prisma.$queryRawUnsafe(
        `SELECT id FROM likes WHERE "postId" = $1 AND "guestId" = $2 LIMIT 1`,
        postId, guestId
      );
    }

    if (existing && existing.length > 0) {
      await prisma.$executeRawUnsafe(`DELETE FROM likes WHERE id = $1`, existing[0].id);
    } else {
      const newId = crypto.randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO likes (id, "postId", "userId", "guestId", "createdAt") VALUES ($1, $2, $3, $4, NOW())`,
        newId, postId, userId, guestId
      );
    }

    const countRes = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM likes WHERE "postId" = $1`,
      postId
    );

    const count = countRes && countRes[0] ? Number(countRes[0].count) : 0;
    const liked = !existing || existing.length === 0;

    return res.json({ liked, count });
  } catch (err) {
    console.error('Toggle like error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
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

    // If title changed or slug missing, generate new slug
    let slug = post.slug;
    if (title.trim() !== post.title || !slug) {
      slug = await generateUniqueSlug(title.trim());
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: title.trim(),
        slug,
        subtitle: subtitle?.trim(),
        body,
        excerpt: excerpt?.trim(),
        tags: tags?.trim(),
        coverImage: coverImage?.trim() || extractFirstImage(body) || null,
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

function extractFirstImageSrc(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// ─── SHARE IMAGE ENDPOINT (Serves real HTTP image for WhatsApp/Twitter cards) ───
async function getPostShareImage(req, res) {
  try {
    const { slug } = req.params;
    let post = await prisma.post.findFirst({
      where: { slug },
      include: { author: { select: { photo: true } } },
    });

    if (!post) {
      post = await prisma.post.findFirst({
        where: { id: slug },
        include: { author: { select: { photo: true } } },
      });
    }

    let rawImg = post?.coverImage || extractFirstImageSrc(post?.body) || post?.author?.photo;

    if (!rawImg) {
      return res.redirect('https://thenebulahouse.com/assets/images/room-icon.png');
    }

    // Handle Base64 images (convert to binary image response for social crawlers)
    if (rawImg.startsWith('data:image/')) {
      const parts = rawImg.split(';base64,');
      const mime = parts[0].replace('data:', '') || 'image/jpeg';
      const base64Data = parts[1];
      if (base64Data) {
        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    }

    // Handle Absolute HTTP/HTTPS URLs
    if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
      return res.redirect(rawImg);
    }

    // Handle Relative local paths
    if (rawImg.startsWith('/')) {
      return res.redirect(`https://thenebulahouse.com${rawImg}`);
    }

    return res.redirect(`https://thenebulahouse.com/${rawImg}`);
  } catch (err) {
    console.error('Share image endpoint error:', err);
    res.redirect('https://thenebulahouse.com/assets/images/room-icon.png');
  }
}

async function getSharePage(req, res) {
  try {
    const { slug } = req.params;
    let post = await prisma.post.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: { author: { select: { name: true, slug: true } } },
    });

    if (!post) {
      post = await prisma.post.findFirst({
        where: { id: slug, status: 'PUBLISHED' },
        include: { author: { select: { name: true, slug: true } } },
      });
    }

    if (!post) {
      return res.redirect('https://thenebulahouse.com/the-writers-room');
    }

    // Clean title and description strings
    const cleanTitle = (post.title || 'Story')
      .replace(/&amp;/g, '&')
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    const rawDesc = post.excerpt || post.subtitle || (post.body ? post.body.replace(/<[^>]+>/g, '').slice(0, 160) : 'A story from The Nebula House.');
    const cleanDesc = rawDesc
      .replace(/&amp;/g, '&')
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    // Dedicated public HTTPS image endpoint for WhatsApp/Twitter/Facebook social cards
    const shareImageUrl = `https://the-nebula-house-backend.onrender.com/api/posts/share-image/${post.slug || post.id}`;
    const authorSlug = post.author?.slug || 'author';
    const postUrl = `https://thenebulahouse.com/story/${authorSlug}/${post.slug || post.id}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${cleanTitle} | The Nebula House</title>

  <!-- OpenGraph Metadata for WhatsApp, Facebook, iMessage, LinkedIn -->
  <meta property="og:site_name" content="The Nebula House">
  <meta property="og:title" content="${cleanTitle}">
  <meta property="og:description" content="${cleanDesc}">
  <meta property="og:image" content="${shareImageUrl}">
  <meta property="og:image:secure_url" content="${shareImageUrl}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${postUrl}">
  <meta property="og:type" content="article">

  <!-- Twitter Card Metadata -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@the_nebula_house">
  <meta name="twitter:title" content="${cleanTitle}">
  <meta name="twitter:description" content="${cleanDesc}">
  <meta name="twitter:image" content="${shareImageUrl}">

  <!-- Automatic Client Redirect -->
  <script>
    window.location.replace("https://thenebulahouse.com/story.html?author=${authorSlug}&slug=${post.slug || post.id}");
  </script>
</head>
<body style="background:#0a0a0a; color:#fff; font-family:sans-serif; text-align:center; padding-top:20vh;">
  <p>Redirecting to ${cleanTitle}...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Share page rendering error:', err);
    res.redirect('https://thenebulahouse.com/the-writers-room');
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

module.exports = { getPosts, getPost, createPost, toggleLike, addComment, deleteComment, getMyPosts, updatePost, deletePost, getSharePage, getPostShareImage, notifyFollowersOfNewPost };
