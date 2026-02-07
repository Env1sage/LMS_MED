require('dotenv').config();
const { Pool } = require('pg');

// Setup PostgreSQL connection
const dbUrl = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port),
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: false,
});

async function seedAnalyticsData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding Analytics Data...\n');

    // Get faculty courses
    const facultyResult = await client.query(`
      SELECT id FROM users WHERE email = 'faculty1@aiimsnagpur.edu.in'
    `);
    
    const facultyId = facultyResult.rows[0].id;

    const coursesResult = await client.query(`
      SELECT c.id, c.title, c."facultyId",
             COUNT(lfs.id) as step_count
      FROM courses c
      LEFT JOIN learning_flow_steps lfs ON c.id = lfs."courseId"
      WHERE c."facultyId" = $1
      GROUP BY c.id
    `, [facultyId]);

    // Get students
    const studentsResult = await client.query(`
      SELECT s.id, u.email FROM students s
      JOIN users u ON s."userId" = u.id
      WHERE u.role = 'STUDENT' LIMIT 20
    `);

    const courses = coursesResult.rows;
    const students = studentsResult.rows;

    console.log(`📊 Found ${courses.length} courses and ${students.length} students\n`);

    let assignmentCount = 0;
    let progressCount = 0;

    // Create assignments and progress
    for (const course of courses) {
      const numStudents = Math.floor(Math.random() * 10) + 5;
      const selectedStudents = students.slice(0, Math.min(numStudents, students.length));

      for (const student of selectedStudents) {
        // Check if assignment exists
        const existing = await client.query(`
          SELECT id FROM course_assignments 
          WHERE "courseId" = $1 AND "studentId" = $2
        `, [course.id, student.id]);

        if (existing.rows.length > 0) continue;

        // Create assignment
        const daysAgo = Math.floor(Math.random() * 30);
        const assignedDate = new Date();
        assignedDate.setDate(assignedDate.getDate() - daysAgo);
        
        const status = Math.random() > 0.3 ? 'IN_PROGRESS' : 'ASSIGNED';

        const assignmentResult = await client.query(`
          INSERT INTO course_assignments 
          (id, "courseId", "studentId", "assignedBy", "assignedAt", status)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
          RETURNING id
        `, [course.id, student.id, facultyId, assignedDate, status]);

        assignmentCount++;

        // Create step progress if IN_PROGRESS
        if (status === 'IN_PROGRESS' && course.step_count > 0) {
          const numSteps = Math.ceil(course.step_count * (Math.random() * 0.6 + 0.2)); // 20-80%
          const stepsResult = await client.query(`
            SELECT id FROM learning_flow_steps WHERE "courseId" = $1 ORDER BY "stepOrder" LIMIT $2
          `, [course.id, numSteps]);

          for (const step of stepsResult.rows) {
            await client.query(`
              INSERT INTO step_progress 
              (id, "studentId", "stepId", "courseId", "completionPercent", "timeSpentSeconds", "lastAccessedAt", "createdAt", "updatedAt")
              VALUES (gen_random_uuid(), $1, $2, $3, 100, $4, $5, NOW(), NOW())
            `, [
              student.id,
              step.id,
              course.id,
              Math.floor(Math.random() * 1800) + 300,
              new Date(assignedDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
            ]);
            
            progressCount++;
          }
        }
      }

      console.log(`✅ Assigned "${course.title}" to ${selectedStudents.length} students`);
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
    client.release();
    await pool.end();
  }
}

seedAnalyticsData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
