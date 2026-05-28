const prisma = require('../lib/prisma');

// ─── SUBSCRIBE TO NEWSLETTER ─────────────────
async function subscribe(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const existing = await prisma.newsletter.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.json({ message: 'You are already subscribed!' });

    await prisma.newsletter.create({
      data: {
        email: email.toLowerCase(),
        userId: req.user?.id || null,
      },
    });
    res.status(201).json({ message: 'Subscribed successfully! Welcome to The Nebula House.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ─── SUBMIT NOMINATION ───────────────────────
async function submitNomination(req, res) {
  try {
    const { bookTitle, bookAuthor, reason } = req.body;
    if (!bookTitle || !bookAuthor)
      return res.status(400).json({ error: 'Book title and author are required' });

    const nomination = await prisma.nomination.create({
      data: {
        bookTitle: bookTitle.trim(),
        bookAuthor: bookAuthor.trim(),
        reason: reason?.trim(),
        submitterId: req.user.id,
      },
    });
    res.status(201).json({ message: 'Nomination submitted!', nomination });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { subscribe, submitNomination };
