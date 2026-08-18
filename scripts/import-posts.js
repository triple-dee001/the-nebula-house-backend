const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const POSTS_DIR = 'C:\\Users\\Triple D\\Desktop\\The Nebula House\\post';

function cleanHtml(bodyHtml) {
  let clean = bodyHtml;
  
  // Cut off tags section if present
  const tagsIdx = clean.indexOf('<div class="article-tags">');
  if (tagsIdx !== -1) {
    clean = clean.substring(0, tagsIdx);
  } else {
    const altTagsIdx = clean.indexOf('<div class="article-tags reveal">');
    if (altTagsIdx !== -1) clean = clean.substring(0, altTagsIdx);
  }
  
  // Cut off interactions section if present
  const interactionsIdx = clean.indexOf('<div class="post-interactions');
  if (interactionsIdx !== -1) clean = clean.substring(0, interactionsIdx);
  
  // Cut off comments section if present
  const commentsIdx = clean.indexOf('<div class="comments-section');
  if (commentsIdx !== -1) clean = clean.substring(0, commentsIdx);

  // Close any unclosed divs from truncation if we cut it inside a parent div
  return clean.trim();
}

async function importPosts() {
  console.log('=== Starting Import of Posts ===\n');

  // Find Kelechi Oji user
  const user = await prisma.user.findFirst({
    where: { email: 'kelechioji@thenebulahouse.com' }
  });
  if (!user) {
    console.error('Kelechi Oji not found in the database. Please register him first.');
    return;
  }
  console.log(`Found author: ${user.name} (${user.id})`);

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.html'));
  console.log(`Found ${files.length} posts to import.`);

  for (const filename of files) {
    const filePath = path.join(POSTS_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');

    // Title
    const titleMatch = content.match(/<h1 class="article-header__title">([\s\S]*?)<\/h1>/);
    let title = titleMatch ? titleMatch[1].trim() : '';
    if (!title) {
      const pageTitleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
      title = pageTitleMatch ? pageTitleMatch[1].split('|')[0].trim() : filename.replace('.html', '');
    }
    // Clean html entities in title
    title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

    // Subtitle
    const subtitle = '';

    // Description/Excerpt
    const descMatch = content.match(/<meta name="description" content="([\s\S]*?)">/);
    const excerpt = descMatch ? descMatch[1].trim() : '';

    // Date
    const dateMatch = content.match(/<span>([A-Za-z]{3}\s+\d{1,2},\s+\d{4})<\/span>/);
    let createdAt = new Date();
    if (dateMatch) {
      createdAt = new Date(dateMatch[1]);
    }

    // Cover Image
    const coverMatch = content.match(/<div class="article-image[^"]*".*?<img\s+src="([^"]+)"/s);
    let coverImage = coverMatch ? coverMatch[1].replace('../', '') : null;

    // Tags
    const tagsMatches = [...content.matchAll(/<span class="article-tag">([\s\S]*?)<\/span>/g)];
    const tags = tagsMatches.map(m => m[1].trim()).join(', ');

    // Body
    const bodyMatch = content.match(/<div class="article-body[^"]*">([\s\S]*)$/);
    let body = '';
    if (bodyMatch) {
      body = cleanHtml(bodyMatch[1]);
    } else {
      body = content;
    }

    const slug = filename.replace('.html', '');

    // Upsert to database
    await prisma.post.upsert({
      where: { slug },
      update: {
        title,
        subtitle,
        excerpt,
        body,
        tags,
        coverImage,
        createdAt,
        approvedAt: createdAt,
        status: 'PUBLISHED',
        authorId: user.id
      },
      create: {
        title,
        subtitle,
        excerpt,
        body,
        tags,
        coverImage,
        createdAt,
        approvedAt: createdAt,
        status: 'PUBLISHED',
        authorId: user.id,
        slug
      }
    });

    console.log(`✓ Imported: "${title}" -> slug: "${slug}"`);
  }

  console.log('\n=== All posts imported successfully! ===');
}

importPosts()
  .catch(e => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
