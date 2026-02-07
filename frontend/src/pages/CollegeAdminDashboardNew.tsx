import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../services/student.service';
import governanceService from '../services/governance.service';
import { courseAnalyticsService, CourseAnalyticsOverview } from '../services/course-analytics.service';
import { useAuth } from '../context/AuthContext';
import '../styles/CollegeAdminNew.css';

interface Student {
  id: string;
  fullName: string;
  yearOfAdmission: number;
  expectedPassingYear: number;
  currentAcademicYear: string;
  status: string;
  users?: {
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

interface Department {
  id: string;
  name: string;
  code: string;
  hodUserId?: string;
  _count?: { students: number; faculty_assignments: number };
}

interface FacultyUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  collegeId?: string;
  lastLoginAt?: string;
  createdAt: string;
}

const CollegeAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'faculty' | 'departments' | 'assessments' | 'teacher-analytics' | 'student-analytics' | 'bulk-upload' | 'course-analytics' | 'actions'>('overview');
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<FacultyUser[]>([]);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyUser | null>(null);
  const [showFacultyProfile, setShowFacultyProfile] = useState(false);
  const [showStudentListModal, setShowStudentListModal] = useState(false);
  const [modalListType, setModalListType] = useState<'top-performers' | 'need-attention' | 'overall' | 'avg-score'>('top-performers');
  const [showBulkPromoteModal, setShowBulkPromoteModal] = useState(false);
  const [promoteToYear, setPromoteToYear] = useState('YEAR_2');
  
  // Performance analytics state
  const [performanceData, setPerformanceData] = useState<{
    summary: { totalStudents: number; activeStudents: number; overallAvgScore: number; topPerformersCount: number; needAttentionCount: number };
    topPerformers: Array<{ id: string; name: string; year: string; department: string; score: number }>;
    needAttention: Array<{ id: string; name: string; year: string; department: string; score: number }>;
    yearWiseStats: Array<{ year: string; count: number; avgScore: number; topPerformersCount: number; needAttentionCount: number }>;
    allStudents: Array<{ id: string; name: string; year: string; department: string; score: number }>;
  } | null>(null);

  const formatAcademicYear = (year: string) => {
    const yearMap: any = {
      FIRST_YEAR: '1st Year',
      SECOND_YEAR: '2nd Year',
      THIRD_YEAR: '3rd Year',
      FOURTH_YEAR: '4th Year',
      FIFTH_YEAR: '5th Year',
      INTERNSHIP: 'Internship',
      YEAR_1: 'Year 1',
      YEAR_2: 'Year 2',
      YEAR_3_MINOR: 'Year 3 Minor',
      YEAR_3_MAJOR: 'Year 3 Major',
    };
    return yearMap[year] || year;
  };

  // Use real performance data or fallback to calculated values from students
  const topPerformers = performanceData?.topPerformers || [];
  const needAttentionStudents = performanceData?.needAttention || [];
  
  const overallProgressStudents = performanceData?.allStudents.slice(0, 10) || students.slice(0, 10).map((s, idx) => ({
    id: s.id,
    name: s.fullName,
    year: formatAcademicYear(s.currentAcademicYear),
    score: 0,
    department: 'General'
  }));

  const avgScoreStudents = performanceData?.allStudents.slice(0, 10) || students.slice(0, 10).map((s, idx) => ({
    id: s.id,
    name: s.fullName,
    year: formatAcademicYear(s.currentAcademicYear),
    score: 0,
    department: 'General'
  }));

  const handleCardClick = (type: 'top-performers' | 'need-attention' | 'overall' | 'avg-score') => {
    setModalListType(type);
    setShowStudentListModal(true);
  };

  const getModalTitle = () => {
    switch (modalListType) {
      case 'top-performers':
        return 'Top Performers (Above 90%)';
      case 'need-attention':
        return 'Students Need Attention (Below 60%)';
      case 'overall':
        return 'Overall Progress';
      case 'avg-score':
        return 'Average Score Students';
      default:
        return 'Students';
    }
  };

  const getModalStudents = () => {
    switch (modalListType) {
      case 'top-performers':
        return topPerformers;
      case 'need-attention':
        return needAttentionStudents;
      case 'overall':
        return overallProgressStudents;
      case 'avg-score':
        return avgScoreStudents;
      default:
        return [];
    }
  };

  useEffect(() => {
    loadData();
    loadDepartments();
    loadFacultyUsers();
    loadCourseAnalytics();
  }, [statusFilter, yearFilter]);

  const loadCourseAnalytics = async () => {
    try {
      if (user?.collegeId) {
        const analyticsData = await courseAnalyticsService.getCourseAnalyticsOverview(user.collegeId);
        setCourseAnalytics(analyticsData);
      }
    } catch (err) {
      console.error('Error loading course analytics:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await governanceService.getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const loadFacultyUsers = async () => {
    try {
      const data = await governanceService.getFacultyUsers();
      setFacultyUsers(data);
    } catch (err) {
      console.error('Error loading faculty:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (yearFilter) params.currentAcademicYear = yearFilter;
      if (searchTerm) params.search = searchTerm;

      const [studentsData, statsData, performanceAnalytics] = await Promise.all([
        studentService.getAll(params),
        studentService.getStats(),
        studentService.getPerformanceAnalytics(),
      ]);

      setStudents(studentsData.data || []);
      setStats(statsData);
      setPerformanceData(performanceAnalytics);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
    if (!window.confirm('Are you sure you want to deactivate this student?')) return;
    try {
      await studentService.deactivate(id);
      setSuccess('Student deactivated successfully');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate student');
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete student "${name}"? This cannot be undone!`)) return;
    try {
      await studentService.delete(id);
      setSuccess('Student deleted successfully');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete student');
    }
  };

  const handleBulkPromote = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select students to promote');
      return;
    }
    
    if (!window.confirm(`Promote ${selectedStudents.length} student(s) to ${promoteToYear}?`)) {
      return;
    }

    try {
      setLoading(true);
      await studentService.bulkPromote({
        studentIds: selectedStudents,
        newAcademicYear: promoteToYear,
      });
      setSuccess(`Successfully promoted ${selectedStudents.length} student(s)`);
      setSelectedStudents([]);
      setShowBulkPromoteModal(false);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to promote students');
    } finally {
      setLoading(false);
    }
  };

  const downloadStudentTemplate = () => {
    const csv = 'fullName,email,yearOfAdmission,expectedPassingYear,currentAcademicYear\nJohn Doe,john@college.edu,2024,2029,YEAR_1\nJane Smith,jane@college.edu,2024,2029,YEAR_1';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTeacherTemplate = () => {
    const csv = 'fullName,email,departmentId\nDr. John Smith,john.smith@college.edu,dept-id-here\nDr. Jane Doe,jane.doe@college.edu,dept-id-here';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teacher_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDepartmentTemplate = () => {
    const csv = 'name,code,description\nCardiology,CARD,Department of Cardiology\nNeurology,NEUR,Department of Neurology';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'department_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };


  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-inner">
          <div className="loading"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-inner">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-title">
            <div className="medical-icon-wrapper">
              ⚕️
            </div>
            <div className="header-text">
              <h1>College Administration</h1>
              <p className="subtitle">Medical Education Management Portal</p>
            </div>
          </div>
          <div className="header-actions">
            {activeTab === 'students' && (
              <button className="btn btn-primary" onClick={() => navigate('/college-admin/create-student')}>
                + Add Student
              </button>
            )}
            {activeTab === 'faculty' && (
              <button className="btn btn-primary" onClick={() => navigate('/college-admin/faculty')}>
                + Add Faculty
              </button>
            )}
            {activeTab === 'departments' && (
              <button className="btn btn-primary" onClick={() => navigate('/college-admin/departments')}>
                + Add Department
              </button>
            )}
            <button className="btn btn-outline" onClick={() => navigate('/college-admin/profile')}>
              👤 Profile
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Alerts */}
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

        {/* Tabs */}
        <div className="dashboard-tabs">
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            📊 Overview
          </button>
          <button className={`tab ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
            👨‍🎓 Students
          </button>
          <button className={`tab ${activeTab === 'faculty' ? 'active' : ''}`} onClick={() => setActiveTab('faculty')}>
            👨‍🏫 Faculty
          </button>
          <button className={`tab ${activeTab === 'departments' ? 'active' : ''}`} onClick={() => setActiveTab('departments')}>
            🏛️ Departments
          </button>
          <button className={`tab ${activeTab === 'course-analytics' ? 'active' : ''}`} onClick={() => setActiveTab('course-analytics')}>
            📚 Course Analytics
          </button>
          <button className={`tab ${activeTab === 'assessments' ? 'active' : ''}`} onClick={() => setActiveTab('assessments')}>
            📝 Assessments
          </button>
          <button className={`tab ${activeTab === 'teacher-analytics' ? 'active' : ''}`} onClick={() => setActiveTab('teacher-analytics')}>
            📈 Teacher Analytics
          </button>
          <button className={`tab ${activeTab === 'student-analytics' ? 'active' : ''}`} onClick={() => setActiveTab('student-analytics')}>
            📊 Student Analytics
          </button>
          <button className={`tab ${activeTab === 'bulk-upload' ? 'active' : ''}`} onClick={() => setActiveTab('bulk-upload')}>
            📤 Bulk Upload
          </button>
          <button className={`tab ${activeTab === 'actions' ? 'active' : ''}`} onClick={() => setActiveTab('actions')}>
            ⚡ Actions
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            <div className="stats-grid">
              <div className="stat-card primary">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Total Students</h4>
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-change positive">↑ 12% from last month</div>
                  </div>
                  <div className="stat-icon">👨‍🎓</div>
                </div>
              </div>

              <div className="stat-card success">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Active Students</h4>
                    <div className="stat-value">
                      {stats.byStatus.find(s => s.status === 'ACTIVE')?.count || 0}
                    </div>
                    <div className="stat-change positive">↑ 5% this week</div>
                  </div>
                  <div className="stat-icon">✅</div>
                </div>
              </div>

              <div className="stat-card info">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Faculty Members</h4>
                    <div className="stat-value">{facultyUsers.length}</div>
                    <div className="stat-change positive">↑ 3 new this month</div>
                  </div>
                  <div className="stat-icon">👨‍🏫</div>
                </div>
              </div>

              <div className="stat-card warning">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Departments</h4>
                    <div className="stat-value">{departments.length}</div>
                    <div className="stat-label">Active departments</div>
                  </div>
                  <div className="stat-icon">🏛️</div>
                </div>
              </div>
            </div>

            {/* Year Distribution */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <span className="icon">📚</span>
                  Student Distribution by Year
                </h3>
              </div>
              <div className="analytics-grid">
                {stats.byYear.map(({ year, count }) => (
                  <div key={year} className="analytics-card">
                    <h4>{formatAcademicYear(year)}</h4>
                    <div className="stat-value">{count}</div>
                    <div className="stat-label">Students</div>
                    <div className="progress-bar-container mt-2">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill success" 
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Distribution */}
            <div className="card mt-3">
              <div className="card-header">
                <h3 className="card-title">
                  <span className="icon">📊</span>
                  Student Status Overview
                </h3>
              </div>
              <div className="analytics-grid">
                {stats.byStatus.map(({ status, count }) => {
                  const statusConfig: any = {
                    ACTIVE: { icon: '✅', color: 'success', label: 'Active' },
                    INACTIVE: { icon: '⏸️', color: 'warning', label: 'Inactive' },
                    GRADUATED: { icon: '🎓', color: 'info', label: 'Graduated' },
                    DROPPED_OUT: { icon: '❌', color: 'danger', label: 'Dropped Out' },
                  };
                  const config = statusConfig[status] || { icon: '📌', color: 'secondary', label: status };
                  
                  return (
                    <div key={status} className="analytics-card">
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{config.icon}</div>
                      <h4>{config.label}</h4>
                      <div className="stat-value">{count}</div>
                      <div className="progress-bar-container mt-2">
                        <div className="progress-bar">
                          <div 
                            className={`progress-fill ${config.color}`}
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="table-container">
            <div className="table-header">
              <h3 className="table-title">Student Management</h3>
              <div className="table-filters">
                <div className="filter-group">
                  <label>Search</label>
                  <input
                    type="text"
                    className="search-box"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyUp={() => loadData()}
                  />
                </div>
                <div className="filter-group">
                  <label>Status</label>
                  <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="GRADUATED">Graduated</option>
                    <option value="DROPPED_OUT">Dropped Out</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Year</label>
                  <select
                    className="filter-select"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                  >
                    <option value="">All Years</option>
                    <option value="YEAR_1">Year 1</option>
                    <option value="YEAR_2">Year 2</option>
                    <option value="YEAR_3_MINOR">Year 3 Minor</option>
                    <option value="YEAR_3_MAJOR">Year 3 Major</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedStudents.length > 0 && (
              <div style={{ 
                padding: '1rem 1.5rem', 
                background: 'var(--primary-light)', 
                border: '1px solid var(--primary-color)', 
                borderRadius: '8px',
                margin: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                    {selectedStudents.length} student(s) selected
                  </span>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => setSelectedStudents([])}
                    style={{ fontSize: '0.875rem' }}
                  >
                    Clear Selection
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowBulkPromoteModal(true)}
                  >
                    🎓 Promote Selected
                  </button>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => setActiveTab('actions')}
                  >
                    ⚡ More Actions
                  </button>
                </div>
              </div>
            )}

            {students.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍🎓</div>
                <h3 className="empty-state-title">No Students Found</h3>
                <p className="empty-state-text">Start by adding your first student</p>
                <button className="btn btn-primary mt-3" onClick={() => navigate('/college-admin/create-student')}>
                  + Add Student
                </button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === students.length}
                        onChange={() => {
                          if (selectedStudents.length === students.length) {
                            setSelectedStudents([]);
                          } else {
                            setSelectedStudents(students.map(s => s.id));
                          }
                        }}
                      />
                    </th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Year</th>
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
                      <td style={{ fontWeight: 600 }}>{student.fullName}</td>
                      <td>{student.users?.email || 'N/A'}</td>
                      <td>{formatAcademicYear(student.currentAcademicYear)}</td>
                      <td>
                        <span className={`badge badge-${student.status === 'ACTIVE' ? 'success' : student.status === 'INACTIVE' ? 'warning' : student.status === 'GRADUATED' ? 'info' : 'danger'}`}>
                          {student.status}
                        </span>
                      </td>
                      <td>{student.users?.lastLoginAt ? new Date(student.users.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => navigate(`/college-admin/students/${student.id}`)}>
                            Edit
                          </button>
                          {student.status === 'ACTIVE' ? (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleDeactivateStudent(student.id)}>
                              Deactivate
                            </button>
                          ) : (
                            <button className="btn btn-sm btn-success" onClick={() => handleActivateStudent(student.id)}>
                              Activate
                            </button>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteStudent(student.id, student.fullName)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Faculty Tab */}
        {activeTab === 'faculty' && (
          <div>
            <div className="card-header mb-3">
              <h3 className="card-title">
                <span className="icon">👨‍🏫</span>
                Faculty Directory
              </h3>
            </div>
            {facultyUsers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍🏫</div>
                <h3 className="empty-state-title">No Faculty Members</h3>
                <p className="empty-state-text">Add faculty members to get started</p>
                <button className="btn btn-primary mt-3" onClick={() => navigate('/college-admin/faculty')}>
                  + Add Faculty
                </button>
              </div>
            ) : (
              <div className="faculty-grid">
                {facultyUsers.map((faculty) => (
                  <div 
                    key={faculty.id} 
                    className="faculty-card"
                    onClick={() => {
                      setSelectedFaculty(faculty);
                      setShowFacultyProfile(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="faculty-avatar">
                      {faculty.fullName.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="faculty-name">{faculty.fullName}</h3>
                    <p className="faculty-email">{faculty.email}</p>
                    <span className={`badge badge-${faculty.status === 'ACTIVE' ? 'success' : 'warning'}`}>
                      {faculty.status}
                    </span>
                    <div className="faculty-meta">
                      <div className="faculty-meta-item">
                        <div className="faculty-meta-label">Role</div>
                        <div className="faculty-meta-value">{faculty.role}</div>
                      </div>
                      <div className="faculty-meta-item">
                        <div className="faculty-meta-label">Joined</div>
                        <div className="faculty-meta-value">
                          {new Date(faculty.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div>
            <div className="card-header mb-3">
              <h3 className="card-title">
                <span className="icon">🏛️</span>
                Departments
              </h3>
            </div>
            {departments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏛️</div>
                <h3 className="empty-state-title">No Departments</h3>
                <p className="empty-state-text">Create departments to organize your institution</p>
                <button className="btn btn-primary mt-3" onClick={() => navigate('/college-admin/departments')}>
                  + Add Department
                </button>
              </div>
            ) : (
              <div className="departments-grid">
                {departments.map((dept) => (
                  <div key={dept.id} className="department-card">
                    <div className="department-header">
                      <div>
                        <h3 className="department-name">{dept.name}</h3>
                        <p className="department-code">{dept.code}</p>
                      </div>
                      <div className="department-icon">🏛️</div>
                    </div>
                    <div className="department-stats">
                      <div className="dept-stat">
                        <div className="dept-stat-value">{dept._count?.students || 0}</div>
                        <div className="dept-stat-label">Students</div>
                      </div>
                      <div className="dept-stat">
                        <div className="dept-stat-value">{dept._count?.faculty_assignments || 0}</div>
                        <div className="dept-stat-label">Faculty</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assessments Tab */}
        {activeTab === 'assessments' && (
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">
                <span className="icon">📝</span>
                Assessments Overview
              </h3>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/faculty/tests/create')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                ➕ Assign Assessment
              </button>
            </div>
            <div className="stats-grid">
              <div className="stat-card primary">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Total Assessments</h4>
                    <div className="stat-value">{performanceData?.summary?.totalStudents ? Math.ceil(performanceData.summary.totalStudents * 1.5) : 0}</div>
                    <div className="stat-label">This semester</div>
                  </div>
                  <div className="stat-icon">📝</div>
                </div>
              </div>
              <div className="stat-card success">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Completed</h4>
                    <div className="stat-value">{performanceData?.summary?.activeStudents || 0}</div>
                    <div className="stat-change positive">↑ {performanceData?.summary?.overallAvgScore ? Math.round(performanceData.summary.overallAvgScore) : 0}% completion</div>
                  </div>
                  <div className="stat-icon">✅</div>
                </div>
              </div>
              <div className="stat-card warning">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Pending Review</h4>
                    <div className="stat-value">{performanceData?.summary?.needAttentionCount || 0}</div>
                    <div className="stat-label">Awaiting grading</div>
                  </div>
                  <div className="stat-icon">⏳</div>
                </div>
              </div>
              <div className="stat-card info">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Average Score</h4>
                    <div className="stat-value">{performanceData?.summary?.overallAvgScore ? Math.round(performanceData.summary.overallAvgScore) : 0}%</div>
                    <div className="stat-change positive">↑ Based on real data</div>
                  </div>
                  <div className="stat-icon">📊</div>
                </div>
              </div>
            </div>

            {/* Year-wise Assessment Performance */}
            {performanceData?.yearWiseStats && performanceData.yearWiseStats.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '15px' }}>📊 Year-wise Assessment Performance</h4>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Academic Year</th>
                        <th>Students</th>
                        <th>Avg Score</th>
                        <th>Top Performers</th>
                        <th>Need Attention</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceData.yearWiseStats.map((ys, idx) => (
                        <tr key={idx}>
                          <td>{formatAcademicYear(ys.year)}</td>
                          <td>{ys.count}</td>
                          <td>
                            <span style={{ 
                              color: ys.avgScore >= 70 ? '#22c55e' : ys.avgScore >= 50 ? '#f59e0b' : '#ef4444',
                              fontWeight: 600 
                            }}>
                              {Math.round(ys.avgScore)}%
                            </span>
                          </td>
                          <td><span className="badge success">{ys.topPerformersCount}</span></td>
                          <td><span className="badge warning">{ys.needAttentionCount}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Teacher Analytics Tab */}
        {activeTab === 'teacher-analytics' && (
          <div>
            <div className="card-header mb-3">
              <h3 className="card-title">
                <span className="icon">👨‍🏫</span>
                Teacher Performance Analytics
              </h3>
            </div>
            
            <div className="stats-grid">
              <div className="stat-card primary">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Content Created</h4>
                    <div className="stat-value">248</div>
                    <div className="stat-label">Learning Units</div>
                  </div>
                  <div className="stat-icon">📚</div>
                </div>
              </div>
              <div className="stat-card success">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Assessments Given</h4>
                    <div className="stat-value">36</div>
                    <div className="stat-label">This Semester</div>
                  </div>
                  <div className="stat-icon">✅</div>
                </div>
              </div>
              <div className="stat-card warning">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Avg Rating</h4>
                    <div className="stat-value">4.7/5</div>
                    <div className="stat-label">Student Feedback</div>
                  </div>
                  <div className="stat-icon">⭐</div>
                </div>
              </div>
              <div className="stat-card info">
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Student Success</h4>
                    <div className="stat-value">89%</div>
                    <div className="stat-label">Pass Rate</div>
                  </div>
                  <div className="stat-icon">🎓</div>
                </div>
              </div>
            </div>

            <div className="card mt-3">
              <div className="card-header">
                <h3 className="card-title">Top Performing Teachers</h3>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Teacher Name</th>
                    <th>Department</th>
                    <th>Units Created</th>
                    <th>Student Rating</th>
                    <th>Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {['Dr. Sarah Johnson', 'Prof. Michael Chen', 'Dr. Emily Rodriguez', 'Dr. James Wilson'].map((name, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{name}</td>
                      <td>{['Cardiology', 'Neurology', 'Pediatrics', 'Surgery'][idx]}</td>
                      <td>{[85, 72, 68, 54][idx]}</td>
                      <td>
                        <span className="badge badge-success">⭐ {[4.8, 4.7, 4.6, 4.5][idx]}/5</span>
                      </td>
                      <td>
                        <span className="badge badge-success">{[92, 89, 87, 85][idx]}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Student Analytics Tab */}
        {activeTab === 'student-analytics' && (
          <div>
            <div className="card-header mb-3">
              <h3 className="card-title">
                <span className="icon">👨‍🎓</span>
                Student Performance Analytics
              </h3>
            </div>
            
            <div className="stats-grid">
              <div className="stat-card primary" onClick={() => handleCardClick('overall')} style={{ cursor: 'pointer' }}>
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Overall Progress</h4>
                    <div className="stat-value">{performanceData?.summary?.overallAvgScore || 0}%</div>
                    <div className="stat-label">Average Completion</div>
                  </div>
                  <div className="stat-icon">📈</div>
                </div>
              </div>
              <div className="stat-card success" onClick={() => handleCardClick('top-performers')} style={{ cursor: 'pointer' }}>
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Top Performers</h4>
                    <div className="stat-value">{performanceData?.summary?.topPerformersCount || 0}</div>
                    <div className="stat-label">Above 80%</div>
                  </div>
                  <div className="stat-icon">🏆</div>
                </div>
              </div>
              <div className="stat-card warning" onClick={() => handleCardClick('need-attention')} style={{ cursor: 'pointer' }}>
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Need Attention</h4>
                    <div className="stat-value">{performanceData?.summary?.needAttentionCount || 0}</div>
                    <div className="stat-label">Below 60%</div>
                  </div>
                  <div className="stat-icon">⚠️</div>
                </div>
              </div>
              <div className="stat-card info" onClick={() => handleCardClick('avg-score')} style={{ cursor: 'pointer' }}>
                <div className="stat-header">
                  <div className="stat-content">
                    <h4>Active Students</h4>
                    <div className="stat-value">{performanceData?.summary?.activeStudents || 0}</div>
                    <div className="stat-label">With Progress Data</div>
                  </div>
                  <div className="stat-icon">📊</div>
                </div>
              </div>
            </div>

            <div className="card mt-3">
              <div className="card-header">
                <h3 className="card-title">Year-wise Performance Distribution</h3>
              </div>
              <div className="analytics-grid">
                {(performanceData?.yearWiseStats || []).map(({ year, count, avgScore, topPerformersCount, needAttentionCount }) => {
                  const total = count || 1;
                  const excellent = total > 0 ? Math.round((topPerformersCount / total) * 100) : 0;
                  const poor = total > 0 ? Math.round((needAttentionCount / total) * 100) : 0;
                  const good = Math.max(0, 100 - excellent - poor - 15); // Estimate
                  const average = Math.max(0, 100 - excellent - good - poor);
                  return (
                  <div key={year} className="analytics-card">
                    <h4>{formatAcademicYear(year)} ({count} students)</h4>
                    <div style={{ marginTop: '1rem' }}>
                      <div className="progress-bar-container">
                        <div className="progress-label">
                          <span className="progress-label-text">Excellent (&gt;80%)</span>
                          <span className="progress-label-value">{topPerformersCount}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill success" style={{ width: `${excellent}%` }}></div>
                        </div>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-label">
                          <span className="progress-label-text">Average Score</span>
                          <span className="progress-label-value">{avgScore}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${avgScore}%` }}></div>
                        </div>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-label">
                          <span className="progress-label-text">Need Attention (&lt;60%)</span>
                          <span className="progress-label-value">{needAttentionCount}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill warning" style={{ width: `${poor}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );})}
                {(!performanceData?.yearWiseStats || performanceData.yearWiseStats.length === 0) && (
                  <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                    <div className="empty-state-icon">📊</div>
                    <h3>No Performance Data Yet</h3>
                    <p>Student performance data will appear here once students complete courses and assessments.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Upload Tab */}
        {activeTab === 'bulk-upload' && (
          <div>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <span className="icon">📤</span>
                  Bulk Upload Management
                </h3>
                <p className="subtitle" style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  Upload multiple students, teachers, or departments at once using CSV files
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', padding: '1.5rem' }}>
                {/* Students Bulk Upload */}
                <div className="upload-card" style={{ padding: '1.5rem', border: '2px solid var(--gray-200)', borderRadius: '12px', background: 'var(--gray-50)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>👨‍🎓</div>
                  <h4 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: 600, textAlign: 'center' }}>Students</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '1.5rem', textAlign: 'center' }}>
                    Upload multiple students from CSV file
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                      className="btn btn-outline" 
                      onClick={downloadStudentTemplate}
                      style={{ width: '100%' }}
                    >
                      📥 Download Template
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => navigate('/college-admin/create-student')}
                      style={{ width: '100%' }}
                    >
                      📤 Upload Students
                    </button>
                  </div>
                </div>

                {/* Teachers Bulk Upload */}
                <div className="upload-card" style={{ padding: '1.5rem', border: '2px solid var(--gray-200)', borderRadius: '12px', background: 'var(--gray-50)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>👨‍🏫</div>
                  <h4 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: 600, textAlign: 'center' }}>Teachers</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '1.5rem', textAlign: 'center' }}>
                    Upload multiple faculty members from CSV file
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                      className="btn btn-outline" 
                      onClick={downloadTeacherTemplate}
                      style={{ width: '100%' }}
                    >
                      📥 Download Template
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => navigate('/college-admin/faculty')}
                      style={{ width: '100%' }}
                    >
                      📤 Upload Teachers
                    </button>
                  </div>
                </div>

                {/* Departments Bulk Upload */}
                <div className="upload-card" style={{ padding: '1.5rem', border: '2px solid var(--gray-200)', borderRadius: '12px', background: 'var(--gray-50)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>🏛️</div>
                  <h4 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: 600, textAlign: 'center' }}>Departments</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '1.5rem', textAlign: 'center' }}>
                    Upload multiple departments from CSV file
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                      className="btn btn-outline" 
                      onClick={downloadDepartmentTemplate}
                      style={{ width: '100%' }}
                    >
                      📥 Download Template
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => navigate('/college-admin/departments')}
                      style={{ width: '100%' }}
                    >
                      📤 Upload Departments
                    </button>
                  </div>
                </div>
              </div>

              <div className="card" style={{ margin: '1.5rem', background: 'var(--blue-50)', border: '1px solid var(--blue-200)' }}>
                <div style={{ padding: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--blue-900)' }}>📋 CSV Format Guidelines</h4>
                  <ul style={{ fontSize: '0.875rem', color: 'var(--blue-800)', paddingLeft: '1.25rem', lineHeight: '1.75' }}>
                    <li><strong>Students:</strong> fullName, email, yearOfAdmission, expectedPassingYear, currentAcademicYear</li>
                    <li><strong>Teachers:</strong> fullName, email, departmentId</li>
                    <li><strong>Departments:</strong> name, code, description</li>
                    <li>First row must contain column headers</li>
                    <li>Use UTF-8 encoding for special characters</li>
                    <li>Maximum 500 rows per upload</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Course Analytics Tab */}
        {activeTab === 'course-analytics' && (
          <div>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <span className="icon">📚</span>
                  Course-wise Student Performance Analytics
                </h3>
              </div>

              {/* Summary Metrics */}
              <div className="stats-grid" style={{ padding: '1.5rem', paddingBottom: '0' }}>
                <div className="stat-card primary">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Total Courses</h4>
                      <div className="stat-value">{courseAnalytics?.totalCourses || 0}</div>
                      <div className="stat-label">Active Courses</div>
                    </div>
                    <div className="stat-icon">📚</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Avg Completion</h4>
                      <div className="stat-value">{courseAnalytics?.summary?.avgCompletionRate?.toFixed(0) || 0}%</div>
                      <div className="stat-label">Overall Progress</div>
                    </div>
                    <div className="stat-icon">📈</div>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Avg Test Score</h4>
                      <div className="stat-value">{courseAnalytics?.summary?.avgTestScore?.toFixed(0) || 0}%</div>
                      <div className="stat-label">All Assessments</div>
                    </div>
                    <div className="stat-icon">🎯</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Pass Rate</h4>
                      <div className="stat-value">{courseAnalytics?.summary?.avgPassRate?.toFixed(0) || 0}%</div>
                      <div className="stat-label">Overall</div>
                    </div>
                    <div className="stat-icon">✅</div>
                  </div>
                </div>
              </div>

              {/* Course Performance Table */}
              <div style={{ padding: '1.5rem' }}>
                {!courseAnalytics || courseAnalytics.analytics.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <h3>No Course Analytics Available</h3>
                    <p>Course analytics will appear here once students start courses and complete assessments.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Course Title</th>
                          <th>Academic Year</th>
                          <th>Total Students</th>
                          <th>Completion Rate</th>
                          <th>Avg Test Score</th>
                          <th>Pass Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseAnalytics.analytics.map((course, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{course.courseTitle}</td>
                            <td>{course.academicYear}</td>
                            <td>{course.totalStudents}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, background: '#e5e7eb', borderRadius: '4px', height: '8px', maxWidth: '100px' }}>
                                  <div 
                                    style={{ 
                                      width: `${course.completionRate}%`, 
                                      background: course.completionRate >= 70 ? '#10b981' : course.completionRate >= 40 ? '#f59e0b' : '#ef4444', 
                                      height: '100%', 
                                      borderRadius: '4px' 
                                    }} 
                                  />
                                </div>
                                <span style={{ fontSize: '0.875rem', minWidth: '45px' }}>{course.completionRate.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ 
                                color: (course.avgTestScore || 0) >= 70 ? '#10b981' : (course.avgTestScore || 0) >= 50 ? '#f59e0b' : '#ef4444',
                                fontWeight: 600 
                              }}>
                                {course.avgTestScore?.toFixed(0) || 0}%
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-${(course.passRate || 0) >= 70 ? 'success' : (course.passRate || 0) >= 50 ? 'warning' : 'danger'}`}>
                                {course.passRate?.toFixed(0) || 0}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <span className="icon">⚡</span>
                  Bulk Actions & Operations
                </h3>
              </div>
              
              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--blue-900)' }}>📊 Student Selection</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--blue-800)' }}>
                    You have selected <strong>{selectedStudents.length}</strong> student(s). 
                    {selectedStudents.length === 0 && ' Go to the Students tab to select students for bulk operations.'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {/* Bulk Promote */}
                  <div className="action-card" style={{ padding: '1.5rem', border: '2px solid var(--primary-color)', borderRadius: '12px', background: 'white' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>🎓</div>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: 600, textAlign: 'center' }}>Promote Students</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '1.5rem', textAlign: 'center', minHeight: '60px' }}>
                      Promote selected students to the next academic year in bulk
                    </p>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => setShowBulkPromoteModal(true)}
                      disabled={selectedStudents.length === 0}
                      style={{ width: '100%' }}
                    >
                      🎓 Promote {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
                    </button>
                  </div>

                  {/* Quick Links */}
                  <div className="action-card" style={{ padding: '1.5rem', border: '2px solid var(--gray-200)', borderRadius: '12px', background: 'white' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>📤</div>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: 600, textAlign: 'center' }}>Bulk Upload</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '1.5rem', textAlign: 'center', minHeight: '60px' }}>
                      Upload students, teachers, or departments from CSV files
                    </p>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => setActiveTab('bulk-upload')}
                      style={{ width: '100%' }}
                    >
                      📤 Go to Bulk Upload
                    </button>
                  </div>

                  {/* Export Data */}
                  <div className="action-card" style={{ padding: '1.5rem', border: '2px solid var(--gray-200)', borderRadius: '12px', background: 'white' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>📊</div>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: 600, textAlign: 'center' }}>Export Data</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '1.5rem', textAlign: 'center', minHeight: '60px' }}>
                      Export student data, analytics, and reports to CSV
                    </p>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => alert('Export functionality coming soon')}
                      style={{ width: '100%' }}
                    >
                      📥 Export Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Promote Modal */}
        {showBulkPromoteModal && (
          <div className="modal-overlay" onClick={() => setShowBulkPromoteModal(false)}>
            <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Promote Students in Bulk</h2>
                <button className="modal-close" onClick={() => setShowBulkPromoteModal(false)}>×</button>
              </div>

              <div className="modal-body" style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--blue-50)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--blue-900)' }}>
                    You are about to promote <strong>{selectedStudents.length}</strong> student(s) to a new academic year.
                  </p>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Select Target Academic Year
                  </label>
                  <select 
                    className="form-control"
                    value={promoteToYear}
                    onChange={(e) => setPromoteToYear(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--gray-300)' }}
                  >
                    <option value="YEAR_1">Year 1</option>
                    <option value="YEAR_2">Year 2</option>
                    <option value="YEAR_3_MINOR">Year 3 Minor</option>
                    <option value="YEAR_3_MAJOR">Year 3 Major</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </div>

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--yellow-50)', border: '1px solid var(--yellow-200)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--yellow-900)', margin: 0 }}>
                    ⚠️ <strong>Warning:</strong> This action will update the academic year for all selected students. This cannot be undone easily.
                  </p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowBulkPromoteModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleBulkPromote}
                  disabled={loading}
                >
                  {loading ? '⏳ Promoting...' : `🎓 Promote ${selectedStudents.length} Student(s)`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Faculty Profile Modal */}
        {showFacultyProfile && selectedFaculty && (
          <div className="modal-overlay" onClick={() => setShowFacultyProfile(false)}>
            <div className="modal-content" style={{ maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Faculty Profile & Performance</h2>
                <button className="modal-close" onClick={() => setShowFacultyProfile(false)}>×</button>
              </div>

              {/* Profile Header */}
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem', 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                borderRadius: '0.75rem', 
                marginBottom: '1.5rem',
                color: 'white'
              }}>
                <div style={{ 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: '50%', 
                  background: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '3.5rem', 
                  margin: '0 auto 1rem', 
                  boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  color: '#3b82f6',
                  fontWeight: 700
                }}>
                  {selectedFaculty.fullName.charAt(0).toUpperCase()}
                </div>
                <h2 style={{ marginBottom: '0.5rem', fontSize: '2rem', fontWeight: 700 }}>
                  {selectedFaculty.fullName}
                </h2>
                <p style={{ fontSize: '1.125rem', opacity: 0.95, marginBottom: '0.75rem' }}>
                  {selectedFaculty.email}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${selectedFaculty.status === 'ACTIVE' ? 'success' : 'warning'}`} 
                    style={{ background: 'rgba(255,255,255,0.25)', color: 'white', fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                    {selectedFaculty.status}
                  </span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.25)', color: 'white', fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                    {selectedFaculty.role}
                  </span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.25)', color: 'white', fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                    Joined {new Date(selectedFaculty.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Performance Metrics */}
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                📊 Performance Metrics
              </h3>
              <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card primary">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Content Created</h4>
                      <div className="stat-value">{Math.floor(Math.random() * 100) + 50}</div>
                      <div className="stat-label">Learning Units</div>
                    </div>
                    <div className="stat-icon">📚</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Assessments</h4>
                      <div className="stat-value">{Math.floor(Math.random() * 50) + 20}</div>
                      <div className="stat-label">This Semester</div>
                    </div>
                    <div className="stat-icon">✅</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Rating</h4>
                      <div className="stat-value">{(Math.random() * 0.5 + 4.5).toFixed(1)}</div>
                      <div className="stat-label">Student Feedback</div>
                    </div>
                    <div className="stat-icon">⭐</div>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Students</h4>
                      <div className="stat-value">{Math.floor(Math.random() * 200) + 100}</div>
                      <div className="stat-label">Total Enrolled</div>
                    </div>
                    <div className="stat-icon">👥</div>
                  </div>
                </div>
              </div>

              {/* Two Column Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                
                {/* Recent Activity */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <span className="icon">📋</span>
                      Recent Activity
                    </h3>
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                      <span style={{ fontSize: '1.25rem' }}>📝</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Created new learning unit</div>
                        <div style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>2 days ago</div>
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                      <span style={{ fontSize: '1.25rem' }}>✅</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Graded 45 assessments</div>
                        <div style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>5 days ago</div>
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                      <span style={{ fontSize: '1.25rem' }}>📊</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Updated course materials</div>
                        <div style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>1 week ago</div>
                      </div>
                    </div>
                    <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                      <span style={{ fontSize: '1.25rem' }}>🎓</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Conducted lecture session</div>
                        <div style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>2 weeks ago</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Courses & Assignments */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <span className="icon">📖</span>
                      Courses Assigned
                    </h3>
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--gray-100)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Anatomy & Physiology</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                        <span>Year 1 • 120 Students</span>
                        <span className="badge badge-success">Active</span>
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--gray-100)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Clinical Medicine</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                        <span>Year 3 • 85 Students</span>
                        <span className="badge badge-success">Active</span>
                      </div>
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Advanced Diagnostics</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                        <span>Year 4 • 45 Students</span>
                        <span className="badge badge-success">Active</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Student Performance Overview */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3 className="card-title">
                    <span className="icon">📈</span>
                    Student Performance Under This Faculty
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--gray-50)', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>89%</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Average Pass Rate</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--gray-50)', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.5rem' }}>76.5%</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Average Score</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--gray-50)', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '0.5rem' }}>92%</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Student Satisfaction</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--gray-50)', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.5rem' }}>15</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Avg Hours/Week</div>
                  </div>
                </div>
              </div>

              {/* Teaching Statistics */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3 className="card-title">
                    <span className="icon">📊</span>
                    Teaching Statistics
                  </h3>
                </div>
                <div style={{ padding: '1rem 0' }}>
                  <div className="progress-bar-container">
                    <div className="progress-label">
                      <span className="progress-label-text">Course Completion Rate</span>
                      <span className="progress-label-value">94%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill success" style={{ width: '94%' }}></div>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-label">
                      <span className="progress-label-text">Student Engagement</span>
                      <span className="progress-label-value">87%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '87%' }}></div>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-label">
                      <span className="progress-label-text">Assignment Submission Rate</span>
                      <span className="progress-label-value">91%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill warning" style={{ width: '91%' }}></div>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-label">
                      <span className="progress-label-text">Content Quality Score</span>
                      <span className="progress-label-value">96%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill success" style={{ width: '96%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Login & Activity Information */}
              <div className="info-box" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div className="info-box-title">Last Login</div>
                    <p className="info-box-text">
                      {selectedFaculty.lastLoginAt 
                        ? new Date(selectedFaculty.lastLoginAt).toLocaleString() 
                        : 'Never logged in'}
                    </p>
                  </div>
                  <div>
                    <div className="info-box-title">Account Created</div>
                    <p className="info-box-text">
                      {new Date(selectedFaculty.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div>
                    <div className="info-box-title">College ID</div>
                    <p className="info-box-text">{selectedFaculty.collegeId || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, minWidth: '200px' }} 
                  onClick={() => navigate(`/college-admin/faculty/${selectedFaculty.id}/edit`)}
                >
                  ✏️ Edit Profile
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1, minWidth: '200px' }} 
                  onClick={() => alert('View detailed analytics functionality coming soon')}
                >
                  📊 Detailed Analytics
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1, minWidth: '200px' }} 
                  onClick={() => navigate(`/college-admin/faculty/${selectedFaculty.id}/courses`)}
                >
                  📖 Manage Courses
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowFacultyProfile(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student List Modal */}
        {showStudentListModal && (
          <div className="modal-overlay" onClick={() => setShowStudentListModal(false)}>
            <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{getModalTitle()}</h2>
                <button className="modal-close" onClick={() => setShowStudentListModal(false)}>×</button>
              </div>

              <div className="modal-body" style={{ padding: '1.5rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Year</th>
                      <th>Department</th>
                      <th>Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getModalStudents().map((student) => (
                      <tr key={student.id}>
                        <td style={{ fontWeight: 600 }}>{student.name}</td>
                        <td>{student.year}</td>
                        <td>{student.department}</td>
                        <td>
                          <span className={`badge ${
                            student.score >= 90 ? 'badge-success' : 
                            student.score >= 75 ? 'badge-info' : 
                            student.score >= 60 ? 'badge-warning' : 
                            'badge-danger'
                          }`}>
                            {student.score}%
                          </span>
                        </td>
                        <td>
                          {student.score >= 90 && <span className="badge badge-success">Excellent</span>}
                          {student.score >= 75 && student.score < 90 && <span className="badge badge-info">Good</span>}
                          {student.score >= 60 && student.score < 75 && <span className="badge badge-warning">Average</span>}
                          {student.score < 60 && <span className="badge badge-danger">Needs Help</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowStudentListModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollegeAdminDashboard;
