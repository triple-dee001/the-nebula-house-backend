const prisma = require('../lib/prisma');
const { sendSubscriptionWelcomeEmail } = require('../lib/email');

// ─── SUBSCRIBE TO NEWSLETTER ─────────────────
async function subscribe(req, res) {
  try {
    const { email, name, website_hp, formLoadedAt } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    // Anti-bot Trap 1: Honeypot field filled by scraper bots
    if (website_hp) {
      console.warn(`[Bot Blocked] Honeypot triggered by IP ${req.ip} for email: ${email}`);
      return res.status(201).json({ message: 'Subscribed successfully! Welcome to The Nebula House.' });
    }

    // Anti-bot Trap 2: Time to submit check (bots submit in under 1.5s)
    if (formLoadedAt && Date.now() - parseInt(formLoadedAt) < 1500) {
      console.warn(`[Bot Blocked] Submission too fast (${Date.now() - parseInt(formLoadedAt)}ms) by IP ${req.ip} for email: ${email}`);
      return res.status(201).json({ message: 'Subscribed successfully! Welcome to The Nebula House.' });
    }

    // Anti-bot Trap 3: Excessive dot stuffing in username (e.g. e.zu.fup.uso4.6)
    const username = email.split('@')[0] || '';
    if ((username.match(/\./g) || []).length >= 4) {
      console.warn(`[Bot Blocked] Dot stuffing pattern: ${email}`);
      return res.status(201).json({ message: 'Subscribed successfully! Welcome to The Nebula House.' });
    }

    const existing = await prisma.newsletter.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.json({ message: 'You are already subscribed!' });

    await prisma.newsletter.create({
      data: {
        email: email.toLowerCase(),
        userId: req.user?.id || null,
      },
    });

    // Send welcome email (non-blocking)
    sendSubscriptionWelcomeEmail(email.toLowerCase(), name || '').catch(err => console.error('Subscription welcome email failed:', err));

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
