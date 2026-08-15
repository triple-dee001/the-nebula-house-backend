require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding local SQLite database...');

  // 1. Create Super Admin / Mentor user
  const adminEmail = 'danieldurojaiye42@gmail.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  let adminUser;
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    adminUser = await prisma.user.create({
      data: {
        name: 'Daniel Durojaiye',
        email: adminEmail,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        emailVerified: true,
        isMentor: false,
        bio: 'Co-founder and lead technical developer of The Nebula House.',
        mentorBio: null,
      },
    });
    console.log(`✓ Created Super Admin account: ${adminEmail} (password: password123)`);
  } else {
    adminUser = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: 'SUPER_ADMIN',
        emailVerified: true,
        isMentor: false,
        mentorBio: null,
      }
    });
    console.log(`✓ Updated existing account to Super Admin: ${adminEmail}`);
  }

  // 2. Create another Super Admin/Mentor user (Kelechi Oji)
  const mentorEmail = 'kelechioji@thenebulahouse.com';
  const existingMentor = await prisma.user.findUnique({ where: { email: mentorEmail } });
  if (!existingMentor) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    await prisma.user.create({
      data: {
        name: 'Kelechi Oji',
        email: mentorEmail,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        emailVerified: true,
        isMentor: true,
        bio: 'Founder of The Nebula House. Essayist and thinker.',
        mentorBio: 'Ready to guide writers on spiritual discovery, Christian philosophy, suffering, and editing critical arguments.',
      },
    });
    console.log(`✓ Created Admin account: ${mentorEmail} (password: password123)`);
  } else {
    await prisma.user.update({
      where: { email: mentorEmail },
      data: {
        role: 'SUPER_ADMIN',
        emailVerified: true,
        isMentor: true,
        mentorBio: 'Ready to guide writers on spiritual discovery, Christian philosophy, suffering, and editing critical arguments.',
      }
    });
    console.log(`✓ Updated existing account to Super Admin: ${mentorEmail}`);
  }

  // 3. Create a Monthly Challenge
  const existingChallenge = await prisma.challenge.findFirst({
    where: { title: 'The Soul of Modern Man' }
  });

  if (!existingChallenge) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month

    await prisma.challenge.create({
      data: {
        title: 'The Soul of Modern Man',
        description: 'Explore the modern struggle of identity, technology, and faith. How does a man preserve his soul in a hyper-connected, secular world? Submissions should be essays or reflective prose.',
        theme: 'Preserving Faith and Identity',
        startDate,
        endDate,
        isActive: true,
      },
    });
    console.log('✓ Created active Monthly Challenge: "The Soul of Modern Man"');
  }

  console.log('🌱 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
