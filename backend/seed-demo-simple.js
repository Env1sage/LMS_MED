/**
 * Simplified Demo Seed Script for Bitflow Medical LMS
 * Creates 2 colleges with 500 students
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Setup Prisma
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

const firstNames = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Arjun', 'Divya', 'Rohan', 'Neha', 'Karan', 'Pooja', 'Aditya', 'Kavya', 'Siddharth', 'Riya', 'Akash', 'Meera', 'Varun', 'Ishita'];
const lastNames = ['Sharma', 'Kumar', 'Patel', 'Singh', 'Reddy', 'Gupta', 'Verma', 'Agarwal', 'Joshi', 'Mehta', 'Nair', 'Rao', 'Malhotra', 'Chopra', 'Desai'];

function getRandomName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { first, last };
}

async function main() {
  console.log('🌱 Starting Demo Data Seeding...\n');
  console.log('📝 Default Password: Demo@2026\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const credentials = { owner: [], publishers: [], colleges: [], students: [], faculty: [] };

  // 1. BITFLOW OWNER
  console.log('👤 Creating Bitflow Owner...');
  const bitflowOwner = await prisma.users.upsert({
    where: { email: 'owner@bitflow.com' },
    update: { passwordHash: hashedPassword, updatedAt: new Date() },
    create: {
      id: uuidv4(),
      email: 'owner@bitflow.com',
      passwordHash: hashedPassword,
      fullName: 'Bitflow Administrator',
      role: 'BITFLOW_OWNER',
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
  });
  credentials.owner.push({ email: 'owner@bitflow.com', password: DEFAULT_PASSWORD });
  console.log('   ✓ Owner: owner@bitflow.com');

  // 2. PUBLISHERS
  console.log('\n📚 Creating Publishers...');
  const publishersData = [
    { name: 'Elsevier Medical', code: 'ELSEVIER', email: 'admin@elsevier-demo.com' },
    { name: 'Springer Healthcare', code: 'SPRINGER', email: 'admin@springer-demo.com' },
  ];

  const createdPublishers = [];
  for (const pub of publishersData) {
    const publisher = await prisma.publishers.upsert({
      where: { code: pub.code },
      update: { status: 'ACTIVE', updatedAt: new Date() },
      create: {
        id: uuidv4(),
        name: pub.name,
        code: pub.code,
        legalName: `${pub.name} Pvt. Ltd.`,
        contactPerson: 'Admin',
        contactEmail: pub.email,
        physicalAddress: 'Mumbai, India',
        contractStartDate: new Date('2026-01-01'),
        contractEndDate: new Date('2027-12-31'),
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const publisherAdmin = await prisma.users.upsert({
      where: { email: pub.email },
      update: { passwordHash: hashedPassword, updatedAt: new Date() },
      create: {
        id: uuidv4(),
        email: pub.email,
        passwordHash: hashedPassword,
        fullName: `${pub.name} Administrator`,
        role: 'PUBLISHER_ADMIN',
        status: 'ACTIVE',
        publisherId: publisher.id,
        updatedAt: new Date(),
      },
    });

    credentials.publishers.push({ email: pub.email, password: DEFAULT_PASSWORD, publisher: pub.name });
    createdPublishers.push(publisher);
    console.log(`   ✓ Publisher: ${pub.name} (${pub.email})`);
  }

  // 3. COLLEGES
  console.log('\n🏛️  Creating Colleges...');
  const collegesData = [
    { name: 'All India Institute of Medical Sciences', code: 'AIIMS_DELHI', city: 'New Delhi', state: 'Delhi', domain: 'aiims-demo.edu' },
    { name: 'King Georges Medical University', code: 'KGMU', city: 'Lucknow', state: 'Uttar Pradesh', domain: 'kgmu-demo.edu' },
  ];

  const createdColleges = [];
  for (const collegeData of collegesData) {
    const college = await prisma.colleges.upsert({
      where: { code: collegeData.code },
      update: { status: 'ACTIVE', updatedAt: new Date() },
      create: {
        id: uuidv4(),
        name: collegeData.name,
        code: collegeData.code,
        status: 'ACTIVE',
        emailDomain: collegeData.domain,
        adminContactEmail: `admin@${collegeData.domain}`,
        address: `Medical College Campus`,
        city: collegeData.city,
        state: collegeData.state,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    createdColleges.push({ ...college, domain: collegeData.domain });
    console.log(`   ✓ College: ${collegeData.name}`);

    // Create IT Admin & Dean
    await prisma.users.upsert({
      where: { email: `itadmin@${collegeData.domain}` },
      update: { passwordHash: hashedPassword, updatedAt: new Date() },
      create: {
        id: uuidv4(),
        email: `itadmin@${collegeData.domain}`,
        passwordHash: hashedPassword,
        fullName: `${collegeData.code} IT Administrator`,
        role: 'COLLEGE_ADMIN',
        status: 'ACTIVE',
        collegeId: college.id,
        updatedAt: new Date(),
      },
    });

    await prisma.users.upsert({
      where: { email: `dean@${collegeData.domain}` },
      update: { passwordHash: hashedPassword, updatedAt: new Date() },
      create: {
        id: uuidv4(),
        email: `dean@${collegeData.domain}`,
        passwordHash: hashedPassword,
        fullName: `Dean - ${collegeData.name}`,
        role: 'COLLEGE_DEAN',
        status: 'ACTIVE',
        collegeId: college.id,
        updatedAt: new Date(),
      },
    });

    credentials.colleges.push({
      college: collegeData.name,
      itAdmin: { email: `itadmin@${collegeData.domain}`, password: DEFAULT_PASSWORD },
      dean: { email: `dean@${collegeData.domain}`, password: DEFAULT_PASSWORD },
    });

    // Create Departments
    console.log(`   📂 Creating Departments...`);
    const departments = ['Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology', 'Medicine', 'Surgery', 'Pediatrics'];
    const createdDepartments = [];
    for (const dept of departments) {
      const departmentCode = `${collegeData.code}_${dept.substring(0, 4).toUpperCase()}`;
      const department = await prisma.departments.upsert({
        where: { collegeId_code: { collegeId: college.id, code: departmentCode } },
        update: { updatedAt: new Date() },
        create: {
          id: uuidv4(),
          name: dept,
          code: departmentCode,
          collegeId: college.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      createdDepartments.push(department);
    }
    console.log(`      ✓ Created ${departments.length} departments`);

    // Create Faculty (2 per department)
    console.log(`   👨‍🏫 Creating Faculty...`);
    const facultyList = [];
    for (let i = 0; i < createdDepartments.length; i++) {
      const dept = createdDepartments[i];
      for (let j = 0; j < 2; j++) {
        const name = getRandomName();
        const email = `${name.first.toLowerCase()}.${name.last.toLowerCase()}${i}${j}@${collegeData.domain}`;
        
        const faculty = await prisma.users.upsert({
          where: { email },
          update: { passwordHash: hashedPassword, updatedAt: new Date() },
          create: {
            id: uuidv4(),
            email,
            passwordHash: hashedPassword,
            fullName: `Dr. ${name.first} ${name.last}`,
            role: 'FACULTY',
            status: 'ACTIVE',
            collegeId: college.id,
            updatedAt: new Date(),
          },
        });

        facultyList.push(faculty);
        if (j === 0 && credentials.faculty.length < 3) {
          credentials.faculty.push({ college: collegeData.name, email, password: DEFAULT_PASSWORD, department: dept.name });
        }
      }
    }
    console.log(`      ✓ Created ${facultyList.push} faculty members`);
  }

  // 4. STUDENTS (250 per college = 500 total)
  console.log('\n👨‍🎓 Creating 500 Students...');
  let totalStudents = 0;
  for (const college of createdColleges) {
    console.log(`\n   Creating 250 students for ${college.name}...`);
    const studentsPerYear = [70, 65, 60, 55]; // Y1=70, Y2=65, Y3=60, Y4=55
    
    for (let year = 1; year <= 4; year++) {
      const studentCount = studentsPerYear[year - 1];
      
      for (let i = 0; i < studentCount; i++) {
        const name = getRandomName();
        const rollNo = `${college.code}_${year}${String(i + 1).padStart(3, '0')}`;
        const email = `${rollNo.toLowerCase()}@${college.domain}`;
        
        await prisma.users.create({
          data: {
            id: uuidv4(),
            email,
            passwordHash: hashedPassword,
            fullName: `${name.first} ${name.last}`,
            role: 'STUDENT',
            status: 'ACTIVE',
            collegeId: college.id,
            rollNumber: rollNo,
            currentYear: year,
            updatedAt: new Date(),
          },
        });

        if (totalStudents < 3) {
          credentials.students.push({ college: college.name, email, password: DEFAULT_PASSWORD, year: year, rollNumber: rollNo });
        }

        totalStudents++;
        if (totalStudents % 50 === 0) {
          console.log(`      ✓ Created ${totalStudents} students...`);
        }
      }
    }
  }
  console.log(`\n   ✅ Total Students Created: ${totalStudents}`);

  // 5. SAVE CREDENTIALS
  console.log('\n📄 Creating credentials file...');
  const credentialsDoc = `# BITFLOW MEDICAL LMS - DEMO CREDENTIALS
Generated: ${new Date().toLocaleString()}

**Default Password for ALL accounts: Demo@2026**

## OWNER PORTAL
- Email: owner@bitflow.com
- Password: Demo@2026
- Access: http://localhost:3000/owner

## PUBLISHER PORTALS
${credentials.publishers.map((p, i) => `
### Publisher ${i + 1}: ${p.publisher}
- Email: ${p.email}
- Password: Demo@2026
- Access: http://localhost:3000/publisher`).join('\n')}

## COLLEGE PORTALS
${credentials.colleges.map((c, i) => `
### College ${i + 1}: ${c.college}
**IT Admin:** ${c.itAdmin.email} | Password: Demo@2026
**Dean:** ${c.dean.email} | Password: Demo@2026
Access: http://localhost:3000/college`).join('\n')}

## FACULTY PORTAL (Sample)
${credentials.faculty.map((f, i) => `
Faculty ${i + 1}: ${f.email} | Password: Demo@2026 | ${f.college} - ${f.department}`).join('\n')}

## STUDENT PORTAL (Sample)
${credentials.students.map((s, i) => `
Student ${i + 1}: ${s.email} | Password: Demo@2026 | ${s.college} - Year ${s.year} (${s.rollNumber})`).join('\n')}

## SUMMARY
- Colleges: 2
- Students: 500 (250 per college)
- Faculty: 32 (16 per college)
- Departments: 16 (8 per college)
- Publishers: 2

## LOGIN
http://localhost:3000/login
`;

  require('fs').writeFileSync('/home/envisage/Downloads/MEDICAL_LMS/DEMO_CREDENTIALS.md', credentialsDoc);

  console.log('\n✅ SEEDING COMPLETE!');
  console.log('\n📋 Summary:');
  console.log(`   • Colleges: 2`);
  console.log(`   • Students: 500`);
  console.log(`   • Faculty: 32`);
  console.log(`   • Publishers: 2`);
  console.log('\n📄 Credentials saved to: DEMO_CREDENTIALS.md');
  console.log('🔑 Default Password: Demo@2026');
  console.log('🌐 Login at: http://localhost:3000/login\n');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
