import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../services/student.service';
import '../styles/CreateStudent.css';

const CreateStudent: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    currentAcademicYear: 'FIRST_YEAR',
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
      const text = await bulkFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const results: any[] = [];
      
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const [fullName, email, yearOfAdmission, expectedPassingYear, currentAcademicYear] = lines[i].split(',');
        
        if (!fullName || !email) continue;

        try {
          const result = await studentService.create({
            fullName: fullName.trim(),
            email: email.trim(),
            yearOfAdmission: parseInt(yearOfAdmission.trim()) || new Date().getFullYear(),
            expectedPassingYear: parseInt(expectedPassingYear.trim()) || new Date().getFullYear() + 5,
            currentAcademicYear: currentAcademicYear?.trim() || 'FIRST_YEAR',
            temporaryPassword: '', // Auto-generate
          });
          results.push({ success: true, email: email.trim(), password: result.temporaryPassword });
        } catch (err: any) {
          results.push({ success: false, email: email.trim(), error: err.response?.data?.message });
        }
      }

      setBulkResults(results);
      alert(`Bulk upload complete!\n\nSuccessful: ${results.filter(r => r.success).length}\nFailed: ${results.filter(r => !r.success).length}`);
    } catch (err: any) {
      setError('Failed to process CSV file. Please check the format.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'Full Name,Email,Year of Admission,Expected Passing Year,Current Academic Year\nJohn Doe,john@college.edu,2024,2029,FIRST_YEAR\nJane Smith,jane@college.edu,2024,2029,FIRST_YEAR';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_upload_template.csv';
    a.click();
  };

  return (
    <div className="create-student-container">
      <div className="create-student-header">
        <button className="btn-back" onClick={() => navigate('/college-admin')}>
          ← Back to Dashboard
        </button>
        <h1>Create New Student{isBulkUpload ? 's' : ''}</h1>
        <p>{isBulkUpload ? 'Upload multiple students from CSV file' : 'Create student identity and login credentials'}</p>
      </div>

      <div className="upload-mode-toggle">
        <button
          className={`toggle-btn ${!isBulkUpload ? 'active' : ''}`}
          onClick={() => setIsBulkUpload(false)}
        >
          👤 Single Student
        </button>
        <button
          className={`toggle-btn ${isBulkUpload ? 'active' : ''}`}
          onClick={() => setIsBulkUpload(true)}
        >
          📄 Bulk Upload
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {!isBulkUpload ? (
        <>
          <div className="info-box">
            <strong>⚠️ Important:</strong> This creates a student login account. No self-signup is allowed.
            The student will receive a temporary password that must be changed on first login.
          </div>

          <form onSubmit={handleSubmit} className="create-student-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="fullName">Full Name *</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Enter student's full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="student@college.edu"
            />
            <small>This will be used as the student's login username</small>
          </div>
        </div>

        <div className="form-section">
          <h3>Academic Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="yearOfAdmission">Year of Admission *</label>
              <input
                type="number"
                id="yearOfAdmission"
                name="yearOfAdmission"
                value={formData.yearOfAdmission}
                onChange={handleChange}
                required
                min="2000"
                max="2100"
              />
            </div>

            <div className="form-group">
              <label htmlFor="expectedPassingYear">Expected Passing Year *</label>
              <input
                type="number"
                id="expectedPassingYear"
                name="expectedPassingYear"
                value={formData.expectedPassingYear}
                onChange={handleChange}
                required
                min="2000"
                max="2100"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="currentAcademicYear">Current Academic Year *</label>
            <select
              id="currentAcademicYear"
              name="currentAcademicYear"
              value={formData.currentAcademicYear}
              onChange={handleChange}
              required
            >
              <option value="FIRST_YEAR">1st Year</option>
              <option value="SECOND_YEAR">2nd Year</option>
              <option value="THIRD_YEAR">3rd Year</option>
              <option value="FOURTH_YEAR">4th Year</option>
              <option value="FIFTH_YEAR">5th Year</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>Login Credentials</h3>
          
          <div className="form-group">
            <label htmlFor="temporaryPassword">Temporary Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="temporaryPassword"
                name="temporaryPassword"
                value={formData.temporaryPassword}
                onChange={handleChange}
                placeholder="Leave empty to auto-generate"
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <small>Leave empty to auto-generate a secure password</small>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={generateRandomPassword}
          >
            🔄 Generate Random Password
          </button>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/college-admin')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Student'}
          </button>
        </div>
      </form>
      </>
      ) : (
        <form onSubmit={handleBulkUpload} className="bulk-upload-form">
          <div className="info-box">
            <strong>📋 CSV Format:</strong> Upload a CSV file with columns: Full Name, Email, Year of Admission, Expected Passing Year, Current Academic Year
            <br />
            <button type="button" className="btn-link" onClick={downloadTemplate}>
              📥 Download Template
            </button>
          </div>

          <div className="form-section">
            <h3>Upload CSV File</h3>
            <div className="form-group">
              <label htmlFor="csvFile">Select CSV File *</label>
              <input
                type="file"
                id="csvFile"
                accept=".csv"
                onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                required
              />
              {bulkFile && <small>Selected: {bulkFile.name}</small>}
            </div>
          </div>

          {bulkResults && (
            <div className="bulk-results">
              <h3>Upload Results</h3>
              <div className="results-summary">
                <div className="result-stat success">
                  ✅ Successful: {bulkResults.filter((r: any) => r.success).length}
                </div>
                <div className="result-stat error">
                  ❌ Failed: {bulkResults.filter((r: any) => !r.success).length}
                </div>
              </div>
              <div className="results-table">
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Password / Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((result: any, idx: number) => (
                      <tr key={idx} className={result.success ? 'success' : 'error'}>
                        <td>{result.email}</td>
                        <td>{result.success ? '✅ Success' : '❌ Failed'}</td>
                        <td>{result.success ? result.password : result.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/college-admin')}
            >
              Back to Dashboard
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !bulkFile}>
              {loading ? 'Uploading...' : 'Upload Students'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateStudent;
