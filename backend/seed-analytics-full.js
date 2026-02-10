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

// Helper to generate dates in the past
function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
}

// Helper to generate realistic scores (normal distribution)
function generateScore(mean = 70, stdDev = 15) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const score = mean + z * stdDev;
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function main() {
  console.log('📊 Starting Comprehensive Analytics Data Seeding...\n');

  try {
    // Get all necessary data
    const [students, courses, tests, mcqs, learningUnits] = await Promise.all([
      prisma.students.findMany({ include: { user: true } }),
      prisma.courses.findMany(),
      prisma.tests.findMany({ include: { questions: true } }),
      prisma.mcqs.findMany(),
      prisma.learning_units.findMany()
    ]);

    console.log(`✓ Found ${students.length} students`);
    console.log(`✓ Found ${courses.length} courses`);
    console.log(`✓ Found ${tests.length} tests`);
    console.log(`✓ Found ${mcqs.length} MCQs`);
    console.log(`✓ Found ${learningUnits.length} learning units\n`);

    // 1. CREATE TEST ATTEMPTS
    console.log('📝 Creating test attempts and responses...');
    let attemptCount = 0;
    let responseCount = 0;

    for (const test of tests.slice(0, 40)) {
      const testAssignments = await prisma.test_assignments.findMany({
        where: { testId: test.id },
        take: 25
      });

      for (const assignment of testAssignments) {
        if (Math.random() > 0.25) { // 75% attempt rate
          const score = generateScore(68, 16);
          const totalQuestions = test.totalQuestions;
          const correctAnswers = Math.round((score / 100) * totalQuestions);
          const timeSpent = test.durationMinutes * 60 * (0.6 + Math.random() * 0.35);
          const completed = Math.random() > 0.15; // 85% completion rate

          const attempt = await prisma.test_attempts.create({
            data: {
              id: uuidv4(),
              testId: test.id,
              studentId: assignment.studentId,
              attemptNumber: 1,
              status: completed ? 'COMPLETED' : 'IN_PROGRESS',
              startedAt: randomDate(35),
              submittedAt: completed ? randomDate(30) : null,
              totalScore: completed ? score : null,
              totalCorrect: completed ? correctAnswers : null,
              totalIncorrect: completed ? (totalQuestions - correctAnswers) : null,
              totalSkipped: 0,
              percentageScore: completed ? score : null,
              isPassed: completed ? (score >= (test.passingMarks || 50)) : null,
              timeSpentSeconds: Math.floor(timeSpent),
              updatedAt: new Date()
            }
          });

          // Create responses for completed attempts
          if (completed) {
            const testQuestions = await prisma.test_questions.findMany({
              where: { testId: test.id }
            });

            for (const tq of testQuestions) {
              const isCorrect = Math.random() < (correctAnswers / totalQuestions);
              const mcq = await prisma.mcqs.findUnique({ where: { id: tq.mcqId } });
              
              if (mcq) {
                const options = ['A', 'B', 'C', 'D'];
                await prisma.test_responses.create({
                  data: {
                    id: uuidv4(),
                    attemptId: attempt.id,
                    mcqId: tq.mcqId,
                    questionOrder: tq.questionOrder,
                    selectedAnswer: isCorrect ? mcq.correctAnswer : options[Math.floor(Math.random() * options.length)],
                    isCorrect: isCorrect,
                    marksAwarded: isCorrect ? tq.marks : (test.negativeMarking ? -test.negativeMarkValue : 0),
                    timeSpentSeconds: Math.floor(Math.random() * 150) + 20,
                    answeredAt: randomDate(30)
                  }
                });
                responseCount++;
              }
            }
          }

          attemptCount++;
          if (attemptCount % 100 === 0) console.log(`  Created ${attemptCount} test attempts...`);
        }
      }
    }
    console.log(`✓ Created ${attemptCount} test attempts with ${responseCount} responses\n`);

    // 2. CREATE PRACTICE SESSIONS
    console.log('🎯 Creating practice sessions with responses...');
    let practiceCount = 0;
    let practiceRespCount = 0;

    const subjects = ['Anatomy', 'Physiology', 'Biochemistry', 'Medicine', 'Surgery', 'Pathology'];

    for (const student of students.slice(0, 350)) {
      const numSessions = Math.floor(Math.random() * 12) + 8; // 8-20 sessions per student

      for (let i = 0; i < numSessions; i++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const sessionMcqs = Math.floor(Math.random() * 35) + 15; // 15-50 questions
        const accuracy = 0.35 + Math.random() * 0.5; // 35-85% accuracy
        const correct = Math.round(sessionMcqs * accuracy);
        const incorrect = sessionMcqs - correct;
        const timePerQuestion = 35 + Math.random() * 85; // 35-120 seconds per Q
        const startTime = randomDate(65);
        const endTime = new Date(startTime.getTime() + (sessionMcqs * timePerQuestion * 1000));

        const session = await prisma.practice_sessions.create({
          data: {
            id: uuidv4(),
            studentId: student.id,
            subject: subject,
            topic: null,
            totalQuestions: sessionMcqs,
            correctAnswers: correct,
            incorrectAnswers: incorrect,
            skippedQuestions: 0,
            timeSpentSeconds: Math.floor(sessionMcqs * timePerQuestion),
            startedAt: startTime,
            completedAt: endTime,
            metadata: { difficulty: ['K', 'KH', 'S'][Math.floor(Math.random() * 3)] }
          }
        });

        // Create practice responses
        const subjectMcqs = mcqs.filter(m => m.subject === subject);
        if (subjectMcqs.length > 0) {
          for (let q = 0; q < Math.min(sessionMcqs, subjectMcqs.length); q++) {
            const mcq = subjectMcqs[q % subjectMcqs.length];
            const isCorrect = q < correct;
            
            await prisma.practice_responses.create({
              data: {
                id: uuidv4(),
                sessionId: session.id,
                mcqId: mcq.id,
                selectedAnswer: isCorrect ? mcq.correctAnswer : 'A',
                isCorrect: isCorrect,
                timeSpentSeconds: Math.floor(25 + Math.random() * 95),
                viewedExplanation: Math.random() > 0.35,
                answeredAt: new Date(startTime.getTime() + (q * timePerQuestion * 1000))
              }
            });
            practiceRespCount++;
          }
        }

        practiceCount++;
        if (practiceCount % 200 === 0) console.log(`  Created ${practiceCount} practice sessions...`);
      }
    }
    console.log(`✓ Created ${practiceCount} practice sessions with ${practiceRespCount} responses\n`);

    // 3. CREATE LEARNING UNIT ACCESS LOGS
    console.log('📚 Creating learning unit access logs...');
    let accessCount = 0;

    for (const student of students.slice(0, 450)) {
      const unitsToAccess = Math.floor(Math.random() * 25) + 15; // 15-40 units per student
      const accessedUnits = learningUnits
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(unitsToAccess, learningUnits.length));

      for (const unit of accessedUnits) {
        const sessionDuration = Math.floor(180 + Math.random() * 2700); // 3-48 minutes
        const startTime = randomDate(50);
        const endTime = new Date(startTime.getTime() + sessionDuration * 1000);

        await prisma.learning_unit_access_logs.create({
          data: {
            id: uuidv4(),
            learningUnitId: unit.id,
            userId: student.userId,
            collegeId: student.collegeId,
            accessToken: `tok_${uuidv4().substring(0, 16)}`,
            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            userAgent: ['Chrome/120.0', 'Firefox/119.0', 'Safari/17.0'][Math.floor(Math.random() * 3)],
            deviceType: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
            sessionStarted: startTime,
            sessionEnded: endTime,
            duration: sessionDuration,
            watermarkPayload: { 
              studentId: student.id, 
              timestamp: startTime.toISOString(),
              deviceId: uuidv4().substring(0, 8)
            },
            violationDetected: Math.random() < 0.02 // 2% violation rate
          }
        });

        accessCount++;
        if (accessCount % 1000 === 0) console.log(`  Created ${accessCount} access logs...`);
      }
    }
    console.log(`✓ Created ${accessCount} learning unit access logs\n`);

    // 4. CREATE AUDIT LOGS
    console.log('📋 Creating audit logs for activity tracking...');
    let auditCount = 0;

    const users = await prisma.users.findMany({ take: 150 });
    const actions = [
      'USER_LOGIN', 'USER_LOGOUT', 'CONTENT_VIEWED', 'COURSE_ENROLLED',
      'TEST_STARTED', 'TEST_SUBMITTED', 'PRACTICE_STARTED', 'PRACTICE_COMPLETED',
      'CONTENT_DOWNLOADED', 'PROFILE_UPDATED', 'ASSIGNMENT_SUBMITTED'
    ];

    for (const user of users) {
      const numActions = Math.floor(Math.random() * 40) + 20; // 20-60 actions per user
      
      for (let i = 0; i < numActions; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        await prisma.audit_logs.create({
          data: {
            id: uuidv4(),
            userId: user.id,
            collegeId: user.collegeId,
            publisherId: user.publisherId,
            action: action,
            entityType: ['USER', 'COURSE', 'TEST', 'CONTENT'][Math.floor(Math.random() * 4)],
            entityId: user.id,
            description: `User performed ${action.toLowerCase().replace(/_/g, ' ')}`,
            metadata: { 
              browser: ['Chrome', 'Firefox', 'Safari'][Math.floor(Math.random() * 3)],
              os: ['Windows', 'macOS', 'Linux'][Math.floor(Math.random() * 3)]
            },
            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            userAgent: 'Mozilla/5.0',
            timestamp: randomDate(70)
          }
        });
        auditCount++;
      }
      if (auditCount % 500 === 0) console.log(`  Created ${auditCount} audit logs...`);
    }
    console.log(`✓ Created ${auditCount} audit logs\n`);

    // 5. CREATE RATINGS
    console.log('⭐ Creating content ratings and feedback...');
    let ratingCount = 0;

    for (const student of students.slice(0, 300)) {
      // Rate courses
      const studentCourses = await prisma.course_assignments.findMany({
        where: { studentId: student.id },
        take: 4
      });

      for (const ca of studentCourses) {
        if (Math.random() > 0.4) { // 60% rating rate
          try {
            await prisma.ratings.create({
              data: {
                id: uuidv4(),
                studentId: student.id,
                collegeId: student.collegeId,
                ratingType: 'COURSE',
                entityId: ca.courseId,
                rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
                feedback: Math.random() > 0.5 ? [
                  'Excellent course content and structure',
                  'Very helpful for understanding the concepts',
                  'Great learning experience',
                  'Well-organized and comprehensive',
                  'Could use more practical examples'
                ][Math.floor(Math.random() * 5)] : null,
                isAnonymous: Math.random() > 0.4,
                updatedAt: new Date()
              }
            });
            ratingCount++;
          } catch (e) {
            // Skip if already exists
          }
        }
      }
    }
    console.log(`✓ Created ${ratingCount} ratings\n`);

    // 6. UPDATE MCQ STATISTICS
    console.log('📊 Updating MCQ usage statistics...');
    const mcqsToUpdate = await prisma.mcqs.findMany({ take: 2000 });
    
    for (const mcq of mcqsToUpdate) {
      const usageCount = Math.floor(Math.random() * 250) + 80; // 80-330 uses
      const correctRate = 0.30 + Math.random() * 0.55; // 30-85%

      await prisma.mcqs.update({
        where: { id: mcq.id },
        data: {
          usageCount: usageCount,
          correctRate: parseFloat(correctRate.toFixed(3)),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✓ Updated ${mcqsToUpdate.length} MCQ statistics\n`);

    // SUMMARY
    console.log('\n' + '='.repeat(75));
    console.log('✅ COMPREHENSIVE ANALYTICS DATA SEEDING COMPLETED!');
    console.log('='.repeat(75));
    console.log(`📝 Test Attempts: ${attemptCount} (with ${responseCount} responses)`);
    console.log(`🎯 Practice Sessions: ${practiceCount} (with ${practiceRespCount} responses)`);
    console.log(`📚 Learning Unit Access Logs: ${accessCount}`);
    console.log(`📋 Audit Logs: ${auditCount}`);
    console.log(`⭐ Ratings & Feedback: ${ratingCount}`);
    console.log(`📊 MCQ Statistics Updated: ${mcqsToUpdate.length}`);
    console.log('='.repeat(75));
    console.log('\n🎨 Your dashboards are now filled with beautiful analytics!');
    console.log('📈 Graphs will show:');
    console.log('   • Student performance trends (test scores, practice accuracy)');
    console.log('   • Learning unit engagement (access patterns, time spent)');
    console.log('   • Course completion rates and progress');
    console.log('   • MCQ difficulty analysis and usage stats');
    console.log('   • User activity timelines');
    console.log('   • Rating distributions and feedback');
    console.log('\n🚀 Login to any portal to see presentation-ready visualizations!\n');

  } catch (error) {
    console.error('❌ Error during analytics seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
