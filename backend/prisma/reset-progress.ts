import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
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

async function resetProgress() {
  console.log('🔄 Resetting all student progress...');
  
  // Delete all step progress records
  const deletedStepProgress = await prisma.step_progress.deleteMany({});
  console.log(`✅ Deleted ${deletedStepProgress.count} step progress records`);
  
  // Delete all student progress records
  const deletedStudentProgress = await prisma.student_progress.deleteMany({});
  console.log(`✅ Deleted ${deletedStudentProgress.count} student progress records`);
  
  console.log('\n🎉 All student progress has been reset!');
  console.log('Students can now start courses from the beginning.');
}

resetProgress()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
