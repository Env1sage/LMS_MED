const ExcelJS = require('exceljs');
const path = require('path');

// Try to import Prisma, but allow fallback to sample data
let prisma = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bitflow_lms'
      }
    }
  });
} catch (err) {
  console.log('⚠️ Prisma client not available, using sample data');
}

async function generateExcelTemplate() {
  console.log('🔄 Fetching competencies from database...');
  
  // Fetch all active competencies
  let competencies = [];
  try {
    if (prisma) {
      competencies = await prisma.competencies.findMany({
        where: { status: 'ACTIVE' },
        select: { code: true, title: true, subject: true },
        orderBy: [{ subject: 'asc' }, { code: 'asc' }],
      });
      console.log(`✅ Found ${competencies.length} active competencies from database`);
    }
  } catch (err) {
    console.log('⚠️ Could not fetch competencies from database:', err.message);
  }
  
  // Use sample data if no competencies found
  if (competencies.length === 0) {
    console.log('📋 Using sample MCI competency codes...');
    // Sample MCI competency codes
    competencies = [
      { code: 'AN1.1', title: 'Describe & demonstrate the anatomy of skin', subject: 'Anatomy' },
      { code: 'AN1.2', title: 'Describe parts of a typical vertebra', subject: 'Anatomy' },
      { code: 'AN2.1', title: 'Describe & demonstrate features of bones', subject: 'Anatomy' },
      { code: 'AN2.2', title: 'Describe joints & their movements', subject: 'Anatomy' },
      { code: 'PY1.1', title: 'Describe cell structure & function', subject: 'Physiology' },
      { code: 'PY1.2', title: 'Describe transport across cell membrane', subject: 'Physiology' },
      { code: 'PY2.1', title: 'Describe blood composition & functions', subject: 'Physiology' },
      { code: 'PY2.2', title: 'Describe RBC structure & functions', subject: 'Physiology' },
      { code: 'BI1.1', title: 'Describe basics of bio-molecules', subject: 'Biochemistry' },
      { code: 'BI1.2', title: 'Describe carbohydrate chemistry', subject: 'Biochemistry' },
      { code: 'PA1.1', title: 'Define & describe inflammation', subject: 'Pathology' },
      { code: 'PA1.2', title: 'Describe acute inflammation', subject: 'Pathology' },
      { code: 'PH1.1', title: 'Describe principles of pharmacology', subject: 'Pharmacology' },
      { code: 'PH1.2', title: 'Describe pharmacokinetics', subject: 'Pharmacology' },
      { code: 'MI1.1', title: 'Describe morphology of bacteria', subject: 'Microbiology' },
      { code: 'MI1.2', title: 'Describe growth requirements', subject: 'Microbiology' },
    ];
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bitflow Medical LMS';
  workbook.created = new Date();

  // ============================================
  // Sheet 1: Learning Units Template
  // ============================================
  const luSheet = workbook.addWorksheet('Learning Units', {
    properties: { tabColor: { argb: '3B82F6' } },
  });

  // Column definitions
  luSheet.columns = [
    { header: 'type', key: 'type', width: 12 },
    { header: 'title', key: 'title', width: 40 },
    { header: 'description', key: 'description', width: 60 },
    { header: 'subject', key: 'subject', width: 20 },
    { header: 'topic', key: 'topic', width: 25 },
    { header: 'subTopic', key: 'subTopic', width: 25 },
    { header: 'difficultyLevel', key: 'difficultyLevel', width: 18 },
    { header: 'estimatedDuration', key: 'estimatedDuration', width: 18 },
    { header: 'secureAccessUrl', key: 'secureAccessUrl', width: 50 },
    { header: 'deliveryType', key: 'deliveryType', width: 15 },
    { header: 'watermarkEnabled', key: 'watermarkEnabled', width: 18 },
    { header: 'sessionExpiryMinutes', key: 'sessionExpiryMinutes', width: 20 },
    { header: 'competencyCodes', key: 'competencyCodes', width: 30 },
  ];

  // Style header row
  luSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  luSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } };
  luSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add sample data rows
  luSheet.addRow({
    type: 'BOOK',
    title: 'Cardiovascular Anatomy',
    description: 'Comprehensive guide to heart structure and function covering all major components',
    subject: 'Anatomy',
    topic: 'Cardiovascular System',
    subTopic: '',
    difficultyLevel: 'INTERMEDIATE',
    estimatedDuration: 45,
    secureAccessUrl: 'https://cdn.example.com/book1.pdf',
    deliveryType: 'REDIRECT',
    watermarkEnabled: 'true',
    sessionExpiryMinutes: 30,
    competencyCodes: 'AN1.1,AN1.2',
  });

  luSheet.addRow({
    type: 'VIDEO',
    title: 'Heart Function Video',
    description: 'Educational video explaining how the heart pumps blood through the body',
    subject: 'Physiology',
    topic: 'Cardiac Function',
    subTopic: '',
    difficultyLevel: 'BEGINNER',
    estimatedDuration: 30,
    secureAccessUrl: 'https://cdn.example.com/video1.mp4',
    deliveryType: 'STREAM',
    watermarkEnabled: 'true',
    sessionExpiryMinutes: 60,
    competencyCodes: 'PY2.1',
  });

  // Add dropdown validations
  // Type dropdown
  luSheet.dataValidations.add('A2:A1000', {
    type: 'list',
    allowBlank: false,
    formulae: ['"BOOK,VIDEO,NOTES,MCQ"'],
    showErrorMessage: true,
    errorTitle: 'Invalid Type',
    error: 'Please select BOOK, VIDEO, NOTES, or MCQ',
  });

  // Difficulty dropdown
  luSheet.dataValidations.add('G2:G1000', {
    type: 'list',
    allowBlank: false,
    formulae: ['"BEGINNER,INTERMEDIATE,ADVANCED,EXPERT"'],
    showErrorMessage: true,
    errorTitle: 'Invalid Difficulty',
    error: 'Please select BEGINNER, INTERMEDIATE, ADVANCED, or EXPERT',
  });

  // Delivery Type dropdown
  luSheet.dataValidations.add('J2:J1000', {
    type: 'list',
    allowBlank: false,
    formulae: ['"REDIRECT,EMBED,STREAM"'],
    showErrorMessage: true,
    errorTitle: 'Invalid Delivery Type',
    error: 'Please select REDIRECT, EMBED, or STREAM',
  });

  // Watermark dropdown
  luSheet.dataValidations.add('K2:K1000', {
    type: 'list',
    allowBlank: false,
    formulae: ['"true,false"'],
    showErrorMessage: true,
  });

  // ============================================
  // Sheet 2: MCQ Template
  // ============================================
  const mcqSheet = workbook.addWorksheet('MCQs', {
    properties: { tabColor: { argb: '22C55E' } },
  });

  mcqSheet.columns = [
    { header: 'question', key: 'question', width: 60 },
    { header: 'optionA', key: 'optionA', width: 25 },
    { header: 'optionB', key: 'optionB', width: 25 },
    { header: 'optionC', key: 'optionC', width: 25 },
    { header: 'optionD', key: 'optionD', width: 25 },
    { header: 'optionE', key: 'optionE', width: 25 },
    { header: 'correctAnswer', key: 'correctAnswer', width: 15 },
    { header: 'subject', key: 'subject', width: 20 },
    { header: 'topic', key: 'topic', width: 25 },
    { header: 'difficultyLevel', key: 'difficultyLevel', width: 18 },
    { header: 'bloomsLevel', key: 'bloomsLevel', width: 15 },
    { header: 'competencyCodes', key: 'competencyCodes', width: 30 },
    { header: 'tags', key: 'tags', width: 25 },
    { header: 'year', key: 'year', width: 10 },
    { header: 'source', key: 'source', width: 20 },
  ];

  // Style header row
  mcqSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  mcqSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '166534' } };
  mcqSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Sample MCQ data
  mcqSheet.addRow({
    question: 'What is the normal resting heart rate for adults?',
    optionA: '60-100 bpm',
    optionB: '40-60 bpm',
    optionC: '100-120 bpm',
    optionD: '120-140 bpm',
    optionE: '',
    correctAnswer: 'A',
    subject: 'Physiology',
    topic: 'Cardiovascular System',
    difficultyLevel: 'BEGINNER',
    bloomsLevel: 'REMEMBER',
    competencyCodes: 'PY2.1,PY2.2',
    tags: 'cardiology,vitals',
    year: 2024,
    source: 'NEET PG',
  });

  mcqSheet.addRow({
    question: 'Which organ produces insulin?',
    optionA: 'Liver',
    optionB: 'Pancreas',
    optionC: 'Kidney',
    optionD: 'Spleen',
    optionE: '',
    correctAnswer: 'B',
    subject: 'Physiology',
    topic: 'Endocrine System',
    difficultyLevel: 'BEGINNER',
    bloomsLevel: 'REMEMBER',
    competencyCodes: 'PY1.1',
    tags: 'endocrine,diabetes',
    year: 2024,
    source: 'NEET PG',
  });

  // MCQ Validations
  mcqSheet.dataValidations.add('G2:G1000', {
    type: 'list',
    allowBlank: false,
    formulae: ['"A,B,C,D,E"'],
    showErrorMessage: true,
    errorTitle: 'Invalid Answer',
    error: 'Please select A, B, C, D, or E',
  });

  mcqSheet.dataValidations.add('J2:J1000', {
    type: 'list',
    allowBlank: false,
    formulae: ['"BEGINNER,INTERMEDIATE,ADVANCED,EXPERT"'],
  });

  mcqSheet.dataValidations.add('K2:K1000', {
    type: 'list',
    allowBlank: false,
    formulae: ['"REMEMBER,UNDERSTAND,APPLY,ANALYZE,EVALUATE,CREATE"'],
  });

  // ============================================
  // Sheet 3: Competency Reference
  // ============================================
  const compSheet = workbook.addWorksheet('Competency Codes', {
    properties: { tabColor: { argb: 'F97316' } },
  });

  compSheet.columns = [
    { header: 'Code', key: 'code', width: 15 },
    { header: 'Title', key: 'title', width: 60 },
    { header: 'Subject', key: 'subject', width: 25 },
  ];

  // Style header row
  compSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  compSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C2410C' } };
  compSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add competencies
  for (const comp of competencies) {
    compSheet.addRow({
      code: comp.code,
      title: comp.title,
      subject: comp.subject,
    });
  }

  // Freeze first row
  compSheet.views = [{ state: 'frozen', ySplit: 1 }];

  // ============================================
  // Sheet 4: Instructions
  // ============================================
  const instrSheet = workbook.addWorksheet('Instructions', {
    properties: { tabColor: { argb: '8B5CF6' } },
  });

  instrSheet.columns = [{ header: '', key: 'text', width: 100 }];

  const instructions = [
    '📋 BITFLOW MEDICAL LMS - BULK UPLOAD TEMPLATE',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    '📚 LEARNING UNITS SHEET:',
    '• type: BOOK, VIDEO, NOTES, or MCQ',
    '• title: Content title (required)',
    '• description: At least 20 characters (required)',
    '• subject: Medical subject area (required)',
    '• topic: Specific topic (required)',
    '• difficultyLevel: BEGINNER, INTERMEDIATE, ADVANCED, or EXPERT',
    '• estimatedDuration: Duration in minutes',
    '• secureAccessUrl: URL to the content (required)',
    '• deliveryType: REDIRECT, EMBED, or STREAM',
    '• watermarkEnabled: true or false',
    '• sessionExpiryMinutes: Session timeout in minutes',
    '• competencyCodes: Comma-separated codes (e.g., "AN1.1,AN1.2,PY2.1")',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    '✅ MCQs SHEET:',
    '• question: The question text (required)',
    '• optionA to optionE: Answer options (A-D required, E optional)',
    '• correctAnswer: A, B, C, D, or E',
    '• subject: Medical subject area',
    '• topic: Specific topic',
    '• difficultyLevel: BEGINNER, INTERMEDIATE, ADVANCED, or EXPERT',
    '• bloomsLevel: REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE',
    '• competencyCodes: Comma-separated codes (e.g., "PY2.1,PY2.2")',
    '• tags: Comma-separated keywords',
    '• year: Year of question',
    '• source: Source of question (e.g., NEET PG)',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    '🎯 HOW TO USE COMPETENCY CODES:',
    '',
    '1. Go to the "Competency Codes" sheet to see available codes',
    '2. Copy the codes you need (e.g., AN1.1)',
    '3. For multiple competencies, separate with commas:',
    '   Example: AN1.1,AN1.2,PY2.1',
    '',
    '⚠️ IMPORTANT:',
    '• Codes must match exactly (case-sensitive)',
    '• Invalid codes will cause upload errors',
    '• Leave empty if no competencies to map',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    '💾 HOW TO UPLOAD:',
    '',
    '1. Fill in your data in Learning Units or MCQs sheet',
    '2. Save the file as CSV:',
    '   - File → Save As → Choose "CSV (Comma delimited)"',
    '   - Save only the sheet you want to upload',
    '3. Go to Publisher Portal → Bulk Upload',
    '4. Select your CSV file and upload',
    '',
    '═══════════════════════════════════════════════════════════════════',
  ];

  for (const line of instructions) {
    instrSheet.addRow({ text: line });
  }

  // Style instructions
  instrSheet.getRow(1).font = { bold: true, size: 16, color: { argb: '1E40AF' } };

  // Save the file
  const outputPath = path.join(__dirname, '..', '..', 'bulk-upload-template.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  
  console.log(`\n✅ Excel template generated successfully!`);
  console.log(`📁 Location: ${outputPath}`);
  console.log(`\n📊 Sheets included:`);
  console.log(`   • Learning Units - Upload books, videos, notes`);
  console.log(`   • MCQs - Upload multiple choice questions`);
  console.log(`   • Competency Codes - Reference for ${competencies.length} competencies`);
  console.log(`   • Instructions - How to use the template`);

  if (prisma) {
    await prisma.$disconnect();
  }
}

generateExcelTemplate().catch((err) => {
  console.error('Error generating template:', err);
  process.exit(1);
});
