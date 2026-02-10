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
  console.log('🎓 Creating courses for all colleges...\n');

  try {
    // Get owner to use as faculty fallback
    const owner = await prisma.users.findFirst({ where: { role: 'BITFLOW_OWNER' } });
    
    // Get all colleges
    const colleges = await prisma.colleges.findMany({
      include: {
        _count: {
          select: { courses: true }
        }
      }
    });

    // Find a college with courses to use as template
    const templateCollege = colleges.find(c => c._count.courses > 0);
    if (!templateCollege) {
      console.log('❌ No colleges with courses found!');
      return;
    }

    console.log(`📖 Using ${templateCollege.name} as template (${templateCollege._count.courses} courses)\n`);

    // Get template courses
    const templateCourses = await prisma.courses.findMany({
      where: { collegeId: templateCollege.id },
      include: {
        course_competencies: {
          include: {
            competencies: true
          }
        },
        learning_flow_steps: true
      }
    });

    // Find colleges without courses
    const collegesWithoutCourses = colleges.filter(c => c._count.courses === 0);

    console.log(`🏥 Found ${collegesWithoutCourses.length} colleges without courses:\n`);
    collegesWithoutCourses.forEach(c => {
      console.log(`   - ${c.name}`);
    });
    console.log();

    let totalCoursesCreated = 0;

    // Create courses for each college
    for (const college of collegesWithoutCourses) {
      console.log(`\n📚 Creating courses for ${college.name}...`);
      
      // Get faculty for this college or use owner
      const collegeFaculty = await prisma.users.findMany({
        where: { role: 'FACULTY', collegeId: college.id },
        take: 1
      });
      const facultyId = collegeFaculty[0]?.id || owner.id;
      
      for (const templateCourse of templateCourses) {
        const newCourseId = uuidv4();
        
        // Create the course
        await prisma.courses.create({
          data: {
            id: newCourseId,
            collegeId: college.id,
            facultyId: facultyId,
            title: templateCourse.title,
            description: templateCourse.description,
            academicYear: templateCourse.academicYear,
            courseCode: templateCourse.courseCode,
            status: 'PUBLISHED',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Copy course competencies
        for (const cc of templateCourse.course_competencies) {
          await prisma.course_competencies.create({
            data: {
              id: uuidv4(),
              courseId: newCourseId,
              competencyId: cc.competencyId,
              createdAt: new Date()
            }
          });
        }

        // Copy learning flow steps
        for (const step of templateCourse.learning_flow_steps) {
          await prisma.learning_flow_steps.create({
            data: {
              id: uuidv4(),
              courseId: newCourseId,
              stepOrder: step.stepOrder,
              stepType: step.stepType,
              unitId: step.unitId,
              testId: step.testId,
              selfPacedResourceId: step.selfPacedResourceId,
              isRequired: step.isRequired,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }

        totalCoursesCreated++;
      }
      
      console.log(`✓ Created ${templateCourses.length} courses for ${college.name}`);
    }

    console.log(`\n✅ SUCCESS!`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📚 Total courses created: ${totalCoursesCreated}`);
    console.log(`🏥 Colleges now have courses: ${colleges.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

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
    console.log('✨ All colleges now have courses!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
