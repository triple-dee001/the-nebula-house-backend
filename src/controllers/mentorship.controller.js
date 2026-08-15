const prisma = require('../lib/prisma');

async function getMentors(req, res) {
  try {
    const mentors = await prisma.user.findMany({
      where: { isMentor: true },
      select: {
        id: true,
        name: true,
        email: true,
        photo: true,
        bio: true,
        mentorBio: true,
        createdAt: true,
      }
    });
    res.json(mentors);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function requestMentorship(req, res) {
  try {
    const { mentorId, message } = req.body;
    const menteeId = req.user.id;

    if (!mentorId) return res.status(400).json({ error: 'Mentor ID is required' });

    // Validate mentor exists and is actually a mentor
    const mentor = await prisma.user.findFirst({ where: { id: mentorId, isMentor: true } });
    if (!mentor) return res.status(404).json({ error: 'Mentor not found or user is not a mentor' });

    if (mentorId === menteeId) return res.status(400).json({ error: 'You cannot request mentorship from yourself' });

    // Check if request already exists
    const existing = await prisma.mentorshipRequest.findFirst({
      where: { mentorId, menteeId, status: 'PENDING' }
    });
    if (existing) return res.status(400).json({ error: 'You already have a pending request with this mentor' });

    const request = await prisma.mentorshipRequest.create({
      data: {
        mentorId,
        menteeId,
        message: message?.trim(),
      }
    });

    res.status(201).json({ message: 'Mentorship request sent successfully', request });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function getRequests(req, res) {
  try {
    const userId = req.user.id;
    // Get requests where user is either mentor or mentee
    const requests = await prisma.mentorshipRequest.findMany({
      where: {
        OR: [
          { mentorId: userId },
          { menteeId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        mentor: { select: { id: true, name: true, email: true, photo: true } },
        mentee: { select: { id: true, name: true, email: true, photo: true } }
      }
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function updateRequestStatus(req, res) {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const userId = req.user.id;

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be ACCEPTED or DECLINED.' });
    }

    const request = await prisma.mentorshipRequest.findUnique({
      where: { id }
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.mentorId !== userId) return res.status(403).json({ error: 'Not authorized to respond to this request' });

    const updated = await prisma.mentorshipRequest.update({
      where: { id },
      data: { status }
    });

    res.json({ message: `Mentorship request ${status.toLowerCase()}`, request: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getMentors, requestMentorship, getRequests, updateRequestStatus };
