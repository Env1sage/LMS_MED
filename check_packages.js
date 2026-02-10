const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check packages and their publishers
  const packages = await prisma.packages.findMany({
    take: 10,
    include: { publisher: { select: { name: true, id: true } } }
  });
  
  console.log('=== SAMPLE PACKAGES ===');
  packages.forEach(p => {
    console.log(`Package: ${p.name} | Publisher: ${p.publisher?.name || 'NONE'} | PublisherId: ${p.publisherId}`);
  });

  // Count packages by publisher
  const total = await prisma.packages.count();
  console.log(`\nTotal packages: ${total}`);
  
  // Get all publishers
  const publishers = await prisma.publishers.findMany({ select: { id: true, name: true } });
  console.log('\n=== PUBLISHERS ===');
  for (const pub of publishers) {
    const count = await prisma.packages.count({ where: { publisherId: pub.id } });
    console.log(`${pub.name}: ${count} packages`);
  }

  // Check assignments
  const assignments = await prisma.college_packages.findMany({
    take: 5,
    include: {
      package: { select: { name: true, publisher: { select: { name: true } } } },
      college: { select: { name: true } }
    }
  });
  console.log('\n=== SAMPLE ASSIGNMENTS ===');
  assignments.forEach(a => {
    console.log(`Package: ${a.package.name} | Publisher: ${a.package.publisher?.name} | College: ${a.college.name} | Status: ${a.status}`);
  });

  // Check who creates packages - look at the roles
  const users = await prisma.users.findMany({
    where: { role: { in: ['PUBLISHER', 'TEACHER', 'FACULTY'] } },
    select: { id: true, email: true, role: true, firstName: true, lastName: true }
  });
  console.log('\n=== PUBLISHER & TEACHER USERS ===');
  users.forEach(u => {
    console.log(`${u.email} | Role: ${u.role} | Name: ${u.firstName} ${u.lastName}`);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
