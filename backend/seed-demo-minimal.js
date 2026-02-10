/**
 * Minimal Demo Seed - Creates essential demo data
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
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

const DEFAULT_PASSWORD = 'Demo@2026';

async function main() {
  console.log('🌱 Creating Demo Users...\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Owner
  await prisma.users.upsert({
    where: { email: 'owner@bitflow.com' },
    update: { passwordHash: hashedPassword },
    create: {
      id: uuidv4(),
      email: 'owner@bitflow.com',
      passwordHash: hashedPassword,
      fullName: 'Bitflow Owner',
      role: 'BITFLOW_OWNER',
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
  });
  console.log('✓ owner@bitflow.com');

  // Publishers
  for (const pub of [{ name: 'Elsevier Medical', code: 'ELSEVIER' }, { name: 'Springer', code: 'SPRINGER' }]) {
    const publisher = await prisma.publishers.upsert({
      where: { code: pub.code },
      update: {},
      create: {
        id: uuidv4(),
        name: pub.name,
        code: pub.code,
        legalName: `${pub.name} Pvt Ltd`,
        contactEmail: `admin@${pub.code.toLowerCase()}-demo.com`,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await prisma.users.upsert({
      where: { email: `admin@${pub.code.toLowerCase()}-demo.com` },
      update: { passwordHash: hashedPassword },
      create: {
        id: uuidv4(),
        email: `admin@${pub.code.toLowerCase()}-demo.com`,
        passwordHash: hashedPassword,
        fullName: `${pub.name} Admin`,
        role: 'PUBLISHER_ADMIN',
        status: 'ACTIVE',
        publisherId: publisher.id,
        updatedAt: new Date(),
      },
    });
    console.log(`✓ admin@${pub.code.toLowerCase()}-demo.com (Publisher)`);
  }

  // Colleges
  for (const col of [
    { name: 'AIIMS Delhi', code: 'AIIMS', domain: 'aiims-demo.edu' },
    { name: 'KGMU', code: 'KGMU', domain: 'kgmu-demo.edu' },
  ]) {
    const college = await prisma.colleges.upsert({
      where: { code: col.code },
      update: {},
      create: {
        id: uuidv4(),
        name: col.name,
        code: col.code,
        status: 'ACTIVE',
        emailDomain: col.domain,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // College Admin
    await prisma.users.upsert({
      where: { email: `admin@${col.domain}` },
      update: { passwordHash: hashedPassword },
      create: {
        id: uuidv4(),
        email: `admin@${col.domain}`,
        passwordHash: hashedPassword,
        fullName: `${col.name} Admin`,
        role: 'COLLEGE_ADMIN',
        status: 'ACTIVE',
        colleges: { connect: { id: college.id } },
        updatedAt: new Date(),
      },
    });
    console.log(`✓ admin@${col.domain} (College Admin)`);

    // Dean
    await prisma.users.upsert({
      where: { email: `dean@${col.domain}` },
      update: { passwordHash: hashedPassword },
      create: {
        id: uuidv4(),
        email: `dean@${col.domain}`,
        passwordHash: hashedPassword,
        fullName: `${col.name} Dean`,
        role: 'COLLEGE_DEAN',
        status: 'ACTIVE',
        colleges: { connect: { id: college.id } },
        updatedAt: new Date(),
      },
    });
    console.log(`✓ dean@${col.domain} (Dean)`);

    // Sample Faculty (just 2)
    for (let i = 1; i <= 2; i++) {
      await prisma.users.upsert({
        where: { email: `faculty${i}@${col.domain}` },
        update: { passwordHash: hashedPassword },
        create: {
          id: uuidv4(),
          email: `faculty${i}@${col.domain}`,
          passwordHash: hashedPassword,
          fullName: `Dr. Faculty Member ${i}`,
          role: 'FACULTY',
          status: 'ACTIVE',
          colleges: { connect: { id: college.id } },
          updatedAt: new Date(),
        },
      });
    }
    console.log(`✓ faculty1@${col.domain}, faculty2@${col.domain} (Faculty)`);

    // Students (250 per college = 500 total)
    const studentsPerYear = { 1: 70, 2: 65, 3: 60, 4: 55 }; // Total: 250 per college
    let collegeStudentCount = 0;
    
    for (let year = 1; year <= 4; year++) {
      const yearMap = { 1: 'YEAR_1', 2: 'YEAR_2', 3: 'YEAR_3_MINOR', 4: 'YEAR_3_MAJOR' };
      
      for (let i = 1; i <= studentsPerYear[year]; i++) {
        const rollNo = `${col.code}_Y${year}_${String(i).padStart(3, '0')}`;
        const email = `${rollNo.toLowerCase()}@${col.domain}`;
        
        const user = await prisma.users.upsert({
          where: { email },
          update: { passwordHash: hashedPassword },
          create: {
            id: uuidv4(),
            email,
            passwordHash: hashedPassword,
            fullName: `Student ${year}-${i}`,
            role: 'STUDENT',
            status: 'ACTIVE',
            collegeId: college.id,
            updatedAt: new Date(),
          },
        });
        
        // Create student record
        await prisma.students.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            id: uuidv4(),
            userId: user.id,
            collegeId: college.id,
            fullName: `Student ${year}-${i}`,
            yearOfAdmission: 2024,
            expectedPassingYear: 2024 + (5 - year),
            currentAcademicYear: yearMap[year],
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        
        collegeStudentCount++;
        if (collegeStudentCount % 50 === 0) {
          console.log(`   ✓ Created ${collegeStudentCount} students...`);
        }
      }
    }
    console.log(`✓ Total: ${collegeStudentCount} students for ${col.name}`);
  }

  // Create credentials file
  const credentials = `# BITFLOW LMS - DEMO CREDENTIALS
Generated: ${new Date().toLocaleString()}

**Default Password: Demo@2026**

## OWNER
owner@bitflow.com

## PUBLISHERS
admin@elsevier-demo.com
admin@springer-demo.com

## AIIMS DELHI (250 students)
admin@aiims-demo.edu (College Admin)
dean@aiims-demo.edu (Dean)
faculty1@aiims-demo.edu, faculty2@aiims-demo.edu (Faculty)
Students: aiims_y1_001 to aiims_y1_070 (Year 1: 70 students)
Students: aiims_y2_001 to aiims_y2_065 (Year 2: 65 students)
Students: aiims_y3_001 to aiims_y3_060 (Year 3: 60 students)
Students: aiims_y4_001 to aiims_y4_055 (Year 4: 55 students)

## KGMU (250 students)
admin@kgmu-demo.edu (College Admin)
dean@kgmu-demo.edu (Dean)
faculty1@kgmu-demo.edu, faculty2@kgmu-demo.edu (Faculty)
Students: kgmu_y1_001 to kgmu_y1_070 (Year 1: 70 students)
Students: kgmu_y2_001 to kgmu_y2_065 (Year 2: 65 students)
Students: kgmu_y3_001 to kgmu_y3_060 (Year 3: 60 students)
Students: kgmu_y4_001 to kgmu_y4_055 (Year 4: 55 students)

**TOTAL: 500 students across both colleges**

Login: http://localhost:3000/login
`;

  require('fs').writeFileSync('/home/envisage/Downloads/MEDICAL_LMS/DEMO_CREDENTIALS.md', credentials);

  console.log('\n✅ Demo data created!');
  console.log('📄 Credentials: DEMO_CREDENTIALS.md');
  console.log('🔑 Password: Demo@2026');
  console.log('🌐 Login: http://localhost:3000/login\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
