// Fix faculty content status - set all faculty-created content to ACTIVE
const { PrismaClient } = require('@prisma/client');

async function fixFacultyContent() {
  const prisma = new PrismaClient();
  
  console.log('Fixing faculty content status...\n');
  
  // Find all learning units without a publisher (faculty-created)
  const facultyContent = await prisma.learning_units.findMany({
    where: {
      publisherId: null,
      status: { not: 'ACTIVE' }
    },
    select: {
      id: true,
      title: true,
      status: true,
      type: true,
    }
  });
  
  console.log(`Found ${facultyContent.length} faculty content items to activate:\n`);
  
  for (const unit of facultyContent) {
    console.log(`  - ${unit.title} (${unit.type}) - Status: ${unit.status}`);
  }
  
  if (facultyContent.length > 0) {
    // Update all to ACTIVE
    const result = await prisma.learning_units.updateMany({
      where: {
        publisherId: null,
        status: { not: 'ACTIVE' }
      },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
        updatedAt: new Date(),
      }
    });
    
    console.log(`\n✅ Activated ${result.count} faculty content items!`);
  } else {
    console.log('\n✅ All faculty content is already active!');
  }
  
  await prisma.$disconnect();
}

fixFacultyContent().catch(console.error);
