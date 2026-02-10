const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const dbUrl = new URL(process.env.DATABASE_URL);
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

function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
}

function generateScore(mean = 70, stdDev = 15) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const score = mean + z * stdDev;
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function main() {
  console.log('📊 Quick Analytics Seeding for Presentation...\n');

  try {
    const [students, mcqs, learningUnits, users] = await Promise.all([
      prisma.students.findMany({ take: 200 }),
      prisma.mcqs.findMany({ take: 1000 }),
      prisma.learning_units.findMany({ take: 500 }),
      prisma.users.findMany({ take: 100 })
    ]);

    console.log(`✓ Working with ${students.length} students, ${mcqs.length} MCQs\n`);

    // 1. PRACTICE SESSIONS (lighter version)
    console.log('🎯 Creating practice sessions...');
    const subjects = ['Anatomy', 'Physiology', 'Medicine', 'Surgery'];
    let practiceCount = 0;

    for (const student of students) {
      const numSessions = Math.floor(Math.random() * 6) + 3; // 3-8 sessions
      
      for (let i = 0; i < numSessions; i++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const totalQ = Math.floor(Math.random() * 20) + 10;
        const accuracy = 0.4 + Math.random() * 0.45;
        const correct = Math.round(totalQ * accuracy);
        
        await prisma.practice_sessions.create({
          data: {
            id: uuidv4(),
            studentId: student.id,
            subject: subject,
            totalQuestions: totalQ,
            correctAnswers: correct,
            incorrectAnswers: totalQ - correct,
            skippedQuestions: 0,
            timeSpentSeconds: totalQ * (40 + Math.random() * 60),
            startedAt: randomDate(50),
            completedAt: randomDate(48),
            metadata: {}
          }
        });
        practiceCount++;
      }
      if (practiceCount % 200 === 0) console.log(`  ${practiceCount} sessions...`);
    }
    console.log(`✓ Created ${practiceCount} practice sessions\n`);

    // 2. LEARNING UNIT ACCESS LOGS
    console.log('📚 Creating access logs...');
    let accessCount = 0;

    for (const student of students) {
      const numAccess = Math.floor(Math.random() * 15) + 8;
      
      for (let i = 0; i < numAccess; i++) {
        const unit = learningUnits[Math.floor(Math.random() * learningUnits.length)];
        const duration = Math.floor(300 + Math.random() * 2000);
        const start = randomDate(40);
        
        await prisma.learning_unit_access_logs.create({
          data: {
            id: uuidv4(),
            learningUnitId: unit.id,
            userId: student.userId,
            collegeId: student.collegeId,
            accessToken: `tok_${uuidv4().substring(0, 12)}`,
            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            userAgent: 'Chrome/120.0',
            deviceType: ['Desktop', 'Mobile'][Math.floor(Math.random() * 2)],
            sessionStarted: start,
            sessionEnded: new Date(start.getTime() + duration * 1000),
            duration: duration,
            watermarkPayload: { studentId: student.id },
            violationDetected: false
          }
        });
        accessCount++;
      }
      if (accessCount % 500 === 0) console.log(`  ${accessCount} access logs...`);
    }
    console.log(`✓ Created ${accessCount} access logs\n`);

    // 3. AUDIT LOGS
    console.log('📋 Creating audit logs...');
    const actions = ['LOGIN_SUCCESS', 'CONTENT_ACCESSED', 'CONTENT_COMPLETED', 'LEARNING_UNIT_ACCESSED', 'STEP_COMPLETED'];
    let auditCount = 0;

    for (const user of users) {
      const numActions = Math.floor(Math.random() * 20) + 10;
      
      for (let i = 0; i < numActions; i++) {
        await prisma.audit_logs.create({
          data: {
            id: uuidv4(),
            userId: user.id,
            collegeId: user.collegeId,
            publisherId: user.publisherId,
            action: actions[Math.floor(Math.random() * actions.length)],
            entityType: 'USER',
            entityId: user.id,
            description: 'User activity',
            metadata: {},
            ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
            userAgent: 'Mozilla/5.0',
            timestamp: randomDate(60)
          }
        });
        auditCount++;
      }
    }
    console.log(`✓ Created ${auditCount} audit logs\n`);

    // 4. UPDATE MCQ STATS
    console.log('📊 Updating MCQ statistics...');
    for (const mcq of mcqs) {
      await prisma.mcqs.update({
        where: { id: mcq.id },
        data: {
          usageCount: Math.floor(Math.random() * 200) + 50,
          correctRate: 0.35 + Math.random() * 0.5,
          updatedAt: new Date()
        }
      });
    }
    console.log(`✓ Updated ${mcqs.length} MCQs\n`);

    // 5. CREATE RATINGS
    console.log('⭐ Creating ratings...');
    let ratingCount = 0;
    
    for (const student of students.slice(0, 150)) {
      const courseAssignments = await prisma.course_assignments.findMany({
        where: { studentId: student.id },
        take: 2
      });

      for (const ca of courseAssignments) {
        try {
          await prisma.ratings.create({
            data: {
              id: uuidv4(),
              studentId: student.id,
              collegeId: student.collegeId,
              ratingType: 'COURSE',
              entityId: ca.courseId,
              rating: Math.floor(Math.random() * 3) + 3,
              feedback: Math.random() > 0.5 ? 'Great course!' : null,
              isAnonymous: Math.random() > 0.5,
              updatedAt: new Date()
            }
          });
          ratingCount++;
        } catch (e) {}
      }
    }
    console.log(`✓ Created ${ratingCount} ratings\n`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ ANALYTICS DATA READY FOR PRESENTATION!');
    console.log('='.repeat(70));
    console.log(`🎯 Practice Sessions: ${practiceCount}`);
    console.log(`📚 Access Logs: ${accessCount}`);
    console.log(`📋 Audit Logs: ${auditCount}`);
    console.log(`📊 MCQ Stats: ${mcqs.length} updated`);
    console.log(`⭐ Ratings: ${ratingCount}`);
    console.log('='.repeat(70));
    console.log('\n🎨 Your dashboards now have beautiful, presentation-ready graphs!');
    console.log('📈 Charts will show realistic student engagement and performance\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
