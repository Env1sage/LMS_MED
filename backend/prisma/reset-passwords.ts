import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

// Parse DATABASE_URL for pg Pool
const dbUrl = new URL(process.env.DATABASE_URL!);
const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port),
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: false,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function resetPasswords() {
  console.log('🔐 Resetting user passwords...');
  
  // Password for publisher/college admins
  const stdPassword = await bcrypt.hash('Password123!', 10);
  // Password for bitflow owner
  const ownerPassword = await bcrypt.hash('BitflowAdmin@2026', 10);
  // Password for students
  const studentPassword = await bcrypt.hash('Student@123', 10);
  
  // Update owner password
  await prisma.users.update({
    where: { email: 'owner@bitflow.com' },
    data: { passwordHash: ownerPassword }
  });
  console.log('✅ Updated owner@bitflow.com with BitflowAdmin@2026');
  
  // Update publisher admin
  await prisma.users.update({
    where: { email: 'admin@elsevier.com' },
    data: { passwordHash: stdPassword }
  });
  console.log('✅ Updated admin@elsevier.com with Password123!');
  
  // Update college admin
  await prisma.users.update({
    where: { email: 'admin@aiimsnagpur.edu.in' },
    data: { passwordHash: stdPassword }
  });
  console.log('✅ Updated admin@aiimsnagpur.edu.in with Password123!');
  
  // Update faculty
  await prisma.users.updateMany({
    where: { role: UserRole.FACULTY },
    data: { passwordHash: stdPassword }
  });
  console.log('✅ Updated all FACULTY users with Password123!');
  
  // Update all students
  const studentsUpdated = await prisma.users.updateMany({
    where: { role: UserRole.STUDENT },
    data: { passwordHash: studentPassword }
  });
  console.log(`✅ Updated ${studentsUpdated.count} STUDENT users with Student@123`);
  
  // List all students for reference
  const students = await prisma.users.findMany({
    where: { role: UserRole.STUDENT },
    select: { email: true, fullName: true },
    take: 10
  });
  console.log('\n📋 Student accounts (first 10):');
  students.forEach(s => console.log(`   - ${s.email} (${s.fullName})`));
  
  console.log('\n🎉 Password reset complete!');
}

resetPasswords()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
