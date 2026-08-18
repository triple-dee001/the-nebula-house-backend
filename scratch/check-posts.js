const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    select: { id: true, title: true, slug: true, status: true, author: { select: { name: true } } }
  });
  console.log('Posts in DB:', posts.length);
  console.log(JSON.stringify(posts, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
