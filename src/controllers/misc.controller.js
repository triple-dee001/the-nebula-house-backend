const prisma = require('../lib/prisma');

// ─── SUBSCRIBE TO NEWSLETTER ─────────────────
async function subscribe(req, res) {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const existing = await prisma.newsletter.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.json({ message: 'You are already subscribed!' });

    await prisma.newsletter.create({
      data: {
        email: email.toLowerCase(),
        userId: req.user?.id || null,
      },
    });

    // Sync to Brevo contacts list (non-blocking)
    if (process.env.BREVO_API_KEY) {
      fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          attributes: { FIRSTNAME: name || '' },
          listIds: [process.env.BREVO_LIST_ID ? parseInt(process.env.BREVO_LIST_ID) : 2],
          updateEnabled: true,
        }),
      }).catch(err => console.error('Brevo contact sync error:', err));
    }

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
