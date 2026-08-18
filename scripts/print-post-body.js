const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    take: 5
  });
  for (const p of posts) {
    console.log(`TITLE: ${p.title}`);
    console.log(`BODY HAS ASSETS: ${p.body ? p.body.includes('assets') : false}`);
    const imgMatches = p.body ? p.body.match(/<img[^>]+>/g) : null;
    if (imgMatches) {
      console.log('IMG TAGS:', imgMatches);
    }
    console.log('---');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
