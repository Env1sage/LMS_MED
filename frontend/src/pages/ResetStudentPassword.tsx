import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentService } from '../services/student.service';
import '../styles/CollegeAdminModern.css';

const ResetStudentPassword: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<{ fullName: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await studentService.getById(id);
      setStudentInfo({
        fullName: data.fullName,
        email: data.users.email,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load student');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await studentService.resetCredentials(id, newPassword);
      setSuccess(`Password reset successfully! New password: ${newPassword}`);
      setTimeout(() => navigate('/college-admin'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  if (loading && !studentInfo) {
    return (
      <div className="create-student-container">
        <div className="loading">Loading student details...</div>
      </div>
    );
  }

  return (
    <div className="create-student-container">
      <div className="create-student-header">
        <button className="btn-back" onClick={() => navigate('/college-admin')}>
          ← Back to Dashboard
        </button>
        <h1>Reset Student Password</h1>
        <p>Generate and set a new password for the student</p>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {studentInfo && (
        <div className="info-box" style={{ marginBottom: '20px' }}>
          <p><strong>Student:</strong> {studentInfo.fullName}</p>
          <p><strong>Email:</strong> {studentInfo.email}</p>
        </div>
      )}

      <form onSubmit={handleReset} className="create-student-form">
        <div className="form-section">
          <h3>New Password</h3>
          
          <div className="form-group">
            <label htmlFor="newPassword">Password *</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                id="newPassword"
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter new password (min 8 characters)"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={generatePassword}
                style={{ minWidth: '120px' }}
              >
                Generate
              </button>
            </div>
            <small>Password must be at least 8 characters long</small>
          </div>

          <div className="info-box" style={{ marginTop: '20px', background: '#fff3cd', borderLeft: '4px solid #ffc107' }}>
            <p><strong>⚠️ Important:</strong></p>
            <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li>Make sure to copy the password before submitting</li>
              <li>This password will be shown only once</li>
              <li>Share it securely with the student</li>
              <li>Student should change it after first login</li>
            </ul>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/college-admin')}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !newPassword}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResetStudentPassword;
