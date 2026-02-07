/**
 * Comprehensive Seed Script for Bitflow Medical LMS
 * Seeds all entities with realistic dummy data
 */

// Ensure we're in the backend directory for module resolution
process.chdir(__dirname);

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

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

// Common password for all users
const DEFAULT_PASSWORD = 'Password123!';

async function main() {
  console.log('🌱 Starting comprehensive database seeding...\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

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
      fullName: 'Bitflow Platform Owner',
      role: 'BITFLOW_OWNER',
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
  });
  console.log('   ✓ Bitflow Owner: owner@bitflow.com');

  // ========================================
  // 2. PUBLISHERS
  // ========================================
  console.log('\n📚 Creating Publishers...');
  
  const publishers = [
    {
      id: 'pub-elsevier-001',
      name: 'Elsevier Medical',
      code: 'ELSEVIER',
      legalName: 'Elsevier Medical Publishers Pvt. Ltd.',
      contactPerson: 'Dr. Rajesh Kumar',
      contactEmail: 'admin@elsevier.com',
      contractStartDate: new Date('2026-01-01'),
      contractEndDate: new Date('2027-12-31'),
      status: 'ACTIVE',
    },
    {
      id: 'pub-springer-001',
      name: 'Springer Healthcare',
      code: 'SPRINGER',
      legalName: 'Springer Nature India Pvt. Ltd.',
      contactPerson: 'Dr. Priya Sharma',
      contactEmail: 'admin@springer.com',
      contractStartDate: new Date('2026-01-01'),
      contractEndDate: new Date('2027-06-30'),
      status: 'ACTIVE',
    },
    {
      id: 'pub-wiley-001',
      name: 'Wiley Medical',
      code: 'WILEY',
      legalName: 'John Wiley & Sons India Pvt. Ltd.',
      contactPerson: 'Dr. Amit Patel',
      contactEmail: 'admin@wiley.com',
      contractStartDate: new Date('2026-02-01'),
      contractEndDate: new Date('2027-02-01'),
      status: 'ACTIVE',
    },
  ];

  for (const pub of publishers) {
    await prisma.publishers.upsert({
      where: { code: pub.code },
      update: { ...pub, updatedAt: new Date() },
      create: { ...pub, createdAt: new Date(), updatedAt: new Date() },
    });
    console.log(`   ✓ Publisher: ${pub.name} (${pub.code})`);
  }

  // Create Publisher Admins
  console.log('\n👥 Creating Publisher Admins...');
  for (const pub of publishers) {
    const adminEmail = pub.contactEmail;
    await prisma.users.upsert({
      where: { email: adminEmail },
      update: { passwordHash: hashedPassword },
      create: {
        id: uuidv4(),
        email: adminEmail,
        passwordHash: hashedPassword,
        fullName: pub.contactPerson,
        role: 'PUBLISHER_ADMIN',
        status: 'ACTIVE',
        publisherId: pub.id,
        updatedAt: new Date(),
      },
    });
    console.log(`   ✓ Publisher Admin: ${adminEmail}`);
  }

  // ========================================
  // 3. COLLEGES
  // ========================================
  console.log('\n🏫 Creating Colleges...');
  
  const colleges = [
    {
      id: 'col-aiims-001',
      name: 'AIIMS Nagpur',
      code: 'AIIMS_NGP',
      emailDomain: 'aiimsnagpur.edu.in',
      adminContactEmail: 'admin@aiimsnagpur.edu.in',
      address: 'Plot No 2, Sector 20, MIHAN',
      city: 'Nagpur',
      state: 'Maharashtra',
      status: 'ACTIVE',
    },
    {
      id: 'col-aiims-del-001',
      name: 'AIIMS Delhi',
      code: 'AIIMS_DEL',
      emailDomain: 'aiims.edu',
      adminContactEmail: 'admin@aiims.edu',
      address: 'Ansari Nagar East',
      city: 'New Delhi',
      state: 'Delhi',
      status: 'ACTIVE',
    },
    {
      id: 'col-kmc-001',
      name: 'KMC Manipal',
      code: 'KMC_MNP',
      emailDomain: 'manipal.edu',
      adminContactEmail: 'admin@manipal.edu',
      address: 'Madhav Nagar, Manipal',
      city: 'Udupi',
      state: 'Karnataka',
      status: 'ACTIVE',
    },
  ];

  for (const col of colleges) {
    await prisma.colleges.upsert({
      where: { code: col.code },
      update: { ...col, updatedAt: new Date() },
      create: { ...col, createdAt: new Date(), updatedAt: new Date() },
    });
    console.log(`   ✓ College: ${col.name} (${col.code})`);
  }

  // Create College Admins
  console.log('\n👥 Creating College Admins...');
  for (const col of colleges) {
    const adminEmail = col.adminContactEmail;
    await prisma.users.upsert({
      where: { email: adminEmail },
      update: { passwordHash: hashedPassword },
      create: {
        id: uuidv4(),
        email: adminEmail,
        passwordHash: hashedPassword,
        fullName: `Admin - ${col.name}`,
        role: 'COLLEGE_ADMIN',
        status: 'ACTIVE',
        collegeId: col.id,
        updatedAt: new Date(),
      },
    });
    console.log(`   ✓ College Admin: ${adminEmail}`);
  }

  // ========================================
  // 4. DEPARTMENTS
  // ========================================
  console.log('\n🏛️ Creating Departments...');
  
  const departmentTemplates = [
    { name: 'Department of Anatomy', code: 'ANAT' },
    { name: 'Department of Physiology', code: 'PHYS' },
    { name: 'Department of Biochemistry', code: 'BIOC' },
    { name: 'Department of Pathology', code: 'PATH' },
    { name: 'Department of Pharmacology', code: 'PHAR' },
    { name: 'Department of Microbiology', code: 'MICR' },
    { name: 'Department of General Medicine', code: 'GMED' },
    { name: 'Department of General Surgery', code: 'GSUR' },
  ];

  const departments = [];
  for (const col of colleges) {
    for (const dept of departmentTemplates) {
      const deptId = uuidv4();
      departments.push({
        id: deptId,
        collegeId: col.id,
        name: dept.name,
        code: dept.code,
        status: 'ACTIVE',
      });
    }
  }

  for (const dept of departments) {
    await prisma.departments.upsert({
      where: { collegeId_code: { collegeId: dept.collegeId, code: dept.code } },
      update: { ...dept, updatedAt: new Date() },
      create: { ...dept, createdAt: new Date(), updatedAt: new Date() },
    });
  }
  console.log(`   ✓ Created ${departments.length} departments across ${colleges.length} colleges`);

  // ========================================
  // 5. FACULTY PERMISSIONS
  // ========================================
  console.log('\n🔐 Creating Faculty Permissions...');
  
  for (const col of colleges) {
    const permissions = [
      {
        id: uuidv4(),
        name: 'Full Access',
        collegeId: col.id,
        canCreateCourses: true,
        canEditCourses: true,
        canDeleteCourses: true,
        canCreateMcqs: true,
        canEditMcqs: true,
        canDeleteMcqs: true,
        canViewAnalytics: true,
        canAssignStudents: true,
        canScheduleLectures: true,
        canUploadNotes: true,
      },
      {
        id: uuidv4(),
        name: 'Read Only',
        collegeId: col.id,
        canCreateCourses: false,
        canEditCourses: false,
        canDeleteCourses: false,
        canCreateMcqs: false,
        canEditMcqs: false,
        canDeleteMcqs: false,
        canViewAnalytics: true,
        canAssignStudents: false,
        canScheduleLectures: false,
        canUploadNotes: false,
      },
      {
        id: uuidv4(),
        name: 'Course Manager',
        collegeId: col.id,
        canCreateCourses: true,
        canEditCourses: true,
        canDeleteCourses: false,
        canCreateMcqs: false,
        canEditMcqs: false,
        canDeleteMcqs: false,
        canViewAnalytics: true,
        canAssignStudents: true,
        canScheduleLectures: true,
        canUploadNotes: true,
      },
    ];

    for (const perm of permissions) {
      await prisma.faculty_permissions.upsert({
        where: { collegeId_name: { collegeId: perm.collegeId, name: perm.name } },
        update: { ...perm, updatedAt: new Date() },
        create: { ...perm, createdAt: new Date(), updatedAt: new Date() },
      });
    }
  }
  console.log(`   ✓ Created permission templates for ${colleges.length} colleges`);

  // ========================================
  // 6. FACULTY USERS
  // ========================================
  console.log('\n👨‍🏫 Creating Faculty Users...');
  
  const facultyUsers = [];
  const facultyNames = [
    'Dr. Anil Verma', 'Dr. Sunita Reddy', 'Dr. Vikram Singh', 'Dr. Meera Iyer',
    'Dr. Rakesh Gupta', 'Dr. Kavita Nair', 'Dr. Suresh Menon', 'Dr. Deepa Joshi',
  ];

  let facultyIndex = 0;
  for (const col of colleges) {
    for (let i = 0; i < 4; i++) {
      const name = facultyNames[facultyIndex % facultyNames.length];
      const email = `faculty${facultyIndex + 1}@${col.emailDomain}`;
      const userId = uuidv4();
      
      const faculty = await prisma.users.upsert({
        where: { email },
        update: { passwordHash: hashedPassword },
        create: {
          id: userId,
          email,
          passwordHash: hashedPassword,
          fullName: name,
          role: 'FACULTY',
          status: 'ACTIVE',
          collegeId: col.id,
          updatedAt: new Date(),
        },
      });
      
      // Use the actual faculty ID (may be existing user or newly created)
      facultyUsers.push({ id: faculty.id, email: faculty.email, collegeId: col.id, name: faculty.fullName });
      facultyIndex++;
    }
  }
  console.log(`   ✓ Created/Updated ${facultyUsers.length} faculty users`);

  // ========================================
  // 7. STUDENTS
  // ========================================
  console.log('\n👨‍🎓 Creating Students...');
  
  const studentNames = [
    'Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Neha Singh', 'Vikash Yadav',
    'Sneha Reddy', 'Rohan Gupta', 'Anjali Verma', 'Karan Malhotra', 'Divya Nair',
    'Arjun Das', 'Pooja Iyer', 'Saurabh Joshi', 'Ritu Agarwal', 'Mohit Saxena',
    'Tanvi Kapoor', 'Harsh Mehta', 'Simran Kaur', 'Akash Pandey', 'Kritika Rao',
  ];

  let studentCount = 0;
  for (const col of colleges) {
    for (let i = 0; i < 15; i++) {
      const name = studentNames[i % studentNames.length];
      const rollNo = `${col.code.substring(0, 4)}${String(i + 1).padStart(3, '0')}`;
      const email = `${rollNo.toLowerCase()}@${col.emailDomain}`;
      const userId = uuidv4();
      const studentId = uuidv4();
      const currentYear = new Date().getFullYear();
      
      // Check if user already exists
      const existingUser = await prisma.users.findUnique({ where: { email } });
      if (existingUser) {
        console.log(`   ⚠ Student user already exists: ${email}`);
        continue;
      }
      
      // Create user first
      await prisma.users.create({
        data: {
          id: userId,
          email,
          passwordHash: hashedPassword,
          fullName: name,
          role: 'STUDENT',
          status: 'ACTIVE',
          collegeId: col.id,
          updatedAt: new Date(),
        },
      });

      // Create student profile linked to user
      const academicYearNum = i < 5 ? 1 : i < 10 ? 2 : 3;
      await prisma.students.create({
        data: {
          id: studentId,
          collegeId: col.id,
          userId: userId,
          fullName: name,
          yearOfAdmission: currentYear - academicYearNum,
          expectedPassingYear: currentYear + (5 - academicYearNum),
          currentAcademicYear: i < 5 ? 'YEAR_1' : i < 10 ? 'YEAR_2' : 'PART_1',
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });
      studentCount++;
    }
  }
  console.log(`   ✓ Created ${studentCount} students`);

  // ========================================
  // 8. LEARNING UNITS
  // ========================================
  console.log('\n📖 Creating Learning Units...');

  // Get topics for reference
  const topics = await prisma.topics.findMany({ take: 20 });
  
  const learningUnits = [];
  const subjects = ['Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology'];
  const types = ['BOOK', 'VIDEO', 'NOTES'];
  const difficulties = ['K', 'KH', 'S', 'SH', 'P'];

  const luTitles = {
    BOOK: [
      'Gray\'s Anatomy - Upper Limb',
      'Guyton Physiology - Cardiac Function',
      'Harper\'s Biochemistry - Enzymes',
      'Robbins Pathology - Cell Injury',
      'Katzung Pharmacology - ANS Drugs',
    ],
    VIDEO: [
      'Heart Dissection - Step by Step',
      'ECG Interpretation Masterclass',
      'Biochemical Pathways Animation',
      'Histopathology Techniques',
      'Drug Mechanisms Explained',
    ],
    NOTES: [
      'Clinical Anatomy Quick Notes',
      'Physiology MCQ Prep Notes',
      'Biochemistry Formulae Sheet',
      'Pathology Case Studies',
      'Pharmacology Drug Charts',
    ],
  };

  let luCount = 0;
  for (const pub of publishers) {
    for (const type of types) {
      for (let i = 0; i < 5; i++) {
        const subject = subjects[i % subjects.length];
        const topic = topics.find(t => t.subject === subject) || topics[0];
        const title = luTitles[type][i];
        
        const lu = {
          id: uuidv4(),
          publisherId: pub.id,
          type,
          title: `${title} - ${pub.code}`,
          description: `Comprehensive ${type.toLowerCase()} covering ${subject} concepts. Published by ${pub.name}.`,
          subject,
          topicId: topic?.id || null,
          topic: topic?.name || subject,
          difficultyLevel: difficulties[i % difficulties.length],
          estimatedDuration: type === 'VIDEO' ? 45 : type === 'BOOK' ? 120 : 30,
          competencyIds: [],
          secureAccessUrl: `/uploads/${type.toLowerCase()}s/sample-${type.toLowerCase()}-${i + 1}.${type === 'VIDEO' ? 'mp4' : 'pdf'}`,
          deliveryType: type === 'VIDEO' ? 'STREAM' : 'EMBED',
          watermarkEnabled: true,
          sessionExpiryMinutes: 60,
          status: 'ACTIVE',
          competencyMappingStatus: 'COMPLETE',
          activatedAt: new Date(),
          tags: [subject, type, 'MBBS'],
        };
        
        await prisma.learning_units.create({
          data: { ...lu, createdAt: new Date(), updatedAt: new Date() },
        });
        learningUnits.push(lu);
        luCount++;
      }
    }
  }
  console.log(`   ✓ Created ${luCount} learning units`);

  // ========================================
  // 9. MCQs
  // ========================================
  console.log('\n❓ Creating MCQs...');

  const mcqTemplates = [
    {
      question: 'Which muscle is the chief flexor of the forearm at the elbow joint?',
      optionA: 'Biceps brachii',
      optionB: 'Brachialis',
      optionC: 'Brachioradialis',
      optionD: 'Pronator teres',
      correctAnswer: 'B',
      explanation: 'Brachialis is the chief flexor as it inserts on the ulna and acts only on the elbow joint.',
      subject: 'Anatomy',
    },
    {
      question: 'Normal resting cardiac output in an adult is approximately:',
      optionA: '3 L/min',
      optionB: '5 L/min',
      optionC: '7 L/min',
      optionD: '10 L/min',
      correctAnswer: 'B',
      explanation: 'Normal cardiac output is about 5 L/min (stroke volume 70ml × heart rate 70/min).',
      subject: 'Physiology',
    },
    {
      question: 'Which enzyme is rate limiting in glycolysis?',
      optionA: 'Hexokinase',
      optionB: 'Phosphofructokinase-1',
      optionC: 'Pyruvate kinase',
      optionD: 'Aldolase',
      correctAnswer: 'B',
      explanation: 'PFK-1 is the rate-limiting enzyme and major regulatory point of glycolysis.',
      subject: 'Biochemistry',
    },
    {
      question: 'Coagulative necrosis is typically seen in:',
      optionA: 'Brain',
      optionB: 'Heart',
      optionC: 'Spleen',
      optionD: 'Pancreas',
      correctAnswer: 'B',
      explanation: 'Coagulative necrosis is characteristic of ischemic injury in solid organs like heart, kidney, spleen.',
      subject: 'Pathology',
    },
    {
      question: 'Which drug is contraindicated in bronchial asthma?',
      optionA: 'Salbutamol',
      optionB: 'Propranolol',
      optionC: 'Ipratropium',
      optionD: 'Theophylline',
      correctAnswer: 'B',
      explanation: 'Beta-blockers like propranolol can cause bronchoconstriction and are contraindicated in asthma.',
      subject: 'Pharmacology',
    },
  ];

  let mcqCount = 0;
  for (const pub of publishers) {
    // Get a user for this publisher
    const pubAdmin = await prisma.users.findFirst({ where: { publisherId: pub.id } });
    
    for (let i = 0; i < 20; i++) {
      const template = mcqTemplates[i % mcqTemplates.length];
      const topic = topics.find(t => t.subject === template.subject) || topics[0];
      
      await prisma.mcqs.create({
        data: {
          id: uuidv4(),
          publisherId: pub.id,
          createdBy: pubAdmin?.id || bitflowOwner.id,
          topicId: topic?.id || null,
          question: `${template.question} (Variant ${i + 1})`,
          optionA: template.optionA,
          optionB: template.optionB,
          optionC: template.optionC,
          optionD: template.optionD,
          optionE: null,
          correctAnswer: template.correctAnswer,
          explanation: template.explanation,
          subject: template.subject,
          topic: topic?.name || template.subject,
          mcqType: i % 3 === 0 ? 'SCENARIO_BASED' : i % 3 === 1 ? 'IMAGE_BASED' : 'NORMAL',
          difficultyLevel: difficulties[i % difficulties.length],
          bloomsLevel: ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE'][i % 5],
          competencyIds: [],
          tags: [template.subject, 'MBBS', 'MCQ'],
          status: 'PUBLISHED',
          isVerified: true,
          verifiedBy: pubAdmin?.id,
          verifiedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      mcqCount++;
    }
  }
  console.log(`   ✓ Created ${mcqCount} MCQs`);

  // ========================================
  // 10. COURSES
  // ========================================
  console.log('\n📋 Creating Courses...');

  let courseCount = 0;
  for (const col of colleges) {
    const facultyInCollege = facultyUsers.filter(f => f.collegeId === col.id);
    
    const courseTemplates = [
      { title: 'Pre-Clinical Anatomy Module', subject: 'Anatomy', year: 'YEAR_1' },
      { title: 'Physiology Fundamentals', subject: 'Physiology', year: 'YEAR_1' },
      { title: 'Biochemistry Essentials', subject: 'Biochemistry', year: 'YEAR_1' },
      { title: 'Pathology Overview', subject: 'Pathology', year: 'YEAR_2' },
      { title: 'Clinical Pharmacology', subject: 'Pharmacology', year: 'YEAR_2' },
    ];

    for (let i = 0; i < courseTemplates.length; i++) {
      const template = courseTemplates[i];
      const faculty = facultyInCollege[i % facultyInCollege.length];
      const courseId = uuidv4();
      
      await prisma.courses.create({
        data: {
          id: courseId,
          facultyId: faculty.id,
          collegeId: col.id,
          title: template.title,
          description: `Comprehensive course covering ${template.subject} for ${template.year} year MBBS students.`,
          academicYear: template.year,
          status: 'PUBLISHED',
          courseCode: `${col.code.substring(0, 4)}-${template.subject.substring(0, 3).toUpperCase()}-${i + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Add learning flow steps
      const relatedLUs = learningUnits.filter(lu => lu.subject === template.subject).slice(0, 3);
      for (let j = 0; j < relatedLUs.length; j++) {
        await prisma.learning_flow_steps.create({
          data: {
            id: uuidv4(),
            courseId,
            learningUnitId: relatedLUs[j].id,
            stepOrder: j + 1,
            stepNumber: j + 1,
            stepType: relatedLUs[j].type,
            mandatory: true,
            isMandatory: true,
            prerequisites: j > 0 ? [relatedLUs[j - 1].id] : [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      courseCount++;
    }
  }
  console.log(`   ✓ Created ${courseCount} courses with learning flows`);

  // ========================================
  // 11. PACKAGES
  // ========================================
  console.log('\n📦 Creating Packages...');

  for (const pub of publishers) {
    const packages = [
      {
        name: `${pub.name} - Basic Package`,
        description: 'Access to books and notes',
        subjects: ['Anatomy', 'Physiology', 'Biochemistry'],
        contentTypes: ['BOOK', 'NOTES'],
      },
      {
        name: `${pub.name} - Premium Package`,
        description: 'Full access to all content including videos',
        subjects: ['Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology'],
        contentTypes: ['BOOK', 'VIDEO', 'NOTES'],
      },
    ];

    for (const pkg of packages) {
      const packageId = uuidv4();
      await prisma.packages.create({
        data: {
          id: packageId,
          publisherId: pub.id,
          name: pkg.name,
          description: pkg.description,
          subjects: pkg.subjects,
          contentTypes: pkg.contentTypes,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Assign package to first college
      await prisma.college_packages.create({
        data: {
          id: uuidv4(),
          collegeId: colleges[0].id,
          packageId,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2027-12-31'),
          status: 'ACTIVE',
          assignedBy: bitflowOwner.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }
  console.log(`   ✓ Created ${publishers.length * 2} packages and assignments`);

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ SEEDING COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n📋 Summary:');
  console.log(`   • 1 Bitflow Owner`);
  console.log(`   • ${publishers.length} Publishers with Admins`);
  console.log(`   • ${colleges.length} Colleges with Admins`);
  console.log(`   • ${departments.length} Departments`);
  console.log(`   • ${facultyUsers.length} Faculty Users`);
  console.log(`   • ${studentCount} Students`);
  console.log(`   • ${luCount} Learning Units`);
  console.log(`   • ${mcqCount} MCQs`);
  console.log(`   • ${courseCount} Courses`);
  console.log(`   • ${publishers.length * 2} Packages`);

  console.log('\n🔐 Login Credentials (Password: ' + DEFAULT_PASSWORD + '):');
  console.log('   ┌─────────────────────────────────────────────────────────┐');
  console.log('   │ Role              │ Email                              │');
  console.log('   ├─────────────────────────────────────────────────────────┤');
  console.log('   │ Bitflow Owner     │ owner@bitflow.com                  │');
  console.log('   │ Publisher Admin   │ admin@elsevier.com                 │');
  console.log('   │ Publisher Admin   │ admin@springer.com                 │');
  console.log('   │ Publisher Admin   │ admin@wiley.com                    │');
  console.log('   │ College Admin     │ admin@aiimsnagpur.edu.in           │');
  console.log('   │ College Admin     │ admin@aiims.edu                    │');
  console.log('   │ College Admin     │ admin@manipal.edu                  │');
  console.log('   │ Faculty           │ faculty1@aiimsnagpur.edu.in        │');
  console.log('   │ Student           │ aiim001@aiimsnagpur.edu.in         │');
  console.log('   └─────────────────────────────────────────────────────────┘');
  console.log('\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Seeding failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
