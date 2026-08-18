const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Backfilling isWriter flag ===');
  // Mark Kelechi Oji and others as writer
  const res = await prisma.user.updateMany({
    where: {
      OR: [
        { email: 'kelechioji@thenebulahouse.com' },
        { role: 'ADMIN' },
        { role: 'SUPER_ADMIN' }
      ]
    },
    data: { isWriter: true }
  });
  console.log(`Updated ${res.count} users with isWriter: true.`);
  console.log('=== Done ===');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
