// ─── BACKFILL SLUGS ───────────────────────────
// Run once: node scripts/backfill-slugs.js
// Generates URL-friendly slugs for all existing Users and Posts that don't have one.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function toSlug(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // collapse consecutive hyphens
    .substring(0, 80);               // max 80 chars
}

async function makeUniqueSlug(base, existingSlugs, suffix = '') {
  const candidate = suffix ? `${base}-${suffix}` : base;
  if (!existingSlugs.has(candidate)) {
    existingSlugs.add(candidate);
    return candidate;
  }
  // Try numeric suffix
  let n = 2;
  while (existingSlugs.has(`${base}-${n}`)) n++;
  const unique = `${base}-${n}`;
  existingSlugs.add(unique);
  return unique;
}

async function backfillUserSlugs() {
  const users = await prisma.user.findMany({ where: { slug: null } });
  console.log(`Found ${users.length} users without slugs`);

  const existingSlugs = new Set(
    (await prisma.user.findMany({ where: { slug: { not: null } }, select: { slug: true } }))
      .map(u => u.slug)
  );

  for (const user of users) {
    const base = toSlug(user.name || user.email.split('@')[0]);
    const slug = await makeUniqueSlug(base, existingSlugs);
    await prisma.user.update({ where: { id: user.id }, data: { slug } });
    console.log(`  User "${user.name}" → slug: "${slug}"`);
  }
}

async function backfillPostSlugs() {
  const posts = await prisma.post.findMany({ where: { slug: null } });
  console.log(`Found ${posts.length} posts without slugs`);

  const existingSlugs = new Set(
    (await prisma.post.findMany({ where: { slug: { not: null } }, select: { slug: true } }))
      .map(p => p.slug)
  );

  for (const post of posts) {
    const base = toSlug(post.title);
    const slug = await makeUniqueSlug(base, existingSlugs);
    await prisma.post.update({ where: { id: post.id }, data: { slug } });
    console.log(`  Post "${post.title}" → slug: "${slug}"`);
  }
}

async function main() {
  console.log('=== Backfilling slugs ===\n');
  await backfillUserSlugs();
  console.log('');
  await backfillPostSlugs();
  console.log('\n=== Done ===');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
