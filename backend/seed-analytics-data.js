require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Setup Prisma with adapter (required for v7)
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

async function seedAnalyticsData() {
  console.log('🌱 Seeding Analytics Data...\n');

  try {
    // Get faculty, courses, and students
    const faculty = await prisma.users.findFirst({
      where: { email: 'faculty1@aiimsnagpur.edu.in' }
    });

    const courses = await prisma.courses.findMany({
      where: { facultyId: faculty.id },
      include: { learning_flow_steps: true }
    });

    const students = await prisma.users.findMany({
      where: { 
        role: 'STUDENT'
      },
      take: 20
    });

    console.log(`📊 Found ${courses.length} courses and ${students.length} students\n`);

    let assignmentCount = 0;
    let progressCount = 0;

    // Assign courses to students
    for (const course of courses) {
      const studentsToAssign = students.slice(0, Math.floor(Math.random() * 10) + 5);
      
      for (const student of studentsToAssign) {
        // Check if assignment already exists
        const existing = await prisma.course_assignments.findFirst({
          where: { courseId: course.id, studentId: student.id }
        });

        if (existing) continue;

        // Create assignment
        const daysAgo = Math.floor(Math.random() * 30);
        const assignedDate = new Date();
        assignedDate.setDate(assignedDate.getDate() - daysAgo);

        const assignment = await prisma.course_assignments.create({
          data: {
            id: uuidv4(),
            courseId: course.id,
            studentId: student.id,
            assignedAt: assignedDate,
            status: Math.random() > 0.3 ? 'IN_PROGRESS' : 'NOT_STARTED',
          }
        });

        assignmentCount++;

        // Create progress for some assignments
        if (assignment.status === 'IN_PROGRESS' && course.learning_flow_steps.length > 0) {
          const completedSteps = Math.floor(Math.random() * course.learning_flow_steps.length);
          
          for (let i = 0; i < completedSteps; i++) {
            const step = course.learning_flow_steps[i];
            
            await prisma.student_step_progress.create({
              data: {
                id: uuidv4(),
                assignmentId: assignment.id,
                stepId: step.id,
                completionPercent: 100,
                timeSpent: Math.floor(Math.random() * 1800) + 300, // 5-35 minutes
                isCompleted: true,
                lastAccessed: new Date(assignedDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
              }
            });
            
            progressCount++;
          }

          // Update assignment progress
          if (completedSteps > 0) {
            const progress = (completedSteps / course.learning_flow_steps.length) * 100;
            const isCompleted = completedSteps === course.steps.length;
            
            await prisma.course_assignments.update({
              where: { id: assignment.id },
              data: {
                status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
                startedAt: assignedDate,
                completedAt: isCompleted ? new Date() : null,
                progressPercent: Math.floor(progress)
              }
            });
          }
        }
      }

      console.log(`✅ Assigned "${course.title}" to ${studentsToAssign.length} students`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ANALYTICS DATA SEEDING COMPLETE!');
    console.log('='.repeat(70));
    console.log(`\n📊 Summary:`);
    console.log(`   • Assignments Created: ${assignmentCount}`);
    console.log(`   • Progress Records: ${progressCount}`);
    console.log(`   • Students Enrolled: ${students.length}`);
    console.log(`   • Courses Assigned: ${courses.length}\n`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAnalyticsData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
