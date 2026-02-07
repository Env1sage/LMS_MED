import { PrismaClient, ContentStatus, AcademicYear } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { v4 as uuid } from 'uuid';

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

const CBME_TOPICS = [
  // Anatomy Topics
  { subject: 'Anatomy', code: 'AN1.1', name: 'General Anatomy', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Anatomy', code: 'AN2.1', name: 'General Embryology', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Anatomy', code: 'AN3.1', name: 'General Histology', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Anatomy', code: 'AN4.1', name: 'Upper Limb', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Anatomy', code: 'AN5.1', name: 'Lower Limb', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Anatomy', code: 'AN6.1', name: 'Thorax', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Anatomy', code: 'AN7.1', name: 'Abdomen', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Anatomy', code: 'AN8.1', name: 'Pelvis and Perineum', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Anatomy', code: 'AN9.1', name: 'Head and Neck', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Anatomy', code: 'AN10.1', name: 'Brain', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Anatomy', code: 'AN11.1', name: 'Neuroanatomy', academicYear: AcademicYear.YEAR_1 },

  // Physiology Topics
  { subject: 'Physiology', code: 'PY1.1', name: 'General Physiology', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Physiology', code: 'PY2.1', name: 'Blood and Body Fluids', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Physiology', code: 'PY3.1', name: 'Nerve and Muscle Physiology', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Physiology', code: 'PY4.1', name: 'Cardiovascular System', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Physiology', code: 'PY5.1', name: 'Respiratory System', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Physiology', code: 'PY6.1', name: 'Gastrointestinal System', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Physiology', code: 'PY7.1', name: 'Renal Physiology', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Physiology', code: 'PY8.1', name: 'Endocrine Physiology', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Physiology', code: 'PY9.1', name: 'Reproductive Physiology', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Physiology', code: 'PY10.1', name: 'Neurophysiology', academicYear: AcademicYear.YEAR_1 },

  // Biochemistry Topics
  { subject: 'Biochemistry', code: 'BI1.1', name: 'Cell Biology', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Biochemistry', code: 'BI2.1', name: 'Biomolecules', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Biochemistry', code: 'BI3.1', name: 'Enzymes', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Biochemistry', code: 'BI4.1', name: 'Carbohydrate Metabolism', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Biochemistry', code: 'BI5.1', name: 'Lipid Metabolism', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Biochemistry', code: 'BI6.1', name: 'Protein Metabolism', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Biochemistry', code: 'BI7.1', name: 'Nucleic Acid Metabolism', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Biochemistry', code: 'BI8.1', name: 'Molecular Biology', academicYear: AcademicYear.YEAR_1 },
  { subject: 'Biochemistry', code: 'BI9.1', name: 'Clinical Biochemistry', academicYear: AcademicYear.YEAR_1 },

  // Pathology Topics
  { subject: 'Pathology', code: 'PA1.1', name: 'Cell Injury and Adaptation', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pathology', code: 'PA2.1', name: 'Inflammation and Healing', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pathology', code: 'PA3.1', name: 'Hemodynamic Disorders', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pathology', code: 'PA4.1', name: 'Neoplasia', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pathology', code: 'PA5.1', name: 'Immunopathology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pathology', code: 'PA6.1', name: 'Hematopathology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pathology', code: 'PA7.1', name: 'Cardiovascular Pathology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pathology', code: 'PA8.1', name: 'Respiratory Pathology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pathology', code: 'PA9.1', name: 'Gastrointestinal Pathology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pathology', code: 'PA10.1', name: 'Renal Pathology', academicYear: AcademicYear.YEAR_2 },

  // Pharmacology Topics
  { subject: 'Pharmacology', code: 'PH1.1', name: 'General Pharmacology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pharmacology', code: 'PH2.1', name: 'Autonomic Nervous System', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pharmacology', code: 'PH3.1', name: 'Cardiovascular Pharmacology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pharmacology', code: 'PH4.1', name: 'CNS Pharmacology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pharmacology', code: 'PH5.1', name: 'Antimicrobials', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pharmacology', code: 'PH6.1', name: 'Chemotherapy', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pharmacology', code: 'PH7.1', name: 'Endocrine Pharmacology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Pharmacology', code: 'PH8.1', name: 'Autacoids', academicYear: AcademicYear.YEAR_2 },

  // Microbiology Topics
  { subject: 'Microbiology', code: 'MI1.1', name: 'General Microbiology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Microbiology', code: 'MI2.1', name: 'Immunology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Microbiology', code: 'MI3.1', name: 'Bacteriology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Microbiology', code: 'MI4.1', name: 'Virology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Microbiology', code: 'MI5.1', name: 'Parasitology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Microbiology', code: 'MI6.1', name: 'Mycology', academicYear: AcademicYear.YEAR_2 },
  { subject: 'Microbiology', code: 'MI7.1', name: 'Applied Microbiology', academicYear: AcademicYear.YEAR_2 },

  // Community Medicine Topics
  { subject: 'Community Medicine', code: 'CM1.1', name: 'Epidemiology', academicYear: AcademicYear.PART_1 },
  { subject: 'Community Medicine', code: 'CM2.1', name: 'Biostatistics', academicYear: AcademicYear.PART_1 },
  { subject: 'Community Medicine', code: 'CM3.1', name: 'Demography', academicYear: AcademicYear.PART_1 },
  { subject: 'Community Medicine', code: 'CM4.1', name: 'Communicable Diseases', academicYear: AcademicYear.PART_1 },
  { subject: 'Community Medicine', code: 'CM5.1', name: 'Non-communicable Diseases', academicYear: AcademicYear.PART_1 },
  { subject: 'Community Medicine', code: 'CM6.1', name: 'National Health Programs', academicYear: AcademicYear.PART_1 },
  { subject: 'Community Medicine', code: 'CM7.1', name: 'Environmental Health', academicYear: AcademicYear.PART_1 },
  { subject: 'Community Medicine', code: 'CM8.1', name: 'Nutrition', academicYear: AcademicYear.PART_1 },

  // General Medicine Topics
  { subject: 'General Medicine', code: 'IM1.1', name: 'Cardiovascular Diseases', academicYear: AcademicYear.PART_2 },
  { subject: 'General Medicine', code: 'IM2.1', name: 'Respiratory Diseases', academicYear: AcademicYear.PART_2 },
  { subject: 'General Medicine', code: 'IM3.1', name: 'Gastrointestinal Diseases', academicYear: AcademicYear.PART_2 },
  { subject: 'General Medicine', code: 'IM4.1', name: 'Endocrine Disorders', academicYear: AcademicYear.PART_2 },
  { subject: 'General Medicine', code: 'IM5.1', name: 'Renal Diseases', academicYear: AcademicYear.PART_2 },
  { subject: 'General Medicine', code: 'IM6.1', name: 'Neurology', academicYear: AcademicYear.PART_2 },
  { subject: 'General Medicine', code: 'IM7.1', name: 'Hematology', academicYear: AcademicYear.PART_2 },
  { subject: 'General Medicine', code: 'IM8.1', name: 'Infectious Diseases', academicYear: AcademicYear.PART_2 },

  // General Surgery Topics
  { subject: 'General Surgery', code: 'SU1.1', name: 'Surgical Anatomy', academicYear: AcademicYear.PART_2 },
  { subject: 'General Surgery', code: 'SU2.1', name: 'Wound Healing', academicYear: AcademicYear.PART_2 },
  { subject: 'General Surgery', code: 'SU3.1', name: 'Shock', academicYear: AcademicYear.PART_2 },
  { subject: 'General Surgery', code: 'SU4.1', name: 'Gastrointestinal Surgery', academicYear: AcademicYear.PART_2 },
  { subject: 'General Surgery', code: 'SU5.1', name: 'Breast Diseases', academicYear: AcademicYear.PART_2 },
  { subject: 'General Surgery', code: 'SU6.1', name: 'Thyroid Disorders', academicYear: AcademicYear.PART_2 },
  { subject: 'General Surgery', code: 'SU7.1', name: 'Urological Surgery', academicYear: AcademicYear.PART_2 },

  // Obstetrics & Gynaecology Topics
  { subject: 'Obstetrics & Gynaecology', code: 'OG1.1', name: 'Anatomy of Female Reproductive System', academicYear: AcademicYear.PART_2 },
  { subject: 'Obstetrics & Gynaecology', code: 'OG2.1', name: 'Normal Pregnancy', academicYear: AcademicYear.PART_2 },
  { subject: 'Obstetrics & Gynaecology', code: 'OG3.1', name: 'High Risk Pregnancy', academicYear: AcademicYear.PART_2 },
  { subject: 'Obstetrics & Gynaecology', code: 'OG4.1', name: 'Labor and Delivery', academicYear: AcademicYear.PART_2 },
  { subject: 'Obstetrics & Gynaecology', code: 'OG5.1', name: 'Gynaecological Disorders', academicYear: AcademicYear.PART_2 },
  { subject: 'Obstetrics & Gynaecology', code: 'OG6.1', name: 'Contraception', academicYear: AcademicYear.PART_2 },

  // Pediatrics Topics
  { subject: 'Pediatrics', code: 'PE1.1', name: 'Neonatology', academicYear: AcademicYear.PART_2 },
  { subject: 'Pediatrics', code: 'PE2.1', name: 'Growth and Development', academicYear: AcademicYear.PART_2 },
  { subject: 'Pediatrics', code: 'PE3.1', name: 'Nutrition in Children', academicYear: AcademicYear.PART_2 },
  { subject: 'Pediatrics', code: 'PE4.1', name: 'Immunization', academicYear: AcademicYear.PART_2 },
  { subject: 'Pediatrics', code: 'PE5.1', name: 'Respiratory Infections', academicYear: AcademicYear.PART_2 },
  { subject: 'Pediatrics', code: 'PE6.1', name: 'Pediatric Emergencies', academicYear: AcademicYear.PART_2 },

  // Ophthalmology Topics
  { subject: 'Ophthalmology', code: 'OP1.1', name: 'Anatomy of Eye', academicYear: AcademicYear.PART_1 },
  { subject: 'Ophthalmology', code: 'OP2.1', name: 'Refractive Errors', academicYear: AcademicYear.PART_1 },
  { subject: 'Ophthalmology', code: 'OP3.1', name: 'Corneal Diseases', academicYear: AcademicYear.PART_1 },
  { subject: 'Ophthalmology', code: 'OP4.1', name: 'Cataract', academicYear: AcademicYear.PART_1 },
  { subject: 'Ophthalmology', code: 'OP5.1', name: 'Glaucoma', academicYear: AcademicYear.PART_1 },

  // ENT Topics
  { subject: 'ENT', code: 'EN1.1', name: 'Ear Anatomy and Physiology', academicYear: AcademicYear.PART_1 },
  { subject: 'ENT', code: 'EN2.1', name: 'Ear Diseases', academicYear: AcademicYear.PART_1 },
  { subject: 'ENT', code: 'EN3.1', name: 'Nose and PNS Diseases', academicYear: AcademicYear.PART_1 },
  { subject: 'ENT', code: 'EN4.1', name: 'Throat Diseases', academicYear: AcademicYear.PART_1 },

  // Orthopedics Topics
  { subject: 'Orthopedics', code: 'OR1.1', name: 'Fractures - General Principles', academicYear: AcademicYear.PART_2 },
  { subject: 'Orthopedics', code: 'OR2.1', name: 'Upper Limb Fractures', academicYear: AcademicYear.PART_2 },
  { subject: 'Orthopedics', code: 'OR3.1', name: 'Lower Limb Fractures', academicYear: AcademicYear.PART_2 },
  { subject: 'Orthopedics', code: 'OR4.1', name: 'Spine Disorders', academicYear: AcademicYear.PART_2 },
  { subject: 'Orthopedics', code: 'OR5.1', name: 'Bone Infections', academicYear: AcademicYear.PART_2 },

  // Forensic Medicine Topics
  { subject: 'Forensic Medicine', code: 'FM1.1', name: 'Legal Medicine', academicYear: AcademicYear.PART_1 },
  { subject: 'Forensic Medicine', code: 'FM2.1', name: 'Thanatology', academicYear: AcademicYear.PART_1 },
  { subject: 'Forensic Medicine', code: 'FM3.1', name: 'Mechanical Injuries', academicYear: AcademicYear.PART_1 },
  { subject: 'Forensic Medicine', code: 'FM4.1', name: 'Toxicology', academicYear: AcademicYear.PART_1 },
  { subject: 'Forensic Medicine', code: 'FM5.1', name: 'Medical Jurisprudence', academicYear: AcademicYear.PART_1 },

  // Psychiatry Topics
  { subject: 'Psychiatry', code: 'PS1.1', name: 'Psychiatric History Taking', academicYear: AcademicYear.PART_1 },
  { subject: 'Psychiatry', code: 'PS2.1', name: 'Mood Disorders', academicYear: AcademicYear.PART_1 },
  { subject: 'Psychiatry', code: 'PS3.1', name: 'Schizophrenia', academicYear: AcademicYear.PART_1 },
  { subject: 'Psychiatry', code: 'PS4.1', name: 'Anxiety Disorders', academicYear: AcademicYear.PART_1 },
  { subject: 'Psychiatry', code: 'PS5.1', name: 'Substance Use Disorders', academicYear: AcademicYear.PART_1 },

  // Dermatology Topics
  { subject: 'Dermatology', code: 'DR1.1', name: 'Skin Structure and Function', academicYear: AcademicYear.PART_1 },
  { subject: 'Dermatology', code: 'DR2.1', name: 'Bacterial Infections', academicYear: AcademicYear.PART_1 },
  { subject: 'Dermatology', code: 'DR3.1', name: 'Fungal Infections', academicYear: AcademicYear.PART_1 },
  { subject: 'Dermatology', code: 'DR4.1', name: 'Viral Infections', academicYear: AcademicYear.PART_1 },
  { subject: 'Dermatology', code: 'DR5.1', name: 'Leprosy', academicYear: AcademicYear.PART_1 },
];

async function seedTopics() {
  console.log('🌱 Seeding CBME Topics...');

  let created = 0;
  let skipped = 0;

  for (const topicData of CBME_TOPICS) {
    try {
      const existing = await prisma.topics.findUnique({
        where: { code: topicData.code },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.topics.create({
        data: {
          id: uuid(),
          subject: topicData.subject,
          name: topicData.name,
          code: topicData.code,
          description: `${topicData.name} - ${topicData.subject}`,
          academicYear: topicData.academicYear,
          status: ContentStatus.ACTIVE,
        },
      });

      created++;
    } catch (error) {
      console.error(`Failed to create topic ${topicData.code}:`, error);
    }
  }

  console.log(`✅ Topics seeding complete: ${created} created, ${skipped} skipped`);
}

seedTopics()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
