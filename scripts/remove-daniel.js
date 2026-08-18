const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Locating and updating Daniel Durojaiye ===');
  const user = await prisma.user.findFirst({
    where: {
      name: {
        contains: 'Daniel Durojaiye',
        mode: 'insensitive'
      }
    }
  });

  if (!user) {
    console.log('No user found with the name "Daniel Durojaiye"');
    return;
  }

  console.log(`Found user: ${user.name} (${user.email}). Updating isWriter to false...`);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isWriter: false }
  });

  console.log('Updated user successfully:', updated);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
