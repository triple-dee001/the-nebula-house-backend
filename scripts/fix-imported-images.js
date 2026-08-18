const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Cleaning imported post body image paths ===');
  const posts = await prisma.post.findMany();
  
  let updatedCount = 0;
  for (const post of posts) {
    if (post.body && post.body.includes('src="../assets/')) {
      const fixedBody = post.body.replace(/src="\.\.\/assets\//g, 'src="/assets/');
      await prisma.post.update({
        where: { id: post.id },
        data: { body: fixedBody }
      });
      console.log(`Fixed image paths for: "${post.title}"`);
      updatedCount++;
    }
  }
  
  console.log(`=== Done: Updated ${updatedCount} posts ===`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
