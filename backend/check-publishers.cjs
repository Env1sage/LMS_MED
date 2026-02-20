const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPublishers() {
  try {
    const publishers = await prisma.publishers.findMany();
    console.log('\nPublishers in database:', publishers.length);
    publishers.forEach(p => {
      console.log(`  - ${p.name} (${p.code}) - Status: ${p.status}`);
    });
    
    const packages = await prisma.packages.findMany({ include: { publisher: true } });
    console.log('\nPackages in database:', packages.length);
    packages.forEach(p => {
      console.log(`  - ${p.name} by ${p.publisher?.name || 'Unknown'}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPublishers();
