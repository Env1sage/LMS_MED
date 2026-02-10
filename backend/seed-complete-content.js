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

// Medical subjects for content creation
const MEDICAL_SUBJECTS = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 
  'Microbiology', 'Pharmacology', 'Forensic Medicine', 
  'Community Medicine', 'Medicine', 'Surgery', 'Pediatrics', 
  'Obstetrics & Gynecology', 'Orthopedics', 'ENT', 
  'Ophthalmology', 'Psychiatry', 'Dermatology', 'Radiology'
];

const ACADEMIC_YEARS = ['YEAR_1', 'YEAR_2', 'YEAR_3_MINOR', 'YEAR_3_MAJOR'];

// Helper function to generate MCI competency codes
function generateCompetencyCode(subject, index) {
  const subjectCodes = {
    'Anatomy': 'AN', 'Physiology': 'PY', 'Biochemistry': 'BI', 'Pathology': 'PA',
    'Microbiology': 'MI', 'Pharmacology': 'PH', 'Forensic Medicine': 'FM',
    'Community Medicine': 'CM', 'Medicine': 'IM', 'Surgery': 'SU', 'Pediatrics': 'PE',
    'Obstetrics & Gynecology': 'OG', 'Orthopedics': 'OR', 'ENT': 'EN',
    'Ophthalmology': 'OP', 'Psychiatry': 'PS', 'Dermatology': 'DE', 'Radiology': 'RA'
  };
  return `${subjectCodes[subject] || 'XX'}${index.toString().padStart(2, '0')}.1`;
}

async function main() {
  console.log('🚀 Starting comprehensive content seeding...\n');

  try {
    // Get existing data
    const [owner, publishers, colleges, students, faculty] = await Promise.all([
      prisma.users.findFirst({ where: { role: 'BITFLOW_OWNER' } }),
      prisma.publishers.findMany({ include: { users: true } }),
      prisma.colleges.findMany({ include: { users: true } }),
      prisma.students.findMany({ include: { user: true } }),
      prisma.users.findMany({ where: { role: 'FACULTY' } })
    ]);

    if (!owner || publishers.length === 0 || colleges.length === 0) {
      throw new Error('Please run seed-demo-minimal.js first to create users and colleges');
    }

    console.log(`✓ Found ${publishers.length} publishers`);
    console.log(`✓ Found ${colleges.length} colleges`);
    console.log(`✓ Found ${students.length} students`);
    console.log(`✓ Found ${faculty.length} faculty members\n`);

    // 1. CREATE TOPICS (100 topics across all subjects)
    console.log('📚 Creating topics...');
    const topics = [];
    let topicCount = 0;
    
    for (const subject of MEDICAL_SUBJECTS) {
      for (let i = 1; i <= 6; i++) {
        const topic = await prisma.topics.upsert({
          where: { code: `${subject.substring(0, 3).toUpperCase()}_TOPIC_${i}` },
          update: {},
          create: {
            id: uuidv4(),
            subject: subject,
            name: `${subject} - Topic ${i}`,
            code: `${subject.substring(0, 3).toUpperCase()}_TOPIC_${i}`,
            description: `Core concepts and clinical applications of ${subject} topic ${i}`,
            academicYear: ACADEMIC_YEARS[Math.floor((i - 1) / 2)],
            status: 'ACTIVE'
          }
        });
        topics.push(topic);
        topicCount++;
        if (topicCount % 20 === 0) console.log(`  Created ${topicCount} topics...`);
      }
    }
    console.log(`✓ Created ${topics.length} topics\n`);

    // 2. CREATE COMPETENCIES (200+ MCI competencies)
    console.log('🎯 Creating MCI competencies...');
    const competencies = [];
    let compCount = 0;
    
    for (const subject of MEDICAL_SUBJECTS) {
      const subjectTopics = topics.filter(t => t.subject === subject);
      
      for (let i = 1; i <= 12; i++) {
        const competencyCode = generateCompetencyCode(subject, i);
        const topic = subjectTopics[Math.floor(Math.random() * subjectTopics.length)];
        
        const competency = await prisma.competencies.upsert({
          where: { code: competencyCode },
          update: {},
          create: {
            id: uuidv4(),
            code: competencyCode,
            title: `${subject} Competency ${i}`,
            description: `At the end of the course, the student should be able to demonstrate knowledge and skills related to ${subject.toLowerCase()} topic ${i}`,
            subject: subject,
            topicId: topic.id,
            domain: ['COGNITIVE', 'CLINICAL', 'PRACTICAL'][Math.floor(Math.random() * 3)],
            academicLevel: 'UG', // All medical students are Undergraduate
            status: 'ACTIVE',
            createdBy: owner.id,
            reviewedBy: owner.id,
            activatedAt: new Date(),
            updatedAt: new Date()
          }
        });
        competencies.push(competency);
        compCount++;
        if (compCount % 30 === 0) console.log(`  Created ${compCount} competencies...`);
      }
    }
    console.log(`✓ Created ${competencies.length} competencies\n`);

    // 3. CREATE LEARNING UNITS (Books, Videos, PPTs for each publisher)
    console.log('📖 Creating learning units...');
    const learningUnits = [];
    let luCount = 0;

    for (const publisher of publishers) {
      const publisherAdmin = publisher.users[0];
      
      // Create learning units for each subject
      for (const subject of MEDICAL_SUBJECTS) {
        const subjectTopics = topics.filter(t => t.subject === subject);
        const subjectCompetencies = competencies.filter(c => c.subject === subject);

        // Books (2 per subject)
        for (let i = 1; i <= 2; i++) {
          const topic = subjectTopics[i % subjectTopics.length];
          const relatedComps = subjectCompetencies.slice(0, 3).map(c => c.id);
          
          const book = await prisma.learning_units.create({
            data: {
              id: uuidv4(),
              publisherId: publisher.id,
              type: 'BOOK',
              title: `${subject} Textbook Vol ${i} - ${publisher.name}`,
              description: `Comprehensive ${subject} textbook covering fundamental concepts and clinical applications`,
              subject: subject,
              topicId: topic.id,
              topic: topic.name,
              difficultyLevel: i === 1 ? 'K' : 'KH',
              estimatedDuration: 180 + (i * 30),
              competencyIds: relatedComps,
              secureAccessUrl: `https://cdn.${publisher.code.toLowerCase()}.com/books/${subject.toLowerCase().replace(/ /g, '-')}-vol${i}.pdf`,
              deliveryType: 'STREAM',
              watermarkEnabled: true,
              sessionExpiryMinutes: 60,
              status: 'ACTIVE',
              competencyMappingStatus: 'COMPLETE',
              activatedAt: new Date(),
              activatedBy: publisherAdmin.id,
              downloadAllowed: false,
              viewOnly: true,
              thumbnailUrl: `https://cdn.${publisher.code.toLowerCase()}.com/thumbnails/${subject.toLowerCase()}-book.jpg`,
              tags: [subject, 'textbook', `year-${i}`],
              updatedAt: new Date()
            }
          });
          learningUnits.push(book);
          luCount++;
        }

        // Videos (3 per subject)
        for (let i = 1; i <= 3; i++) {
          const topic = subjectTopics[i % subjectTopics.length];
          const relatedComps = subjectCompetencies.slice(i * 2, (i * 2) + 2).map(c => c.id);
          
          const video = await prisma.learning_units.create({
            data: {
              id: uuidv4(),
              publisherId: publisher.id,
              type: 'VIDEO',
              title: `${subject} Video Lecture ${i} - ${topic.name}`,
              description: `Detailed video lecture on ${topic.name} with clinical demonstrations`,
              subject: subject,
              topicId: topic.id,
              topic: topic.name,
              difficultyLevel: ['K', 'KH', 'S'][i % 3],
              estimatedDuration: 45 + (i * 10),
              competencyIds: relatedComps,
              secureAccessUrl: `https://cdn.${publisher.code.toLowerCase()}.com/videos/${subject.toLowerCase().replace(/ /g, '-')}-lecture-${i}.mp4`,
              deliveryType: 'STREAM',
              watermarkEnabled: true,
              sessionExpiryMinutes: 45,
              status: 'ACTIVE',
              competencyMappingStatus: 'COMPLETE',
              activatedAt: new Date(),
              activatedBy: publisherAdmin.id,
              downloadAllowed: false,
              viewOnly: true,
              thumbnailUrl: `https://cdn.${publisher.code.toLowerCase()}.com/thumbnails/${subject.toLowerCase()}-video${i}.jpg`,
              tags: [subject, 'video', 'lecture'],
              updatedAt: new Date()
            }
          });
          learningUnits.push(video);
          luCount++;
        }

        // PPTs (2 per subject)
        for (let i = 1; i <= 2; i++) {
          const topic = subjectTopics[i % subjectTopics.length];
          const relatedComps = subjectCompetencies.slice(i * 3, (i * 3) + 3).map(c => c.id);
          
          const ppt = await prisma.learning_units.create({
            data: {
              id: uuidv4(),
              publisherId: publisher.id,
              type: 'NOTES',
              title: `${subject} Presentation ${i} - ${topic.name}`,
              description: `Interactive presentation covering key points of ${topic.name}`,
              subject: subject,
              topicId: topic.id,
              topic: topic.name,
              difficultyLevel: i === 1 ? 'K' : 'KH',
              estimatedDuration: 30 + (i * 10),
              competencyIds: relatedComps,
              secureAccessUrl: `https://cdn.${publisher.code.toLowerCase()}.com/presentations/${subject.toLowerCase().replace(/ /g, '-')}-ppt-${i}.pptx`,
              deliveryType: 'STREAM',
              watermarkEnabled: true,
              sessionExpiryMinutes: 40,
              status: 'ACTIVE',
              competencyMappingStatus: 'COMPLETE',
              activatedAt: new Date(),
              activatedBy: publisherAdmin.id,
              downloadAllowed: false,
              viewOnly: true,
              thumbnailUrl: `https://cdn.${publisher.code.toLowerCase()}.com/thumbnails/${subject.toLowerCase()}-ppt.jpg`,
              tags: [subject, 'presentation', 'slides'],
              updatedAt: new Date()
            }
          });
          learningUnits.push(ppt);
          luCount++;
        }

        if (luCount % 50 === 0) console.log(`  Created ${luCount} learning units...`);
      }
    }
    console.log(`✓ Created ${learningUnits.length} learning units\n`);

    // 4. CREATE MCQs (1000+ questions)
    console.log('❓ Creating MCQs...');
    const mcqs = [];
    let mcqCount = 0;

    for (const publisher of publishers) {
      const publisherAdmin = publisher.users[0];
      
      for (const subject of MEDICAL_SUBJECTS) {
        const subjectTopics = topics.filter(t => t.subject === subject);
        const subjectCompetencies = competencies.filter(c => c.subject === subject);

        // Create 30 MCQs per subject per publisher
        for (let i = 1; i <= 30; i++) {
          const topic = subjectTopics[i % subjectTopics.length];
          const relatedComps = subjectCompetencies.slice(0, 2).map(c => c.id);
          const correctOpt = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
          
          const mcq = await prisma.mcqs.create({
            data: {
              id: uuidv4(),
              question: `${subject} Question ${i}: What is the clinical significance of ${topic.name}?`,
              optionA: `This is option A explaining one aspect of ${topic.name}`,
              optionB: `This is option B discussing another perspective of ${topic.name}`,
              optionC: `This is option C presenting an alternative view of ${topic.name}`,
              optionD: `This is option D showing different interpretation of ${topic.name}`,
              correctAnswer: correctOpt,
              explanation: `The correct answer is ${correctOpt} because it accurately describes the fundamental principle of ${topic.name} based on current medical evidence and clinical practice guidelines.`,
              subject: subject,
              topicId: topic.id,
              topic: topic.name,
              mcqType: 'NORMAL',
              difficultyLevel: ['K', 'KH', 'S'][i % 3],
              bloomsLevel: ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE'][i % 4],
              competencyIds: relatedComps,
              tags: [subject, topic.name, 'clinical'],
              year: 2024,
              source: `${publisher.name} Question Bank`,
              publisherId: publisher.id,
              createdBy: publisherAdmin.id,
              status: 'PUBLISHED',
              isVerified: true,
              verifiedBy: publisherAdmin.id,
              verifiedAt: new Date(),
              usageCount: Math.floor(Math.random() * 100),
              correctRate: 0.5 + (Math.random() * 0.4),
              updatedAt: new Date()
            }
          });
          mcqs.push(mcq);
          mcqCount++;
          if (mcqCount % 100 === 0) console.log(`  Created ${mcqCount} MCQs...`);
        }
      }
    }
    console.log(`✓ Created ${mcqs.length} MCQs\n`);

    // 5. CREATE PACKAGES (Subject-based packages)
    console.log('📦 Creating packages...');
    const packages = [];
    
    for (const publisher of publishers) {
      // Create packages for different academic years
      for (let year = 1; year <= 4; year++) {
        const yearSubjects = MEDICAL_SUBJECTS.slice(0, year === 1 ? 6 : year === 2 ? 8 : 12);
        
        const pkg = await prisma.packages.create({
          data: {
            id: uuidv4(),
            publisherId: publisher.id,
            name: `${publisher.name} - Year ${year} Complete Package`,
            description: `Comprehensive learning package for Year ${year} MBBS students including all subjects`,
            status: 'ACTIVE',
            subjects: yearSubjects,
            contentTypes: ['BOOK', 'VIDEO', 'NOTES'],
            updatedAt: new Date()
          }
        });
        packages.push(pkg);
      }

      // Subject-specific packages
      for (const subject of ['Anatomy', 'Physiology', 'Pathology', 'Medicine', 'Surgery']) {
        const pkg = await prisma.packages.create({
          data: {
            id: uuidv4(),
            publisherId: publisher.id,
            name: `${publisher.name} - ${subject} Premium`,
            description: `Complete ${subject} package with books, videos, and presentations`,
            status: 'ACTIVE',
            subjects: [subject],
            contentTypes: ['BOOK', 'VIDEO', 'NOTES'],
            updatedAt: new Date()
          }
        });
        packages.push(pkg);
      }
    }
    console.log(`✓ Created ${packages.length} packages\n`);

    // 6. ASSIGN PACKAGES TO COLLEGES
    console.log('🏥 Assigning packages to colleges...');
    let packageAssignments = 0;
    
    for (const college of colleges) {
      // Assign 6 packages to each college (3 from each publisher)
      const collegePkgs = packages.slice(0, 6);
      
      for (const pkg of collegePkgs) {
        await prisma.college_packages.upsert({
          where: {
            collegeId_packageId: {
              collegeId: college.id,
              packageId: pkg.id
            }
          },
          update: {},
          create: {
            id: uuidv4(),
            collegeId: college.id,
            packageId: pkg.id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            status: 'ACTIVE',
            assignedBy: owner.id,
            updatedAt: new Date()
          }
        });
        packageAssignments++;
      }
    }
    console.log(`✓ Created ${packageAssignments} package assignments\n`);

    // 7. CREATE DEPARTMENTS FOR COLLEGES
    console.log('🏛️ Creating departments...');
    const departments = [];
    const deptSubjects = ['Anatomy', 'Physiology', 'Medicine', 'Surgery', 'Pediatrics'];
    
    for (const college of colleges) {
      const collegeFaculty = faculty.filter(f => f.collegeId === college.id);
      
      for (let i = 0; i < deptSubjects.length; i++) {
        const dept = await prisma.departments.create({
          data: {
            id: uuidv4(),
            collegeId: college.id,
            name: `Department of ${deptSubjects[i]}`,
            code: `DEPT_${deptSubjects[i].substring(0, 3).toUpperCase()}`,
            hodId: collegeFaculty[i % collegeFaculty.length]?.id || null,
            status: 'ACTIVE',
            updatedAt: new Date()
          }
        });
        departments.push(dept);
      }
    }
    console.log(`✓ Created ${departments.length} departments\n`);

    // 8. ASSIGN FACULTY TO DEPARTMENTS
    console.log('👨‍🏫 Assigning faculty to departments...');
    let facultyAssignments = 0;
    
    for (const college of colleges) {
      const collegeFaculty = faculty.filter(f => f.collegeId === college.id);
      const collegeDepts = departments.filter(d => d.collegeId === college.id);
      
      // Create faculty permissions first
      const permission = await prisma.faculty_permissions.upsert({
        where: {
          collegeId_name: {
            collegeId: college.id,
            name: 'Full Access'
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          name: 'Full Access',
          collegeId: college.id,
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
          updatedAt: new Date()
        }
      });

      for (const fac of collegeFaculty) {
        const dept = collegeDepts[facultyAssignments % collegeDepts.length];
        
        await prisma.faculty_assignments.upsert({
          where: {
            userId_departmentId: {
              userId: fac.id,
              departmentId: dept.id
            }
          },
          update: {},
          create: {
            id: uuidv4(),
            userId: fac.id,
            departmentId: dept.id,
            permissionId: permission.id,
            subjects: [deptSubjects[facultyAssignments % deptSubjects.length]],
            status: 'ACTIVE',
            updatedAt: new Date()
          }
        });
        facultyAssignments++;
      }
    }
    console.log(`✓ Created ${facultyAssignments} faculty assignments\n`);

    // 9. ASSIGN STUDENTS TO DEPARTMENTS
    console.log('👨‍🎓 Assigning students to departments...');
    let studentDeptAssignments = 0;
    
    for (const college of colleges) {
      const collegeStudents = students.filter(s => s.collegeId === college.id);
      const collegeDepts = departments.filter(d => d.collegeId === college.id);
      
      for (const student of collegeStudents) {
        // Assign to 2-3 departments
        const numDepts = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numDepts; i++) {
          const dept = collegeDepts[i % collegeDepts.length];
          
          await prisma.student_departments.upsert({
            where: {
              studentId_departmentId: {
                studentId: student.id,
                departmentId: dept.id
              }
            },
            update: {},
            create: {
              id: uuidv4(),
              studentId: student.id,
              departmentId: dept.id
            }
          });
          studentDeptAssignments++;
        }
      }
    }
    console.log(`✓ Created ${studentDeptAssignments} student-department assignments\n`);

    // 10. CREATE COURSES
    console.log('📚 Creating courses...');
    const courses = [];
    let courseCount = 0;
    
    for (const college of colleges) {
      const collegeFaculty = faculty.filter(f => f.collegeId === college.id);
      
      // Create 20 courses per college
      for (let i = 0; i < 20; i++) {
        const subject = MEDICAL_SUBJECTS[i % MEDICAL_SUBJECTS.length];
        const fac = collegeFaculty[i % collegeFaculty.length];
        const year = ACADEMIC_YEARS[i % ACADEMIC_YEARS.length];
        
        const course = await prisma.courses.create({
          data: {
            id: uuidv4(),
            facultyId: fac.id,
            collegeId: college.id,
            title: `${subject} Course - ${year.replace('_', ' ')}`,
            description: `Comprehensive ${subject} course covering all competencies for ${year.replace('_', ' ')}`,
            academicYear: year,
            status: 'PUBLISHED',
            courseCode: `${college.code}_${subject.substring(0, 3).toUpperCase()}_${i + 1}`,
            metadata: {
              credits: 4,
              semester: Math.floor(i / 2) + 1,
              prerequisites: []
            },
            updatedAt: new Date()
          }
        });
        courses.push(course);
        courseCount++;
      }
    }
    console.log(`✓ Created ${courses.length} courses\n`);

    // 11. MAP COMPETENCIES TO COURSES
    console.log('🎯 Mapping competencies to courses...');
    let courseCompMappings = 0;
    
    for (const course of courses) {
      const courseSubject = MEDICAL_SUBJECTS.find(s => course.title.includes(s));
      const relevantComps = competencies.filter(c => c.subject === courseSubject).slice(0, 5);
      
      for (const comp of relevantComps) {
        await prisma.course_competencies.upsert({
          where: {
            courseId_competencyId: {
              courseId: course.id,
              competencyId: comp.id
            }
          },
          update: {},
          create: {
            id: uuidv4(),
            courseId: course.id,
            competencyId: comp.id
          }
        });
        courseCompMappings++;
      }
    }
    console.log(`✓ Created ${courseCompMappings} course-competency mappings\n`);

    // 12. ADD LEARNING FLOW STEPS TO COURSES
    console.log('📖 Creating learning flow steps...');
    let flowSteps = 0;
    
    for (const course of courses) {
      const courseSubject = MEDICAL_SUBJECTS.find(s => course.title.includes(s));
      const relevantUnits = learningUnits.filter(lu => lu.subject === courseSubject).slice(0, 10);
      
      for (let i = 0; i < relevantUnits.length; i++) {
        await prisma.learning_flow_steps.create({
          data: {
            id: uuidv4(),
            courseId: course.id,
            learningUnitId: relevantUnits[i].id,
            stepOrder: i + 1,
            stepNumber: i + 1,
            stepType: relevantUnits[i].type,
            mandatory: i < 5, // First 5 steps are mandatory
            isMandatory: i < 5,
            prerequisites: i > 0 ? [relevantUnits[i - 1].id] : [],
            completionCriteria: {
              minTimeSpent: 30,
              requiresFullView: true
            },
            updatedAt: new Date()
          }
        });
        flowSteps++;
      }
    }
    console.log(`✓ Created ${flowSteps} learning flow steps\n`);

    // 13. ASSIGN COURSES TO STUDENTS
    console.log('👨‍🎓 Assigning courses to students...');
    let courseAssignments = 0;
    
    for (const college of colleges) {
      const collegeStudents = students.filter(s => s.collegeId === college.id);
      const collegeCourses = courses.filter(c => c.collegeId === college.id);
      const collegeFaculty = faculty.filter(f => f.collegeId === college.id);
      const assignedBy = collegeFaculty[0]?.id || owner.id;
      
      for (const student of collegeStudents) {
        // Assign 5 courses per student based on their year
        const studentYearCourses = collegeCourses
          .filter(c => c.academicYear === student.currentAcademicYear)
          .slice(0, 5);
        
        for (const course of studentYearCourses) {
          await prisma.course_assignments.upsert({
            where: {
              courseId_studentId: {
                courseId: course.id,
                studentId: student.id
              }
            },
            update: {},
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
          courseAssignments++;
        }
      }
    }
    console.log(`✓ Created ${courseAssignments} course assignments\n`);

    // 14. CREATE STUDENT PROGRESS
    console.log('📊 Creating student progress data...');
    let progressRecords = 0;
    
    const assignedCourseData = await prisma.course_assignments.findMany({
      include: {
        courses: {
          include: {
            learning_flow_steps: true
          }
        }
      }
    });
    
    for (const assignment of assignedCourseData) {
      const totalSteps = assignment.courses.learning_flow_steps.length;
      const completedSteps = Math.floor(Math.random() * (totalSteps / 2));
      const stepIds = assignment.courses.learning_flow_steps
        .slice(0, completedSteps)
        .map(s => s.id);
      
      await prisma.student_progress.upsert({
        where: {
          studentId_courseId: {
            studentId: assignment.studentId,
            courseId: assignment.courseId
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          studentId: assignment.studentId,
          courseId: assignment.courseId,
          status: completedSteps === totalSteps ? 'COMPLETED' : completedSteps > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
          completedSteps: stepIds,
          currentStepId: stepIds[stepIds.length - 1] || null,
          startedAt: completedSteps > 0 ? new Date() : null,
          completedAt: completedSteps === totalSteps ? new Date() : null,
          updatedAt: new Date()
        }
      });
      progressRecords++;
      
      if (progressRecords % 100 === 0) console.log(`  Created ${progressRecords} progress records...`);
    }
    console.log(`✓ Created ${progressRecords} student progress records\n`);

    // 15. CREATE TESTS
    console.log('📝 Creating tests...');
    const tests = [];
    
    for (const course of courses) {
      // Create 2 tests per course
      for (let i = 1; i <= 2; i++) {
        const test = await prisma.tests.create({
          data: {
            id: uuidv4(),
            courseId: course.id,
            createdBy: course.facultyId,
            collegeId: course.collegeId,
            title: `${course.title} - Assessment ${i}`,
            description: `${i === 1 ? 'Mid-term' : 'Final'} assessment for ${course.title}`,
            type: i === 1 ? 'SCHEDULED_TEST' : 'FINAL_EXAM',
            status: 'ACTIVE',
            subject: MEDICAL_SUBJECTS.find(s => course.title.includes(s)) || 'Medicine',
            totalQuestions: 50,
            totalMarks: 100,
            passingMarks: 50,
            durationMinutes: 120,
            scheduledStartTime: new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000)),
            scheduledEndTime: new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000) + (3 * 60 * 60 * 1000)),
            allowMultipleAttempts: false,
            maxAttempts: 1,
            shuffleQuestions: true,
            showAnswersAfter: true,
            showExplanations: true,
            negativeMarking: true,
            negativeMarkValue: 0.25,
            updatedAt: new Date()
          }
        });
        tests.push(test);

        // Add MCQ questions to test
        const testSubject = MEDICAL_SUBJECTS.find(s => course.title.includes(s));
        const testMcqs = mcqs.filter(m => m.subject === testSubject).slice(0, 50);
        
        for (let q = 0; q < testMcqs.length; q++) {
          await prisma.test_questions.create({
            data: {
              id: uuidv4(),
              testId: test.id,
              mcqId: testMcqs[q].id,
              questionOrder: q + 1,
              marks: 2
            }
          });
        }
      }
    }
    console.log(`✓ Created ${tests.length} tests with questions\n`);

    // 16. ASSIGN TESTS TO STUDENTS
    console.log('📝 Assigning tests to students...');
    let testAssignments = 0;
    
    for (const test of tests) {
      const courseAssigns = await prisma.course_assignments.findMany({
        where: { courseId: test.courseId }
      });
      
      for (const assign of courseAssigns) {
        await prisma.test_assignments.create({
          data: {
            id: uuidv4(),
            testId: test.id,
            studentId: assign.studentId,
            status: 'ASSIGNED',
            dueDate: test.scheduledEndTime
          }
        });
        testAssignments++;
      }
    }
    console.log(`✓ Created ${testAssignments} test assignments\n`);

    // 17. CREATE SELF-PACED RESOURCES
    console.log('📚 Creating self-paced resources...');
    let selfPacedCount = 0;
    
    for (const college of colleges) {
      const collegeFaculty = faculty.filter(f => f.collegeId === college.id);
      
      for (const fac of collegeFaculty) {
        // Create 5 resources per faculty
        for (let i = 1; i <= 5; i++) {
          const subject = MEDICAL_SUBJECTS[i % MEDICAL_SUBJECTS.length];
          const resType = ['PDF', 'VIDEO', 'LINK', 'NOTES'][i % 4];
          
          await prisma.self_paced_resources.create({
            data: {
              id: uuidv4(),
              facultyId: fac.id,
              collegeId: college.id,
              title: `${subject} - Self Study Material ${i}`,
              description: `Additional learning resource for ${subject}`,
              resourceType: resType,
              fileUrl: resType !== 'NOTES' ? `https://cdn.college.edu/resources/${subject.toLowerCase()}-${i}.${resType.toLowerCase()}` : null,
              content: resType === 'NOTES' ? `Detailed notes on ${subject} for self-paced learning` : null,
              subject: subject,
              academicYear: ACADEMIC_YEARS[i % ACADEMIC_YEARS.length],
              tags: [subject, 'self-paced', resType.toLowerCase()],
              status: 'ACTIVE',
              viewCount: Math.floor(Math.random() * 200),
              updatedAt: new Date()
            }
          });
          selfPacedCount++;
        }
      }
    }
    console.log(`✓ Created ${selfPacedCount} self-paced resources\n`);

    // 18. CREATE NOTIFICATIONS
    console.log('🔔 Creating notifications...');
    let notifCount = 0;
    
    for (const college of colleges) {
      const collegeUsers = await prisma.users.findMany({
        where: { collegeId: college.id }
      });
      
      // Create 5 notifications per college
      for (let i = 1; i <= 5; i++) {
        const notifTypes = ['COURSE_ASSIGNED', 'TEST_SCHEDULED', 'GRADE_PUBLISHED', 'ANNOUNCEMENT', 'REMINDER'];
        const notifType = notifTypes[i % notifTypes.length];
        
        for (const user of collegeUsers.slice(0, 10)) {
          await prisma.notifications.create({
            data: {
              id: uuidv4(),
              userId: user.id,
              collegeId: college.id,
              type: notifType,
              title: `${notifType.replace('_', ' ')}: Important Update ${i}`,
              message: `This is a ${notifType.toLowerCase().replace('_', ' ')} notification for ${college.name}`,
              priority: i % 2 === 0 ? 'HIGH' : 'MEDIUM',
              isRead: Math.random() > 0.5,
              createdBy: owner.id,
              updatedAt: new Date()
            }
          });
          notifCount++;
        }
      }
    }
    console.log(`✓ Created ${notifCount} notifications\n`);

    // SUMMARY
    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPREHENSIVE CONTENT SEEDING COMPLETED!');
    console.log('='.repeat(60));
    console.log(`📚 Topics: ${topics.length}`);
    console.log(`🎯 Competencies: ${competencies.length}`);
    console.log(`📖 Learning Units: ${learningUnits.length} (Books, Videos, PPTs)`);
    console.log(`❓ MCQs: ${mcqs.length}`);
    console.log(`📦 Packages: ${packages.length}`);
    console.log(`🏥 Package Assignments: ${packageAssignments}`);
    console.log(`🏛️ Departments: ${departments.length}`);
    console.log(`👨‍🏫 Faculty Assignments: ${facultyAssignments}`);
    console.log(`👨‍🎓 Student-Department Assignments: ${studentDeptAssignments}`);
    console.log(`📚 Courses: ${courses.length}`);
    console.log(`🎯 Course-Competency Mappings: ${courseCompMappings}`);
    console.log(`📖 Learning Flow Steps: ${flowSteps}`);
    console.log(`👨‍🎓 Course Assignments: ${courseAssignments}`);
    console.log(`📊 Progress Records: ${progressRecords}`);
    console.log(`📝 Tests: ${tests.length}`);
    console.log(`📝 Test Assignments: ${testAssignments}`);
    console.log(`📚 Self-Paced Resources: ${selfPacedCount}`);
    console.log(`🔔 Notifications: ${notifCount}`);
    console.log('='.repeat(60));
    console.log('\n🎉 All portals are now fully populated with content!');
    console.log('💡 You can now login and explore:');
    console.log('   - Owner Portal: Full system overview');
    console.log('   - Publisher Portal: Learning units, MCQs, packages');
    console.log('   - College Admin Portal: Courses, students, faculty');
    console.log('   - Faculty Portal: Create courses, assign content, view analytics');
    console.log('   - Student Portal: Enrolled courses, learning materials, tests');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
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
