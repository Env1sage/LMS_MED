import React, { useState } from 'react';
import { studentService } from '../../services/student.service';
import governanceService from '../../services/governance.service';
import CollegeLayout from '../../components/college/CollegeLayout';
import { Upload, Download, GraduationCap, UserCog, CheckCircle, XCircle } from 'lucide-react';
import '../../styles/bitflow-owner.css';

const CollegeBulkUpload: React.FC = () => {
  const [tab, setTab] = useState<'students' | 'faculty'>('students');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a CSV file'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      let res;
      if (tab === 'students') {
        res = await studentService.bulkUpload(file);
      } else {
        res = await governanceService.bulkUploadFaculty(file);
      }
      setResult(res);
      setSuccess(`Upload complete: ${res.success} created, ${res.failed} failed`);
    } catch (err: any) { setError(err.response?.data?.message || 'Upload failed'); }
    finally { setLoading(false); }
  };

  const downloadTemplate = () => {
    let csv = '';
    if (tab === 'students') {
      csv = 'fullName,email,yearOfAdmission,expectedPassingYear,currentAcademicYear\nJohn Doe,john@college.edu,2024,2029,FIRST_YEAR\nJane Smith,jane@college.edu,2024,2029,SECOND_YEAR';
    } else {
      csv = 'fullName,email,departmentCode,permissionSetName\nDr. John Smith,john.smith@college.edu,ANAT,Full Access\nDr. Jane Doe,jane.doe@college.edu,PHYSIO,Course Manager';
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${tab}_template.csv`; a.click();
  };

  const reset = () => { setFile(null); setResult(null); setError(null); setSuccess(null); };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  return (
    <CollegeLayout>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
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
              <div style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: 12 }}>Choose a CSV file to upload</div>
              <input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} style={inputStyle} />
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
