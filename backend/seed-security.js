const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Seeding Security Policy...');
  
  const existingPolicy = await prisma.security_policies.findFirst();
  
  if (existingPolicy) {
    console.log('✅ Security policy already exists');
    return;
  }
  
  const policy = await prisma.security_policies.create({
    data: {
      publisherPortalEnabled: true,
      facultyPortalEnabled: true,
      studentPortalEnabled: true,
      mobileAppEnabled: true,
      sessionTimeoutMinutes: 60,
      tokenExpiryMinutes: 15,
      maxConcurrentSessions: 3,
      watermarkEnabled: true,
    }
  });
  
  console.log('✅ Security policy created:', policy.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
