import React, { useState, useRef, useEffect } from 'react';
import XLSXStyle from 'xlsx-js-style';
import * as fflate from 'fflate';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import mcqService from '../../services/mcq.service';
import topicsService from '../../services/topics.service';
import { Topic } from '../../services/topics.service';
import TopicSearch from '../TopicSearch';
import CompetencySearch from '../common/CompetencySearch';
import FileUploadButton from './FileUploadButton';
import {
  Upload, X, Download, Plus, Trash2, FileText,
  AlertCircle, CheckCircle2, ChevronDown, Image as ImageIcon, Eye, Edit2, ArrowLeft
} from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

// XML-safe escape for values injected into sheet XML (e.g. "Obstetrics & Gynaecology")
const xmlEscMcq = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const XLSX_MIME_MCQ = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const STATIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
const getImageUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${STATIC_BASE_URL}${url}`;
  return url;
};

/* ── Simple CSV parser (handles quoted fields, escaped quotes) ── */
const parseCSVLines = (text: string): string[][] => {
  const result: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { current.push(field); field = ''; }
      else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        current.push(field); field = '';
        result.push(current); current = [];
        if (ch === '\r') i++;
      } else if (ch === '\r') {
        current.push(field); field = '';
        result.push(current); current = [];
      } else { field += ch; }
    }
  }
  if (field || current.length > 0) { current.push(field); result.push(current); }
  return result;
};

function safeUUID(): string {
  try { return crypto.randomUUID(); } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

interface BulkUploadResult {
  success: number;
  failed: number;
  errors: string[];
}

interface McqRow {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctAnswer: string;
  subject: string;
  topic: string;
  mcqType: string;
  difficultyLevel: string;
  bloomsLevel: string;
  competencyCodes: string;
  tags: string;
  year: string;
  source: string;
  coverImageUrl?: string;  // Cover / thumbnail image shown on MCQ card in lists
  questionImage?: string;   // Image shown alongside the question during a test
  explanation: string;
  explanationImage?: string;
  expanded: boolean;
}

interface BulkMcqUploadProps {
  onSuccess?: () => void;
}

const BulkMcqUpload: React.FC<BulkMcqUploadProps> = ({ onSuccess }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear - i));

  const createEmptyRow = (): McqRow => ({
    id: safeUUID(),
    question: '', optionA: '', optionB: '', optionC: '', optionD: '', optionE: '',
    correctAnswer: 'A', subject: '', topic: '', mcqType: 'NORMAL',
    difficultyLevel: 'K', bloomsLevel: 'REMEMBER',
    competencyCodes: '', tags: '', year: String(currentYear), source: '', coverImageUrl: '', questionImage: '',
    explanation: '', explanationImage: '',
    expanded: true,
  });

  const [mode, setMode] = useState<'form' | 'csv'>('form');
  const [rows, setRows] = useState<McqRow[]>([createEmptyRow()]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState('');
  const [csvPhase, setCsvPhase] = useState<'upload' | 'preview'>('upload');
  const [subjects, setSubjects] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-row competency tracking (keyed by row.id)
  const [rowCompetencies, setRowCompetencies] = useState<Record<string, Array<{
    id: string; code: string; title: string; description: string;
    subject: string; domain?: string; academicLevel?: string;
  }>>>({}); 
  const [rowSelectedCompIds, setRowSelectedCompIds] = useState<Record<string, string[]>>({});
  const [rowTopicIds, setRowTopicIds] = useState<Record<string, string | undefined>>({});
  const [rowTopicSubjects, setRowTopicSubjects] = useState<Record<string, string>>({});

  const diffLevels = [
    { value: 'K', label: 'K — Knows' },
    { value: 'KH', label: 'KH — Knows How' },
    { value: 'S', label: 'S — Shows' },
    { value: 'SH', label: 'SH — Shows How' },
    { value: 'P', label: 'P — Performs' },
  ];

  const bloomsLevels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
  const mcqTypes = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'SCENARIO_BASED', label: 'Scenario Based' },
    { value: 'IMAGE_BASED', label: 'Image Based' },
  ];
  const answers = ['A', 'B', 'C', 'D', 'E'];

  const sourceOptions = [
    'NEET PG', 'NEET UG', 'AIIMS', 'JIPMER', 'INI-CET', 'FMGE',
    'USMLE Step 1', 'USMLE Step 2', 'USMLE Step 3', 'PLAB',
    'NBE', 'DNB', 'State PG', 'University Exam', 'Self-authored',
    'Textbook', 'Journal', 'Other',
  ];

  const tagOptions = [
    'Cardiology', 'Neurology', 'Gastroenterology', 'Pulmonology', 'Nephrology',
    'Endocrinology', 'Hematology', 'Oncology', 'Rheumatology', 'Dermatology',
    'Orthopedics', 'Ophthalmology', 'ENT', 'Psychiatry', 'Pediatrics',
    'Obstetrics', 'Gynecology', 'Surgery', 'Radiology', 'Anesthesia',
    'Emergency Medicine', 'Forensic Medicine', 'Community Medicine',
    'Pharmacology', 'Pathology', 'Microbiology', 'Biochemistry',
    'Anatomy', 'Physiology', 'High Yield', 'Clinical', 'Basic Science',
    'NEET', 'USMLE', 'AIIMS', 'Must Know', 'Frequently Asked',
  ];

  const competencyCodeOptions = [
    // Anatomy
    'AN1.1', 'AN1.2', 'AN2.1', 'AN2.2', 'AN3.1', 'AN3.2', 'AN4.1', 'AN4.2', 'AN5.1',
    // Physiology
    'PY1.1', 'PY1.2', 'PY2.1', 'PY2.2', 'PY3.1', 'PY3.2', 'PY4.1', 'PY5.1',
    // Biochemistry
    'BC1.1', 'BC1.2', 'BC2.1', 'BC2.2', 'BC3.1', 'BC3.2', 'BC4.1', 'BC5.1',
    // Pathology
    'PA1.1', 'PA1.2', 'PA2.1', 'PA2.2', 'PA3.1', 'PA3.2', 'PA4.1', 'PA5.1',
    // Pharmacology
    'PH1.1', 'PH1.2', 'PH2.1', 'PH2.2', 'PH3.1', 'PH3.2', 'PH4.1', 'PH5.1',
    // Microbiology
    'MI1.1', 'MI1.2', 'MI2.1', 'MI2.2', 'MI3.1', 'MI3.2', 'MI4.1', 'MI5.1',
    // Forensic Medicine
    'FM1.1', 'FM1.2', 'FM2.1', 'FM2.2', 'FM3.1', 'FM3.2', 'FM4.1', 'FM5.1',
    // Internal Medicine
    'IM1.1', 'IM1.2', 'IM2.1', 'IM2.2', 'IM3.1', 'IM3.2', 'IM4.1', 'IM5.1',
    // Surgery
    'SU1.1', 'SU1.2', 'SU2.1', 'SU2.2', 'SU3.1', 'SU3.2', 'SU4.1', 'SU5.1',
    // Obstetrics & Gynecology
    'OG1.1', 'OG1.2', 'OG2.1', 'OG2.2', 'OG3.1', 'OG3.2', 'OG4.1', 'OG5.1',
    // Pediatrics
    'PE1.1', 'PE1.2', 'PE2.1', 'PE2.2', 'PE3.1', 'PE3.2', 'PE4.1', 'PE5.1',
    // Ophthalmology
    'OP1.1', 'OP1.2', 'OP2.1', 'OP2.2', 'OP3.1', 'OP3.2', 'OP4.1', 'OP5.1',
    // ENT
    'EN1.1', 'EN1.2', 'EN2.1', 'EN2.2', 'EN3.1', 'EN3.2', 'EN4.1', 'EN5.1',
    // Orthopedics
    'OR1.1', 'OR1.2', 'OR2.1', 'OR2.2', 'OR3.1', 'OR3.2', 'OR4.1', 'OR5.1',
    // Psychiatry
    'PS1.1', 'PS1.2', 'PS2.1', 'PS2.2', 'PS3.1', 'PS3.2', 'PS4.1', 'PS5.1',
    // Community Medicine
    'CM1.1', 'CM1.2', 'CM2.1', 'CM2.2', 'CM3.1', 'CM3.2', 'CM4.1', 'CM5.1',
    // Dermatology
    'DR1.1', 'DR1.2', 'DR2.1', 'DR2.2', 'DR3.1', 'DR3.2', 'DR4.1', 'DR5.1',
    // Radiology
    'RD1.1', 'RD1.2', 'RD2.1', 'RD2.2', 'RD3.1',
    // Anesthesia
    'AS1.1', 'AS1.2', 'AS2.1', 'AS2.2', 'AS3.1',
  ];

  useEffect(() => {
    topicsService.getSubjects().then(setSubjects).catch(() => {});
  }, []);

  const addRow = () => setRows(prev => [...prev, createEmptyRow()]);
  const removeRow = (id: string) => { if (rows.length > 1) setRows(prev => prev.filter(r => r.id !== id)); };
  const toggleExpand = (id: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, expanded: !r.expanded } : r));
  const updateRow = (id: string, field: keyof McqRow, value: string | boolean) => setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && (f.type === 'text/csv' || f.name.endsWith('.csv') || f.name.endsWith('.xls') || f.name.endsWith('.xlsx'))) {
      setFile(f); setError(''); setResult(null);
    } else { setError('Please select a CSV or Excel file'); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const f = e.dataTransfer.files[0];
      if (f.name.endsWith('.csv') || f.name.endsWith('.xls') || f.name.endsWith('.xlsx')) { setFile(f); setError(''); setResult(null); }
      else setError('Please drop a CSV or Excel file');
    }
  };

  const parseCSVContent = (text: string): McqRow[] => {
    const lines = parseCSVLines(text);
    if (lines.length < 2) return [];
    // Normalise: lowercase, strip spaces/underscores/asterisks so "question *" → "question"
    const normalise = (h: string) => h.trim().toLowerCase().replace(/[\s_*]+/g, '');
    // Auto-detect header row — first row that contains a "question" column
    let headerIdx = lines.findIndex(line => line.some(cell => normalise(cell) === 'question'));
    if (headerIdx === -1) headerIdx = 0;
    const headers = lines[headerIdx].map(normalise);
    const result: McqRow[] = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const values = lines[i];
      if (values.length === 0 || (values.length === 1 && !values[0].trim())) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, j) => { row[h] = values[j]?.trim() || ''; });
      if (!row['question']) continue;
      result.push({
        id: safeUUID(),
        question: row['question'] || '',
        optionA: row['optiona'] || '',
        optionB: row['optionb'] || '',
        optionC: row['optionc'] || '',
        optionD: row['optiond'] || '',
        optionE: row['optione'] || '',
        correctAnswer: (row['correctanswer'] || 'A').toUpperCase(),
        subject: row['subject'] || '',
        topic: row['topic'] || '',
        mcqType: row['mcqtype'] || 'NORMAL',
        difficultyLevel: row['difficultylevel'] || row['difficulty'] || 'K',
        bloomsLevel: row['bloomslevel'] || row['blooms'] || 'REMEMBER',
        competencyCodes: row['competencycodes'] || row['competencyids'] || '',
        tags: row['tags'] || '',
        year: row['year'] || String(currentYear),
        source: row['source'] || '',
        coverImageUrl: row['coverimageurl'] || row['coverimage'] || row['cover_image_url'] || '',
        questionImage: row['questionimageurl'] || row['questionimage'] || row['question_image_url'] || '',
        explanation: row['explanation'] || '',
        explanationImage: row['explanationimage'] || '',
        expanded: false,
      });
    }
    return result;
  };

  const handleCsvPreview = () => {
    if (!file) return;
    const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) { setError('File is empty.'); return; }
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const lines: string[][] = (XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][])
            .map(r => r.map((v: any) => String(v ?? '').trim()));
          const text = lines.map(r => r.map(c => `"${c.replace(/"/g,'""')}"`).join(',')).join('\n');
          const parsed = parseCSVContent(text);
          if (parsed.length === 0) { setError('No valid MCQ rows found. Ensure the header row has a "question" column.'); return; }
          setRows(parsed);
          setRowCompetencies({}); setRowSelectedCompIds({}); setRowTopicIds({}); setRowTopicSubjects({});
          setCsvPhase('preview'); setError(''); setResult(null);
        } catch { setError('Could not parse the .xlsx file.'); }
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSVContent(text);
      if (parsed.length === 0) { setError('No valid MCQ rows found in CSV. Ensure the header row has "question" column.'); return; }
      setRows(parsed);
      setRowCompetencies({});
      setRowSelectedCompIds({});
      setRowTopicIds({});
      setRowTopicSubjects({});
      setCsvPhase('preview');
      setError('');
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = async () => {
    if (!file) { setError('Please select a file first'); return; }
    setUploading(true); setError(''); setResult(null);
    try {
      const data = await mcqService.bulkUpload(file);
      setResult(data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (data.success > 0 && onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to upload CSV');
    } finally { setUploading(false); }
  };

  const handleFormUpload = async () => {
    setError(''); setResult(null);
    const invalid = rows.filter(r => !r.question || !r.optionA || !r.optionB || !r.subject);
    if (invalid.length > 0) {
      setError(`${invalid.length} MCQ(s) missing required fields (question, options A & B, subject)`);
      return;
    }
    const headers = 'question,optionA,optionB,optionC,optionD,optionE,correctAnswer,subject,topic,mcqType,difficultyLevel,bloomsLevel,competencyCodes,tags,year,source,coverImageUrl,questionImageUrl,explanation,explanationImage';
    const csvRows = rows.map(r => {
      const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return [r.question, r.optionA, r.optionB, r.optionC, r.optionD, r.optionE,
        r.correctAnswer, r.subject, r.topic, r.mcqType, r.difficultyLevel,
        r.bloomsLevel, r.competencyCodes, r.tags, r.year, r.source,
        r.coverImageUrl || '', r.questionImage || '',
        r.explanation || '', r.explanationImage || ''].map(escape).join(',');
    });
    const csvContent = [headers, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const csvFile = new File([blob], 'bulk_mcqs.csv', { type: 'text/csv' });

    setUploading(true);
    try {
      const data = await mcqService.bulkUpload(csvFile);
      setResult(data);
      if (data.success > 0 && onSuccess) onSuccess();
      if (data.failed === 0) setRows([createEmptyRow()]);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to upload');
    } finally { setUploading(false); }
  };

  const downloadTemplateAsExcel = () => {
    const cols = [
      { header: 'question *',         width: 40, dropdown: undefined },
      { header: 'optionA *',          width: 20, dropdown: undefined },
      { header: 'optionB *',          width: 20, dropdown: undefined },
      { header: 'optionC',            width: 20, dropdown: undefined },
      { header: 'optionD',            width: 20, dropdown: undefined },
      { header: 'optionE',            width: 20, dropdown: undefined },
      { header: 'correctAnswer *',    width: 14, dropdown: ['A','B','C','D','E'] },
      { header: 'subject *',          width: 20, dropdown: ['Anatomy','Physiology','Biochemistry','Pharmacology','Pathology','Microbiology','Forensic Medicine','Community Medicine','Medicine','Surgery','Obstetrics & Gynaecology','Paediatrics','Orthopaedics','Ophthalmology','ENT','Dermatology','Psychiatry','Radiology','Anaesthesia'] },
      { header: 'topic',              width: 20, dropdown: undefined },
      { header: 'mcqType',            width: 18, dropdown: ['NORMAL','SCENARIO_BASED','IMAGE_BASED'] },
      { header: 'difficultyLevel *',  width: 16, dropdown: ['K','KH','S','SH','P'] },
      { header: 'bloomsLevel',        width: 16, dropdown: ['REMEMBER','UNDERSTAND','APPLY','ANALYZE','EVALUATE','CREATE'] },
      { header: 'competencyCodes',    width: 22, dropdown: undefined },
      { header: 'tags',               width: 22, dropdown: undefined },
      { header: 'year',               width: 10, dropdown: undefined },
      { header: 'source',             width: 18, dropdown: ['NEET PG','NEET UG','AIIMS','JIPMER','INI-CET','FMGE','USMLE Step 1','USMLE Step 2','NBE','DNB','State PG','University Exam','Self-authored','Textbook','Other'] },
      { header: 'coverImageUrl',      width: 28, dropdown: undefined },
      { header: 'questionImageUrl',   width: 28, dropdown: undefined },
      { header: 'explanation',        width: 35, dropdown: undefined },
      { header: 'explanationImage',   width: 28, dropdown: undefined },
    ];
    const ex1 = [
      'What is the normal resting heart rate in adults?',
      '60–100 bpm','40–60 bpm','100–120 bpm','120–140 bpm','',
      'A','Physiology','Cardiovascular System','NORMAL','K','REMEMBER',
      'PY2.1,PY2.2','Cardiology,High Yield','2024','NEET PG',
      '','','Normal resting HR is 60–100 bpm. Bradycardia <60, tachycardia >100.','',
    ];
    const ex2 = [
      'A 45-yr-old presents with crushing chest pain. ECG shows ST elevation in leads V1–V4.',
      'STEMI','Unstable Angina','NSTEMI','Pericarditis','',
      'A','Medicine','Cardiovascular System','SCENARIO_BASED','KH','APPLY',
      'IM3.1,IM3.2','Cardiology','2024','AIIMS',
      '','https://example.com/ecg.jpg','ST elevation in anterior leads indicates anterior STEMI.','',
    ];

    const styleHdr = { fill: { fgColor: { rgb: '4472C4' } }, font: { color: { rgb: 'FFFFFF' }, sz: 11, bold: true, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center', wrapText: false } };
    const styleEx  = { fill: { fgColor: { rgb: 'EFF6FF' } }, font: { italic: true, color: { rgb: '6B7280' }, sz: 10, name: 'Calibri' }, alignment: { vertical: 'center', wrapText: true } };
    const styleInstr = { fill: { fgColor: { rgb: 'DBEAFE' } }, font: { color: { rgb: '1E3A5F' }, sz: 11, name: 'Calibri', bold: true }, alignment: { wrapText: true, vertical: 'top' } };
    const styleTip   = { fill: { fgColor: { rgb: 'FFFBEB' } }, font: { color: { rgb: '6B7280' }, sz: 10, name: 'Calibri' }, alignment: { wrapText: true } };
    const numCols = cols.length;
    const ws: any = {};
    const R = (row: number, col: number) => XLSXStyle.utils.encode_cell({ r: row, c: col });

    // Row 0: instruction
    const instr = 'MCQ BULK UPLOAD TEMPLATE  |  Fill from row 3 onwards. correctAnswer must be A/B/C/D/E. competencyCodes: comma-separated codes e.g. PY2.1,PY2.2. tags: comma-separated keywords.';
    ws[R(0,0)] = { v: instr, t: 's', s: styleInstr };
    for (let c = 1; c < numCols; c++) ws[R(0,c)] = { v: '', t: 's', s: styleInstr };
    // Row 1: headers
    cols.forEach(({ header }, c) => { ws[R(1,c)] = { v: header, t: 's', s: styleHdr }; });
    // Rows 2-3: example rows
    ex1.forEach((v, c) => { ws[R(2,c)] = { v, t: 's', s: styleEx }; });
    ex2.forEach((v, c) => { ws[R(3,c)] = { v, t: 's', s: styleEx }; });
    // Row 4: tip
    ws[R(4,0)] = { v: '★ Delete the two EXAMPLE rows (rows 3-4) above, then fill your MCQ data from row 3.', t: 's', s: styleTip };
    for (let c = 1; c < numCols; c++) ws[R(4,c)] = { v: '', t: 's', s: styleTip };

    ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r:0, c:0 }, e: { r:4, c:numCols-1 } });
    ws['!cols'] = cols.map(c => ({ wch: c.width }));
    ws['!rows'] = [{ hpt: 45 }, { hpt: 28 }, { hpt: 20 }, { hpt: 20 }, { hpt: 22 }];
    ws['!merges'] = [
      { s: { r:0, c:0 }, e: { r:0, c:numCols-1 } },
      { s: { r:4, c:0 }, e: { r:4, c:numCols-1 } },
    ];

    // Dropdowns
    const validations: any[] = [];
    cols.forEach(({ dropdown }, c) => {
      if (!dropdown?.length) return;
      const colLetter = XLSXStyle.utils.encode_col(c);
      validations.push({ sqref: `${colLetter}3:${colLetter}10001`, type: 'list', formula1: `"${dropdown.join(',')}"` });
    });
    if (validations.length) ws['!dataValidation'] = validations;

    // Build dropdowns via zip post-processing
    const dvCols = cols.map((c, i) => ({ ...c, idx: i })).filter(c => c.dropdown?.length);
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'MCQ Upload Template');
    const rawBuf: ArrayBuffer = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'array' });

    let finalBuf: ArrayBuffer | Uint8Array = rawBuf;
    if (dvCols.length > 0) {
      const dvXml = [
        `<dataValidations count="${dvCols.length}">`,
        ...dvCols.map(col => {
          const colLetter = XLSXStyle.utils.encode_col(col.idx);
          // XML-escape values — critical for entries containing & < >
          const formula = col.dropdown!.map(xmlEscMcq).join(',');
          return `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${colLetter}3:${colLetter}10001"><formula1>"${formula}"</formula1></dataValidation>`;
        }),
        '</dataValidations>',
      ].join('');
      // Freeze rows 1-2 (instruction + header stay pinned while scrolling)
      const freezeXml = '<sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A3" sqref="A3"/></sheetView></sheetViews>';
      const unzipped = fflate.unzipSync(new Uint8Array(rawBuf));
      const sheetKey = Object.keys(unzipped).find(k => k.match(/xl\/worksheets\/sheet\d+\.xml/));
      if (sheetKey) {
        let xml = new TextDecoder().decode(unzipped[sheetKey]);
        xml = xml.includes('<sheetViews>')
          ? xml.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/, freezeXml)
          : xml.replace('<sheetData', freezeXml + '<sheetData');
        // OOXML spec order: mergeCells must come before dataValidations.
        // Insert after </mergeCells> if present, else after </sheetData>.
        if (xml.includes('</mergeCells>')) {
          xml = xml.replace('</mergeCells>', `</mergeCells>${dvXml}`);
        } else {
          xml = xml.replace('</sheetData>', `</sheetData>${dvXml}`);
        }
        unzipped[sheetKey] = new TextEncoder().encode(xml);
      }
      finalBuf = fflate.zipSync(unzipped);
    }

    const blob = new Blob([finalBuf], { type: XLSX_MIME_MCQ });
    saveAs(blob, 'mcq_bulk_upload_template.xlsx');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--bo-border)',
    fontSize: 13, background: 'var(--bo-card-bg)', color: 'var(--bo-text)',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer',
    appearance: 'none' as const, WebkitAppearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '14px',
    paddingRight: 32,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--bo-text-muted)',
    display: 'block', marginBottom: 6, letterSpacing: '0.03em', textTransform: 'uppercase' as const,
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text)', marginBottom: 4 }}>Bulk MCQ Upload</h3>
          <p style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>Add multiple MCQs using the interactive form or CSV upload</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'inline-flex', padding: 4, marginBottom: 20, borderRadius: 10, background: 'var(--bo-border, #F1F5F9)', gap: 2 }}>
        {([
          { id: 'form' as const, label: 'Interactive Form', icon: <FileText size={14} /> },
          { id: 'csv' as const, label: 'CSV Upload', icon: <Upload size={14} /> },
        ]).map(tab => (
          <button key={tab.id} onClick={() => { setMode(tab.id); setResult(null); setError(''); if (tab.id === 'csv') setCsvPhase('upload'); }}
            style={{
              padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
              border: 'none', borderRadius: 7, transition: 'all 0.15s',
              background: mode === tab.id ? '#fff' : 'transparent',
              color: mode === tab.id ? 'var(--bo-primary, #6366F1)' : 'var(--bo-text-muted, #6B7280)',
              boxShadow: mode === tab.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* === INTERACTIVE FORM MODE / CSV PREVIEW === */}
      {((mode === 'form') || (mode === 'csv' && csvPhase === 'preview')) && !uploading && (
        <>
          {/* CSV Preview Header */}
          {mode === 'csv' && csvPhase === 'preview' && (
            <div className="bo-card" style={{
              padding: 16, marginBottom: 16,
              background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)',
              border: '1px solid #93C5FD',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1E40AF', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Eye size={18} /> Preview: {rows.length} MCQs Parsed from CSV
                  </h4>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                    Review, edit, add competencies, and verify images before publishing. Click any MCQ card to expand and edit.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: '#10B981', color: '#fff',
                  }}>
                    {rows.filter(r => r.question && r.optionA && r.optionB && r.subject).length} / {rows.length} valid
                  </span>
                </div>
              </div>
            </div>
          )}

          {rows.map((row, idx) => (
            <div key={row.id} className="bo-card" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
              {/* Row Header */}
              <div onClick={() => toggleExpand(row.id)} style={{
                padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: row.expanded ? 'var(--bo-bg)' : 'transparent',
                borderBottom: row.expanded ? '1px solid var(--bo-border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bo-primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--bo-text)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.question || 'New MCQ'}
                  </span>
                  {row.question && row.optionA && row.optionB && row.subject && (
                    <CheckCircle2 size={14} style={{ color: '#10B981' }} />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {row.subject && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bo-primary)', color: '#fff' }}>{row.subject}</span>}
                  {row.correctAnswer && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#10B981', color: '#fff', fontWeight: 700 }}>Ans: {row.correctAnswer}</span>}
                  {row.questionImage && <ImageIcon size={14} style={{ color: '#8B5CF6' }} />}
                  {row.competencyCodes && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F59E0B20', color: '#D97706' }}>{row.competencyCodes.split(',').filter(Boolean).length} comp</span>}
                  {rows.length > 1 && (
                    <button type="button" onClick={e => { e.stopPropagation(); removeRow(row.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-danger, #EF4444)', padding: 2 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                  <ChevronDown size={16} style={{ color: 'var(--bo-text-muted)', transform: row.expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </div>
              </div>

              {/* Row Body */}
              {/* Collapsed Preview - show summary when card is collapsed (CSV preview) */}
              {!row.expanded && mode === 'csv' && csvPhase === 'preview' && (
                <div style={{ padding: '8px 16px', display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: 'var(--bo-text-muted)' }}>
                  {row.questionImage && (
                    <img src={getImageUrl(row.questionImage)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--bo-border)', flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['A', 'B', 'C', 'D'].map(letter => {
                      const val = (row as any)[`option${letter}`];
                      if (!val) return null;
                      return (
                        <span key={letter} style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11,
                          background: row.correctAnswer === letter ? '#10B98120' : 'var(--bo-bg)',
                          color: row.correctAnswer === letter ? '#10B981' : 'var(--bo-text-muted)',
                          fontWeight: row.correctAnswer === letter ? 700 : 400,
                          border: row.correctAnswer === letter ? '1px solid #10B981' : '1px solid var(--bo-border)',
                          maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {letter}. {val}
                        </span>
                      );
                    })}
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}
                    style={{ background: 'none', border: '1px solid var(--bo-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: 'var(--bo-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <Edit2 size={12} /> Edit
                  </button>
                </div>
              )}

              {row.expanded && (
                <div style={{ padding: 16 }}>
                  {/* Question */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Question *</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.5 }}
                      value={row.question}
                      onChange={e => updateRow(row.id, 'question', e.target.value)}
                      placeholder="Enter the MCQ question..."
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {/* Cover Image URL — compact, always visible */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>
                      🖼 Cover Image URL <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--bo-text-muted)', fontSize: 10 }}>(optional — thumbnail shown on MCQ card in lists)</span>
                    </label>
                    {row.coverImageUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={getImageUrl(row.coverImageUrl)}
                          alt="Cover"
                          style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 7, border: '1px solid var(--bo-border)', flexShrink: 0 }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div style={{ flex: 1, fontSize: 11, color: 'var(--bo-text-muted)', wordBreak: 'break-all', lineHeight: 1.4 }}>{row.coverImageUrl}</div>
                        <button type="button" onClick={() => updateRow(row.id, 'coverImageUrl', '')}
                          style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #EF4444', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <X size={11} /> Remove
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          type="url"
                          style={{ ...inputStyle, fontSize: 12 }}
                          placeholder="Paste image URL from File Upload Hub…"
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                          onChange={e => {
                            const v = e.target.value.trim();
                            if (v) updateRow(row.id, 'coverImageUrl', v);
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--bo-border)' }} />
                          <span style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 500 }}>OR</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--bo-border)' }} />
                        </div>
                        <FileUploadButton
                          fileType="image"
                          label="Upload Cover Image"
                          onUploadComplete={(url) => updateRow(row.id, 'coverImageUrl', url)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Question Image — show for Scenario/Image-Based or when image already exists */}
                  {(row.mcqType === 'SCENARIO_BASED' || row.mcqType === 'IMAGE_BASED' || !!row.questionImage) && (
                    <div className="bo-card" style={{
                      padding: 16, marginBottom: 14,
                      background: 'linear-gradient(135deg, #667eea11, #764ba211)',
                      border: '2px dashed var(--bo-primary-light, #9F7AEA)',
                      borderRadius: 12,
                      transition: 'all 0.3s ease',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <ImageIcon size={18} style={{ color: 'var(--bo-primary)' }} />
                        <label style={{
                          ...labelStyle,
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--bo-text)',
                          textTransform: 'none',
                        }}>
                          � Question Image URL — shown to students during the test
                        </label>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginBottom: 10 }}>
                        Upload an image or paste a URL if this MCQ requires visual context (ECG, X-ray, clinical photo, diagram, etc.)
                      </p>
                      {row.questionImage ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img src={getImageUrl(row.questionImage || '')} alt="Question" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--bo-border)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'var(--bo-text)', fontWeight: 600, marginBottom: 4 }}>✅ Image Added</div>
                            <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', wordBreak: 'break-all' }}>{row.questionImage}</div>
                          </div>
                          <button type="button"
                            onClick={() => updateRow(row.id, 'questionImage', '')}
                            style={{
                              padding: '6px 12px', borderRadius: 6, border: '1px solid var(--bo-danger)',
                              background: 'transparent', color: 'var(--bo-danger)', cursor: 'pointer',
                              fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                            <X size={12} /> Remove
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--bo-text-muted)', marginBottom: 4, display: 'block' }}>Paste Image URL</label>
                            <input
                              type="url"
                              style={{ ...inputStyle, fontSize: 12 }}
                              placeholder="https://example.com/image.jpg"
                              onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                              onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) updateRow(row.id, 'questionImage', val);
                                }
                              }}
                              onChange={e => {
                                const val = e.target.value.trim();
                                if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
                                  updateRow(row.id, 'questionImage', val);
                                }
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--bo-border)' }} />
                            <span style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 500 }}>OR</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--bo-border)' }} />
                          </div>
                          <FileUploadButton
                            fileType="image"
                            label="Upload Image File"
                            onUploadComplete={(url) => updateRow(row.id, 'questionImage', url)}
                          />
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                        💡 Supported formats: JPG, PNG, GIF, WebP • Max size: 5MB • Or paste any image URL
                      </div>
                    </div>
                  )}

                  {/* Options Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {(['A', 'B', 'C', 'D', 'E'] as const).map(letter => {
                      const field = `option${letter}` as keyof McqRow;
                      const isRequired = letter === 'A' || letter === 'B';
                      return (
                        <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" onClick={() => updateRow(row.id, 'correctAnswer', letter)}
                            style={{
                              width: 28, height: 28, borderRadius: '50%', border: `2px solid ${row.correctAnswer === letter ? '#10B981' : 'var(--bo-border)'}`,
                              background: row.correctAnswer === letter ? '#10B981' : 'transparent',
                              color: row.correctAnswer === letter ? '#fff' : 'var(--bo-text)',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                            {letter}
                          </button>
                          <input style={{ ...inputStyle, flex: 1 }} value={row[field] as string}
                            onChange={e => updateRow(row.id, field, e.target.value)}
                            placeholder={`Option ${letter}${isRequired ? ' *' : ' (optional)'}`} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Topic Search & Competency Mapping */}
                  <div className="bo-card" style={{ padding: 14, marginBottom: 12, background: 'var(--bo-bg)', border: '1px solid var(--bo-border)', borderRadius: 10 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--bo-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Topic & Competency Mapping
                    </h4>
                    <TopicSearch
                      selectedTopicId={rowTopicIds[row.id]}
                      selectedSubject={rowTopicSubjects[row.id] || ''}
                      onTopicSelect={(topic: Topic | null) => {
                        if (topic) {
                          setRowTopicIds(prev => ({ ...prev, [row.id]: topic.id }));
                          updateRow(row.id, 'topic', topic.name);
                          updateRow(row.id, 'subject', topic.subject);
                          setRowTopicSubjects(prev => ({ ...prev, [row.id]: topic.subject }));
                        } else {
                          setRowTopicIds(prev => ({ ...prev, [row.id]: undefined }));
                          updateRow(row.id, 'topic', '');
                        }
                      }}
                      onSubjectSelect={(s: string) => {
                        setRowTopicSubjects(prev => ({ ...prev, [row.id]: s }));
                        if (s) updateRow(row.id, 'subject', s);
                      }}
                      onCompetenciesLoad={(comps) => {
                        setRowCompetencies(prev => ({ ...prev, [row.id]: comps }));
                        const allIds = comps.map(c => c.id);
                        setRowSelectedCompIds(prev => ({ ...prev, [row.id]: allIds }));
                        // Auto-fill competency codes from loaded competencies
                        const codes = comps.map(c => c.code).join(', ');
                        updateRow(row.id, 'competencyCodes', codes);
                      }}
                      placeholder="Search topics to auto-fill subject & competencies..."
                    />
                    {(rowCompetencies[row.id] || []).length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <CompetencySearch
                          competencies={rowCompetencies[row.id] || []}
                          selectedIds={rowSelectedCompIds[row.id] || []}
                          onChange={(ids) => {
                            setRowSelectedCompIds(prev => ({ ...prev, [row.id]: ids }));
                            // Sync selected competency codes back to the row
                            const selectedComps = (rowCompetencies[row.id] || []).filter(c => ids.includes(c.id));
                            const codes = selectedComps.map(c => c.code).join(', ');
                            updateRow(row.id, 'competencyCodes', codes);
                          }}
                          label="Mapped Competencies (auto-loaded from topic)"
                          maxHeight="250px"
                        />
                      </div>
                    )}
                  </div>

                  {/* Dropdowns Row 1: Subject, Year */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Subject *</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          style={{ ...selectStyle, borderColor: !row.subject ? '#F59E0B40' : 'var(--bo-border)' }}
                          value={row.subject}
                          onChange={e => updateRow(row.id, 'subject', e.target.value)}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = !row.subject ? '#F59E0B40' : 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <option value="">Select Subject</option>
                          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Year</label>
                      <select
                        style={selectStyle}
                        value={row.year}
                        onChange={e => updateRow(row.id, 'year', e.target.value)}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <option value="">—</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Dropdowns Row 2: MCQ Type, Difficulty, Bloom's */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>MCQ Type</label>
                      <select
                        style={selectStyle}
                        value={row.mcqType}
                        onChange={e => updateRow(row.id, 'mcqType', e.target.value)}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {mcqTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Difficulty (Miller's)</label>
                      <select
                        style={selectStyle}
                        value={row.difficultyLevel}
                        onChange={e => updateRow(row.id, 'difficultyLevel', e.target.value)}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {diffLevels.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Bloom's Level</label>
                      <select
                        style={selectStyle}
                        value={row.bloomsLevel}
                        onChange={e => updateRow(row.id, 'bloomsLevel', e.target.value)}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {bloomsLevels.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Competency Codes & Source */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* Competency Codes — Multi-select chips */}
                    <div>
                      <label style={labelStyle}>Competency Codes</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          style={selectStyle}
                          value=""
                          onChange={e => {
                            const code = e.target.value;
                            if (!code) return;
                            const existing = row.competencyCodes ? row.competencyCodes.split(',').map(c => c.trim()).filter(Boolean) : [];
                            if (!existing.includes(code)) {
                              updateRow(row.id, 'competencyCodes', [...existing, code].join(', '));
                            }
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <option value="">{row.competencyCodes ? 'Add more codes...' : 'Select Competency Codes'}</option>
                          {competencyCodeOptions
                            .filter(c => !(row.competencyCodes || '').split(',').map(x => x.trim().toUpperCase()).includes(c.toUpperCase()))
                            .map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      {row.competencyCodes && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {row.competencyCodes.split(',').map(c => c.trim()).filter(Boolean).map(code => (
                            <span key={code} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                              borderRadius: 12, fontSize: 11, fontWeight: 500,
                              background: '#10B981', color: '#fff',
                            }}>
                              {code}
                              <button type="button" onClick={() => {
                                const updated = row.competencyCodes.split(',').map(c => c.trim()).filter(c => c !== code).join(', ');
                                updateRow(row.id, 'competencyCodes', updated);
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', lineHeight: 1 }}>
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Source — Dropdown */}
                    <div>
                      <label style={labelStyle}>Source</label>
                      <select
                        style={selectStyle}
                        value={row.source}
                        onChange={e => updateRow(row.id, 'source', e.target.value)}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <option value="">Select Source</option>
                        {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div style={{ marginTop: 14 }}>
                    <label style={labelStyle}>Explanation (shown after answer)</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 60, resize: 'vertical', lineHeight: 1.5 }}
                      value={row.explanation}
                      onChange={e => updateRow(row.id, 'explanation', e.target.value)}
                      placeholder="Why is this the correct answer?"
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {/* Explanation Image */}
                  <div style={{ marginTop: 12 }}>
                    <label style={labelStyle}>Explanation Image (optional)</label>
                    {row.explanationImage ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={getImageUrl(row.explanationImage || '')} alt="Explanation" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--bo-border)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div style={{ flex: 1, fontSize: 11, color: 'var(--bo-text-muted)', wordBreak: 'break-all' }}>{row.explanationImage}</div>
                        <button type="button"
                          onClick={() => updateRow(row.id, 'explanationImage', '')}
                          style={{
                            padding: '4px 10px', borderRadius: 6, border: '1px solid var(--bo-danger)',
                            background: 'transparent', color: 'var(--bo-danger)', cursor: 'pointer',
                            fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                          <X size={12} /> Remove
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <input
                            type="url"
                            style={{ ...inputStyle, fontSize: 12 }}
                            placeholder="Paste image URL (https://...)"
                            onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const val = e.currentTarget.value.trim();
                                if (val) updateRow(row.id, 'explanationImage', val);
                              }
                            }}
                            onChange={e => {
                              const val = e.target.value.trim();
                              if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
                                updateRow(row.id, 'explanationImage', val);
                              }
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--bo-border)' }} />
                          <span style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 500 }}>OR</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--bo-border)' }} />
                        </div>
                        <FileUploadButton
                          fileType="image"
                          label="Upload Explanation Image"
                          onUploadComplete={(url) => updateRow(row.id, 'explanationImage', url)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            {mode === 'csv' && csvPhase === 'preview' ? (
              <>
                <button type="button" onClick={() => { setCsvPhase('upload'); setRows([createEmptyRow()]); setResult(null); }}
                  className="bo-btn bo-btn-outline" style={{ fontSize: 13 }}>
                  <ArrowLeft size={14} /> Back to CSV Upload
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                    {rows.filter(r => r.question && r.optionA && r.optionB && r.subject).length} / {rows.length} valid MCQ{rows.length > 1 ? 's' : ''}
                  </span>
                  <button type="button" onClick={addRow} className="bo-btn bo-btn-outline" style={{ fontSize: 13 }}>
                    <Plus size={14} /> Add MCQ
                  </button>
                  <button type="button" onClick={handleFormUpload} className="bo-btn bo-btn-primary" disabled={uploading}
                    style={{ padding: '10px 24px', background: '#10B981', fontSize: 14, fontWeight: 700 }}>
                    <CheckCircle2 size={16} /> Confirm & Publish {rows.length} MCQ{rows.length > 1 ? 's' : ''}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button type="button" onClick={addRow} className="bo-btn bo-btn-outline" style={{ fontSize: 13 }}>
                  <Plus size={14} /> Add Another MCQ
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{rows.length} MCQ{rows.length > 1 ? 's' : ''}</span>
                  <button type="button" onClick={handleFormUpload} className="bo-btn bo-btn-primary" disabled={uploading} style={{ padding: '10px 24px' }}>
                    Upload {rows.length} MCQ{rows.length > 1 ? 's' : ''}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* === CSV MODE — Upload Phase === */}
      {mode === 'csv' && csvPhase === 'upload' && !uploading && (
        <>
          {/* Template Info — redesigned */}
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--bo-text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <FileText size={17} /> Excel / CSV Upload Template
                </div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                  Download the Excel template — it has built-in dropdowns for MCQ type, difficulty, Bloom's level &amp; correct answer.
                </div>
              </div>
              <button
                onClick={downloadTemplateAsExcel}
                style={{
                  padding: '10px 18px', border: 'none', borderRadius: 8, cursor: 'pointer',
                  background: '#217346', color: '#fff', fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px #21734640',
                }}
              >
                <Download size={15} /> Download Excel (.xlsx)
              </button>
            </div>

            {/* Required columns */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
                ● Required columns
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['question', 'optionA', 'optionB', 'correctAnswer', 'subject'].map(col => (
                  <span key={col} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5',
                  }}>{col}</span>
                ))}
              </div>
            </div>

            {/* Optional columns */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
                ○ Optional columns
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['optionC', 'optionD', 'optionE', 'topic', 'competencyCodes', 'tags', 'year', 'source', 'explanation', 'explanationImage'].map(col => (
                  <span key={col} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                    background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB',
                  }}>{col}</span>
                ))}
              </div>
            </div>

            {/* Columns with fixed values / dropdowns / image */}
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              🔽 Dropdown &amp; image columns
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
              {[
                { col: 'mcqType', badge: '▾ Dropdown', opts: ['NORMAL', 'SCENARIO_BASED', 'IMAGE_BASED'], color: '#7C3AED' },
                { col: 'difficultyLevel', badge: '▾ Dropdown', opts: ["K — Knows", "KH — Knows How", "S — Shows", "SH — Shows How", "P — Performs"], color: '#D97706' },
                { col: 'bloomsLevel', badge: '▾ Dropdown', opts: ['REMEMBER','UNDERSTAND','APPLY','ANALYZE','EVALUATE','CREATE'], color: '#0284C7' },
                { col: 'coverImageUrl', badge: '🖼 Image URL', opts: ['Thumbnail shown on MCQ card in lists'], color: '#10B981' },
                { col: 'questionImageUrl', badge: '🖼 Image URL', opts: ['Shown alongside question during the test'], color: '#10B981' },
              ].map(({ col, badge, opts, color }) => (
                <div key={col} style={{
                  padding: '10px 12px', borderRadius: 8,
                  border: `1px solid ${color}33`, background: `${color}08`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <code style={{ fontSize: 12, fontWeight: 700, color }}>{col}</code>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${color}22`, color, fontWeight: 600 }}>{badge}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {opts.map(o => (
                      <span key={o} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#fff', border: '1px solid #E5E7EB', color: '#6B7280' }}>{o}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* CSV note */}
            <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: 11, color: '#15803D', display: 'flex', alignItems: 'center', gap: 6 }}>
              💡 You can also upload a plain <strong>.csv</strong> file — the dropdowns are only in the Excel template.
            </div>
          </div>

          {/* Drop Zone */}
          {!file && (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? 'var(--bo-primary)' : 'var(--bo-border)'}`,
                borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'var(--bo-bg)',
                transition: 'all 0.2s', marginBottom: 16,
              }}>
              <Upload size={32} style={{ color: 'var(--bo-text-muted)', marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: 'var(--bo-text)', marginBottom: 4 }}>Drag & Drop CSV or Excel file here</div>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>or click to browse (.csv, .xls, .xlsx)</div>
              <input type="file" ref={fileInputRef} accept=".csv,.xls,.xlsx" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
          )}

          {/* File Selected — Preview + Upload options */}
          {file && (
            <div className="bo-card" style={{ padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={18} style={{ color: 'var(--bo-primary)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="bo-btn bo-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>
                    <X size={14} /> Remove
                  </button>
                  <button onClick={handleCsvPreview} className="bo-btn bo-btn-primary" style={{ padding: '6px 16px', fontSize: 12 }}>
                    <Eye size={14} /> Preview MCQs
                  </button>
                  <button onClick={handleCsvUpload} className="bo-btn bo-btn-outline" style={{ padding: '6px 16px', fontSize: 12, color: 'var(--bo-text-muted)' }}>
                    <Upload size={14} /> Upload Directly
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Uploading */}
      {uploading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
          <div className="bo-spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14 }}>Uploading and processing MCQs...</div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bo-card" style={{ padding: 20, marginTop: 16, borderLeft: `4px solid ${result.failed === 0 ? '#10B981' : result.success === 0 ? '#EF4444' : '#F59E0B'}` }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            {result.failed === 0 ? <CheckCircle2 size={18} style={{ color: '#10B981' }} /> : <AlertCircle size={18} style={{ color: '#F59E0B' }} />}
            Upload {result.failed === 0 ? 'Successful' : 'Complete'}
          </h4>
          <div style={{ display: 'flex', gap: 24, marginBottom: result.errors.length > 0 ? 12 : 0 }}>
            <div>
              <span style={{ color: '#10B981', fontWeight: 700, fontSize: 24 }}>{result.success}</span>
              <span style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginLeft: 6 }}>successful</span>
            </div>
            {result.failed > 0 && (
              <div>
                <span style={{ color: '#EF4444', fontWeight: 700, fontSize: 24 }}>{result.failed}</span>
                <span style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginLeft: 6 }}>failed</span>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div style={{ fontSize: 12, color: '#EF4444', maxHeight: 150, overflowY: 'auto', background: 'var(--bo-bg)', padding: 10, borderRadius: 6 }}>
              {result.errors.slice(0, 15).map((err, i) => <div key={i} style={{ marginBottom: 4 }}>• {err}</div>)}
              {result.errors.length > 15 && <div style={{ color: 'var(--bo-text-muted)', marginTop: 4 }}>...and {result.errors.length - 15} more</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkMcqUpload;
