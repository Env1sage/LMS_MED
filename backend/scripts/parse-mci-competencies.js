const fs = require('fs');
const path = require('path');

/**
 * MCI Competency Parser
 * Extracts competencies from MCI curriculum text files
 */

// Subject mappings
const SUBJECTS = {
  'AN': 'Anatomy',
  'PY': 'Physiology',
  'BI': 'Biochemistry',
  'PA': 'Pathology',
  'MI': 'Microbiology',
  'PH': 'Pharmacology',
  'FM': 'Forensic Medicine',
  'CM': 'Community Medicine',
  'IM': 'Internal Medicine',
  'SU': 'Surgery',
  'OR': 'Orthopedics',
  'EN': 'ENT',
  'OP': 'Ophthalmology',
  'OG': 'Obstetrics & Gynecology',
  'PE': 'Pediatrics',
  'PS': 'Psychiatry',
  'DE': 'Dermatology',
  'DR': 'Radio-Diagnosis',
  'RT': 'Radiotherapy',
  'AN': 'Anesthesia',
  'CT': 'Clinical Training'
};

// Competency pattern: AN1.1, PY2.3, etc.
const COMPETENCY_PATTERN = /([A-Z]{2})(\d+)\.(\d+)\s+(.+?)(?=\s{2,}|$)/g;

function parseCompetencies(text, volume) {
  const competencies = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match competency codes
    const match = line.match(/([A-Z]{2})(\d+)\.(\d+)/);
    
    if (match) {
      const [fullCode, subjectCode, topicNum, compNum] = match;
      
      // Extract description - usually after the code
      let description = line.substring(line.indexOf(fullCode) + fullCode.length).trim();
      
      // Clean up description (remove extra spaces, assessment columns)
      description = description
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+(K|KH|S|SH|P)\s+/g, ' ')
        .replace(/\s+(Y|N)\s+/g, ' ')
        .replace(/\s+(Written|Viva|DOAP|Lecture|session).*/gi, '')
        .trim();
      
      // Only add if we have a meaningful description
      if (description.length > 10) {
        competencies.push({
          code: fullCode,
          subjectCode: subjectCode,
          topicNumber: topicNum,
          competencyNumber: compNum,
          description: description,
          subject: SUBJECTS[subjectCode] || subjectCode,
          volume: volume
        });
      }
    }
  }
  
  return competencies;
}

function main() {
  console.log('🔍 Parsing MCI Competencies...\n');
  
  const extractionDir = '/tmp/mci_extraction';
  const allCompetencies = {};
  
  // Parse each volume
  ['vol1.txt', 'vol2.txt', 'vol3.txt'].forEach((filename, index) => {
    const filePath = path.join(extractionDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${filename} not found, skipping...`);
      return;
    }
    
    console.log(`📄 Processing ${filename}...`);
    const text = fs.readFileSync(filePath, 'utf8');
    const competencies = parseCompetencies(text, index + 1);
    
    console.log(`   Found ${competencies.length} competencies`);
    
    // Group by subject
    competencies.forEach(comp => {
      if (!allCompetencies[comp.subjectCode]) {
        allCompetencies[comp.subjectCode] = {
          code: comp.subjectCode,
          name: comp.subject,
          competencies: []
        };
      }
      
      // Avoid duplicates
      const exists = allCompetencies[comp.subjectCode].competencies.some(
        c => c.code === comp.code
      );
      
      if (!exists) {
        allCompetencies[comp.subjectCode].competencies.push(comp);
      }
    });
  });
  
  // Write output
  const outputPath = '/tmp/mci_competencies_extracted.json';
  fs.writeFileSync(outputPath, JSON.stringify(allCompetencies, null, 2));
  
  // Summary
  console.log('\n' + '━'.repeat(60));
  console.log('✅ Extraction Complete!\n');
  
  let totalComp = 0;
  Object.entries(allCompetencies).forEach(([code, subject]) => {
    console.log(`   ${subject.name.padEnd(30)} ${code}  : ${subject.competencies.length} competencies`);
    totalComp += subject.competencies.length;
  });
  
  console.log('\n' + '━'.repeat(60));
  console.log(`📊 Total Subjects: ${Object.keys(allCompetencies).length}`);
  console.log(`📊 Total Competencies: ${totalComp}`);
  console.log(`📁 Output: ${outputPath}`);
  console.log('\nNext step: Run the database migration');
  console.log('   npx ts-node scripts/migrate-mci-competencies.ts');
}

main();
