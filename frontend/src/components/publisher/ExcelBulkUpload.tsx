import React, { useState, useRef, useCallback, useEffect } from 'react';
import XLSXStyle from 'xlsx-js-style';
import * as fflate from 'fflate';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import learningUnitService from '../../services/learning-unit.service';
import topicsService from '../../services/topics.service';
import {
  Upload, Download, FileSpreadsheet, Check, X, ChevronDown, ChevronRight,
  Trash2, Send, AlertCircle, FileText, Video, BookMarked, Image, Info,
} from 'lucide-react';

interface ExcelRow {
  id: string;
  isbn: string;
  title: string;
  author: string;
  description: string;
  coverImageUrl: string;
  fileUrl: string;
  fileFormat: string;
  subject: string;
  topic: string;
  subTopic: string;
  difficultyLevel: string;
  estimatedDuration: number;
  type: 'BOOK' | 'VIDEO' | 'EPUB';
  deliveryType: 'REDIRECT' | 'EMBED' | 'STREAM';
  watermarkEnabled: boolean;
  downloadAllowed: boolean;
  viewOnly: boolean;
  sessionExpiryMinutes: number;
  valid: boolean;
  errors: string[];
}

interface ExcelBulkUploadProps { onSuccess?: () => void; }

// ── URL helpers ─────────────────────────────────────────────────────────────

/** Sanitise ISBN/code for use as a filename */
const sanitiseIsbn = (isbn: string) =>
  isbn.trim().replace(/[^a-zA-Z0-9._-]/g, '_');

/**
 * Auto-build the content file URL from ISBN + file format.
 * Pattern: /uploads/<folder>/<isbn>.<ext>
 *   books  → pdf, epub
 *   videos → mp4, webm, mov, avi
 *   images → jpg, jpeg, png, gif, webp
 */
const buildAutoUrl = (isbn: string, format: string): string => {
  const safe = sanitiseIsbn(isbn);
  if (!safe) return '';
  const ext = (format || '').toLowerCase();
  const folder =
    ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext) ? 'videos' :
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext) ? 'images' :
    'books';
  return `/uploads/${folder}/${safe}.${ext || 'pdf'}`;
};

// ── Excel xlsx builder (xlsx-js-style — full styling + dropdowns) ──────────────────

type ColDef = { header: string; width?: number; dropdown?: string[]; example1: string; example2: string };

// Cell style helpers
const styleInstr = { fill: { fgColor: { rgb: 'DBEAFE' } }, font: { color: { rgb: '1E3A5F' }, sz: 11, name: 'Calibri' }, alignment: { wrapText: true, vertical: 'top' } };
const styleHeader = { fill: { fgColor: { rgb: '1D4ED8' } }, font: { color: { rgb: 'FFFFFF' }, sz: 11, bold: true, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
const styleExample = { fill: { fgColor: { rgb: 'F9FAFB' } }, font: { italic: true, color: { rgb: '9CA3AF' }, sz: 11, name: 'Calibri' }, alignment: { vertical: 'center', wrapText: true } };
const styleTip = { fill: { fgColor: { rgb: 'FFFBEB' } }, font: { color: { rgb: '6B7280' }, sz: 10, name: 'Calibri' }, alignment: { wrapText: true, vertical: 'top' } };

// XML-safe escape — required for values injected into sheet XML (e.g. "Obstetrics & Gynaecology")
const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function triggerDownload(columns: ColDef[], sheetName: string, instructionText: string, filename: string) {
  const numCols = columns.length;
  const ws: any = {};
  const R = (row: number, col: number) => XLSXStyle.utils.encode_cell({ r: row, c: col });

  ws[R(0, 0)] = { v: instructionText, t: 's', s: styleInstr };
  for (let c = 1; c < numCols; c++) ws[R(0, c)] = { v: '', t: 's', s: styleInstr };

  // Clean header labels (dropdowns added via XML injection below)
  columns.forEach((col, c) => {
    ws[R(1, c)] = { v: col.header, t: 's', s: styleHeader };
  });

  columns.forEach((col, c) => { ws[R(2, c)] = { v: col.example1, t: 's', s: styleExample }; });
  columns.forEach((col, c) => { ws[R(3, c)] = { v: col.example2, t: 's', s: styleExample }; });

  const tipText = '★ Delete the two EXAMPLE rows above and fill in your data. Columns marked * are required. Difficulty: K=Knows  KH=Knows How  S=Shows  SH=Shows How  P=Performs';
  ws[R(4, 0)] = { v: tipText, t: 's', s: styleTip };
  for (let c = 1; c < numCols; c++) ws[R(4, c)] = { v: '', t: 's', s: styleTip };

  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 4, c: numCols - 1 } });
  ws['!cols'] = columns.map(c => ({ wch: Math.round((c.width || 120) / 7) }));
  ws['!rows'] = [{ hpt: 60 }, { hpt: 30 }, { hpt: 20 }, { hpt: 20 }, { hpt: 28 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: numCols - 1 } },
  ];
  ws['!views'] = [{ state: 'frozen', ySplit: 2, xSplit: 0, topLeftCell: 'A3', activeCell: 'A3' }];

  const dvCols = columns.map((c, i) => ({ ...c, idx: i })).filter(c => c.dropdown?.length);

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
  const rawBuf: ArrayBuffer = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'array' });

  if (!dvCols.length) {
    const blob = new Blob([new Uint8Array(rawBuf)], { type: XLSX_MIME });
    saveAs(blob, filename);
    return;
  }

  // Inject <dataValidations> XML into the xlsx zip (same technique as MCQ template)
  const dvXml = [
    `<dataValidations count="${dvCols.length}">`,
    ...dvCols.map(col => {
      const colLetter = XLSXStyle.utils.encode_col(col.idx);
      const formula = col.dropdown!.map(xmlEsc).join(',');
      return `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${colLetter}3:${colLetter}10001"><formula1>"${formula}"</formula1></dataValidation>`;
    }),
    '</dataValidations>',
  ].join('');

  const unzipped = fflate.unzipSync(new Uint8Array(rawBuf));
  const sheetKey = Object.keys(unzipped).find(k => /xl\/worksheets\/sheet\d+\.xml/.test(k));
  if (sheetKey) {
    let xml = new TextDecoder().decode(unzipped[sheetKey]);
    if (xml.includes('</mergeCells>')) {
      xml = xml.replace('</mergeCells>', `</mergeCells>${dvXml}`);
    } else {
      xml = xml.replace('</sheetData>', `</sheetData>${dvXml}`);
    }
    unzipped[sheetKey] = new TextEncoder().encode(xml);
  }

  const finalBuf = fflate.zipSync(unzipped);
  const blob = new Blob([finalBuf], { type: XLSX_MIME });
  saveAs(blob, filename);
}
const SUBJECTS = [
  'Anatomy','Physiology','Biochemistry','Pharmacology','Pathology',
  'Microbiology','Forensic Medicine','Community Medicine','Medicine',
  'Surgery','Obstetrics & Gynaecology','Paediatrics','Orthopaedics',
  'Ophthalmology','ENT','Dermatology','Psychiatry','Radiology','Anaesthesia',
];
const DIFF_OPTS = ['K','KH','S','SH','P'];
const DELIVERY_OPTS = ['REDIRECT','EMBED','STREAM'];
const BOOL_OPTS = ['false','true'];

function downloadEbookTemplate() {
  const instr =
    'eBOOK (PDF) BULK UPLOAD TEMPLATE\n' +
    'HOW IT WORKS:\n' +
    '1. Enter the ISBN for each book in the "ISBN *" column (e.g. 978-0-07-166351-5).\n' +
    '2. In File Upload Hub, upload each PDF named as the ISBN (e.g. 978-0-07-166351-5.pdf).\n' +
    '3. The system auto-builds the content URL as: /uploads/books/<ISBN>.pdf\n' +
    '4. Cover image is auto-generated as: /uploads/images/<ISBN>.jpg — upload the cover with the same ISBN name.\n' +
    '5. Delete the two grey EXAMPLE rows, fill your data. In LibreOffice: File→Save A Copy→Text CSV. Then import here.';
  const cols: ColDef[] = [
    { header: 'ISBN *',               width: 160, example1: 'EXAMPLE-978-0-07-166351-5',   example2: 'EXAMPLE-978-93-5152-366-2' },
    { header: 'Title *',              width: 220, example1: "Harrison's Principles of Internal Medicine", example2: 'Robbins & Cotran Pathology' },
    { header: 'Author',               width: 150, example1: 'Dennis Kasper et al',          example2: 'Vinay Kumar' },
    { header: 'Description *',        width: 260, example1: 'Comprehensive internal medicine textbook covering all major organ systems', example2: 'Standard pathology reference for medical students and clinicians' },
    { header: 'Subject *',            width: 140, dropdown: SUBJECTS, example1: 'Medicine', example2: 'Pathology' },
    { header: 'Topic',                width: 140, example1: 'General Medicine',             example2: 'General Pathology' },
    { header: 'Sub-Topic',            width: 140, example1: '',                             example2: 'Cell Injury' },
    { header: 'Difficulty *',         width: 90,  dropdown: DIFF_OPTS, example1: 'K',       example2: 'KH' },
    { header: 'Duration (min)',        width: 90,  example1: '60',                          example2: '45' },
    { header: 'Delivery Type',        width: 110, dropdown: DELIVERY_OPTS, example1: 'REDIRECT', example2: 'REDIRECT' },
    { header: 'Watermark',            width: 90,  dropdown: BOOL_OPTS, example1: 'true',    example2: 'true' },
    { header: 'Download Allowed',     width: 120, dropdown: BOOL_OPTS, example1: 'false',   example2: 'false' },
    { header: 'View Only',            width: 90,  dropdown: BOOL_OPTS, example1: 'false',   example2: 'true' },
    { header: 'Session Expiry (min)', width: 130, example1: '120',                          example2: '120' },
  ];
  triggerDownload(cols, 'eBook Upload', instr, 'ebook_upload_template.xlsx');
}

function downloadEpubTemplate() {
  const instr =
    'EPUB BULK UPLOAD TEMPLATE\n' +
    'HOW IT WORKS:\n' +
    '1. Enter the ISBN for each book in the "ISBN *" column (e.g. 978-0-07-166351-5).\n' +
    '2. In File Upload Hub, upload each EPUB named as the ISBN (e.g. 978-0-07-166351-5.epub).\n' +
    '3. The system auto-builds the content URL as: /uploads/books/<ISBN>.epub\n' +
    '4. Cover image is auto-generated as: /uploads/images/<ISBN>.jpg — upload the cover with the same ISBN name.\n' +
    '5. Delete the two grey EXAMPLE rows, fill your data. In LibreOffice: File→Save A Copy→Text CSV. Then import here.';
  const cols: ColDef[] = [
    { header: 'ISBN *',               width: 160, example1: 'EXAMPLE-978-0-07-166351-5',   example2: 'EXAMPLE-978-93-5152-366-2' },
    { header: 'Title *',              width: 220, example1: "Gray's Anatomy",               example2: 'Guyton & Hall Physiology' },
    { header: 'Author',               width: 150, example1: 'Henry Gray',                   example2: 'Arthur C. Guyton' },
    { header: 'Description *',        width: 260, example1: 'Definitive anatomy reference with detailed illustrations', example2: 'Comprehensive medical physiology with interactive content' },
    { header: 'Subject *',            width: 140, dropdown: SUBJECTS, example1: 'Anatomy',  example2: 'Physiology' },
    { header: 'Topic',                width: 140, example1: 'General Anatomy',              example2: 'Cardiovascular' },
    { header: 'Sub-Topic',            width: 140, example1: 'Upper Limb',                   example2: 'Cardiac Cycle' },
    { header: 'Difficulty *',         width: 90,  dropdown: DIFF_OPTS, example1: 'KH',      example2: 'S' },
    { header: 'Duration (min)',        width: 90,  example1: '90',                          example2: '60' },
    { header: 'Watermark',            width: 90,  dropdown: BOOL_OPTS, example1: 'true',    example2: 'true' },
    { header: 'Download Allowed',     width: 120, dropdown: BOOL_OPTS, example1: 'false',   example2: 'false' },
    { header: 'Session Expiry (min)', width: 130, example1: '180',                          example2: '120' },
  ];
  triggerDownload(cols, 'EPUB Upload', instr, 'epub_upload_template.xlsx');
}

function downloadVideoTemplate() {
  const instr =
    'VIDEO BULK UPLOAD TEMPLATE\n' +
    'HOW IT WORKS:\n' +
    '1. Enter a unique code for each video in the "Video Code *" column (e.g. VID-ANAT-001).\n' +
    '2. In File Upload Hub, upload each video named after the code (e.g. VID-ANAT-001.mp4). Thumbnails too.\n' +
    '3. The system auto-builds the content URL as: /uploads/videos/<CODE>.<format>\n' +
    '4. Thumbnail is auto-generated as: /uploads/images/<CODE>.jpg — upload thumbnail with the same code name.\n' +
    '5. Delete the two grey EXAMPLE rows, fill your data. In LibreOffice: File→Save A Copy→Text CSV. Then import here.';
  const cols: ColDef[] = [
    { header: 'Video Code *',         width: 160, example1: 'EXAMPLE-VID-ANAT-001',         example2: 'EXAMPLE-VID-PHYS-002' },
    { header: 'Title *',              width: 220, example1: 'Brachial Plexus Video Lecture', example2: 'Cardiac Cycle Animation' },
    { header: 'Presenter / Author',   width: 150, example1: 'Dr. R. Sharma',                example2: 'Dr. A. Mehta' },
    { header: 'Description *',        width: 260, example1: 'Detailed video explaining brachial plexus formation and clinical injuries', example2: 'Animated explanation of the cardiac cycle with ECG correlation' },
    { header: 'Subject *',            width: 140, dropdown: SUBJECTS, example1: 'Anatomy',  example2: 'Physiology' },
    { header: 'Topic',                width: 140, example1: 'Upper Limb',                   example2: 'Cardiovascular System' },
    { header: 'Sub-Topic',            width: 140, example1: 'Brachial Plexus',              example2: 'Cardiac Cycle' },
    { header: 'Difficulty *',         width: 90,  dropdown: DIFF_OPTS, example1: 'S',       example2: 'KH' },
    { header: 'Duration (min)',        width: 90,  example1: '45',                          example2: '30' },
    { header: 'Video Format',         width: 90,  dropdown: ['mp4','webm','mov'], example1: 'mp4', example2: 'mp4' },
    { header: 'Delivery Type',        width: 110, dropdown: DELIVERY_OPTS, example1: 'STREAM', example2: 'STREAM' },
    { header: 'Watermark',            width: 90,  dropdown: BOOL_OPTS, example1: 'true',    example2: 'true' },
    { header: 'Download Allowed',     width: 120, dropdown: BOOL_OPTS, example1: 'false',   example2: 'false' },
    { header: 'Session Expiry (min)', width: 130, example1: '120',                          example2: '90' },
  ];
  triggerDownload(cols, 'Video Upload', instr, 'video_upload_template.xlsx');
}

function downloadImageTemplate() {
  const instr =
    'IMAGE / DIAGRAM BULK UPLOAD TEMPLATE\n' +
    'HOW IT WORKS:\n' +
    '1. Enter a unique code for each image in the "Image Code *" column (e.g. IMG-ANAT-001).\n' +
    '2. In File Upload Hub, upload each image file named after the code (e.g. IMG-ANAT-001.jpg).\n' +
    '3. The system will auto-build the URL as: /uploads/images/<CODE>.<format>\n' +
    '4. Delete the two grey EXAMPLE rows, fill your data, save as .xls and import here.';
  const cols: ColDef[] = [
    { header: 'Image Code *',         width: 160, example1: 'EXAMPLE-IMG-ANAT-001',         example2: 'EXAMPLE-IMG-PATH-002' },
    { header: 'Title *',              width: 220, example1: 'Brachial Plexus Diagram',       example2: 'Cell Injury Histology Slide' },
    { header: 'Source / Author',      width: 150, example1: "Gray's Atlas of Anatomy",       example2: 'Robbins Pathology Atlas' },
    { header: 'Description *',        width: 260, example1: 'High-resolution diagram showing brachial plexus formation and branches', example2: 'H&E stained slide showing ischaemic cell injury changes' },
    { header: 'Subject *',            width: 140, dropdown: SUBJECTS, example1: 'Anatomy',  example2: 'Pathology' },
    { header: 'Topic',                width: 140, example1: 'Upper Limb',                   example2: 'General Pathology' },
    { header: 'Sub-Topic',            width: 140, example1: 'Brachial Plexus',              example2: 'Cell Injury' },
    { header: 'Difficulty *',         width: 90,  dropdown: DIFF_OPTS, example1: 'KH',      example2: 'S' },
    { header: 'Image Format',         width: 90,  dropdown: ['jpg','png','webp','gif'], example1: 'jpg', example2: 'jpg' },
  ];
  triggerDownload(cols, 'Image Upload', instr, 'image_upload_template.xlsx');
}

const TEMPLATE_OPTIONS = [
  { id: 'ebook',  label: 'eBook (PDF)',       color: '#DC2626', desc: 'PDF books  →  /uploads/books/<ISBN>.pdf',    icon: <FileText  size={16} style={{ color: '#DC2626' }} />, fn: downloadEbookTemplate  },
  { id: 'epub',   label: 'EPUB',              color: '#2563EB', desc: 'EPUB files →  /uploads/books/<ISBN>.epub',  icon: <BookMarked size={16} style={{ color: '#2563EB' }} />, fn: downloadEpubTemplate   },
  { id: 'video',  label: 'Video',             color: '#7C3AED', desc: 'Videos     →  /uploads/videos/<CODE>.mp4',  icon: <Video     size={16} style={{ color: '#7C3AED' }} />, fn: downloadVideoTemplate  },
  { id: 'image',  label: 'Images / Diagrams', color: '#059669', desc: 'Images     →  /uploads/images/<CODE>.jpg',  icon: <Image     size={16} style={{ color: '#059669' }} />, fn: downloadImageTemplate  },
];

// ── Component ──────────────────────────────────────────────────────────────

const ExcelBulkUpload: React.FC<ExcelBulkUploadProps> = ({ onSuccess }) => {
  const [rows, setRows]               = useState<ExcelRow[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [result, setResult]           = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [error, setError]             = useState('');
  const [subjects, setSubjects]       = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState<string | null>(null);
  const [dragOver, setDragOver]       = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const diffLevels = [
    { value: 'K',  label: 'K  —  Knows'        },
    { value: 'KH', label: 'KH  —  Knows How'   },
    { value: 'S',  label: 'S  —  Shows'         },
    { value: 'SH', label: 'SH  —  Shows How'   },
    { value: 'P',  label: 'P  —  Performs'      },
  ];

  useEffect(() => { topicsService.getSubjects().then(setSubjects).catch(() => {}); }, []);

  const generateId = () =>
    (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() :
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const parseCSVLine = (line: string): string[] => {
    const out: string[] = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim()); return out;
  };

  const validateRow = (row: ExcelRow): ExcelRow => {
    const errors: string[] = [];
    if (!row.isbn)    errors.push('ISBN / Code is required — the file URL is built from it');
    if (!row.title)   errors.push('Title is required');
    if (!row.subject) errors.push('Subject is required');
    if (!row.fileUrl) errors.push('File URL could not be built — check that ISBN and File Format are filled in');
    return { ...row, valid: errors.length === 0, errors };
  };

  const processAllRows = useCallback((allRows: string[][]) => {
        if (allRows.length < 1) { setError('No rows found in the file.'); return; }

        // Find the actual header row: first row whose first cell is a known column header
        // Handles eBook (ISBN *), Video (Video Code *), Image (Image Code *) templates
        const headerRowIdx = allRows.findIndex(r => {
          const first = (r[0] ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          return first.length < 30 && (
            first.startsWith('isbn') ||
            first.startsWith('videocode') ||
            first.startsWith('imagecode')
          );
        });
        if (headerRowIdx >= 0) {
          allRows = allRows.slice(headerRowIdx);
        }

        allRows = allRows.filter((r, i) => {
          if (i === 0) return true;
          const first = (r[0] ?? '').trim().toUpperCase();
          if (first.startsWith('EXAMPLE-')) return false;
          if (first.startsWith('DELETE THE TWO GREY') || first.startsWith('COLUMNS MARKED') || first.startsWith('★ DELETE')) return false;
          return true;
        });

        if (allRows.length < 2) {
          setError('No data rows found. Replace the EXAMPLE rows with your own content and import again.');
          return;
        }

        const headers = allRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const col = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));

        const isbnIdx     = col(['isbn','code','videocode','imagecode']);
        const titleIdx    = col(['title','bookname','name']);
        const authorIdx   = col(['author','presenter','source']);
        const descIdx     = col(['description','desc']);
        const subjectIdx  = col(['subject']);
        const topicIdx    = col(['topic']);
        const subTopicIdx = col(['subtopic','subtop']);
        const diffIdx     = col(['difficulty','level']);
        const durationIdx = col(['duration','min','minutes']);
        const formatIdx   = col(['videoformat','imageformat','fileformat','format','ext']);
        const deliveryIdx = col(['delivery','deliverytype']);
        const watermarkIdx  = col(['watermark']);
        const downloadIdx   = col(['download','downloadallowed']);
        const viewOnlyIdx   = col(['viewonly']);
        const sessionIdx    = col(['session','sessionexpiry','expiry']);
        const coverIdx      = col(['cover','thumbnail','coverimage']);
        const manualUrlIdx  = headers.findIndex((h, i) => {
          if (i === coverIdx) return false;
          return ['fileurl','videourl','contenturl','pdfurl','epuburl'].some(n => h.includes(n))
              || h === 'imageurl';
        });

        if (isbnIdx < 0 && titleIdx < 0) {
          setError(
            'Could not find required columns. Found headers: ' + allRows[0].slice(0, 8).join(' | ') +
            '. Make sure you are using the downloaded template.'
          );
          return;
        }

        const validDiff = ['K','KH','S','SH','P'];
        const parseBool = (v: string, fb: boolean) => {
          const s = v?.trim().toLowerCase();
          return s === 'true' || s === 'yes' || s === '1' ? true :
                 s === 'false' || s === 'no' || s === '0' ? false : fb;
        };
        const guessType = (fmt: string, url: string): 'BOOK' | 'VIDEO' | 'EPUB' => {
          const f = fmt.toLowerCase(); const u = url.toLowerCase();
          if (['mp4','webm','mov','avi'].includes(f) || /\.(mp4|webm|mov|avi)$/.test(u)) return 'VIDEO';
          if (f === 'epub' || u.endsWith('.epub')) return 'EPUB';
          // Infer from URL path segment when format is missing
          if (u.includes('/uploads/videos/')) return 'VIDEO';
          return 'BOOK';
        };

        const newRows: ExcelRow[] = [];
        for (let i = 1; i < allRows.length; i++) {
          const c = allRows[i];
          if (c.every(v => !v)) continue;
          const get = (idx: number) => (idx >= 0 ? c[idx]?.trim() ?? '' : '');

          const isbn      = get(isbnIdx);
          const rawFormat = get(formatIdx).toLowerCase();
          const manualUrl = get(manualUrlIdx);
          const fileUrl   = manualUrl || buildAutoUrl(isbn, rawFormat);
          const rawDiff   = get(diffIdx).toUpperCase();
          const rawDel    = get(deliveryIdx).toUpperCase();
          const rowType   = guessType(rawFormat, fileUrl);
          const coverUrl  = get(coverIdx) || (isbn ? `/api/uploads/cover/${sanitiseIsbn(isbn)}` : '');

          const row: ExcelRow = {
            id: generateId(), isbn, title: get(titleIdx),
            author: get(authorIdx), description: get(descIdx), coverImageUrl: coverUrl,
            fileUrl,
            fileFormat: rawFormat || (rowType === 'VIDEO' ? 'mp4' : rowType === 'EPUB' ? 'epub' : 'pdf'),
            subject: get(subjectIdx), topic: get(topicIdx), subTopic: get(subTopicIdx),
            difficultyLevel: validDiff.includes(rawDiff) ? rawDiff : 'K',
            estimatedDuration: durationIdx >= 0 ? (parseInt(c[durationIdx]) || 30) : 30,
            type: rowType,
            deliveryType: (['REDIRECT','EMBED','STREAM'].includes(rawDel) ? rawDel :
              rowType === 'EPUB' ? 'EMBED' : rowType === 'VIDEO' ? 'STREAM' : 'REDIRECT') as any,
            watermarkEnabled:     parseBool(get(watermarkIdx), true),
            downloadAllowed:      parseBool(get(downloadIdx), false),
            viewOnly:             parseBool(get(viewOnlyIdx), rowType === 'EPUB'),
            sessionExpiryMinutes: sessionIdx >= 0 ? (parseInt(c[sessionIdx]) || 120) : 120,
            valid: true, errors: [],
          };
          if (!row.title && !row.isbn) continue;
          newRows.push(validateRow(row));
        }

        if (newRows.length === 0) {
          setError('No data rows could be parsed. Make sure rows have at least an ISBN/Code and a Title filled in.');
          return;
        }
        setRows(newRows);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileImport = useCallback((file: File) => {
    setError(''); setResult(null);

    const isXlsx = file.name.toLowerCase().endsWith('.xlsx');

    if (isXlsx) {
      // Use SheetJS to parse proper .xlsx files
      const reader = new FileReader();
      reader.onerror = () => setError('Could not read the file.');
      reader.onload = (ev) => {
        try {
          const data = ev.target?.result;
          if (!data) { setError('File is empty.'); return; }
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const allRows: string[][] = (XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][])
            .map(r => r.map((v: any) => String(v ?? '').trim()));
          processAllRows(allRows);
        } catch (e) {
          setError('Could not parse the .xlsx file. Make sure it is a valid Excel file.');
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError('Could not read the file. Please check the file and try again.');
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result;
        if (!raw || typeof raw !== 'string' || !raw.trim()) { setError('File is empty.'); return; }
        const text = raw as string;

        // BIFF binary XLS (OLE2 compound document)
        if (text.charCodeAt(0) === 0xD0 && text.charCodeAt(1) === 0xCF) {
          setError(
            'Binary .xls format detected. Please save as .xlsx or CSV and try again.'
          );
          return;
        }

        const SS_NS = 'urn:schemas-microsoft-com:office:spreadsheet';
        const ssAttr = (el: Element, name: string): string | null =>
          el.getAttributeNS(SS_NS, name) ?? el.getAttribute('ss:' + name) ?? el.getAttribute(name);
        const getEls = (p: Element | Document, tag: string): Element[] =>
          Array.from(p.getElementsByTagName(tag));

        let allRows: string[][] = [];
        const trimmed = text.trim();
        const isXml = trimmed.startsWith('<?xml') || trimmed.startsWith('<Workbook') ||
          trimmed.includes('urn:schemas-microsoft-com:office:spreadsheet');

        if (isXml) {
          const doc = new DOMParser().parseFromString(text, 'text/xml');
          if (doc.querySelector('parsererror')) {
            setError('XML parse error. Use the downloaded template or export as CSV and try again.');
            return;
          }
          getEls(doc, 'Row').forEach(rowEl => {
            const cells = getEls(rowEl, 'Cell');
            if (cells.length > 0 && ssAttr(cells[0], 'MergeAcross') !== null) return;
            const row: string[] = [];
            cells.forEach(cell => {
              const idxRaw = ssAttr(cell, 'Index');
              const target = idxRaw ? parseInt(idxRaw, 10) - 1 : row.length;
              while (row.length < target) row.push('');
              row.push(getEls(cell, 'Data')[0]?.textContent?.trim() ?? '');
            });
            if (row.some(c => c !== '')) allRows.push(row);
          });
        } else {
          allRows = text.split(/\r?\n/).filter(l => l.trim()).map(l => parseCSVLine(l));
        }

        processAllRows(allRows);
      } catch (err: any) {
        console.error('[ExcelBulkUpload] parse error:', err);
        setError('Unexpected error reading the file. Please check the format and try again.');
      }
    };
    reader.readAsText(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processAllRows]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0]; if (file) handleFileImport(file);
  };

  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  const updateRow = (id: string, field: keyof ExcelRow, value: any) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value };
      if (field === 'isbn' || field === 'fileFormat') {
        const auto = buildAutoUrl(u.isbn, u.fileFormat);
        if (auto) u.fileUrl = auto;
      }
      if (field === 'fileFormat') {
        const fmt = (value as string).toLowerCase();
        const inferredType: 'BOOK' | 'VIDEO' | 'EPUB' =
          ['mp4','webm','mov','avi'].includes(fmt) ? 'VIDEO' :
          fmt === 'epub' ? 'EPUB' : 'BOOK';
        u.type = inferredType;
        u.deliveryType = inferredType === 'VIDEO' ? 'STREAM' : inferredType === 'EPUB' ? 'EMBED' : 'REDIRECT';
      }
      return validateRow(u);
    }));
  };

  const handlePublishAll = async () => {
    setError(''); setResult(null);
    const validRows = rows.filter(r => r.valid);
    if (validRows.length === 0) { setError('No valid rows to publish. Fix errors first.'); return; }
    setUploading(true);
    let success = 0, failed = 0; const errors: string[] = [];

    const toRel = (url: string) => { try { return new URL(url).pathname; } catch { return url; } };

    for (const row of validRows) {
      try {
        const backendType = row.type === 'EPUB' ? 'BOOK' : row.type;
        const fileFormat  = row.type === 'EPUB' ? 'EPUB' : row.type === 'VIDEO' ? 'VIDEO' : 'PDF';
        let desc = row.description || row.title || '';
        if (desc.length < 20) desc = (desc + ' — uploaded via bulk import').slice(0, 60);
        await learningUnitService.create({
          type: backendType as any, title: row.title, description: desc,
          subject: row.subject, topic: row.topic || row.subject,
          subTopic: row.subTopic || undefined,
          difficultyLevel: row.difficultyLevel as any,
          estimatedDuration: row.estimatedDuration,
          secureAccessUrl: toRel(row.fileUrl),
          thumbnailUrl: row.coverImageUrl ? toRel(row.coverImageUrl) : undefined,
          coverImageUrl: row.coverImageUrl ? toRel(row.coverImageUrl) : undefined,
          deliveryType: row.deliveryType as any,
          watermarkEnabled: row.watermarkEnabled, downloadAllowed: row.downloadAllowed,
          viewOnly: row.viewOnly, sessionExpiryMinutes: row.sessionExpiryMinutes,
          competencyIds: [], author: row.author || undefined, fileFormat,
          edition: row.isbn ? ('ISBN: ' + row.isbn) : undefined,
        } as any);
        success++;
      } catch (err: any) {
        failed++;
        const msg = err?.response?.data?.message;
        errors.push(`[${row.isbn || row.title}]: ${Array.isArray(msg) ? msg.join('; ') : (msg || err.message || 'Unknown error')}`);
      }
    }
    setResult({ success, failed, errors });
    if (success > 0 && onSuccess) onSuccess();
    if (failed === 0) setRows([]);
    setUploading(false);
  };

  const validCount   = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;
  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    border: '1px solid var(--bo-border)', fontSize: 13,
    background: '#fff', color: 'var(--bo-text-primary)', boxSizing: 'border-box' as const,
  };
  const tc = (t: string) =>
    t === 'VIDEO' ? { bg: '#EFF6FF', fg: '#2563EB' } :
    t === 'EPUB'  ? { bg: '#EDE9FE', fg: '#7C3AED' } : { bg: '#F0FDF4', fg: '#059669' };

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--bo-text-primary)', marginBottom: 4 }}>Bulk Upload Content</h3>
          <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>Download a template, fill in ISBN + details, import to publish multiple items at once.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowTemplates(p => !p)} className="bo-btn bo-btn-outline"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Download Template <ChevronDown size={13} />
          </button>
          {showTemplates && (
            <div style={{
              position: 'absolute', right: 0, top: '110%', zIndex: 200, background: '#fff',
              border: '1px solid var(--bo-border)', borderRadius: 10,
              boxShadow: '0 8px 28px rgba(0,0,0,0.14)', minWidth: 270, padding: 8,
            }}>
              {TEMPLATE_OPTIONS.map(t => (
                <button key={t.id} onClick={() => { t.fn(); setShowTemplates(false); }}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 7, textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  {t.icon}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text-primary)' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1, fontFamily: 'monospace' }}>{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workflow guide */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 16px', marginBottom: 20, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10 }}>
        <Info size={18} style={{ color: '#1D4ED8', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: '#1E3A5F', lineHeight: 1.8 }}>
          <strong>How to use — 3 steps:</strong>
          <ol style={{ margin: '4px 0 0 0', paddingLeft: 18 }}>
            <li><strong>Upload files</strong> via <strong>File Upload Hub</strong> — name each file after its ISBN/code
              (e.g. <code style={{ background: '#DBEAFE', padding: '0 4px', borderRadius: 3 }}>978-0-07-166351-5.pdf</code>). Upload cover images there too.</li>
            <li><strong>Download a template</strong>, fill in ISBN + metadata, delete the grey EXAMPLE rows.
              In LibreOffice: <strong>File → Save A Copy → Text CSV (.csv)</strong> then import that CSV.</li>
            <li><strong>Import here</strong> — content URL is auto-built as
              <code style={{ background: '#DBEAFE', padding: '0 4px', borderRadius: 3, marginLeft: 4 }}>/uploads/books/&lt;ISBN&gt;.pdf</code>.
              Review and publish.
            </li>
          </ol>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ flex: 1, lineHeight: 1.6 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 2 }}><X size={14} /></button>
        </div>
      )}

      {/* Drop zone */}
      {rows.length === 0 && (
        <div style={{
          border: '2px dashed ' + (dragOver ? 'var(--bo-primary, #c47335)' : '#D1D5DB'),
          borderRadius: 12, padding: '50px 24px', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? 'rgba(196,115,53,0.04)' : '#FAFAFA', transition: 'all 0.2s', marginBottom: 20,
        }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}>
          <FileSpreadsheet size={48} style={{ color: '#9CA3AF', marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 6 }}>Drop your .csv or .xls file here, or click to browse</div>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.8 }}>
            <strong style={{ color: '#059669' }}>Recommended: CSV</strong> — In LibreOffice: File → Save A Copy → Text CSV (.csv)<br />
            Also accepts the downloaded .xls template (before re-saving in LibreOffice)<br />
            <span style={{ color: '#EF4444', fontWeight: 600 }}>⚠ After editing in LibreOffice, always export as CSV — do not re-save as .xls</span>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".csv,.txt,.xls" style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) handleFileImport(e.target.files[0]); e.target.value = ''; }} />

      {/* Preview */}
      {rows.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--bo-text-primary)' }}>{rows.length} item{rows.length !== 1 ? 's' : ''} imported</span>
              {validCount > 0 && <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#ECFDF5', color: '#059669' }}>✓ {validCount} ready</span>}
              {invalidCount > 0 && <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#FEF2F2', color: '#DC2626' }}>✗ {invalidCount} need fixes</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => fileInputRef.current?.click()} className="bo-btn bo-btn-outline" style={{ fontSize: 12 }}><Upload size={13} /> Re-import</button>
              <button onClick={() => { setRows([]); setResult(null); setError(''); }} className="bo-btn bo-btn-outline" style={{ fontSize: 12, color: '#EF4444' }}><Trash2 size={13} /> Clear All</button>
            </div>
          </div>

          <div className="bo-card" style={{ overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '2px solid var(--bo-border)' }}>
                    {['#','ISBN / Code','Title / Author','Type','Subject / Topic','Diff','Auto-Generated URL','Status',''].map((h,i) => (
                      <th key={i} style={{ padding: '10px 12px', textAlign: 'left' as const, fontWeight: 700, color: '#6B7280', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.04em', whiteSpace: 'nowrap' as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const col = tc(row.type);
                    const isOpen = previewOpen === row.id;
                    return (
                      <React.Fragment key={row.id}>
                        <tr style={{ borderBottom: '1px solid var(--bo-border)', background: !row.valid ? '#FEF2F2' : isOpen ? '#F0F9FF' : 'transparent', cursor: 'pointer' }}
                          onClick={() => setPreviewOpen(isOpen ? null : row.id)}
                          onMouseEnter={e => { if (row.valid && !isOpen) (e.currentTarget as HTMLTableRowElement).style.background = '#F9FAFB'; }}
                          onMouseLeave={e => { if (row.valid && !isOpen) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                          <td style={{ padding: '10px 12px', color: '#9CA3AF', fontSize: 12 }}>{idx + 1}</td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' as const }}>
                            {row.isbn ? <code style={{ fontSize: 11, background: '#F0F9FF', color: '#0369A1', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>{row.isbn}</code>
                              : <span style={{ color: '#EF4444', fontSize: 11 }}>⚠ missing</span>}
                          </td>
                          <td style={{ padding: '10px 12px', minWidth: 160 }}>
                            <div style={{ fontWeight: 600, color: 'var(--bo-text-primary)' }}>{row.title || '—'}</div>
                            {row.author && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{row.author}</div>}
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' as const }}>
                            <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: col.bg, color: col.fg }}>{row.type}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{row.subject || '—'}</div>
                            {row.topic && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{row.topic}</div>}
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' as const }}>
                            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#F3F4F6', color: '#374151' }}>{row.difficultyLevel}</span>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: 230 }}>
                            {row.fileUrl
                              ? <code style={{ fontSize: 10, color: '#1D4ED8', background: '#EFF6FF', padding: '2px 6px', borderRadius: 4, wordBreak: 'break-all' as const }}>{row.fileUrl}</code>
                              : <span style={{ color: '#EF4444', fontSize: 11 }}>⚠ no URL</span>}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' as const }}>
                            {row.valid ? <Check size={16} style={{ color: '#10B981' }} />
                              : <span style={{ color: '#EF4444', fontSize: 11, fontWeight: 700 }}>{row.errors.length} err</span>}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' as const }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => setPreviewOpen(isOpen ? null : row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}>
                                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                              <button onClick={() => removeRow(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}><X size={14} /></button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={9} style={{ padding: 0 }}>
                              <div style={{ padding: '16px 20px', background: '#F0F9FF', borderTop: '1px solid #BFDBFE', borderBottom: '1px solid #BFDBFE' }}>
                                {!row.valid && (
                                  <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, marginBottom: 14 }}>
                                    {row.errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#DC2626', marginBottom: 2 }}>• {e}</div>)}
                                  </div>
                                )}
                                <div style={{ padding: '8px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, marginBottom: 14, fontSize: 12, color: '#1E3A5F', lineHeight: 1.6 }}>
                                  <strong>Auto-constructed URL:</strong>{' '}
                                  <code style={{ background: '#DBEAFE', padding: '1px 6px', borderRadius: 3 }}>{row.fileUrl || '— set ISBN + format below'}</code>
                                  <span style={{ marginLeft: 6, color: '#6B7280' }}>Make sure a file with this exact name is uploaded via File Upload Hub.</span>
                                </div>
                                {/* Row 1 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>ISBN / Code *</label>
                                    <input style={inp} value={row.isbn} onChange={e => updateRow(row.id, 'isbn', e.target.value)} placeholder="e.g. 978-0-07-166351-5" /></div>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Title *</label>
                                    <input style={inp} value={row.title} onChange={e => updateRow(row.id, 'title', e.target.value)} /></div>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Author</label>
                                    <input style={inp} value={row.author} onChange={e => updateRow(row.id, 'author', e.target.value)} /></div>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>File Format</label>
                                    <select style={{ ...inp, cursor: 'pointer' }} value={row.fileFormat} onChange={e => updateRow(row.id, 'fileFormat', e.target.value)}>
                                      {['pdf','epub','mp4','webm','mov','jpg','png','webp','gif'].map(f => <option key={f} value={f}>{f}</option>)}
                                    </select></div>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Content Type</label>
                                    <select style={{ ...inp, cursor: 'pointer' }} value={row.type} onChange={e => updateRow(row.id, 'type', e.target.value as any)}>
                                      <option value="BOOK">Book (PDF)</option>
                                      <option value="EPUB">EPUB</option>
                                      <option value="VIDEO">Video</option>
                                    </select></div>
                                </div>
                                {/* Row 2 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Subject *</label>
                                    <select style={{ ...inp, cursor: 'pointer' }} value={row.subject} onChange={e => updateRow(row.id, 'subject', e.target.value)}>
                                      <option value="">Select subject…</option>
                                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select></div>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Topic</label>
                                    <input style={inp} value={row.topic} onChange={e => updateRow(row.id, 'topic', e.target.value)} placeholder="e.g. Cardiovascular System" /></div>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Sub-Topic</label>
                                    <input style={inp} value={row.subTopic} onChange={e => updateRow(row.id, 'subTopic', e.target.value)} placeholder="e.g. Cardiac Cycle" /></div>
                                </div>
                                {/* Row 3 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Difficulty *</label>
                                    <select style={{ ...inp, cursor: 'pointer' }} value={row.difficultyLevel} onChange={e => updateRow(row.id, 'difficultyLevel', e.target.value)}>
                                      {diffLevels.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select></div>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Duration (min)</label>
                                    <input type="number" style={inp} value={row.estimatedDuration} min={1} onChange={e => updateRow(row.id, 'estimatedDuration', parseInt(e.target.value) || 30)} /></div>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Delivery Type</label>
                                    <select style={{ ...inp, cursor: 'pointer' }} value={row.deliveryType} onChange={e => updateRow(row.id, 'deliveryType', e.target.value as any)}>
                                      <option value="REDIRECT">Redirect (Online)</option>
                                      <option value="EMBED">Embed (In-App)</option>
                                      <option value="STREAM">Stream</option>
                                    </select></div>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Session Expiry (min)</label>
                                    <input type="number" style={inp} value={row.sessionExpiryMinutes} min={5} onChange={e => updateRow(row.id, 'sessionExpiryMinutes', parseInt(e.target.value) || 120)} /></div>
                                </div>
                                {/* Row 4 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Cover Image URL <span style={{ fontWeight: 400, color: '#059669' }}>(auto-generated from ISBN — override if needed)</span></label>
                                    <input style={{ ...inp, fontFamily: 'monospace', fontSize: 12 }} value={row.coverImageUrl} onChange={e => updateRow(row.id, 'coverImageUrl', e.target.value)} placeholder="/uploads/images/<isbn>.jpg" /></div>
                                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>File URL <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(auto-generated — edit only if needed)</span></label>
                                    <input style={{ ...inp, fontFamily: 'monospace', fontSize: 12 }} value={row.fileUrl} onChange={e => updateRow(row.id, 'fileUrl', e.target.value)} placeholder="/uploads/books/<isbn>.pdf" /></div>
                                </div>
                                {/* Toggles */}
                                <div style={{ display: 'flex', gap: 24, padding: '8px 0', marginBottom: 12 }}>
                                  {([{ field: 'watermarkEnabled' as const, label: 'Watermark' },
                                     { field: 'downloadAllowed' as const,  label: 'Download Allowed' },
                                     { field: 'viewOnly' as const,         label: 'View Only' }] as const).map(t => (
                                    <label key={t.field} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                                      <input type="checkbox" checked={row[t.field]} onChange={e => updateRow(row.id, t.field, e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                                      <span style={{ fontWeight: 500 }}>{t.label}</span>
                                    </label>
                                  ))}
                                </div>
                                {/* Description */}
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>Description <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(min 20 chars recommended)</span></label>
                                  <textarea style={{ ...inp, minHeight: 64, resize: 'vertical' as const }} value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)} placeholder="Enter a description for this content item…" />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Publish bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
            {invalidCount > 0 && <span style={{ fontSize: 12, color: '#DC2626' }}>⚠ {invalidCount} item{invalidCount !== 1 ? 's have' : ' has'} errors — click to expand and fix.</span>}
            <span style={{ fontSize: 13, color: '#6B7280' }}>{validCount} of {rows.length} ready</span>
            <button onClick={handlePublishAll} className="bo-btn bo-btn-primary" disabled={uploading || validCount === 0}
              style={{ padding: '10px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              {uploading ? 'Publishing…' : <><Send size={16} /> Publish {validCount} item{validCount !== 1 ? 's' : ''}</>}
            </button>
          </div>
        </>
      )}

      {/* Result */}
      {result && (
        <div className="bo-card" style={{ padding: 20, marginTop: 20, borderLeft: '4px solid ' + (result.failed === 0 ? '#10B981' : '#F59E0B') }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: result.failed === 0 ? '#059669' : 'var(--bo-text-primary)' }}>
            {result.failed === 0 ? '✓ All items published successfully!' : 'Publishing completed with some errors'}
          </h4>
          <div style={{ display: 'flex', gap: 28, marginBottom: result.errors.length > 0 ? 14 : 0 }}>
            <div><span style={{ color: '#10B981', fontWeight: 700, fontSize: 22 }}>{result.success}</span><span style={{ color: '#6B7280', marginLeft: 6, fontSize: 13 }}>published</span></div>
            {result.failed > 0 && <div><span style={{ color: '#EF4444', fontWeight: 700, fontSize: 22 }}>{result.failed}</span><span style={{ color: '#6B7280', marginLeft: 6, fontSize: 13 }}>failed</span></div>}
          </div>
          {result.errors.length > 0 && (
            <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', padding: '10px 14px', borderRadius: 7, maxHeight: 200, overflowY: 'auto' as const, lineHeight: 1.8 }}>
              {result.errors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExcelBulkUpload;
