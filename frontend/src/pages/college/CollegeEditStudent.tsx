import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import CollegeLayout from '../../components/college/CollegeLayout';
import { ArrowLeft, Save } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACADEMIC_YEARS = [
  { value: 'YEAR_1', label: '1st Year' },
  { value: 'YEAR_2', label: '2nd Year' },
  { value: 'YEAR_3_MINOR', label: 'Year 3 (Part 1)' },
  { value: 'YEAR_3_MAJOR', label: 'Year 3 (Part 2)' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'FIRST_YEAR', label: '1st Year' },
  { value: 'SECOND_YEAR', label: '2nd Year' },
  { value: 'THIRD_YEAR', label: '3rd Year' },
  { value: 'FOURTH_YEAR', label: '4th Year' },
  { value: 'FIFTH_YEAR', label: '5th Year' },
];

const CollegeEditStudent: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    yearOfAdmission: new Date().getFullYear(),
    expectedPassingYear: new Date().getFullYear() + 5,
    currentAcademicYear: 'YEAR_1',
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const data = await studentService.getById(id);
        setForm({
          fullName: data.fullName,
          email: data.users?.email || '',
          yearOfAdmission: data.yearOfAdmission,
          expectedPassingYear: data.expectedPassingYear,
          currentAcademicYear: data.currentAcademicYear,
          status: data.status,
        });
      } catch (err: any) { setError(err.response?.data?.message || 'Failed to load student'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: (name === 'yearOfAdmission' || name === 'expectedPassingYear') ? parseInt(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true); setError(null);
    try {
      await studentService.update(id, {
        fullName: form.fullName,
        yearOfAdmission: form.yearOfAdmission,
        expectedPassingYear: form.expectedPassingYear,
        currentAcademicYear: form.currentAcademicYear,
        status: form.status,
      });
      setSuccess('Student updated successfully!');
      setTimeout(() => navigate('/college-admin/students'), 1500);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to update student'); }
    finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block' };

  if (loading) return (
    <CollegeLayout>
      <div className="page-loading-screen">
        <div className="loading-rings">
          <div className="loading-ring loading-ring-1"></div>
          <div className="loading-ring loading-ring-2"></div>
          <div className="loading-ring loading-ring-3"></div>
        </div>
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
        <div className="loading-title">Loading Student</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </CollegeLayout>
  );

  return (
    <CollegeLayout>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => navigate('/college-admin/students')} className="bo-btn bo-btn-outline" style={{ marginBottom: 12, padding: '6px 12px', fontSize: 12 }}>
            <ArrowLeft size={14} /> Back to Students
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Edit Student</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Update student information</p>
        </div>

        {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>{error}</span><button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}>×</button></div>}
        {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Basic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Full Name <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="text" name="fullName" value={form.fullName} onChange={handleChange} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={form.email} disabled style={{ ...inputStyle, background: '#F3F4F6', cursor: 'not-allowed' }} />
                <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Email cannot be changed</span>
              </div>
            </div>
          </div>

          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Academic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Year of Admission <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="number" name="yearOfAdmission" value={form.yearOfAdmission} onChange={handleChange} required min={2000} max={2100} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Expected Passing Year <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="number" name="expectedPassingYear" value={form.expectedPassingYear} onChange={handleChange} required min={2000} max={2100} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Academic Year <span style={{ color: '#EF4444' }}>*</span></label>
                <select name="currentAcademicYear" value={form.currentAcademicYear} onChange={handleChange} required style={inputStyle}>
                  {ACADEMIC_YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status <span style={{ color: '#EF4444' }}>*</span></label>
                <select name="status" value={form.status} onChange={handleChange} required style={inputStyle}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="GRADUATED">Graduated</option>
                  <option value="DROPPED_OUT">Dropped Out</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="bo-btn bo-btn-outline" onClick={() => navigate('/college-admin/students')}>Cancel</button>
            <button type="submit" className="bo-btn bo-btn-primary" style={{ background: '#059669' }} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving...' : 'Update Student'}
            </button>
          </div>
        </form>
      </div>
    </CollegeLayout>
  );
};

export default CollegeEditStudent;
