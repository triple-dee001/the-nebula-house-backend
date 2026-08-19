const prisma = require('../lib/prisma');

async function toggleFollow(req, res) {
  try {
    const followerId = req.user.id;
    const followingId = req.params.id;

    if (followerId === followingId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if target user exists
    const target = await prisma.user.findUnique({ where: { id: followingId } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      
      // Update follow counts for response
      const followersCount = await prisma.follow.count({ where: { followingId } });
      const followingCount = await prisma.follow.count({ where: { followerId: followingId } });

      return res.json({ following: false, message: 'Unfollowed successfully', followersCount, followingCount });
    } else {
      await prisma.follow.create({ data: { followerId, followingId } });

      // Create notification for follow event
      await prisma.notification.create({
        data: {
          userId: followingId,
          type: 'SYSTEM',
          title: 'New Follower',
          message: `${req.user.name} is now following you.`,
        }
      }).catch(err => console.error('Failed to create follow notification:', err));

      const followersCount = await prisma.follow.count({ where: { followingId } });
      const followingCount = await prisma.follow.count({ where: { followerId: followingId } });

      return res.json({ following: true, message: 'Followed successfully', followersCount, followingCount });
    }
  } catch (err) {
    console.error('Toggle follow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getFollowers(req, res) {
  try {
    const { id } = req.params;
    const follows = await prisma.follow.findMany({
      where: { followingId: id },
      include: {
        follower: {
          select: { id: true, name: true, photo: true, slug: true, isWriter: true }
        }
      }
    });
    const followers = follows.map(f => f.follower);
    res.json(followers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function getFollowing(req, res) {
  try {
    const { id } = req.params;
    const follows = await prisma.follow.findMany({
      where: { followerId: id },
      include: {
        following: {
          select: { id: true, name: true, photo: true, slug: true, isWriter: true }
        }
      }
    });
    const following = follows.map(f => f.following);
    res.json(following);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { toggleFollow, getFollowers, getFollowing };
