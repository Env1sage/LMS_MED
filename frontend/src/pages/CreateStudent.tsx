import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../services/student.service';
import '../styles/CollegeAdminNew.css';

const CreateStudent: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isBulkUpload, setIsBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResults, setBulkResults] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    yearOfAdmission: new Date().getFullYear(),
    expectedPassingYear: new Date().getFullYear() + 5,
    currentAcademicYear: 'YEAR_1',
    temporaryPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Year') ? parseInt(value) : value,
    }));
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, temporaryPassword: password }));
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await studentService.create(formData);
      setGeneratedPassword(result.temporaryPassword);
      alert(`Student created successfully!\n\nTemporary Password: ${result.temporaryPassword}\n\nPlease save this password and share it with the student securely.`);
      navigate('/college-admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) {
      setError('Please select a CSV file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the new bulk upload endpoint
      const result = await studentService.bulkUpload(bulkFile);
      
      setBulkResults({
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        createdStudents: result.createdStudents,
        emailsSent: result.emailsSent,
        emailsFailed: result.emailsFailed,
      });
      
      let message = `Bulk upload complete!\n\n✅ Created: ${result.success}\n❌ Failed: ${result.failed}`;
      if (result.emailsSent > 0) {
        message += `\n📧 Emails sent: ${result.emailsSent}`;
      }
      if (result.emailsFailed > 0) {
        message += `\n⚠️ Emails failed: ${result.emailsFailed}`;
      }
      alert(message);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process CSV file. Please check the format.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'fullName,email,yearOfAdmission,expectedPassingYear,currentAcademicYear\nJohn Doe,john@college.edu,2024,2029,FIRST_YEAR\nJane Smith,jane@college.edu,2024,2029,FIRST_YEAR';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_upload_template.csv';
    a.click();
  };

  return (
    <div className="modern-page-container">
      <div className="modern-page-inner">
        {/* Modern Header */}
        <div className="modern-header">
          <div className="modern-header-content">
            <div className="modern-icon-wrapper">
              <span className="modern-icon">{isBulkUpload ? '📄' : '👤'}</span>
            </div>
            <div className="modern-header-text">
              <h1>Create New Student{isBulkUpload ? 's' : ''}</h1>
              <p className="subtitle">
                {isBulkUpload ? 'Upload multiple students from CSV file' : 'Create student identity and login credentials'}
              </p>
            </div>
          </div>
          <div className="modern-header-actions">
            <button className="btn-modern btn-modern-secondary" onClick={() => navigate('/college-admin')}>
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Upload Mode Toggle */}
        <div className="modern-card">
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <button
              className={`btn-modern ${!isBulkUpload ? 'btn-modern-primary' : 'btn-modern-outline'}`}
              onClick={() => setIsBulkUpload(false)}
              style={{ flex: 1 }}
            >
              👤 Single Student
            </button>
            <button
              className={`btn-modern ${isBulkUpload ? 'btn-modern-primary' : 'btn-modern-outline'}`}
              onClick={() => setIsBulkUpload(true)}
              style={{ flex: 1 }}
            >
              📄 Bulk Upload
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="modern-alert modern-alert-error">
            <span>{error}</span>
            <button className="modern-alert-close" onClick={() => setError(null)}>×</button>
          </div>
        )}

        {success && (
          <div className="modern-alert modern-alert-success">
            <span>{success}</span>
            <button className="modern-alert-close" onClick={() => setSuccess(null)}>×</button>
          </div>
        )}

        {!isBulkUpload ? (
          // Single Student Form
          <form onSubmit={handleSubmit} className="modern-form">
            <div className="modern-card">
              <div className="modern-card-header">
                <h2 className="modern-card-title">📋 Basic Information</h2>
              </div>

              <div className="modern-form-row">
                <div className="modern-form-group">
                  <label className="modern-form-label">
                    Full Name <span className="required-indicator">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    className="modern-form-input"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Enter student's full name"
                  />
                </div>

                <div className="modern-form-group">
                  <label className="modern-form-label">
                    Email Address <span className="required-indicator">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="modern-form-input"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="student@college.edu"
                  />
                  <small className="modern-form-help">This will be used as the login username</small>
                </div>
              </div>
            </div>

            <div className="modern-card">
              <div className="modern-card-header">
                <h2 className="modern-card-title">🎓 Academic Information</h2>
              </div>

              <div className="modern-form-row">
                <div className="modern-form-group">
                  <label className="modern-form-label">
                    Year of Admission <span className="required-indicator">*</span>
                  </label>
                  <input
                    type="number"
                    name="yearOfAdmission"
                    className="modern-form-input"
                    value={formData.yearOfAdmission}
                    onChange={handleChange}
                    required
                    min="2000"
                    max="2100"
                  />
                </div>

                <div className="modern-form-group">
                  <label className="modern-form-label">
                    Expected Passing Year <span className="required-indicator">*</span>
                  </label>
                  <input
                    type="number"
                    name="expectedPassingYear"
                    className="modern-form-input"
                    value={formData.expectedPassingYear}
                    onChange={handleChange}
                    required
                    min="2000"
                    max="2100"
                  />
                </div>
              </div>

              <div className="modern-form-group">
                <label className="modern-form-label">
                  Current Academic Year <span className="required-indicator">*</span>
                </label>
                <select
                  name="currentAcademicYear"
                  className="modern-form-select"
                  value={formData.currentAcademicYear}
                  onChange={handleChange}
                  required
                >
                  <option value="YEAR_1">Year 1</option>
                  <option value="YEAR_2">Year 2</option>
                  <option value="YEAR_3_MINOR">Year 3 Minor</option>
                  <option value="YEAR_3_MAJOR">Year 3 Major</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>
            </div>

            <div className="modern-card">
              <div className="modern-card-header">
                <h2 className="modern-card-title">🔐 Login Credentials</h2>
              </div>

              <div className="modern-form-group">
                <label className="modern-form-label">Temporary Password</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="temporaryPassword"
                    className="modern-form-input"
                    value={formData.temporaryPassword}
                    onChange={handleChange}
                    placeholder="Leave empty to auto-generate"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-modern btn-modern-outline"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                  <button
                    type="button"
                    className="btn-modern btn-modern-secondary"
                    onClick={generateRandomPassword}
                  >
                    🔄 Generate
                  </button>
                </div>
                <small className="modern-form-help">Leave empty to auto-generate a secure password</small>
              </div>
            </div>

            <div className="modern-form-actions">
              <button
                type="button"
                className="btn-modern btn-modern-secondary"
                onClick={() => navigate('/college-admin')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-modern btn-modern-primary"
                disabled={loading}
              >
                {loading ? '⏳ Creating...' : '✅ Create Student'}
              </button>
            </div>
          </form>
        ) : (
          // Bulk Upload Form
          <form onSubmit={handleBulkUpload} className="modern-form">
            <div className="modern-card">
              <div className="modern-card-header">
                <h2 className="modern-card-title">📥 Upload CSV File</h2>
              </div>

              <div className="modern-alert modern-alert-info">
                <div>
                  <strong>📋 CSV Format Required:</strong> fullName, email, yearOfAdmission, expectedPassingYear, currentAcademicYear
                  <br />
                  <button
                    type="button"
                    className="btn-modern btn-modern-outline"
                    onClick={downloadTemplate}
                    style={{ marginTop: '0.75rem' }}
                  >
                    📥 Download Template
                  </button>
                </div>
              </div>

              <div className="modern-form-group">
                <label className="modern-form-label">
                  Select CSV File <span className="required-indicator">*</span>
                </label>
                <input
                  type="file"
                  className="modern-form-input"
                  accept=".csv"
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                  required
                />
                {bulkFile && <small className="modern-form-help">✓ Selected: {bulkFile.name}</small>}
              </div>
            </div>

            {bulkResults && (
              <div className="modern-card">
                <div className="modern-card-header">
                  <h2 className="modern-card-title">📊 Upload Results</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', background: 'rgba(0, 168, 107, 0.1)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--medical-secondary)' }}>{bulkResults.success}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--medical-text-light)' }}>✅ Created</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--medical-accent)' }}>{bulkResults.failed}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--medical-text-light)' }}>❌ Failed</div>
                  </div>
                  {bulkResults.emailsSent > 0 && (
                    <div style={{ padding: '1rem', background: 'var(--medical-primary-light)', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--medical-primary)' }}>{bulkResults.emailsSent}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--medical-text-light)' }}>📧 Emails Sent</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="modern-form-actions">
              <button
                type="button"
                className="btn-modern btn-modern-secondary"
                onClick={() => navigate('/college-admin')}
              >
                Back to Dashboard
              </button>
              <button
                type="submit"
                className="btn-modern btn-modern-primary"
                disabled={loading || !bulkFile}
              >
                {loading ? '⏳ Uploading...' : '📤 Upload Students'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateStudent;
