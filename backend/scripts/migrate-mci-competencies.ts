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
  log: ['warn', 'error'],
});

/**
 * MCI Competency Migration
 * PERMANENT DATABASE MIGRATION - Not seed data
 * This adds official Medical Council of India competencies permanently
 */

async function main() {
  console.log('🏥 MCI Competencies - PERMANENT MIGRATION');
  console.log('━'.repeat(70));
  console.log('⚠️  This is a ONE-TIME permanent database migration');
  console.log('   Data will persist even if seed data is deleted\n');

  // Load extracted competencies
  const data = JSON.parse(
    readFileSync('/tmp/mci_competencies_extracted.json', 'utf8')
  );

  // Create system user for migration if doesn't exist
  let systemUser = await prisma.users.findFirst({
    where: { email: 'system@mci.gov.in' }
  });

  if (!systemUser) {
    console.log('📝 Creating system user for MCI data ownership...');
    systemUser = await prisma.users.create({
      data: {
        id: 'system-mci-' + uuidv4().substring(0, 8),
        email: 'system@mci.gov.in',
        passwordHash: '', // No password - system account
        fullName: 'MCI System',
        role: 'BITFLOW_OWNER',
        status: 'ACTIVE',
        updatedAt: new Date()
      }
    });
    console.log('   ✓ System user created\n');
  }

  let competenciesAdded = 0;
  let competenciesUpdated = 0;
  let topicsAdded = 0;
  const now = new Date();

  // Process each subject
  for (const [subjectCode, subjectData] of Object.entries(data)) {
    const { name: subjectName, competencies } = subjectData as any;
    
    console.log(`\n📚 ${subjectName} (${subjectCode})`);
    console.log(`   Processing ${competencies.length} competencies...`);

    // Group by topic number to create topics
    const topicGroups = new Map<string, any[]>();
    competencies.forEach((comp: any) => {
      const key = `${subjectCode}${comp.topicNumber}`;
      if (!topicGroups.has(key)) {
        topicGroups.set(key, []);
      }
      topicGroups.get(key)!.push(comp);
    });

    // Create topics first
    for (const [topicKey, topicComps] of topicGroups) {
      const topicNumber = topicComps[0].topicNumber;
      const topicCode = `${subjectCode}-T${topicNumber}`;
      const topicName = `${subjectName} - Topic ${topicNumber}`;

      try {
        const existingTopic = await prisma.topics.findUnique({
          where: { code: topicCode }
        });

        if (!existingTopic) {
          await prisma.topics.create({
            data: {
              id: uuidv4(),
              code: topicCode,
              name: topicName,
              description: `MCI ${subjectName} Topic ${topicNumber} - ${topicComps.length} competencies`,
              subject: subjectName,
              academicYear: getAcademicYear(parseInt(topicNumber)),
              status: 'ACTIVE',
              createdAt: now,
              updatedAt: now
            }
          });
          topicsAdded++;
        }
      } catch (error: any) {
        console.error(`   ⚠️  Topic ${topicCode}:`, error.message);
      }
    }

    // Add competencies
    for (const comp of competencies) {
      try {
        const domain = getCompetencyDomain(subjectCode, comp.description);
        const topicCode = `${subjectCode}-T${comp.topicNumber}`;

        // Find topic
        const topic = await prisma.topics.findUnique({
          where: { code: topicCode }
        });

        const existing = await prisma.competencies.findUnique({
          where: { code: comp.code }
        });

        if (existing) {
          // Update if description changed
          if (existing.description !== comp.description) {
            await prisma.competencies.update({
              where: { code: comp.code },
              data: {
                description: comp.description,
                updatedAt: now
              }
            });
            competenciesUpdated++;
          }
        } else {
          // Create new
          await prisma.competencies.create({
            data: {
              id: uuidv4(),
              code: comp.code,
              title: `${subjectName} ${comp.code}`,
              description: comp.description,
              subject: subjectName,
              domain: domain,
              academicLevel: 'UG',
              status: 'ACTIVE',
              version: 1,
              topicId: topic?.id,
              createdBy: systemUser.id,
              createdAt: now,
              updatedAt: now
            }
          });
          competenciesAdded++;
        }
      } catch (error: any) {
        console.error(`   ❌ ${comp.code}:`, error.message);
      }
    }

    console.log(`   ✅ Completed ${subjectName}`);
  }

  console.log('\n' + '━'.repeat(70));
  console.log('✅ MCI PERMANENT MIGRATION COMPLETE\n');
  console.log(`📊 Statistics:`);
  console.log(`   Topics Created    : ${topicsAdded}`);
  console.log(`   Competencies Added: ${competenciesAdded}`);
  console.log(`   Competencies Updated: ${competenciesUpdated}`);
  console.log(`   Total Competencies: ${competenciesAdded + competenciesUpdated}`);
  console.log('\n💾 Data is now PERMANENT in the database');
  console.log('   Will persist even if seed data is deleted\n');
}

/**
 * Map subject code to CompetencyDomain
 */
function getCompetencyDomain(
  subjectCode: string,
  description: string
): 'COGNITIVE' | 'CLINICAL' | 'PRACTICAL' {
  const desc = description.toLowerCase();
  
  // Check for practical/procedural keywords
  if (/demonstrate|perform|examine|identify|procedure|skill|technique|dissect|practice/.test(desc)) {
    return 'PRACTICAL';
  }
  
  // Check for clinical keywords
  if (/diagnose|patient|clinical|treatment|manage|counsel|prescribe|therapy/.test(desc)) {
    return 'CLINICAL';
  }
  
  // Default to cognitive for theoretical knowledge
  return 'COGNITIVE';
}

/**
 * Map topic number to AcademicYear
 */
function getAcademicYear(topicNum: number): 'YEAR_1' | 'YEAR_2' | 'PART_1' | 'PART_2' | 'INTERNSHIP' | null {
  // MCI curriculum spans across years
  if (topicNum <= 3) return 'YEAR_1';
  if (topicNum <= 6) return 'YEAR_2';
  if (topicNum <= 8) return 'PART_1';
  if (topicNum <= 10) return 'PART_2';
  return 'INTERNSHIP';
}

main()
  .catch((e) => {
    console.error('\n❌ Migration Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
