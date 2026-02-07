import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentService } from '../services/student.service';
import '../styles/CollegeAdminNew.css';

const EditStudent: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    yearOfAdmission: new Date().getFullYear(),
    expectedPassingYear: new Date().getFullYear() + 5,
    currentAcademicYear: 'FIRST_YEAR',
    status: 'ACTIVE',
  });

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await studentService.getById(id);
      setFormData({
        fullName: data.fullName,
        email: data.users.email,
        yearOfAdmission: data.yearOfAdmission,
        expectedPassingYear: data.expectedPassingYear,
        currentAcademicYear: data.currentAcademicYear,
        status: data.status,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load student');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Year') ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      await studentService.update(id, {
        fullName: formData.fullName,
        yearOfAdmission: formData.yearOfAdmission,
        expectedPassingYear: formData.expectedPassingYear,
        currentAcademicYear: formData.currentAcademicYear,
        status: formData.status,
      });
      setSuccess('Student updated successfully!');
      setTimeout(() => navigate('/college-admin'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.fullName) {
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
        <h1>Edit Student</h1>
        <p>Update student information and status</p>
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
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              disabled
              style={{ background: '#f0f0f0', cursor: 'not-allowed' }}
            />
            <small>Email cannot be changed</small>
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

          <div className="form-group">
            <label htmlFor="status">Student Status *</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="GRADUATED">Graduated</option>
              <option value="DROPPED_OUT">Dropped Out</option>
            </select>
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
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Student'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditStudent;
