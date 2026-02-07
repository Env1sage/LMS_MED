/**
 * Database Cleanup Script
 * 
 * This script removes test/dummy data while preserving:
 * - System accounts (owner, essential users)
 * - Reference data (competencies if any real ones exist)
 * - College and Publisher structures
 * 
 * Run with: npx tsx scripts/cleanup-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
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

async function cleanupData() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    // Use raw SQL for reliability
    console.log('📊 Cleaning learning progress data...');
    await prisma.$executeRawUnsafe(`DELETE FROM "step_progress"`);
    await prisma.$executeRawUnsafe(`DELETE FROM "student_progress"`);
    await prisma.$executeRawUnsafe(`DELETE FROM "learning_unit_access_logs"`);
    console.log('   ✅ Learning progress cleaned');

    // 2. Clean up course assignments and enrollments
    console.log('📚 Cleaning course assignments...');
    await prisma.$executeRawUnsafe(`DELETE FROM "course_assignments"`);
    await prisma.$executeRawUnsafe(`DELETE FROM "course_competencies"`);
    await prisma.$executeRawUnsafe(`DELETE FROM "learning_flow_steps"`);
    console.log('   ✅ Course assignments cleaned');

    // 3. Clean up learning units and MCQs (content will be re-added)
    console.log('📝 Cleaning learning content...');
    await prisma.$executeRawUnsafe(`DELETE FROM "mcqs"`);
    await prisma.$executeRawUnsafe(`DELETE FROM "learning_units"`);
    console.log('   ✅ Learning content cleaned');

    // 4. Clean up courses
    console.log('🎓 Cleaning courses...');
    await prisma.$executeRawUnsafe(`DELETE FROM "courses"`);
    console.log('   ✅ Courses cleaned');

    // 5. Clean up student data (but keep the student records)
    console.log('👨‍🎓 Cleaning student-related data...');
    await prisma.$executeRawUnsafe(`DELETE FROM "student_departments"`);
    console.log('   ✅ Student departments cleaned');

    // 6. Clean up notifications
    console.log('🔔 Cleaning notifications...');
    await prisma.$executeRawUnsafe(`DELETE FROM "notifications"`);
    console.log('   ✅ Notifications cleaned');

    // 7. Clean up audit logs (keep recent for debugging)
    console.log('📋 Cleaning old audit logs...');
    await prisma.$executeRawUnsafe(`DELETE FROM "audit_logs" WHERE timestamp < NOW() - INTERVAL '7 days'`);
    console.log('   ✅ Old audit logs cleaned');

    // 8. Clean up sessions and tokens
    console.log('🔑 Cleaning sessions and tokens...');
    await prisma.$executeRawUnsafe(`DELETE FROM "user_sessions"`);
    await prisma.$executeRawUnsafe(`DELETE FROM "refresh_tokens"`);
    console.log('   ✅ Sessions and tokens cleaned');

    // 9. Get summary of remaining data
    console.log('\n📈 Remaining data summary:');
    
    const userCount = await prisma.users.count();
    const collegeCount = await prisma.colleges.count();
    const publisherCount = await prisma.publishers.count();
    const studentCount = await prisma.students.count();
    const departmentCount = await prisma.departments.count();
    const competencyCount = await prisma.competencies.count();

    console.log(`   • Users: ${userCount}`);
    console.log(`   • Colleges: ${collegeCount}`);
    console.log(`   • Publishers: ${publisherCount}`);
    console.log(`   • Students: ${studentCount}`);
    console.log(`   • Departments: ${departmentCount}`);
    console.log(`   • Competencies: ${competencyCount}`);

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('\n📌 What was preserved:');
    console.log('   • User accounts (including credentials)');
    console.log('   • College structures');
    console.log('   • Publisher structures');
    console.log('   • Student records (without progress)');
    console.log('   • Departments');
    console.log('   • Faculty assignments');
    console.log('   • Competency definitions');
    
    console.log('\n📌 What was cleaned:');
    console.log('   • Learning units & MCQs');
    console.log('   • Courses & assignments');
    console.log('   • Student progress & sessions');
    console.log('   • Notifications');
    console.log('   • Old audit logs');
    console.log('   • User sessions & tokens');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Alternative: Complete reset (keeps only essential accounts)
async function completeReset() {
  console.log('🔄 Starting COMPLETE database reset...\n');
  console.log('⚠️  This will remove ALL data except essential system accounts!\n');

  try {
    // Delete in order to respect foreign key constraints
    const tables = [
      'student_learning_sessions',
      'learning_progress',
      'student_mcq_attempts',
      'course_student_assignments',
      'course_competencies',
      'course_learning_units',
      'mcq_options',
      'mcqs',
      'learning_units',
      'courses',
      'student_departments',
      'notifications',
      'audit_logs',
      'faculty_assignments',
      'faculty_permissions',
      'students',
      'departments',
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
        console.log(`   ✅ Cleaned ${table}`);
      } catch (e: any) {
        console.log(`   ⚠️  Could not clean ${table}: ${e.message}`);
      }
    }

    console.log('\n✅ Complete reset finished!');
    console.log('\n📌 Remaining: Users, Colleges, Publishers, Competencies');

  } catch (error) {
    console.error('❌ Error during reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
const args = process.argv.slice(2);
if (args.includes('--complete')) {
  completeReset();
} else {
  cleanupData();
}
