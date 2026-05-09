import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import governanceService from '../../services/governance.service';
import CollegeLayout from '../../components/college/CollegeLayout';
import { Upload, Download, GraduationCap, UserCog, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import XLSXStyle from 'xlsx-js-style';
import * as fflate from 'fflate';
import { saveAs } from 'file-saver';
import '../../styles/bitflow-owner.css';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ── Build real OOXML .xlsx with column dropdowns using fflate ─────────────
function buildFflateXlsx(
  cols: Array<{ header: string; width: number; dropdown?: string[]; example1: string; example2: string }>,
  sheetName: string,
  filename: string,
  tipText: string,
) {
  const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const styleHeader = { fill: { fgColor: { rgb: '059669' } }, font: { color: { rgb: 'FFFFFF' }, sz: 11, bold: true, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
  const styleExample = { fill: { fgColor: { rgb: 'F9FAFB' } }, font: { italic: true, color: { rgb: '9CA3AF' }, sz: 11, name: 'Calibri' }, alignment: { vertical: 'center', wrapText: true } };
  const styleTip = { fill: { fgColor: { rgb: 'ECFDF5' } }, font: { color: { rgb: '065F46' }, sz: 10, name: 'Calibri' }, alignment: { wrapText: true, vertical: 'top' } };
  const numCols = cols.length;
  const ws: any = {};
  const R = (row: number, col: number) => XLSXStyle.utils.encode_cell({ r: row, c: col });
  ws[R(0, 0)] = { v: tipText, t: 's', s: styleTip };
  for (let c = 1; c < numCols; c++) ws[R(0, c)] = { v: '', t: 's', s: styleTip };
  cols.forEach((col, c) => { ws[R(1, c)] = { v: col.header, t: 's', s: styleHeader }; });
  cols.forEach((col, c) => { ws[R(2, c)] = { v: col.example1, t: 's', s: styleExample }; });
  cols.forEach((col, c) => { ws[R(3, c)] = { v: col.example2, t: 's', s: styleExample }; });
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 3, c: numCols - 1 } });
  ws['!cols'] = cols.map(c => ({ wch: c.width }));
  ws['!rows'] = [{ hpt: 40 }, { hpt: 28 }, { hpt: 20 }, { hpt: 20 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } }];
  ws['!views'] = [{ state: 'frozen', ySplit: 2, xSplit: 0, topLeftCell: 'A3', activeCell: 'A3' }];
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
  const rawBuf: ArrayBuffer = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'array' });
  const dvCols = cols.map((c, i) => ({ ...c, idx: i })).filter(c => c.dropdown && c.dropdown.length > 0);
  if (!dvCols.length) {
    const url = URL.createObjectURL(new Blob([new Uint8Array(rawBuf)], { type: XLSX_MIME }));
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  const dvXml = [`<dataValidations count="${dvCols.length}">`, ...dvCols.map(col => {
    const colLetter = XLSXStyle.utils.encode_col(col.idx);
    const formula = col.dropdown!.map(xmlEsc).join(',');
    return `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${colLetter}3:${colLetter}10001"><formula1>"${formula}"</formula1></dataValidation>`;
  }), '</dataValidations>'].join('');
  const unzipped = fflate.unzipSync(new Uint8Array(rawBuf));
  const sheetKey = Object.keys(unzipped).find(k => /xl\/worksheets\/sheet\d+\.xml/.test(k));
  if (sheetKey) {
    let xml = new TextDecoder().decode(unzipped[sheetKey]);
    xml = xml.includes('</mergeCells>') ? xml.replace('</mergeCells>', `</mergeCells>${dvXml}`) : xml.replace('</sheetData>', `</sheetData>${dvXml}`);
    unzipped[sheetKey] = new TextEncoder().encode(xml);
  }
  const zipped = fflate.zipSync(unzipped);
  const url = URL.createObjectURL(new Blob([zipped], { type: XLSX_MIME }));
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const DEPT_CODES = ['ANAT','PHYS','BIOC','PATH','PHAR','MICR','GMED','GSUR','OBGY','PAED','ORTH','OPHT','ENT','DERM','PSYC','RADI','ANES'];
const PERM_SETS = ['Full Access','Course Manager','Read Only'];
// Only the 5 valid academic years used throughout the system
const ACAD_YEARS = ['FIRST_YEAR','SECOND_YEAR','YEAR_3_PART1','YEAR_3_PART2','INTERNSHIP'];

function downloadFacultyTemplate() {
  buildFflateXlsx(
    [
      { header: 'fullName *', width: 26, example1: 'Dr. John Smith', example2: 'Dr. Jane Doe' },
      { header: 'email *', width: 30, example1: 'john.smith@college.edu', example2: 'jane.doe@college.edu' },
      { header: 'departmentCode *', width: 20, dropdown: DEPT_CODES, example1: 'ANAT', example2: 'PHYS' },
      { header: 'permissionSetName *', width: 22, dropdown: PERM_SETS, example1: 'Full Access', example2: 'Course Manager' },
    ],
    'Faculty Upload',
    'faculty_upload_template.xlsx',
    'Faculty Upload Template — Fill in one row per faculty member. Columns marked * are required.',
  );
}

function downloadStudentTemplate() {
  buildFflateXlsx(
    [
      { header: 'fullName *', width: 26, example1: 'Rahul Sharma', example2: 'Priya Patel' },
      { header: 'email *', width: 30, example1: 'rahul@college.edu', example2: 'priya@college.edu' },
      { header: 'yearOfAdmission *', width: 18, example1: '2024', example2: '2023' },
      { header: 'expectedPassingYear *', width: 20, example1: '2029', example2: '2028' },
      { header: 'currentAcademicYear *', width: 24, dropdown: ACAD_YEARS, example1: 'FIRST_YEAR', example2: 'SECOND_YEAR' },
    ],
    'Student Upload',
    'student_upload_template.xlsx',
    'Student Upload Template — Fill in one row per student. Columns marked * are required. Use the dropdown for Academic Year.',
  );
}

const CollegeBulkUpload: React.FC = () => {
  const [tab, setTab] = useState<'students' | 'faculty'>('students');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const progressTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startProgress = () => {
    setProgress(0);
    let current = 0;
    progressTimer.current = setInterval(() => {
      // Ramp quickly at first, then slow down as it approaches 90%
      const increment = current < 30 ? 4 : current < 60 ? 2.5 : current < 80 ? 1.2 : 0.4;
      current = Math.min(current + increment, 90);
      setProgress(current);
      if (current >= 90 && progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
    }, 200);
  };

  const finishProgress = () => {
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
    setProgress(100);
    setTimeout(() => setProgress(0), 1200);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a CSV file'); return; }
    setLoading(true); setError(null); setResult(null);
    startProgress();
    try {
      let res;
      if (tab === 'students') {
        res = await studentService.bulkUpload(file);
      } else {
        res = await governanceService.bulkUploadFaculty(file);
      }
      finishProgress();
      setResult(res);
      setSuccess(`Upload complete: ${res.success} created, ${res.failed} failed`);
    } catch (err: any) {
      finishProgress();
      setError(err.response?.data?.message || 'Upload failed');
    }
    finally { setLoading(false); }
  };

  const downloadTemplate = () => {
    if (tab === 'faculty') downloadFacultyTemplate();
    else downloadStudentTemplate();
  };

  const reset = () => { setFile(null); setResult(null); setError(null); setSuccess(null); };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  const navigate = useNavigate();

  return (
    <CollegeLayout>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button onClick={() => navigate('/college-admin')} className="bo-btn bo-btn-outline" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Bulk Upload</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Upload multiple students or faculty from CSV files</p>
        </div>

        {/* Tab Switcher */}
        <div className="bo-card" style={{ padding: 4, marginBottom: 16, display: 'flex', gap: 4 }}>
          <button onClick={() => { setTab('students'); reset(); }} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === 'students' ? '#059669' : 'transparent', color: tab === 'students' ? 'white' : 'var(--bo-text-secondary)' }}>
            <GraduationCap size={16} style={{ marginRight: 6 }} /> Students
          </button>
          <button onClick={() => { setTab('faculty'); reset(); }} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === 'faculty' ? '#059669' : 'transparent', color: tab === 'faculty' ? 'white' : 'var(--bo-text-secondary)' }}>
            <UserCog size={16} style={{ marginRight: 6 }} /> Faculty
          </button>
        </div>

        {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>{error}</span><button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}>×</button></div>}
        {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

        <form onSubmit={handleUpload}>
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              Upload {tab === 'students' ? 'Students' : 'Faculty'} CSV
            </h3>

            {/* CSV Format Info */}
            <div style={{ padding: 12, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: 16, fontSize: 12, color: '#1D4ED8' }}>
              <strong>Required columns:</strong><br />
              {tab === 'students'
                ? 'fullName, email, yearOfAdmission, expectedPassingYear, currentAcademicYear'
                : 'fullName, email, departmentCode, permissionSetName'}
            </div>

            <button type="button" className="bo-btn bo-btn-outline" onClick={downloadTemplate} style={{ width: '100%', marginBottom: 16 }}>
              <Download size={14} /> Download CSV Template
            </button>

            <div style={{ border: '2px dashed var(--bo-border)', borderRadius: 10, padding: 30, textAlign: 'center', background: 'var(--bo-bg)' }}>
              <Upload size={32} style={{ color: 'var(--bo-text-muted)', opacity: 0.4, marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: 12 }}>Choose a CSV or Excel (.xlsx) file to upload</div>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); setError(null); }} style={inputStyle} />
              {file && <div style={{ marginTop: 8, fontSize: 12, color: '#059669', fontWeight: 500 }}>✓ Selected: {file.name}</div>}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Upload Results</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ padding: 14, borderRadius: 8, background: '#ECFDF5', textAlign: 'center' }}>
                  <CheckCircle size={20} style={{ color: '#059669', marginBottom: 4 }} />
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{result.success}</div>
                  <div style={{ fontSize: 11, color: '#059669' }}>Created</div>
                </div>
                <div style={{ padding: 14, borderRadius: 8, background: '#FEF2F2', textAlign: 'center' }}>
                  <XCircle size={20} style={{ color: '#DC2626', marginBottom: 4 }} />
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626' }}>{result.failed}</div>
                  <div style={{ fontSize: 11, color: '#DC2626' }}>Failed</div>
                </div>
                <div style={{ padding: 14, borderRadius: 8, background: '#EFF6FF', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2563EB' }}>{result.emailsSent || 0}</div>
                  <div style={{ fontSize: 11, color: '#2563EB' }}>Emails Sent</div>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div style={{ padding: 12, borderRadius: 8, background: '#FEF2F2', fontSize: 12, color: '#DC2626', maxHeight: 200, overflow: 'auto' }}>
                  <strong>Errors:</strong>
                  {result.errors.slice(0, 10).map((e: any, i: number) => <div key={i} style={{ marginTop: 4 }}>Row {e.row}: {e.error}</div>)}
                  {result.errors.length > 10 && <div style={{ marginTop: 4 }}>...and {result.errors.length - 10} more</div>}
                </div>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {loading && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>Uploading {tab === 'students' ? 'students' : 'faculty'}…</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: '#D1FAE5', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  borderRadius: 99,
                  background: 'linear-gradient(90deg, #059669, #34D399)',
                  transition: 'width 0.18s ease',
                }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {result && <button type="button" className="bo-btn bo-btn-outline" onClick={reset}>Upload Another</button>}
            <button type="submit" className="bo-btn bo-btn-primary" style={{ background: '#059669' }} disabled={loading || !file}>
              <Upload size={14} /> {loading ? 'Uploading...' : `Upload ${tab === 'students' ? 'Students' : 'Faculty'}`}
            </button>
          </div>
        </form>
      </div>
    </CollegeLayout>
  );
};

export default CollegeBulkUpload;
