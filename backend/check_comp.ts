import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from 'dotenv';

config();

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

async function main() {
  const total = await prisma.competencies.count();
  console.log(`\n📊 Total Competencies: ${total}`);
  
  const bySubject = await prisma.$queryRaw`
    SELECT subject, COUNT(*)::int as count 
    FROM competencies 
    GROUP BY subject 
    ORDER BY count DESC 
    LIMIT 10
  `;
  
  console.log('\n🏥 Top 10 Subjects:');
  (bySubject as any[]).forEach((s: any) => {
    console.log(`   ${s.subject}: ${s.count} competencies`);
  });
  
  const samples = await prisma.competencies.findMany({
    take: 5,
    orderBy: { code: 'asc' }
  });
  
  console.log('\n📝 Sample Competencies:');
  samples.forEach((c: any) => {
    console.log(`   ${c.code}: ${c.description.substring(0, 60)}...`);
  });
  
  await prisma.$disconnect();
  process.exit(0);
}

main();
