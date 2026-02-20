const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFacultyUsers() {
  try {
    const users = await prisma.users.findMany({
      where: { role: 'FACULTY' },
      select: { id: true, email: true, name: true, role: true, collegeId: true }
    });
    
    console.log('Faculty users:', JSON.stringify(users, null, 2));
    
    if (users.length === 0) {
      console.log('\n❌ No FACULTY users found in database!');
      console.log('Creating a test faculty user...');
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('faculty123', 10);
      
      const faculty = await prisma.users.create({
        data: {
          email: 'faculty@test.com',
          password: hashedPassword,
          name: 'Dr. Rakesh Gupta',
          role: 'FACULTY',
          collegeId: (await prisma.colleges.findFirst())?.id || null,
          status: 'ACTIVE'
        }
      });
      
      console.log('✅ Created faculty user:', {
        email: faculty.email,
        password: 'faculty123',
        role: faculty.role
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFacultyUsers();
