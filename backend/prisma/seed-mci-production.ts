import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

// Setup Prisma with adapter (required for v7)
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
const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

/**
 * MCI Competency Production Seed
 * This adds the official Medical Council of India competencies
 * Source: MCI Graduate Medical Education Regulations Vol I, II, III
 * Status: PRODUCTION DATA - Permanent database
 */

async function main() {
  console.log('🏥 Seeding MCI Competencies - Production Data');
  console.log('━'.repeat(60));

  // Load extracted competencies
  const data = JSON.parse(
    readFileSync('/tmp/mci_competencies_full.json', 'utf8')
  );

  // Get Bitflow Owner user for createdBy
  const owner = await prisma.users.findFirst({
    where: { email: 'owner@bitflow.com' }
  });

  if (!owner) {
    throw new Error('Bitflow Owner user not found. Run main seed first.');
  }

  let totalAdded = 0;
  const now = new Date();

  // Process each subject
  for (const [subjectCode, subjectData] of Object.entries(data)) {
    const { name: subjectName, competencies } = subjectData as any;
    
    console.log(`\n📚 ${subjectName} (${subjectCode})`);
    console.log(`   Adding ${competencies.length} competencies...`);

    for (const comp of competencies) {
      try {
        // Map subject to domain (simplified mapping)
        const domain = getCompetencyDomain(subjectCode, comp.description);
        
        // Map topic number to academic level
        const academicLevel = getAcademicLevel(comp.topicNum);

        await prisma.competencies.upsert({
          where: { code: comp.code },
          update: {
            description: comp.description,
            updatedAt: now
          },
          create: {
            id: uuidv4(),
            code: comp.code,
            title: `${subjectName} - Topic ${comp.topicNum}`,
            description: comp.description,
            subject: subjectName,
            domain: domain,
            academicLevel: academicLevel,
            status: 'ACTIVE',
            version: 1,
            createdBy: owner.id,
            updatedAt: now
          }
        });

        totalAdded++;
      } catch (error) {
        console.error(`   ❌ Failed to add ${comp.code}:`, error.message);
      }
    }

    console.log(`   ✅ Completed ${subjectName}`);
  }

  console.log('\n' + '━'.repeat(60));
  console.log(`✅ MCI Production Seed Complete`);
  console.log(`📊 Total Competencies: ${totalAdded}`);
  console.log(`🏥 Ready for Production Use`);
}

/**
 * Map subject code to CompetencyDomain
 */
function getCompetencyDomain(
  subjectCode: string,
  description: string
): 'COGNITIVE' | 'CLINICAL' | 'PRACTICAL' {
  // Basic sciences - mostly cognitive
  if (['AN', 'PY', 'BI', 'PA', 'MI', 'PH', 'FM', 'CM'].includes(subjectCode)) {
    // Check if it mentions practical/clinical skills
    if (/demonstrate|perform|examine|identify|procedure|skill/i.test(description)) {
      return 'PRACTICAL';
    }
    if (/diagnose|patient|clinical|treatment|manage/i.test(description)) {
      return 'CLINICAL';
    }
    return 'COGNITIVE';
  }

  // Clinical subjects
  if (['IM', 'SU', 'OR', 'EN', 'OP', 'OG', 'PE', 'PS', 'DE', 'DR', 'RT', 'CT'].includes(subjectCode)) {
    // Check if it's knowledge-based
    if (/describe|discuss|enumerate|define|classify|explain/i.test(description)) {
      return 'COGNITIVE';
    }
    // Check if practical
    if (/demonstrate|perform|skill|technique|procedure/i.test(description)) {
      return 'PRACTICAL';
    }
    return 'CLINICAL';
  }

  return 'COGNITIVE';
}

/**
 * Map topic number to AcademicLevel
 */
function getAcademicLevel(topicNum: string): 'UG' | 'PG' | 'SPECIALIZATION' {
  const num = parseInt(topicNum);
  
  // Topics 1-5: Undergraduate
  if (num <= 5) return 'UG';
  
  // Topics 6-8: Postgraduate
  if (num <= 8) return 'PG';
  
  // Topics 9+: Specialization
  return 'SPECIALIZATION';
}

main()
  .catch((e) => {
    console.error('❌ Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
