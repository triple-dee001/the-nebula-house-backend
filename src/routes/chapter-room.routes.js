/**
 * CHAPTER ROOM BACKEND API ROUTES
 * Strict Server-Side Sequential Unlocking & Spoiler Defense
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth');

// Seed books catalog
const SEED_BOOKS = [
  {
    id: 'notes-from-underground',
    slug: 'notes-from-underground',
    title: 'Notes from Underground',
    author: 'Fyodor Dostoevsky',
    year: 1864,
    genre: 'Philosophy',
    genres: ['Philosophy', 'Fiction', 'Classics'],
    cover: '../assets/images/notes-from-underground.jpg',
    readingTime: '3.5 hrs',
    chapterCount: 6,
    difficulty: 'Challenging',
    difficultyNote: 'Take your time with this one',
    recommendRate: 92,
    isBotm: true,
    botmMonth: 'October 2026',
    tagline: 'An unflinching probe into spite, free will, and the limits of rationalism.',
    description: 'A dark, introspective novella exploring the mind of a bitter, isolated man in conflict with society and himself.',
    whyWeAreReading: 'Dostoevsky reminds us that human consciousness is stubbornly irrational and cannot be reduced to mathematical equations.',
    keyThemes: ['Rational Egoism vs Irrational Free Will', 'The Crystal Palace & Anti-Utopianism', 'Spite as Self-Preservation', 'Isolation and Inability to Love']
  },
  {
    id: 'the-metamorphosis',
    slug: 'the-metamorphosis',
    title: 'The Metamorphosis',
    author: 'Franz Kafka',
    year: 1915,
    genre: 'Fiction',
    genres: ['Fiction', 'Classics'],
    cover: '',
    readingTime: '2.5 hrs',
    chapterCount: 3,
    difficulty: 'Intermediate',
    difficultyNote: 'Absurd yet profoundly human',
    recommendRate: 89,
    isBotm: false,
    tagline: 'A startling portrait of alienation, duty, and human conditional affection.',
    description: 'Gregor Samsa wakes to find himself transformed into a monstrous insect.',
    whyWeAreReading: 'Kafka dissects the tragic truth of modern labor and familial utility.',
    keyThemes: ['The Burden of Economic Utility', 'Alienation and Bodily Disconnection', 'The Fragility of Familial Love', 'Guilt and Transformation']
  },
  {
    id: 'mans-search-for-meaning',
    slug: 'mans-search-for-meaning',
    title: 'Man’s Search for Meaning',
    author: 'Viktor E. Frankl',
    year: 1946,
    genre: 'Memoir',
    genres: ['Memoir', 'Psychology', 'Philosophy'],
    cover: '',
    readingTime: '4.0 hrs',
    chapterCount: 4,
    difficulty: 'Getting Started',
    difficultyNote: 'Accessible and deeply moving',
    recommendRate: 98,
    isBotm: false,
    tagline: 'Finding purpose and dignity in life’s most harrowing circumstances.',
    description: 'Surviving concentration camps and developing logotherapy.',
    whyWeAreReading: 'Timeless wisdom on inner dignity and choosing one\'s attitude.',
    keyThemes: ['Will to Meaning', 'Tragic Optimism', 'Inner Freedom', 'Responsibility']
  }
];

const SEED_CHAPTERS = {
  'notes-from-underground': [
    {
      number: 1,
      title: 'Part I: Underground — Sections I to IV',
      readingTime: '22 min read',
      readingPanelText: 'I am a sick man... I am a spiteful man. I am an unattractive man. I believe my liver is diseased. However, I know nothing at all about my disease...',
      summary: 'The narrator introduces himself from his basement in St. Petersburg, declaring his spiteful war against 19th-century utilitarianism and determinism.',
      keyIdeas: [
        'Spite as an existential assertion of free will',
        'Hyper-consciousness as paralysis against action',
        'Critique of the simple man of action'
      ],
      discussionPrompt: 'Why does the narrator refuse medical treatment even knowing it harms him?'
    },
    {
      number: 2,
      title: 'Part I: Underground — Sections V to IX',
      readingTime: '26 min read',
      readingPanelText: 'You see, gentlemen, reason is an excellent thing, there’s no disputing that, but reason is nothing but reason and satisfies only the rational side of man’s nature...',
      summary: 'The philosophical core: Dostoevsky attacks the Crystal Palace and the tyranny of 2+2=4. Man will burn utopia just to prove his capricious autonomy.',
      keyIdeas: [
        'The Crystal Palace as metaphor for rational utopia',
        'The human right to choose chaos over clockwork perfection',
        'The limits of mathematical certainty'
      ],
      discussionPrompt: 'Do you agree that humans will deliberately choose chaos to prove they are free?'
    },
    {
      number: 3,
      title: 'Part I: Underground — Sections X to XI',
      readingTime: '18 min read',
      readingPanelText: 'I have been living like this a long time... twenty years now. I am forty. I was in the civil service, but no longer am...',
      summary: 'Despair at his intellectual dead end; transition to childhood memories and the wet snow.',
      keyIdeas: [
        'The impossible ideal of genuine faith',
        'Memories of sixteen years ago',
        'The burden of shame'
      ],
      discussionPrompt: 'Why does the underground man remain in his basement rather than compromise?'
    },
    {
      number: 4,
      title: 'Part II: A Propos of the Wet Snow — Sections I to IV',
      readingTime: '30 min read',
      readingPanelText: 'At that time I was only twenty-four. My life was even then gloomy, ill-regulated, and solitary to the point of savage retreat...',
      summary: 'The officer bumping encounter on Nevsky Prospect and the tragic dinner with old school fellows.',
      keyIdeas: ['Social humiliation', 'Obsessive phantom duels', 'Pride as a prison'],
      discussionPrompt: 'Is the underground man seeking revenge or genuine recognition?'
    },
    {
      number: 5,
      title: 'Part II: A Propos of the Wet Snow — Sections V to VII',
      readingTime: '28 min read',
      readingPanelText: 'Suddenly, by the bedside, I saw two wide-open eyes looking at me curiously...',
      summary: 'The brothel encounter with Liza; theatrical sermon on dignity and redemption.',
      keyIdeas: ['Theatrical morality', 'Power over the vulnerable', 'Fear of intimacy'],
      discussionPrompt: 'Did he mean his sermon to Liza, or was it a literary exercise?'
    },
    {
      number: 6,
      title: 'Part II: A Propos of the Wet Snow — Sections VIII to X',
      readingTime: '34 min read',
      readingPanelText: 'Liza arrived at my wretched room... I could not bear that she saw my poverty and my shame...',
      summary: 'Liza arrives at his squalid room. Terrified of vulnerability, he lashes out in cruelty. Final reflection.',
      keyIdeas: ['Cruelty as defense against exposure', 'The tragedy of isolated pride', 'We are all stillborn'],
      discussionPrompt: 'What stayed with you most after finishing Notes from Underground?'
    }
  ]
};

// ─── IN-MEMORY STATE WITH 3 PERSISTED SEED PERSONAS ─────────
// Persona 1: New Reader (user-maya-lin): completed []
// Persona 2: Reader on Chapter 3 (user-marcus-vance): completed [1, 2]
// Persona 3: Finished Reader (user-elena-rostova): completed [1, 2, 3, 4, 5, 6]

let progressStore = {
  'user-maya-lin': {
    'notes-from-underground': {
      currentChapter: 1,
      completedChapters: [],
      status: 'currently-reading'
    }
  },
  'user-marcus-vance': {
    'notes-from-underground': {
      currentChapter: 3,
      completedChapters: [1, 2],
      status: 'currently-reading'
    }
  },
  'user-elena-rostova': {
    'notes-from-underground': {
      currentChapter: 6,
      completedChapters: [1, 2, 3, 4, 5, 6],
      status: 'finished',
      wouldRecommend: true,
      reflection: 'A startling and timeless exposure of the contradictions within modern rationalism.'
    }
  }
};

let shelfStore = {
  'user-maya-lin': {
    currentlyReading: ['notes-from-underground'],
    nextUp: ['the-metamorphosis'],
    wishlist: ['mans-search-for-meaning'],
    finished: [],
    abandoned: []
  },
  'user-marcus-vance': {
    currentlyReading: ['notes-from-underground'],
    nextUp: [],
    wishlist: ['the-metamorphosis'],
    finished: ['mans-search-for-meaning'],
    abandoned: []
  },
  'user-elena-rostova': {
    currentlyReading: ['the-metamorphosis'],
    nextUp: [],
    wishlist: [],
    finished: ['notes-from-underground', 'mans-search-for-meaning'],
    abandoned: []
  }
};

let plansStore = {
  'user-marcus-vance': {
    'notes-from-underground': {
      targetDate: '2026-10-31',
      frequency: 'A chapter every 3 days'
    }
  }
};

let commentsStore = [
  {
    id: 'c101',
    bookId: 'notes-from-underground',
    chapterNumber: 1,
    author: 'Marcus Vance',
    authorId: 'user-marcus-vance',
    text: 'Notice how the underground man explicitly refuses medical treatment out of spite. His illness is not purely bodily; it is an existential assertion against deterministic medicine.',
    isSpoiler: false,
    reactions: { interesting: 14, madeMeThink: 9, excellentPoint: 7, iDisagree: 1 },
    userReactions: {},
    replies: [],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'c102',
    bookId: 'notes-from-underground',
    chapterNumber: 2,
    author: 'Dr. Elena Rostova',
    authorId: 'user-elena-rostova',
    text: 'The assault on 2+2=4 is arguably the most radical defense of human caprice ever penned.',
    isSpoiler: false,
    reactions: { interesting: 28, madeMeThink: 19, excellentPoint: 15, iDisagree: 2 },
    userReactions: {},
    replies: [],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

let reportsStore = [];

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function resolveUserId(req) {
  if (req.user && req.user.id) return req.user.id;
  const headerId = req.headers['x-guest-id'] || req.headers['x-user-id'];
  return headerId || 'guest';
}

function resolveUserName(req) {
  if (req.user && req.user.name) return req.user.name;
  if (req.headers['x-user-name']) return req.headers['x-user-name'];
  const uid = resolveUserId(req);
  if (uid === 'user-maya-lin') return 'Maya Lin';
  if (uid === 'user-marcus-vance') return 'Marcus Vance';
  if (uid === 'user-elena-rostova') return 'Dr. Elena Rostova';
  return 'Reader ' + uid.substring(0, 6);
}

// ─── 1. BOOKS & BOTM ─────────────────────────────────
router.get('/books', (req, res) => {
  res.json({ books: SEED_BOOKS });
});

router.get('/books/:bookId', (req, res) => {
  const book = SEED_BOOKS.find(b => b.id === req.params.bookId || b.slug === req.params.bookId);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  const chapters = (SEED_CHAPTERS[book.id] || []).map(ch => ({
    number: ch.number,
    title: ch.title,
    readingTime: ch.readingTime
  }));
  res.json({ book, chapters });
});

router.get('/botm', (req, res) => {
  const botm = SEED_BOOKS.find(b => b.isBotm) || SEED_BOOKS[0];
  res.json({ botm, month: 'October 2026' });
});

// ─── 2. PROGRESSION & SEQUENTIAL UNLOCKING ───────────
router.get('/books/:bookId/progress', optionalAuth, (req, res) => {
  const userId = resolveUserId(req);
  const { bookId } = req.params;
  const bookProgress = (progressStore[userId] && progressStore[userId][bookId]) || {
    currentChapter: 1,
    completedChapters: [],
    status: 'not-started'
  };
  res.json({ progress: bookProgress });
});

router.get('/books/:bookId/chapters/:chapterNumber', optionalAuth, (req, res) => {
  const { bookId } = req.params;
  const chapterNumber = parseInt(req.params.chapterNumber, 10);

  const bookChapters = SEED_CHAPTERS[bookId] || [];
  const chapter = bookChapters.find(ch => ch.number === chapterNumber);
  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  // Chapter 1 is always unlocked.
  // Chapter N > 1 requires Chapter N - 1 to be marked complete.
  if (chapterNumber > 1) {
    const userId = resolveUserId(req);
    const userProgress = (progressStore[userId] && progressStore[userId][bookId]) || { completedChapters: [] };
    const isUnlocked = userProgress.completedChapters.includes(chapterNumber - 1);

    if (!isUnlocked) {
      // 403 FORBIDDEN - ZERO SPOILERS LEAKED
      return res.status(403).json({
        locked: true,
        bookId,
        chapterNumber,
        title: chapter.title,
        message: `Chapter ${chapterNumber} is locked. Complete Chapter ${chapterNumber - 1} to unlock summary and discussions.`
      });
    }
  }

  // Chapter is unlocked -> return complete content & chapter-bound comments
  const chapterComments = commentsStore.filter(c => c.bookId === bookId && c.chapterNumber === chapterNumber && !c.isDeleted && !c.isHidden);

  return res.json({
    locked: false,
    number: chapter.number,
    title: chapter.title,
    readingTime: chapter.readingTime,
    readingPanelText: chapter.readingPanelText,
    summary: chapter.summary,
    keyIdeas: chapter.keyIdeas,
    discussionPrompt: chapter.discussionPrompt,
    comments: chapterComments
  });
});

// ─── 3. MARK CHAPTER COMPLETE (SEQUENTIAL INTEGRITY) ───
router.post('/books/:bookId/chapters/:chapterNumber/complete', optionalAuth, (req, res) => {
  const { bookId } = req.params;
  const chapterNumber = parseInt(req.params.chapterNumber, 10);
  const userId = resolveUserId(req);

  if (!progressStore[userId]) progressStore[userId] = {};
  if (!progressStore[userId][bookId]) {
    progressStore[userId][bookId] = {
      currentChapter: 1,
      completedChapters: [],
      status: 'currently-reading'
    };
  }

  const userProg = progressStore[userId][bookId];

  // Cannot mark complete out of order!
  if (chapterNumber > 1 && !userProg.completedChapters.includes(chapterNumber - 1)) {
    return res.status(400).json({
      error: `Cannot mark Chapter ${chapterNumber} complete out of order. Complete Chapter ${chapterNumber - 1} first.`
    });
  }

  if (!userProg.completedChapters.includes(chapterNumber)) {
    userProg.completedChapters.push(chapterNumber);
    userProg.currentChapter = Math.max(userProg.currentChapter, chapterNumber + 1);
  }

  res.json({
    success: true,
    message: `Chapter ${chapterNumber} completed. Next chapter is unlocked.`,
    completedChapters: userProg.completedChapters,
    currentChapter: userProg.currentChapter
  });
});

// ─── 4. COMMENTS (BOUND TO CHAPTER, OWNER PROTECTION) ──
router.post('/books/:bookId/chapters/:chapterNumber/comments', optionalAuth, (req, res) => {
  const { bookId } = req.params;
  const chapterNumber = parseInt(req.params.chapterNumber, 10);
  const { text, isSpoiler, spoilerSummary } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Comment text cannot be empty' });
  }

  const userId = resolveUserId(req);
  const userProg = (progressStore[userId] && progressStore[userId][bookId]) || { completedChapters: [] };

  // Spoilers defense: cannot comment on a locked chapter
  if (chapterNumber > 1 && !userProg.completedChapters.includes(chapterNumber - 1)) {
    return res.status(403).json({ error: 'Cannot comment on a locked chapter' });
  }

  const newComment = {
    id: 'c_' + Date.now(),
    bookId,
    chapterNumber,
    author: resolveUserName(req),
    authorId: userId,
    text: sanitize(text.trim()),
    isSpoiler: !!isSpoiler,
    spoilerSummary: sanitize((spoilerSummary || '').trim()),
    reactions: { interesting: 0, madeMeThink: 0, excellentPoint: 0, iDisagree: 0 },
    userReactions: {},
    replies: [],
    createdAt: new Date().toISOString()
  };

  commentsStore.unshift(newComment);
  res.status(201).json({ comment: newComment });
});

// Edit own comment
router.put('/comments/:commentId', optionalAuth, (req, res) => {
  const { commentId } = req.params;
  const { text } = req.body;
  const userId = resolveUserId(req);

  const comment = commentsStore.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const isAdmin = req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN');
  if (comment.authorId !== userId && !isAdmin) {
    return res.status(403).json({ error: 'You cannot edit another user’s comment' });
  }

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Comment text cannot be empty' });
  }

  comment.text = sanitize(text.trim());
  comment.updatedAt = new Date().toISOString();
  res.json({ success: true, comment });
});

// Delete own comment
router.delete('/comments/:commentId', optionalAuth, (req, res) => {
  const { commentId } = req.params;
  const userId = resolveUserId(req);

  const comment = commentsStore.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const isAdmin = req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN');
  if (comment.authorId !== userId && !isAdmin) {
    return res.status(403).json({ error: 'You cannot delete another user’s comment' });
  }

  comment.isDeleted = true;
  res.json({ success: true, message: 'Comment deleted successfully' });
});

// ─── 5. REACTIONS (INTERESTING, MADE ME THINK, ETC.) ─
router.post('/comments/:commentId/reactions', optionalAuth, (req, res) => {
  const { commentId } = req.params;
  const { type } = req.body;
  const validTypes = ['interesting', 'madeMeThink', 'excellentPoint', 'iDisagree'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid reaction type' });
  }

  const comment = commentsStore.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const userId = resolveUserId(req);
  if (!comment.userReactions) comment.userReactions = {};

  const currentReaction = comment.userReactions[userId];
  if (currentReaction === type) {
    // Unreact
    comment.reactions[type] = Math.max(0, (comment.reactions[type] || 1) - 1);
    delete comment.userReactions[userId];
  } else {
    // If reacted previously, decrement prior
    if (currentReaction) {
      comment.reactions[currentReaction] = Math.max(0, (comment.reactions[currentReaction] || 1) - 1);
    }
    comment.reactions[type] = (comment.reactions[type] || 0) + 1;
    comment.userReactions[userId] = type;
  }

  res.json({ success: true, reactions: comment.reactions, userReaction: comment.userReactions[userId] || null });
});

// ─── 6. SHELVES (5 CATEGORIES) ───────────────────────
router.get('/shelves', optionalAuth, (req, res) => {
  const userId = resolveUserId(req);
  const shelves = shelfStore[userId] || {
    currentlyReading: [],
    nextUp: [],
    wishlist: [],
    finished: [],
    abandoned: []
  };
  res.json({ shelves });
});

router.post('/shelves', optionalAuth, (req, res) => {
  const userId = resolveUserId(req);
  const { bookId, targetShelf, reason } = req.body;

  const validShelves = ['currentlyReading', 'nextUp', 'wishlist', 'finished', 'abandoned'];
  if (!validShelves.includes(targetShelf)) {
    return res.status(400).json({ error: 'Invalid target shelf' });
  }

  if (!shelfStore[userId]) {
    shelfStore[userId] = { currentlyReading: [], nextUp: [], wishlist: [], finished: [], abandoned: [] };
  }

  // Remove from existing shelves
  validShelves.forEach(s => {
    shelfStore[userId][s] = shelfStore[userId][s].filter(id => id !== bookId);
  });

  // Add to target shelf
  shelfStore[userId][targetShelf].push(bookId);

  // If abandoning, record compassionate message
  if (targetShelf === 'abandoned') {
    if (!progressStore[userId]) progressStore[userId] = {};
    if (!progressStore[userId][bookId]) progressStore[userId][bookId] = { completedChapters: [] };
    progressStore[userId][bookId].status = 'abandoned';
    progressStore[userId][bookId].abandonReason = reason || 'Not for me right now';
  }

  res.json({ success: true, shelves: shelfStore[userId] });
});

router.post('/shelves/reorder', optionalAuth, (req, res) => {
  const userId = resolveUserId(req);
  const { shelf, bookIds } = req.body;

  if (!shelfStore[userId] || !Array.isArray(bookIds)) {
    return res.status(400).json({ error: 'Invalid reorder payload' });
  }

  shelfStore[userId][shelf] = bookIds;
  res.json({ success: true, shelves: shelfStore[userId] });
});

// ─── 7. READING PLANS & FINISH BOOK ──────────────────
router.get('/plans/:bookId', optionalAuth, (req, res) => {
  const userId = resolveUserId(req);
  const plan = (plansStore[userId] && plansStore[userId][req.params.bookId]) || null;
  res.json({ plan });
});

router.post('/plans/:bookId', optionalAuth, (req, res) => {
  const userId = resolveUserId(req);
  const { targetDate, frequency } = req.body;
  if (!plansStore[userId]) plansStore[userId] = {};
  plansStore[userId][req.params.bookId] = { targetDate, frequency };
  res.json({ success: true, plan: plansStore[userId][req.params.bookId] });
});

router.post('/finish', optionalAuth, (req, res) => {
  const userId = resolveUserId(req);
  const { bookId, reflection, wouldRecommend } = req.body;

  if (!progressStore[userId]) progressStore[userId] = {};
  progressStore[userId][bookId] = {
    ...progressStore[userId][bookId],
    status: 'finished',
    reflection: sanitize(reflection || ''),
    wouldRecommend: !!wouldRecommend,
    finishedAt: new Date().toISOString()
  };

  // Move to finished shelf
  if (!shelfStore[userId]) shelfStore[userId] = { currentlyReading: [], nextUp: [], wishlist: [], finished: [], abandoned: [] };
  ['currentlyReading', 'nextUp', 'wishlist', 'abandoned'].forEach(s => {
    shelfStore[userId][s] = shelfStore[userId][s].filter(id => id !== bookId);
  });
  if (!shelfStore[userId].finished.includes(bookId)) shelfStore[userId].finished.push(bookId);

  // Return 3 recommendations
  const recs = SEED_BOOKS.filter(b => b.id !== bookId).slice(0, 3);
  res.json({ success: true, recommendations: recs });
});

// ─── 8. REPORT QUEUE & MODERATION ────────────────────
router.post('/comments/:commentId/report', optionalAuth, (req, res) => {
  const { commentId } = req.params;
  const { category, details } = req.body;

  const validCategories = [
    'Spoilers without tag',
    'Harassment or hate speech',
    'Off-topic / Spam',
    'Inappropriate content',
    'Plagiarism',
    'Low-effort trolling'
  ];

  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid report category' });
  }

  const comment = commentsStore.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const report = {
    id: 'rep_' + Date.now(),
    commentId,
    thoughtText: comment.text,
    author: comment.author,
    category,
    details: sanitize(details || ''),
    status: 'PENDING',
    reportedAt: new Date().toISOString()
  };

  reportsStore.unshift(report);
  res.status(201).json({ success: true, message: 'Report submitted for moderation review' });
});

// ─── 9. ADMIN ROOM MODERATION (STRICT ROLE ENFORCEMENT) ─
router.get('/admin/reports', requireAuth, requireAdmin, (req, res) => {
  res.json({ reports: reportsStore });
});

router.post('/admin/moderate', requireAuth, requireAdmin, (req, res) => {
  const { reportId, action } = req.body;
  const report = reportsStore.find(r => r.id === reportId);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  const validActions = ['hide', 'delete', 'warn', 'suspend', 'ban', 'dismiss'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid moderation action' });
  }

  report.status = action.toUpperCase() + 'ED';

  if (action === 'hide' || action === 'delete') {
    const comment = commentsStore.find(c => c.id === report.commentId);
    if (comment) {
      if (action === 'hide') comment.isHidden = true;
      if (action === 'delete') comment.isDeleted = true;
    }
  }

  res.json({ success: true, message: `Action ${action} recorded`, report });
});

module.exports = router;
