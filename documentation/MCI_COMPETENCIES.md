# MCI Competencies - Production Database

## Overview
All **2,080 official Medical Council of India (MCI) competencies** from the Graduate Medical Education Regulations (Vol I, II, III) have been permanently added to the Bitflow LMS database.

## Database Statistics

### Total Counts
- **Total Competencies**: 2,080
- **Total Subjects**: 28
- **Status**: ACTIVE (Production Ready)

### Subject Distribution (Top 10)

| Subject | Competencies |
|---------|-------------|
| General Medicine | 501 |
| Pediatrics | 379 |
| Anatomy | 367 |
| Physiology | 137 |
| Psychiatry | 104 |
| Community Medicine | 100 |
| Pathology | 88 |
| Biochemistry | 87 |
| Dermatology & Leprosy | 69 |
| Respiratory Medicine | 47 |

## Competency Structure

Each competency includes:

```typescript
{
  id: string              // UUID
  code: string            // e.g., "AN1.1", "PY2.3"
  title: string           // Subject - Topic X
  description: string     // Full competency description
  subject: string         // Subject name
  domain: CompetencyDomain // COGNITIVE | CLINICAL | PRACTICAL
  academicLevel: AcademicLevel // UG | PG | SPECIALIZATION
  status: CompetencyStatus // ACTIVE
  version: number         // 1
  createdBy: string       // Bitflow Owner user ID
  updatedAt: DateTime     // Last updated timestamp
}
```

### Domain Classification
- **COGNITIVE**: Knowledge-based competencies (describe, explain, discuss)
- **CLINICAL**: Patient care and diagnosis (diagnose, manage, treat)
- **PRACTICAL**: Hands-on skills (demonstrate, perform, examine)

### Academic Level Mapping
- **UG**: Undergraduate (Topics 1-5)
- **PG**: Postgraduate (Topics 6-8)
- **SPECIALIZATION**: Advanced topics (Topics 9+)

## Sample Competencies

```
AN1.1: Describe the basis of cellular functions as applies to each organelle
PY2.3: Describe and discuss physiological changes in various systems during pregnancy
BI3.2: Explain the biochemical basis of nutritional deficiencies
IM4.1: Demonstrate clinical examination of cardiovascular system
PE5.2: Perform and interpret growth assessment in children
```

## Source Data

### MCI Curriculum Volumes
1. **Volume I** (44,697 lines): Pre-clinical Sciences
   - Anatomy (AN)
   - Physiology (PY)
   - Biochemistry (BI)

2. **Volume II** (42,526 lines): Para-clinical Sciences
   - Pathology (PA)
   - Microbiology (MI)
   - Pharmacology (PH)
   - Forensic Medicine (FM)
   - Community Medicine (CM)

3. **Volume III** (23,736 lines): Clinical Sciences
   - General Medicine (IM)
   - General Surgery (SU)
   - Pediatrics (PE)
   - Obstetrics & Gynaecology (OG)
   - Psychiatry (PS)
   - And 15+ other specialties

## Implementation Details

### Seed File
Location: `/backend/prisma/seed-mci-production.ts`

```bash
# Run seed (already executed)
cd backend
npx ts-node prisma/seed-mci-production.ts
```

### Extraction Script
Location: `/tmp/extract_all_competencies.py`
- Parses all 3 PDF volumes
- Extracts competency codes and descriptions
- Outputs to JSON: `/tmp/mci_competencies_full.json`

### Database Access
```sql
-- Count by subject
SELECT subject, COUNT(*) 
FROM competencies 
GROUP BY subject 
ORDER BY COUNT(*) DESC;

-- Search competencies
SELECT code, subject, description 
FROM competencies 
WHERE description ILIKE '%cardiovascular%'
LIMIT 10;

-- Filter by domain
SELECT code, subject, description 
FROM competencies 
WHERE domain = 'PRACTICAL' AND subject = 'Anatomy'
LIMIT 10;
```

## Usage in Portals

### Publisher Portal
Publishers will map their content (courses, MCQs, videos) to these official MCI competencies, ensuring curriculum alignment.

### Faculty Portal
Faculty can browse competencies to design lectures, assign content, and create assessments.

### Student Portal
Students see which competencies they're learning in each course module and track their progress.

### Bitflow Admin
Admin can search, filter, and manage the competency database.

## Benefits

### 1. Curriculum Compliance
All content is aligned with official MCI guidelines, ensuring regulatory compliance.

### 2. Content Mapping
Every piece of educational content can be tagged with specific competencies for precise learning outcomes.

### 3. Progress Tracking
Students' learning progress can be measured against official competency requirements.

### 4. Gap Analysis
Identify which competencies have content coverage and which need more resources.

### 5. Assessment Alignment
MCQ questions and assessments can be mapped to specific competencies.

### 6. Standardization
All publishers and institutions use the same competency framework.

## Next Steps

1. ✅ **Competencies Added** - Complete (2,080 competencies)

2. **Publisher Portal Enhancements**
   - Add competency selection when creating courses
   - Map MCQs to competencies
   - Show competency coverage analytics

3. **Faculty Portal**
   - Browse competencies by subject
   - Filter by domain and level
   - Tag lecture content to competencies

4. **Student Portal**
   - Show competencies in course details
   - Track competency mastery
   - Filter content by competency

5. **Bitflow Admin**
   - Competency search and filter UI
   - Analytics dashboard
   - Manage competency versions

## Technical Notes

### Prisma v7 Setup
The seed file uses Prisma v7 with PostgreSQL adapter:

```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ /* connection config */ });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

### Domain Mapping Logic
```typescript
// Basic sciences → mostly COGNITIVE
// Clinical subjects → COGNITIVE (knowledge) | CLINICAL (diagnosis) | PRACTICAL (skills)
// Keywords: demonstrate, perform → PRACTICAL
// Keywords: diagnose, manage → CLINICAL
// Keywords: describe, explain → COGNITIVE
```

### Academic Level Logic
```typescript
// Topic 1-5 → UG (Undergraduate)
// Topic 6-8 → PG (Postgraduate)
// Topic 9+ → SPECIALIZATION
```

## Maintenance

### Update Process
If MCI releases updated competency guidelines:

1. Extract new PDF volumes to text
2. Update `/tmp/extract_all_competencies.py` if format changed
3. Run extraction script
4. Update seed file if mapping logic changed
5. Run seed with `upsert` (updates existing, creates new)
6. Increment version number for updated competencies

### Data Integrity
- Competency codes are unique (database constraint)
- All competencies are ACTIVE status
- Created by Bitflow Owner user
- Version 1 (initial release)

## Support

For questions or issues with MCI competencies:
1. Check database directly via Prisma Studio: `npx prisma studio`
2. Query via PostgreSQL client
3. Review extraction logs in `/tmp/`
4. Contact Bitflow Admin team

---

**Status**: ✅ Production Ready  
**Last Updated**: January 12, 2026  
**Total Competencies**: 2,080  
**MCI Curriculum Version**: 2019 (Competency-Based UG Curriculum)
