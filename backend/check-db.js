const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const publishers = await prisma.publishers.count();
    const colleges = await prisma.colleges.count();
    const learningUnits = await prisma.learning_units.count();
    const packages = await prisma.packages.count();
    const users = await prisma.users.count();
    
    console.log('Database Counts:');
    console.log('- Publishers:', publishers);
    console.log('- Colleges:', colleges);
    console.log('- Learning Units:', learningUnits);
    console.log('- Packages:', packages);
    console.log('- Users:', users);
    
    if (publishers === 0) {
      console.log('\n⚠️  No data found! Need to seed the database.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
