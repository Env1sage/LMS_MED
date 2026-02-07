const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        is_active: true,
        name: true,
      },
      orderBy: [
        { role: 'asc' },
        { email: 'asc' }
      ]
    });

    console.log('\n=== ALL USERS IN DATABASE ===\n');
    console.log('Total Users:', users.length);
    console.log('\n' + '='.repeat(120) + '\n');

    const roles = {};
    users.forEach(u => {
      if (!roles[u.role]) roles[u.role] = [];
      roles[u.role].push(u);
    });

    Object.keys(roles).sort().forEach(role => {
      console.log(`\n${role}:`);
      console.log('-'.repeat(120));
      roles[role].forEach(u => {
        console.log(`  Email: ${u.email.padEnd(50)} | Name: ${(u.name || 'N/A').padEnd(30)} | Active: ${u.is_active}`);
      });
    });

    console.log('\n' + '='.repeat(120));
    console.log('\n✅ Standard passwords for seeded accounts:');
    console.log('  - Bitflow Owner: BitflowAdmin@2026');
    console.log('  - College Admin: Admin@123');
    console.log('  - Faculty: Faculty@123');
    console.log('  - Students: Student@123');
    console.log('  - Publisher: PublisherAdmin@2026');
    console.log('\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
