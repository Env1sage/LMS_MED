import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../services/student.service';
import '../styles/CollegeAdminDashboard.css';

interface Student {
  id: string;
  fullName: string;
  yearOfAdmission: number;
  expectedPassingYear: number;
  currentAcademicYear: string;
  status: string;
  users: {
    email: string;
    status: string;
    lastLoginAt: string | null;
  };
}

interface Stats {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byYear: Array<{ year: string; count: number }>;
}

const CollegeAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'actions'>('overview');
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [statusFilter, yearFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (yearFilter) params.currentAcademicYear = yearFilter;
      if (searchTerm) params.search = searchTerm;

      const [studentsData, statsData] = await Promise.all([
        studentService.getAll(params),
        studentService.getStats(),
      ]);

      setStudents(studentsData.data || []);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const handleSelectStudent = (id: string) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter(sid => sid !== id));
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  const handleActivateStudent = async (id: string) => {
    try {
      await studentService.activate(id);
      setSuccess('Student activated successfully');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to activate student');
    }
  };

  const handleDeactivateStudent = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this student? This will immediately revoke access.')) {
      return;
    }
    try {
      await studentService.deactivate(id);
      setSuccess('Student deactivated successfully');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate student');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: any = {
      ACTIVE: 'success',
      INACTIVE: 'warning',
      GRADUATED: 'info',
      DROPPED_OUT: 'danger',
    };
    return statusColors[status] || 'secondary';
  };

  const formatAcademicYear = (year: string) => {
    const yearMap: any = {
      FIRST_YEAR: '1st Year',
      SECOND_YEAR: '2nd Year',
      THIRD_YEAR: '3rd Year',
      FOURTH_YEAR: '4th Year',
      FIFTH_YEAR: '5th Year',
      INTERNSHIP: 'Internship',
    };
    return yearMap[year] || year;
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-inner">
          <div className="loading">Loading College Admin Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-inner">
        <div className="dashboard-header">
          <div>
            <h1>College Admin Dashboard</h1>
            <p>Manage Student Identities & Access Control</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/college-admin/create-student')}
            >
              + Create Student
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
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
            <button onClick={() => setSuccess(null)}>×</button>
          </div>
        )}

        <div className="dashboard-tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            Students
          </button>
          <button
            className={`tab ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            Bulk Actions
          </button>
        </div>

        <div className="dashboard-content">
        {activeTab === 'overview' && stats && (
          <div className="overview-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <h3>{stats.total}</h3>
                  <p>Total Students</p>
                </div>
              </div>

              {stats.byStatus.map((item) => (
                <div className="stat-card" key={item.status}>
                  <div className={`stat-badge badge-${getStatusBadge(item.status)}`}>
                    {item.status}
                  </div>
                  <div className="stat-content">
                    <h3>{item.count}</h3>
                    <p>{item.status} Students</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="year-distribution">
              <h3>Distribution by Academic Year</h3>
              <div className="year-grid">
                {stats.byYear.map((item) => (
                  <div className="year-card" key={item.year}>
                    <div className="year-title">{formatAcademicYear(item.year)}</div>
                    <div className="year-count">{item.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="students-section">
            <div className="filters">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loadData()}
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="GRADUATED">Graduated</option>
                <option value="DROPPED_OUT">Dropped Out</option>
              </select>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                <option value="">All Years</option>
                <option value="FIRST_YEAR">1st Year</option>
                <option value="SECOND_YEAR">2nd Year</option>
                <option value="THIRD_YEAR">3rd Year</option>
                <option value="FOURTH_YEAR">4th Year</option>
                <option value="FIFTH_YEAR">5th Year</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
              <button className="btn btn-secondary" onClick={loadData}>
                Search
              </button>
            </div>

            {students && students.length > 0 ? (
              <table className="students-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === students.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Academic Year</th>
                    <th>Admission Year</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleSelectStudent(student.id)}
                        />
                      </td>
                      <td>{student.fullName}</td>
                      <td>{student.users.email}</td>
                      <td>{formatAcademicYear(student.currentAcademicYear)}</td>
                      <td>{student.yearOfAdmission}</td>
                      <td>
                        <span className={`badge badge-${getStatusBadge(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td>
                        {student.users.lastLoginAt
                          ? new Date(student.users.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/college-admin/edit-student/${student.id}`)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        {student.status === 'INACTIVE' ? (
                          <button
                            className="btn-icon"
                            onClick={() => handleActivateStudent(student.id)}
                            title="Activate"
                          >
                            ✅
                          </button>
                        ) : (
                          <button
                            className="btn-icon"
                            onClick={() => handleDeactivateStudent(student.id)}
                            title="Deactivate"
                          >
                            ⛔
                          </button>
                        )}
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/college-admin/reset-password/${student.id}`)}
                          title="Reset Password"
                        >
                          🔑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No students found</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/college-admin/create-student')}
                >
                  Create First Student
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="actions-section">
            <div className="bulk-actions-card">
              <h3>Bulk Actions</h3>
              <p>Select students from the Students tab to perform bulk operations</p>
              <div className="selected-count">
                <strong>{selectedStudents.length}</strong> student(s) selected
              </div>
              {selectedStudents.length > 0 && (
                <div className="bulk-buttons">
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/college-admin/bulk-promote', { state: { selectedStudents } })}
                  >
                    Promote Selected Students
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default CollegeAdminDashboard;
