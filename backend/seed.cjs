const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Common password for all users
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  
  // Bitflow Owner
  const owner = await prisma.users.upsert({
    where: { email: 'owner@bitflow.com' },
    update: { passwordHash: hashedPassword },
    create: {
      id: uuidv4(),
      email: 'owner@bitflow.com',
      passwordHash: hashedPassword,
      fullName: 'Bitflow Platform Owner',
      role: 'BITFLOW_OWNER',
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
  });
  console.log('Created/Updated Bitflow Owner:', owner.email);

  // Update Publisher Admin password
  const publisherAdmin = await prisma.users.updateMany({
    where: { email: 'admin@elsevier.com' },
    data: { passwordHash: hashedPassword },
  });
  console.log('Updated Publisher Admin password for: admin@elsevier.com');

  // Update College Admin password
  const collegeAdmin = await prisma.users.updateMany({
    where: { email: 'admin@aiimsnagpur.edu.in' },
    data: { passwordHash: hashedPassword },
  });
  console.log('Updated College Admin password for: admin@aiimsnagpur.edu.in');

  console.log('\n✅ All passwords reset to: Password123!');
  console.log('\nLogin credentials:');
  console.log('  Bitflow Owner:    owner@bitflow.com / Password123!');
  console.log('  Publisher Admin:  admin@elsevier.com / Password123!');
  console.log('  College Admin:    admin@aiimsnagpur.edu.in / Password123!');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
