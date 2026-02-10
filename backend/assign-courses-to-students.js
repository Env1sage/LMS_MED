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

async function main() {
  console.log('🎓 Assigning courses to all students...\n');

  try {
    // Get all students and courses
    const [students, courses, faculty, owner] = await Promise.all([
      prisma.students.findMany({
        include: { user: true }
      }),
      prisma.courses.findMany({
        where: { status: 'PUBLISHED' },
        include: { learning_flow_steps: true }
      }),
      prisma.users.findMany({ 
        where: { role: 'FACULTY' }
      }),
      prisma.users.findFirst({ where: { role: 'BITFLOW_OWNER' } })
    ]);

    console.log(`📊 Found ${students.length} students and ${courses.length} courses\n`);

    let assignmentCount = 0;
    let progressCount = 0;

    // Group courses by college
    const coursesByCollege = {};
    courses.forEach(course => {
      if (!coursesByCollege[course.collegeId]) {
        coursesByCollege[course.collegeId] = [];
      }
      coursesByCollege[course.collegeId].push(course);
    });

    // Assign courses to each student
    for (const student of students) {
      const collegeCourses = coursesByCollege[student.collegeId] || [];
      
      if (collegeCourses.length === 0) {
        console.log(`⚠️  No courses found for college ${student.collegeId}`);
        continue;
      }

      // First, try to assign courses matching their year
      let assignedCourses = collegeCourses.filter(
        c => c.academicYear === student.currentAcademicYear
      );

      // If no matching year courses, assign any available courses from the college
      if (assignedCourses.length === 0) {
        assignedCourses = collegeCourses.slice(0, 5);
      } else if (assignedCourses.length < 5) {
        // If we have some matching courses but less than 5, add more
        const additionalCourses = collegeCourses
          .filter(c => !assignedCourses.includes(c))
          .slice(0, 5 - assignedCourses.length);
        assignedCourses = [...assignedCourses, ...additionalCourses];
      } else {
        // Take only first 5 if more available
        assignedCourses = assignedCourses.slice(0, 5);
      }

      // Get appropriate faculty or use owner as assignedBy
      const collegeFaculty = faculty.filter(f => f.collegeId === student.collegeId);
      const assignedBy = collegeFaculty[0]?.id || owner.id;

      // Create course assignments
      for (const course of assignedCourses) {
        try {
          await prisma.course_assignments.upsert({
            where: {
              courseId_studentId: {
                courseId: course.id,
                studentId: student.id
              }
            },
            update: {
              status: 'IN_PROGRESS'
            },
            create: {
              id: uuidv4(),
              courseId: course.id,
              studentId: student.id,
              assignedBy: assignedBy,
              assignmentType: 'INDIVIDUAL',
              status: 'IN_PROGRESS',
              assignedAt: new Date(),
              startedAt: new Date()
            }
          });
          assignmentCount++;

          // Create student progress record
          const totalSteps = course.learning_flow_steps.length;
          const completedSteps = Math.floor(Math.random() * Math.min(totalSteps, 3)); // 0-2 steps completed
          const stepIds = course.learning_flow_steps
            .slice(0, completedSteps)
            .map(s => s.id);

          await prisma.student_progress.upsert({
            where: {
              studentId_courseId: {
                studentId: student.id,
                courseId: course.id
              }
            },
            update: {
              completedSteps: stepIds.length,
              completedStepIds: stepIds,
              lastAccessedAt: new Date()
            },
            create: {
              id: uuidv4(),
              studentId: student.id,
              courseId: course.id,
              completedSteps: stepIds.length,
              completedStepIds: stepIds,
              status: completedSteps > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
              enrolledAt: new Date(),
              lastAccessedAt: new Date()
            }
          });
          progressCount++;
        } catch (error) {
          console.error(`Error assigning course ${course.id} to student ${student.id}:`, error.message);
        }
      }
    }

    console.log('\n✅ COURSE ASSIGNMENT COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📚 Created ${assignmentCount} course assignments`);
    console.log(`📊 Created ${progressCount} student progress records`);
    console.log(`👨‍🎓 Average courses per student: ${(assignmentCount / students.length).toFixed(1)}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Show sample student with courses
    const sampleStudent = await prisma.students.findFirst({
      include: {
        user: true,
        course_assignments: {
          include: {
            courses: {
              select: {
                title: true,
                academicYear: true
              }
            }
          }
        }
      }
    });

    if (sampleStudent) {
      console.log('📋 SAMPLE STUDENT VERIFICATION:');
      console.log(`Student: ${sampleStudent.fullName} (${sampleStudent.user.email})`);
      console.log(`Year: ${sampleStudent.currentAcademicYear}`);
      console.log(`Assigned Courses (${sampleStudent.course_assignments.length}):`);
      sampleStudent.course_assignments.forEach((ca, idx) => {
        console.log(`  ${idx + 1}. ${ca.courses.title} [${ca.courses.academicYear}]`);
      });
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main()
  .then(() => {
    console.log('✨ All students now have courses assigned!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
