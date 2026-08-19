const prisma = require('../lib/prisma');

async function getChallenges(req, res) {
  try {
    const { activeOnly } = req.query;
    const where = activeOnly === 'true' ? { isActive: true } : {};
    const challenges = await prisma.challenge.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        _count: { select: { posts: true } }
      }
    });
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function createChallenge(req, res) {
  try {
    const { title, description, theme, startDate, endDate } = req.body;
    if (!title || !description || !theme || !startDate || !endDate) {
      return res.status(400).json({ error: 'All challenge fields are required' });
    }

    const challenge = await prisma.challenge.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        theme: theme.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
    });

    // Notify all users about the new challenge
    try {
      const users = await prisma.user.findMany({
        select: { id: true }
      });
      for (const u of users) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            type: 'CHALLENGE',
            title: 'New Monthly Challenge!',
            message: `A new writing challenge "${title.trim()}" is now active! Theme: "${theme.trim()}"`,
          }
        });
      }
    } catch (err) {
      console.error('Failed to notify users of challenge:', err);
    }

    res.status(201).json(challenge);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function getChallenge(req, res) {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      include: {
        posts: {
          where: { status: 'PUBLISHED' },
          include: { 
            author: { select: { id: true, name: true, photo: true } },
            _count: { select: { likes: true, comments: true } }
          }
        }
      }
    });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getChallenges, createChallenge, getChallenge };
