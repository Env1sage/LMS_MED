/**
 * Comprehensive Demo Seed Script for Bitflow Medical LMS
 * Creates 2 colleges with 500 students and full ecosystem
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Setup Prisma with adapter
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

// Common password for all users
const DEFAULT_PASSWORD = 'Demo@2026';

// Helper to generate Indian names
const firstNames = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Arjun', 'Divya', 'Rohan', 'Neha', 'Karan', 'Pooja', 'Aditya', 'Kavya', 'Siddharth', 'Riya', 'Akash', 'Meera', 'Varun', 'Ishita'];
const lastNames = ['Sharma', 'Kumar', 'Patel', 'Singh', 'Reddy', 'Gupta', 'Verma', 'Agarwal', 'Joshi', 'Mehta', 'Nair', 'Rao', 'Malhotra', 'Chopra', 'Desai'];

function getRandomName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { first, last };
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🌱 Starting Demo Data Seeding...\n');
  console.log('📝 Default Password for all accounts: Demo@2026\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Store credentials
  const credentials = {
    owner: [],
    publishers: [],
    colleges: [],
    students: [],
    faculty: [],
  };

  // ========================================
  // 1. BITFLOW OWNER
  // ========================================
  console.log('👤 Creating Bitflow Owner...');
  const bitflowOwner = await prisma.users.upsert({
    where: { email: 'owner@bitflow.com' },
    update: { passwordHash: hashedPassword },
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
  credentials.owner.push({ email: 'owner@bitflow.com', password: DEFAULT_PASSWORD, role: 'BITFLOW_OWNER' });
  console.log('   ✓ Owner: owner@bitflow.com');

  // ========================================
  // 2. MCI COMPETENCIES
  // ========================================
  console.log('\n📋 Creating MCI Competencies...');
  const competencies = [
    { code: 'AN1.1', title: 'Anatomical Position', description: 'Describe the anatomical position and planes', subject: 'ANATOMY', domain: 'COGNITIVE', academicLevel: 'UG' },
    { code: 'PH1.1', title: 'Nervous System', description: 'Describe organization of nervous system', subject: 'PHYSIOLOGY', domain: 'COGNITIVE', academicLevel: 'UG' },
    { code: 'BC1.1', title: 'Amino Acids', description: 'Describe structure and function of amino acids', subject: 'BIOCHEMISTRY', domain: 'COGNITIVE', academicLevel: 'UG' },
    { code: 'PA1.1', title: 'Cell Injury', description: 'Describe cell injury and adaptations', subject: 'PATHOLOGY', domain: 'COGNITIVE', academicLevel: 'UG' },
    { code: 'MI1.1', title: 'Bacterial Morphology', description: 'Describe bacterial morphology and classification', subject: 'MICROBIOLOGY', domain: 'COGNITIVE', academicLevel: 'UG' },
    { code: 'PH2.1', title: 'Pharmacokinetics', description: 'Describe pharmacokinetics and pharmacodynamics', subject: 'PHARMACOLOGY', domain: 'COGNITIVE', academicLevel: 'UG' },
    { code: 'FM1.1', title: 'Medicolegal Death', description: 'Describe medicolegal aspects of death', subject: 'FORENSIC_MEDICINE', domain: 'COGNITIVE', academicLevel: 'UG' },
    { code: 'IM1.1', title: 'Approach to Fever', description: 'Describe approach to fever', subject: 'INTERNAL_MEDICINE', domain: 'CLINICAL', academicLevel: 'UG' },
    { code: 'SU1.1', title: 'Surgical Anatomy', description: 'Describe surgical anatomy of abdomen', subject: 'SURGERY', domain: 'PRACTICAL', academicLevel: 'UG' },
    { code: 'OG1.1', title: 'Menstrual Cycle', description: 'Describe menstrual cycle', subject: 'OBSTETRICS_GYNECOLOGY', domain: 'CLINICAL', academicLevel: 'UG' },
    { code: 'PE1.1', title: 'Growth Milestones', description: 'Describe growth and development milestones', subject: 'PEDIATRICS', domain: 'CLINICAL', academicLevel: 'UG' },
    { code: 'OP1.1', title: 'Refractive Errors', description: 'Describe refractive errors', subject: 'OPHTHALMOLOGY', domain: 'CLINICAL', academicLevel: 'UG' },
    { code: 'EN1.1', title: 'Ear Anatomy', description: 'Describe anatomy of ear', subject: 'ENT', domain: 'CLINICAL', academicLevel: 'UG' },
    { code: 'OR1.1', title: 'Fracture Management', description: 'Describe fracture management', subject: 'ORTHOPEDICS', domain: 'PRACTICAL', academicLevel: 'UG' },
    { code: 'PS1.1', title: 'Psychiatric Disorders', description: 'Describe common psychiatric disorders', subject: 'PSYCHIATRY', domain: 'CLINICAL', academicLevel: 'UG' },
  ];

  for (const comp of competencies) {
    await prisma.competencies.upsert({
      where: { code: comp.code },
      update: { description: comp.description, updatedAt: new Date() },
      create: {
        id: uuidv4(),
        code: comp.code,
        title: comp.title,
        description: comp.description,
        subject: comp.subject,
        domain: comp.domain,
        academicLevel: comp.academicLevel,
        status: 'ACTIVE',
        version: 1,
        createdBy: bitflowOwner.id,
        activatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
  console.log(`   ✓ Created ${competencies.length} MCI Competencies`);

  // ========================================
  // 3. PUBLISHERS & CONTENT
  // ========================================
  console.log('\n📚 Creating Publishers & Content...');
  
  const publishersData = [
    { name: 'Elsevier Medical', code: 'ELSEVIER', email: 'admin@elsevier-demo.com' },
    { name: 'Springer Healthcare', code: 'SPRINGER', email: 'admin@springer-demo.com' },
    { name: 'Oxford Medical', code: 'OXFORD', email: 'admin@oxford-demo.com' },
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

    // Create publisher admin
    const publisherAdmin = await prisma.users.upsert({
      where: { email: pub.email },
      update: { passwordHash: hashedPassword },
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

    credentials.publishers.push({ email: pub.email, password: DEFAULT_PASSWORD, role: 'PUBLISHER_ADMIN', publisher: pub.name });
    createdPublishers.push(publisher);
    console.log(`   ✓ Publisher: ${pub.name} (${pub.email})`);
  }

  // Create Learning Units (Books & Videos)
  console.log('\n📖 Creating Learning Units...');
  const learningUnits = [];
  const subjects = ['Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology', 'Medicine', 'Surgery', 'Pediatrics'];
  
  let unitCount = 0;
  for (let i = 0; i < subjects.length; i++) {
    const publisher = createdPublishers[i % createdPublishers.length];
    
    // Create Books
    for (let j = 0; j < 3; j++) {
      const unit = await prisma.learning_units.create({
        data: {
          id: uuidv4(),
          title: `${subjects[i]} Textbook - Volume ${j + 1}`,
          description: `Comprehensive ${subjects[i]} textbook for medical students`,
          type: 'BOOK',
          subject: subjects[i].toUpperCase(),
          publisherId: publisher.id,
          difficultyLevel: j === 0 ? 'K' : j === 1 ? 'KH' : 'S',
          estimatedDuration: 3600,
          competencyIds: [competencies[i]?.code],
          secureAccessUrl: `https://cdn.bitflow.com/books/${subjects[i].toLowerCase()}-vol${j + 1}.pdf`,
          deliveryType: 'STREAM',
          watermarkEnabled: true,
          sessionExpiryMinutes: 30,
          status: 'ACTIVE',
          competencyMappingStatus: 'COMPLETE',
          thumbnailUrl: `https://cdn.bitflow.com/thumbs/${subjects[i].toLowerCase()}.jpg`,
          tags: [subjects[i], 'Textbook', `Year ${Math.floor(i / 2) + 1}`],
          activatedAt: new Date(),
          activatedBy: bitflowOwner.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      learningUnits.push(unit);
      unitCount++;
    }

    // Create Videos
    for (let j = 0; j < 2; j++) {
      const unit = await prisma.learning_units.create({
        data: {
          id: uuidv4(),
          title: `${subjects[i]} Video Lecture ${j + 1}`,
          description: `High-quality video lecture on ${subjects[i]}`,
          type: 'VIDEO',
          subject: subjects[i].toUpperCase(),
          publisherId: publisher.id,
          difficultyLevel: j === 0 ? 'K' : 'KH',
          estimatedDuration: Math.floor(Math.random() * 3600) + 1800,
          competencyIds: [competencies[i]?.code],
          secureAccessUrl: `https://cdn.bitflow.com/videos/${subjects[i].toLowerCase()}-lec${j + 1}.mp4`,
          deliveryType: 'STREAM',
          watermarkEnabled: true,
          sessionExpiryMinutes: 60,
          status: 'ACTIVE',
          competencyMappingStatus: 'COMPLETE',
          thumbnailUrl: `https://cdn.bitflow.com/thumbs/${subjects[i].toLowerCase()}-video.jpg`,
          tags: [subjects[i], 'Video', 'Lecture', `Year ${Math.floor(i / 2) + 1}`],
          activatedAt: new Date(),
          activatedBy: bitflowOwner.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      learningUnits.push(unit);
      unitCount++;
    }
  }
  console.log(`   ✓ Created ${unitCount} Learning Units (Books & Videos)`);

  // ========================================
  // 4. COLLEGES
  // ========================================
  console.log('\n🏛️  Creating Colleges...');
  
  const collegesData = [
    {
      name: 'All India Institute of Medical Sciences',
      code: 'AIIMS_DELHI',
      city: 'New Delhi',
      state: 'Delhi',
      domain: 'aiims-demo.edu',
      maxStudents: 300,
    },
    {
      name: 'King Georges Medical University',
      code: 'KGMU',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      domain: 'kgmu-demo.edu',
      maxStudents: 250,
    },
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

    // Create IT Admin
    const itAdmin = await prisma.users.upsert({
      where: { email: `itadmin@${collegeData.domain}` },
      update: { passwordHash: hashedPassword },
      create: {
        id: uuidv4(),
        email: `itadmin@${collegeData.domain}`,
        passwordHash: hashedPassword,
        fullName: `${collegeData.code} IT Administrator`,
        role: 'COLLEGE_IT_ADMIN',
        status: 'ACTIVE',
        collegeId: college.id,
        updatedAt: new Date(),
      },
    });

    // Create Dean
    const dean = await prisma.users.upsert({
      where: { email: `dean@${collegeData.domain}` },
      update: { passwordHash: hashedPassword },
      create: {
        id: uuidv4(),
        email: `dean@${collegeData.domain}`,
        passwordHash: hashedPassword,
        fullName: `Dean - ${collegeData.name}`,
        role: 'DEAN',
        status: 'ACTIVE',
        collegeId: college.id,
        updatedAt: new Date(),
      },
    });

    credentials.colleges.push({
      college: collegeData.name,
      itAdmin: { email: `itadmin@${collegeData.domain}`, password: DEFAULT_PASSWORD, role: 'COLLEGE_IT_ADMIN' },
      dean: { email: `dean@${collegeData.domain}`, password: DEFAULT_PASSWORD, role: 'DEAN' },
    });

    // Create Departments
    console.log(`\n   📂 Creating Departments for ${collegeData.name}...`);
    const departments = [
      { name: 'Anatomy', code: 'ANAT' },
      { name: 'Physiology', code: 'PHYS' },
      { name: 'Biochemistry', code: 'BIOC' },
      { name: 'Pathology', code: 'PATH' },
      { name: 'Pharmacology', code: 'PHAR' },
      { name: 'Medicine', code: 'MED' },
      { name: 'Surgery', code: 'SURG' },
      { name: 'Pediatrics', code: 'PEDI' },
    ];

    const createdDepartments = [];
    for (const dept of departments) {
      const department = await prisma.departments.create({
        data: {
          id: uuidv4(),
          name: dept.name,
          code: `${collegeData.code}_${dept.code}`,
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
        const email = `${name.first.toLowerCase()}.${name.last.toLowerCase()}${j}@${collegeData.domain}`;
        
        const faculty = await prisma.users.upsert({
          where: { email },
          update: { passwordHash: hashedPassword },
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

        // Assign to department
        await prisma.faculty_assignments.create({
          data: {
            id: uuidv4(),
            userId: faculty.id,
            departmentId: dept.id,
            isPrimary: j === 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        facultyList.push(faculty);
        
        if (j === 0 && credentials.faculty.length < 5) {
          credentials.faculty.push({
            college: collegeData.name,
            email,
            password: DEFAULT_PASSWORD,
            role: 'FACULTY',
            department: dept.name,
          });
        }
      }
    }
    console.log(`      ✓ Created ${facultyList.length} faculty members`);

    // Create Courses
    console.log(`   📚 Creating Courses...`);
    const coursesList = [];
    for (let i = 0; i < createdDepartments.length; i++) {
      const dept = createdDepartments[i];
      const faculty = facultyList[i * 2]; // Assign first faculty of each dept
      
      const course = await prisma.courses.create({
        data: {
          id: uuidv4(),
          title: `${dept.name} - Year ${Math.floor(i / 2) + 1}`,
          code: `${collegeData.code}_${dept.code}_Y${Math.floor(i / 2) + 1}`,
          description: `Comprehensive ${dept.name} course`,
          subject: dept.name.toUpperCase(),
          yearLevel: Math.floor(i / 2) + 1,
          semester: ((i % 2) + 1),
          collegeId: college.id,
          createdBy: faculty.id,
          facultyId: faculty.id,
          competencyIds: [competencies[i]?.code],
          status: 'PUBLISHED',
          enrollmentStartDate: new Date('2026-01-01'),
          enrollmentEndDate: new Date('2026-12-31'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      coursesList.push(course);
    }
    console.log(`      ✓ Created ${coursesList.length} courses`);
  }

  // ========================================
  // 5. STUDENTS (250 per college = 500 total)
  // ========================================
  console.log('\n👨‍🎓 Creating Students...');
  
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
        
        const student = await prisma.users.create({
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

        // Store first 3 students from first college as sample credentials
        if (totalStudents < 3) {
          credentials.students.push({
            college: college.name,
            email,
            password: DEFAULT_PASSWORD,
            role: 'STUDENT',
            year: year,
            rollNumber: rollNo,
          });
        }

        totalStudents++;
        
        // Progress indicator
        if ((totalStudents) % 50 === 0) {
          console.log(`      ✓ Created ${totalStudents} students...`);
        }
      }
    }
  }
  console.log(`\n   ✅ Total Students Created: ${totalStudents}`);

  // ========================================
  // 6. ANALYTICS & ACTIVITY DATA
  // ========================================
  console.log('\n📊 Creating Analytics Data...');
  
  // Get all students
  const allStudents = await prisma.users.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, collegeId: true, currentYear: true },
  });

  // Get all courses
  const allCourses = await prisma.courses.findMany({
    select: { id: true, collegeId: true, yearLevel: true },
  });

  // Create some enrollments
  let enrollmentCount = 0;
  for (const student of allStudents) {
    // Enroll in 3-4 relevant courses
    const relevantCourses = allCourses.filter(
      c => c.collegeId === student.collegeId && c.yearLevel === student.currentYear
    );
    
    const enrollmentCourseCount = Math.min(relevantCourses.length, Math.floor(Math.random() * 2) + 3);
    const selectedCourses = relevantCourses.slice(0, enrollmentCourseCount);
    
    for (const course of selectedCourses) {
      try {
        await prisma.enrollments.create({
          data: {
            id: uuidv4(),
            studentId: student.id,
            courseId: course.id,
            status: 'ENROLLED',
            enrolledAt: getRandomDate(new Date('2026-01-01'), new Date('2026-02-01')),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        enrollmentCount++;
      } catch (err) {
        // Skip duplicates
      }
    }
    
    if (enrollmentCount % 200 === 0) {
      console.log(`   ✓ Created ${enrollmentCount} enrollments...`);
    }
  }
  console.log(`   ✅ Total Enrollments: ${enrollmentCount}`);

  // ========================================
  // 7. CREATE CREDENTIALS FILE
  // ========================================
  console.log('\n📄 Creating credentials file...');
  
  const credentialsDoc = `
# BITFLOW MEDICAL LMS - DEMO CREDENTIALS
# Generated: ${new Date().toLocaleString()}

**Default Password for ALL accounts: Demo@2026**

## OWNER PORTAL
- Email: ${credentials.owner[0].email}
- Password: ${credentials.owner[0].password}
- Access: http://localhost:3000/owner
- Role: Platform Administrator

## PUBLISHER PORTALS
${credentials.publishers.map((p, i) => `
### Publisher ${i + 1}: ${p.publisher}
- Email: ${p.email}
- Password: ${p.password}
- Access: http://localhost:3000/publisher
- Role: Publisher Admin`).join('\n')}

## COLLEGE PORTALS
${credentials.colleges.map((c, i) => `
### College ${i + 1}: ${c.college}

**IT Admin:**
- Email: ${c.itAdmin.email}
- Password: ${c.itAdmin.password}
- Role: College IT Admin

**Dean:**
- Email: ${c.dean.email}
- Password: ${c.dean.password}
- Role: Dean

Access: http://localhost:3000/college`).join('\n')}

## FACULTY PORTAL (Sample)
${credentials.faculty.map((f, i) => `
### Faculty ${i + 1} (${f.college} - ${f.department})
- Email: ${f.email}
- Password: ${f.password}
- Access: http://localhost:3000/faculty`).join('\n')}

## STUDENT PORTAL (Sample - First 3 Students)
${credentials.students.map((s, i) => `
### Student ${i + 1} (${s.college} - Year ${s.year})
- Email: ${s.email}
- Password: ${s.password}
- Roll No: ${s.rollNumber}
- Access: http://localhost:3000/student`).join('\n')}

## SUMMARY
- Total Colleges: 2
- Total Students: 500 (250 per college)
- Total Faculty: 32 (16 per college)
- Total Courses: 16 (8 per college)
- Total Departments: 16 (8 per college)
- Total Publishers: 3
- Total Learning Units: ${unitCount} (Books & Videos)
- Total MCI Competencies: ${competencies.length}

## LOGIN URL
http://localhost:3000/login

---
Generated by Bitflow LMS Demo Seed Script
`;

  const fs = require('fs');
  fs.writeFileSync('/home/envisage/Downloads/MEDICAL_LMS/DEMO_CREDENTIALS.md', credentialsDoc);

  console.log('\n✅ SEEDING COMPLETE!');
  console.log('\n📋 Summary:');
  console.log(`   • Colleges: ${createdColleges.length}`);
  console.log(`   • Students: ${totalStudents}`);
  console.log(`   • Faculty: 32`);
  console.log(`   • Publishers: ${createdPublishers.length}`);
  console.log(`   • Learning Units: ${unitCount}`);
  console.log(`   • Enrollments: ${enrollmentCount}`);
  console.log(`   • Competencies: ${competencies.length}`);
  console.log('\n📄 Credentials saved to: DEMO_CREDENTIALS.md');
  console.log('\n🔑 Default Password: Demo@2026');
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
