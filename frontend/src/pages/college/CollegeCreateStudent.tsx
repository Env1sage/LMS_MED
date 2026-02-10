import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import CollegeLayout from '../../components/college/CollegeLayout';
import { UserPlus, ArrowLeft, Eye, EyeOff, RefreshCw, Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import '../../styles/bitflow-owner.css';

const ACADEMIC_YEARS = [
  { value: 'YEAR_1', label: '1st Year' },
  { value: 'YEAR_2', label: '2nd Year' },
  { value: 'YEAR_3_MINOR', label: 'Year 3 (Part 1)' },
  { value: 'YEAR_3_MAJOR', label: 'Year 3 (Part 2)' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const CollegeCreateStudent: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResults, setBulkResults] = useState<any>(null);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    yearOfAdmission: new Date().getFullYear(),
    expectedPassingYear: new Date().getFullYear() + 5,
    currentAcademicYear: 'YEAR_1',
    temporaryPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name.includes('Year') && name !== 'currentAcademicYear' ? parseInt(value) : value }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm(prev => ({ ...prev, temporaryPassword: pw }));
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const result = await studentService.create(form);
      setSuccess(`Student created! Temp password: ${result.temporaryPassword || form.temporaryPassword}`);
      setTimeout(() => navigate('/college-admin/students'), 2000);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create student'); }
    finally { setLoading(false); }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) { setError('Please select a CSV file'); return; }
    setLoading(true); setError(null);
    try {
      const result = await studentService.bulkUpload(bulkFile);
      setBulkResults(result);
      setSuccess(`Bulk upload: ${result.success} created, ${result.failed} failed`);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to upload'); }
    finally { setLoading(false); }
  };

  const downloadTemplate = () => {
    const csv = 'fullName,email,yearOfAdmission,expectedPassingYear,currentAcademicYear\nJohn Doe,john@college.edu,2024,2029,FIRST_YEAR';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'student_template.csv'; a.click();
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block' };

  return (
    <CollegeLayout>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => navigate('/college-admin/students')} className="bo-btn bo-btn-outline" style={{ marginBottom: 12, padding: '6px 12px', fontSize: 12 }}>
            <ArrowLeft size={14} /> Back to Students
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text-primary)' }}>Add New Student</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Create student identity and login credentials</p>
        </div>

        {/* Mode Toggle */}
        <div className="bo-card" style={{ padding: 4, marginBottom: 16, display: 'flex', gap: 4 }}>
          <button onClick={() => setIsBulk(false)} style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: !isBulk ? '#059669' : 'transparent', color: !isBulk ? 'white' : 'var(--bo-text-secondary)' }}>
            <UserPlus size={14} style={{ marginRight: 6 }} /> Single Student
          </button>
          <button onClick={() => setIsBulk(true)} style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: isBulk ? '#059669' : 'transparent', color: isBulk ? 'white' : 'var(--bo-text-secondary)' }}>
            <Upload size={14} style={{ marginRight: 6 }} /> Bulk Upload
          </button>
        </div>

        {/* Alerts */}
        {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span><button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}>×</button>
        </div>}
        {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

        {!isBulk ? (
          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--bo-text-primary)' }}>Basic Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input type="text" name="fullName" value={form.fullName} onChange={handleChange} required placeholder="Student full name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email Address <span style={{ color: '#EF4444' }}>*</span></label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="student@college.edu" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--bo-text-primary)' }}>Academic Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Year of Admission <span style={{ color: '#EF4444' }}>*</span></label>
                  <input type="number" name="yearOfAdmission" value={form.yearOfAdmission} onChange={handleChange} required min={2000} max={2100} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Expected Passing Year <span style={{ color: '#EF4444' }}>*</span></label>
                  <input type="number" name="expectedPassingYear" value={form.expectedPassingYear} onChange={handleChange} required min={2000} max={2100} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Academic Year <span style={{ color: '#EF4444' }}>*</span></label>
                  <select name="currentAcademicYear" value={form.currentAcademicYear} onChange={handleChange} required style={inputStyle}>
                    {ACADEMIC_YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Credentials */}
            <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--bo-text-primary)' }}>Login Credentials</h3>
              <div>
                <label style={labelStyle}>Temporary Password</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} name="temporaryPassword" value={form.temporaryPassword} onChange={handleChange} placeholder="Leave empty to auto-generate" style={inputStyle} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button type="button" onClick={generatePassword} className="bo-btn bo-btn-outline" style={{ padding: '8px 14px', fontSize: 12 }}>
                    <RefreshCw size={14} /> Generate
                  </button>
                </div>
                <span style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 4, display: 'block' }}>Leave empty to auto-generate a secure password</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="bo-btn bo-btn-outline" onClick={() => navigate('/college-admin/students')}>Cancel</button>
              <button type="submit" className="bo-btn bo-btn-primary" style={{ background: '#059669' }} disabled={loading}>
                {loading ? 'Creating...' : 'Create Student'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBulkUpload}>
            <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--bo-text-primary)' }}>Upload CSV File</h3>
              <div style={{ padding: 12, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: 16, fontSize: 12, color: '#1D4ED8' }}>
                <strong>Required columns:</strong> fullName, email, yearOfAdmission, expectedPassingYear, currentAcademicYear
              </div>
              <button type="button" className="bo-btn bo-btn-outline" onClick={downloadTemplate} style={{ marginBottom: 16, width: '100%' }}>
                <Download size={14} /> Download CSV Template
              </button>
              <div>
                <label style={labelStyle}>Select CSV File <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="file" accept=".csv" onChange={e => setBulkFile(e.target.files?.[0] || null)} style={inputStyle} required />
                {bulkFile && <span style={{ fontSize: 11, color: '#059669', marginTop: 4, display: 'block' }}>✓ {bulkFile.name}</span>}
              </div>
            </div>

            {bulkResults && (
              <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Upload Results</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: '#ECFDF5', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{bulkResults.success}</div>
                    <div style={{ fontSize: 11, color: '#059669' }}>Created</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 8, background: '#FEF2F2', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626' }}>{bulkResults.failed}</div>
                    <div style={{ fontSize: 11, color: '#DC2626' }}>Failed</div>
                  </div>
                </div>
                {bulkResults.errors?.length > 0 && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#FEF2F2', fontSize: 12, color: '#DC2626' }}>
                    {bulkResults.errors.slice(0, 5).map((e: any, i: number) => <div key={i}>Row {e.row}: {e.error}</div>)}
                    {bulkResults.errors.length > 5 && <div>...and {bulkResults.errors.length - 5} more</div>}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="bo-btn bo-btn-outline" onClick={() => navigate('/college-admin/students')}>Cancel</button>
              <button type="submit" className="bo-btn bo-btn-primary" style={{ background: '#059669' }} disabled={loading || !bulkFile}>
                {loading ? 'Uploading...' : 'Upload Students'}
              </button>
            </div>
          </form>
        )}
      </div>
    </CollegeLayout>
  );
};

export default CollegeCreateStudent;
