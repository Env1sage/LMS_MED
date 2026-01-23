import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Create Bitflow Owner
  const hashedPassword = await bcrypt.hash('BitflowOwner@123', 10);
  
  const bitflowOwner = await prisma.users.upsert({
    where: { email: 'owner@bitflow.com' },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      id: uuidv4(),
      email: 'owner@bitflow.com',
      passwordHash: hashedPassword,
      fullName: 'Bitflow Platform Owner',
      role: UserRole.BITFLOW_OWNER,
      status: UserStatus.ACTIVE,
      updatedAt: new Date(),
    },
  });
  
  console.log('✅ Created Bitflow Owner:', bitflowOwner.email);
  
  // Create Security Policy if not exists
  const securityPolicy = await prisma.security_policies.upsert({
    where: { id: 'default-policy' },
    update: {},
    create: {
      id: 'default-policy',
      sessionTimeoutMinutes: 60,
      tokenExpiryMinutes: 15,
      refreshTokenExpiryDays: 30,
      maxConcurrentSessions: 3,
      watermarkEnabled: true,
      screenshotPrevention: true,
      publisherPortalEnabled: true,
      facultyPortalEnabled: true,
      studentPortalEnabled: true,
      mobileAppEnabled: true,
      updatedAt: new Date(),
    },
  });
  
  console.log('✅ Security policy ensured');
  
  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login Credentials:');
  console.log('   Email: owner@bitflow.com');
  console.log('   Password: BitflowOwner@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
