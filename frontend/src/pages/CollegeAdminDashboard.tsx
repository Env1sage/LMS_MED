import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../services/student.service';
import governanceService from '../services/governance.service';
import { packagesService } from '../services/packages.service';
import { ratingsService, CollegeRatingItem } from '../services/ratings.service';
import { courseAnalyticsService, CourseAnalyticsOverview } from '../services/course-analytics.service';
import { useAuth } from '../context/AuthContext';
import { NotificationBell, NotificationManager } from '../components/notifications';
import './CollegeAdminDashboard.css';

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

interface AssignedPackage {
  id: string;
  packageId: string;
  collegeId: string;
  startDate: string;
  endDate?: string;
  status: string;
  package?: {
    id: string;
    name: string;
    description?: string;
    subjects: string[];
    contentTypes: string[];
    publisher?: { name: string };
  };
}

const CollegeAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'faculty' | 'departments' | 'packages' | 'assessments' | 'teacher-analytics' | 'student-analytics' | 'notifications' | 'actions'>('overview');
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<FacultyUser[]>([]);
  const [assignedPackages, setAssignedPackages] = useState<AssignedPackage[]>([]);
  const [teacherRatings, setTeacherRatings] = useState<CollegeRatingItem[]>([]);
  const [courseRatings, setCourseRatings] = useState<CollegeRatingItem[]>([]);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');

  useEffect(() => {
    loadData();
    loadDepartments();
    loadFacultyUsers();
    loadPackages();
    loadAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, yearFilter]);

  const loadAnalyticsData = async () => {
    try {
      if (user?.collegeId) {
        const [teacherRatingsData, courseRatingsData, analyticsData] = await Promise.all([
          ratingsService.getCollegeTeacherRatings(user.collegeId).catch(() => []),
          ratingsService.getCollegeCourseRatings(user.collegeId).catch(() => []),
          courseAnalyticsService.getCourseAnalyticsOverview(user.collegeId).catch(() => null),
        ]);
        setTeacherRatings(teacherRatingsData);
        setCourseRatings(courseRatingsData);
        setCourseAnalytics(analyticsData);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
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

  const loadPackages = async () => {
    try {
      if (user?.collegeId) {
        const data = await packagesService.getCollegePackages(user.collegeId);
        setAssignedPackages(data);
      }
    } catch (err) {
      console.error('Error loading packages:', err);
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

  const handleLogout = async () => {
    await logout();
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

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE student "${name}"? This action cannot be undone!`)) {
      return;
    }
    try {
      await studentService.delete(id);
      setSuccess('Student deleted successfully');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete student');
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
          <div className="header-title">
            <div className="medical-icon-wrapper">
              <span className="medical-icon-inner">⚕️</span>
            </div>
            <div className="header-text">
              <h1>College Administration</h1>
              <p className="subtitle">Medical Education Management Portal</p>
            </div>
          </div>
          <div className="header-actions">
            {activeTab === 'students' && (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/college-admin/create-student')}
              >
                <span>+</span> Create Student
              </button>
            )}
            {activeTab === 'faculty' && (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/college-admin/faculty')}
              >
                <span>+</span> Add Faculty
              </button>
            )}
            {activeTab === 'departments' && (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/college-admin/departments')}
              >
                <span>+</span> Add Department
              </button>
            )}
            <NotificationBell />
            <button className="btn btn-outline" onClick={() => navigate('/college-admin/profile')}>
              👤 Profile
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              🚪 Logout
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
            className={`tab ${activeTab === 'faculty' ? 'active' : ''}`}
            onClick={() => setActiveTab('faculty')}
          >
            Faculty
          </button>
          <button
            className={`tab ${activeTab === 'departments' ? 'active' : ''}`}
            onClick={() => setActiveTab('departments')}
          >
            Departments
          </button>
          <button
            className={`tab ${activeTab === 'packages' ? 'active' : ''}`}
            onClick={() => setActiveTab('packages')}
          >
            📦 Content Packages
          </button>
          <button
            className={`tab ${activeTab === 'assessments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assessments')}
          >
            Assessments
          </button>
          <button
            className={`tab ${activeTab === 'teacher-analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('teacher-analytics')}
          >
            Teacher Analytics
          </button>
          <button
            className={`tab ${activeTab === 'student-analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('student-analytics')}
          >
            Student Analytics
          </button>
          <button
            className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            🔔 Notifications
          </button>
          <button
            className={`tab ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            Bulk Upload
          </button>
        </div>

        <div className="dashboard-content">
        {activeTab === 'overview' && stats && (
          <div className="overview-section">
            <div className="section-header-medical">
              <h3>📊 Dashboard Overview</h3>
            </div>
            <div className="stats-grid-modern">
              <div className="stat-card-modern primary">
                <div className="stat-card-icon">👥</div>
                <div className="stat-card-content">
                  <span className="stat-card-value">{stats.total}</span>
                  <span className="stat-card-label">Total Students</span>
                </div>
                <div className="stat-card-trend">
                  <span className="trend-up">↑ Active</span>
                </div>
              </div>

              {stats.byStatus.map((item) => (
                <div className={`stat-card-modern ${item.status.toLowerCase()}`} key={item.status}>
                  <div className="stat-card-icon">
                    {item.status === 'ACTIVE' ? '✅' : 
                     item.status === 'INACTIVE' ? '⏸️' : 
                     item.status === 'GRADUATED' ? '🎓' : '📤'}
                  </div>
                  <div className="stat-card-content">
                    <span className="stat-card-value">{item.count}</span>
                    <span className="stat-card-label">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="year-distribution-modern">
              <div className="section-subheader">
                <h4>📅 Distribution by Academic Year</h4>
              </div>
              <div className="year-cards-grid">
                {stats.byYear.map((item, index) => (
                  <div className="year-card-modern" key={item.year} style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="year-card-number">{formatAcademicYear(item.year)}</div>
                    <div className="year-card-count">{item.count}</div>
                    <div className="year-card-label">Students</div>
                    <div className="year-card-bar">
                      <div 
                        className="year-card-progress" 
                        style={{ width: `${(item.count / stats.total) * 100}%` }}
                      ></div>
                    </div>
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
                        <button
                          className="btn-icon"
                          onClick={() => handleDeleteStudent(student.id, student.fullName)}
                          title="Delete Permanently"
                          style={{ color: '#dc3545' }}
                        >
                          🗑️
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

        {activeTab === 'faculty' && (
          <div className="faculty-section">
            <div className="section-header-medical">
              <h3>👨‍🏫 Faculty Members</h3>
              <span className="dept-count-badge">{facultyUsers.length} Members</span>
            </div>
            {facultyUsers.length > 0 ? (
              <div className="table-wrapper-modern">
                <table className="data-table-modern">
                  <thead>
                    <tr>
                      <th>Faculty Member</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyUsers.map((faculty) => (
                      <tr key={faculty.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">{faculty.fullName.charAt(0)}</div>
                            <span className="user-name">{faculty.fullName}</span>
                          </div>
                        </td>
                        <td className="email-cell">{faculty.email}</td>
                        <td>
                          <span className="role-badge">
                            {faculty.role === 'COLLEGE_HOD' ? '👑 HOD' : 
                             faculty.role === 'FACULTY' ? '👨‍🏫 Faculty' : 
                             faculty.role || 'Not assigned'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${faculty.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                            <span className="status-dot"></span>
                            {faculty.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-action btn-action-primary"
                              onClick={() => navigate('/college-admin/faculty')}
                              title="Manage Faculty"
                            >
                              ⚙️ Manage
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-modern">
                <div className="empty-icon">👨‍🏫</div>
                <h3>No Faculty Members</h3>
                <p>Add faculty members to assign them to departments and courses</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/college-admin/faculty')}
                >
                  + Add Faculty
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'departments' && (
          <div className="departments-section">
            <div className="section-header-medical">
              <h3>🏛️ College Departments</h3>
              <span className="dept-count-badge">{departments.length} Departments</span>
            </div>
            {departments.length > 0 ? (
              <div className="departments-grid-modern">
                {departments.map((dept, index) => (
                  <div className="department-card-modern" key={dept.id} style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="dept-card-header">
                      <div className="dept-icon-wrapper">
                        <span className="dept-icon">🏥</span>
                      </div>
                      <div className="dept-badge">{dept.code}</div>
                    </div>
                    <div className="dept-card-body">
                      <h4 className="dept-name">{dept.name}</h4>
                      <div className="dept-stats-row">
                        <div className="dept-stat-item">
                          <div className="stat-icon-small">👨‍🏫</div>
                          <div className="stat-info">
                            <span className="stat-number">{dept._count?.faculty_assignments || 0}</span>
                            <span className="stat-text">Faculty</span>
                          </div>
                        </div>
                        <div className="dept-stat-item">
                          <div className="stat-icon-small">🎓</div>
                          <div className="stat-info">
                            <span className="stat-number">{dept._count?.students || 0}</span>
                            <span className="stat-text">Students</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="dept-card-footer">
                      <button
                        className="btn-dept-action btn-view"
                        onClick={() => navigate('/college-admin/departments')}
                      >
                        <span>View Details</span>
                        <span className="arrow-icon">→</span>
                      </button>
                      <button
                        className="btn-dept-action btn-edit"
                        onClick={() => navigate(`/college-admin/departments/${dept.id}/edit`)}
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-modern">
                <div className="empty-icon">🏛️</div>
                <h3>No Departments Yet</h3>
                <p>Create your first department to organize faculty and students</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/college-admin/departments')}
                >
                  + Create Department
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="assessments-section">
            <div className="section-header-medical">
              <h3>📋 Assessment Management</h3>
              <button className="btn btn-primary-medical" onClick={() => navigate('/college-admin/create-assessment')}>
                + Create Assessment
              </button>
            </div>
            <div className="medical-card">
              <div className="assessment-grid">
                <div className="assessment-card">
                  <div className="assessment-icon">📝</div>
                  <h4>Scheduled Tests</h4>
                  <p className="assessment-count">12 Active</p>
                  <button className="btn btn-outline-medical" onClick={() => navigate('/college-admin/assessments/scheduled')}>
                    Assign to Students
                  </button>
                </div>
                <div className="assessment-card">
                  <div className="assessment-icon">🎯</div>
                  <h4>Practice Tests</h4>
                  <p className="assessment-count">8 Available</p>
                  <button className="btn btn-outline-medical" onClick={() => navigate('/college-admin/assessments/practice')}>
                    Assign to Batches
                  </button>
                </div>
                <div className="assessment-card">
                  <div className="assessment-icon">📊</div>
                  <h4>Assignments</h4>
                  <p className="assessment-count">5 Pending</p>
                  <button className="btn btn-outline-medical" onClick={() => navigate('/college-admin/assessments/assignments')}>
                    View & Assign
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teacher-analytics' && (
          <div className="analytics-section">
            <div className="section-header-medical">
              <h3>👨‍🏫 Teacher Performance Analysis</h3>
            </div>
            
            {/* Metrics Cards */}
            <div className="analytics-metrics" style={{ marginBottom: '2rem' }}>
              <div className="metric-card">
                <div className="metric-icon">�</div>
                <div className="metric-content">
                  <h4>Total Faculty</h4>
                  <p className="metric-value">{facultyUsers.length}</p>
                  <p className="metric-label">Active Teachers</p>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">📚</div>
                <div className="metric-content">
                  <h4>Total Courses</h4>
                  <p className="metric-value">{courseAnalytics?.totalCourses || 0}</p>
                  <p className="metric-label">In System</p>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">⭐</div>
                <div className="metric-content">
                  <h4>Avg Rating</h4>
                  <p className="metric-value">
                    {teacherRatings.length > 0 
                      ? (teacherRatings.reduce((sum, r) => sum + r.averageRating, 0) / teacherRatings.length).toFixed(1)
                      : 'N/A'}/5
                  </p>
                  <p className="metric-label">Student Feedback</p>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">🎓</div>
                <div className="metric-content">
                  <h4>Completion Rate</h4>
                  <p className="metric-value">{courseAnalytics?.summary?.avgCompletionRate?.toFixed(0) || 0}%</p>
                  <p className="metric-label">Average</p>
                </div>
              </div>
            </div>

            {/* Teacher Ratings Table */}
            <div className="medical-card">
              <h4 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600', color: 'var(--medical-text)' }}>Faculty Ratings Overview</h4>
              {teacherRatings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
                  <p>No teacher ratings available yet.</p>
                  <p style={{ fontSize: '13px' }}>Ratings will appear here once students provide feedback.</p>
                </div>
              ) : (
                <div className="teacher-table-wrapper">
                  <table className="medical-table">
                    <thead>
                      <tr>
                        <th>Teacher Name</th>
                        <th>Average Rating</th>
                        <th>Total Reviews</th>
                        <th>Rating Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherRatings.map((rating, idx) => (
                        <tr key={idx}>
                          <td>{rating.teacherName || 'Unknown'}</td>
                          <td>
                            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                              {'⭐'.repeat(Math.round(rating.averageRating))} {rating.averageRating.toFixed(1)}
                            </span>
                          </td>
                          <td>{rating.totalRatings} reviews</td>
                          <td>
                            <span className={`performance-badge ${rating.averageRating >= 4 ? 'good' : rating.averageRating >= 3 ? 'average' : 'poor'}`}>
                              {rating.averageRating >= 4.5 ? 'Excellent' : rating.averageRating >= 4 ? 'Very Good' : rating.averageRating >= 3 ? 'Good' : 'Needs Improvement'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Course Ratings Table */}
            <div className="medical-card" style={{ marginTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600', color: 'var(--medical-text)' }}>Course Ratings Overview</h4>
              {courseRatings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>📚</div>
                  <p>No course ratings available yet.</p>
                </div>
              ) : (
                <div className="teacher-table-wrapper">
                  <table className="medical-table">
                    <thead>
                      <tr>
                        <th>Course Title</th>
                        <th>Average Rating</th>
                        <th>Total Reviews</th>
                        <th>Rating Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseRatings.map((rating, idx) => (
                        <tr key={idx}>
                          <td>{rating.courseTitle || 'Unknown'}</td>
                          <td>
                            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                              {'⭐'.repeat(Math.round(rating.averageRating))} {rating.averageRating.toFixed(1)}
                            </span>
                          </td>
                          <td>{rating.totalRatings} reviews</td>
                          <td>
                            <span className={`performance-badge ${rating.averageRating >= 4 ? 'good' : rating.averageRating >= 3 ? 'average' : 'poor'}`}>
                              {rating.averageRating >= 4.5 ? 'Excellent' : rating.averageRating >= 4 ? 'Very Good' : rating.averageRating >= 3 ? 'Good' : 'Needs Improvement'}
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
        )}

        {activeTab === 'student-analytics' && (
          <div className="analytics-section">
            <div className="section-header-medical">
              <h3>👩‍🎓 Student Performance Analysis</h3>
            </div>
            
            {/* Metrics Cards */}
            <div className="analytics-metrics" style={{ marginBottom: '2rem' }}>
              <div className="metric-card">
                <div className="metric-icon">�</div>
                <div className="metric-content">
                  <h4>Total Students</h4>
                  <p className="metric-value">{stats?.total || students.length}</p>
                  <p className="metric-label">Enrolled</p>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">📈</div>
                <div className="metric-content">
                  <h4>Overall Progress</h4>
                  <p className="metric-value">{courseAnalytics?.summary?.avgCompletionRate?.toFixed(0) || 0}%</p>
                  <p className="metric-label">Average Completion</p>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">🎯</div>
                <div className="metric-content">
                  <h4>Avg Test Score</h4>
                  <p className="metric-value">{courseAnalytics?.summary?.avgTestScore?.toFixed(0) || 0}%</p>
                  <p className="metric-label">All Assessments</p>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">✅</div>
                <div className="metric-content">
                  <h4>Pass Rate</h4>
                  <p className="metric-value">{courseAnalytics?.summary?.avgPassRate?.toFixed(0) || 0}%</p>
                  <p className="metric-label">Overall</p>
                </div>
              </div>
            </div>

            {/* Course Performance Table */}
            <div className="medical-card">
              <h4 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600', color: 'var(--medical-text)' }}>Course-wise Student Performance</h4>
              {!courseAnalytics || courseAnalytics.analytics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
                  <p>No course analytics available yet.</p>
                  <p style={{ fontSize: '13px' }}>Analytics will appear here once students start courses.</p>
                </div>
              ) : (
                <div className="teacher-table-wrapper">
                  <table className="medical-table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Academic Year</th>
                        <th>Students</th>
                        <th>Completion</th>
                        <th>Avg Score</th>
                        <th>Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseAnalytics.analytics.map((course, idx) => (
                        <tr key={idx}>
                          <td>{course.courseTitle}</td>
                          <td>{course.academicYear}</td>
                          <td>{course.totalStudents}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, background: '#e5e7eb', borderRadius: '4px', height: '8px' }}>
                                <div style={{ width: `${course.completionRate}%`, background: course.completionRate >= 70 ? '#10b981' : course.completionRate >= 40 ? '#f59e0b' : '#ef4444', height: '100%', borderRadius: '4px' }} />
                              </div>
                              <span style={{ fontSize: '0.875rem', minWidth: '40px' }}>{course.completionRate.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td>{course.avgTestScore?.toFixed(0) || 0}%</td>
                          <td>
                            <span className={`performance-badge ${course.passRate >= 70 ? 'good' : course.passRate >= 50 ? 'average' : 'poor'}`}>
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

            {/* Year-wise Student Distribution */}
            <div className="medical-card" style={{ marginTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: '600', color: 'var(--medical-text)' }}>Year-wise Student Distribution</h4>
              {stats?.byYear && stats.byYear.length > 0 ? (
                <div className="year-performance-grid">
                  {stats.byYear.map((yearData) => (
                    <div className="year-performance-card" key={yearData.year}>
                      <h5>{yearData.year.replace('_', ' ')}</h5>
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--medical-primary)' }}>
                          {yearData.count}
                        </div>
                        <div style={{ color: '#666', fontSize: '0.875rem' }}>Students</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No year-wise distribution data available
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'packages' && (
          <div className="packages-section">
            <div className="medical-card">
              <div className="section-header-medical">
                <h3>📦 Assigned Content Packages</h3>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                  These packages determine what content your faculty and students can access
                </p>
              </div>
              
              {assignedPackages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>📭</div>
                  <p>No content packages have been assigned to your college yet.</p>
                  <p style={{ fontSize: '13px' }}>Contact the Bitflow Admin to request package assignments.</p>
                </div>
              ) : (
                <div className="packages-grid" style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                  {assignedPackages.map((assignment) => (
                    <div 
                      key={assignment.id} 
                      className="package-card"
                      style={{
                        background: 'linear-gradient(135deg, #f8fafc 0%, #fff 100%)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <h4 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                          {assignment.package?.name || 'Unknown Package'}
                        </h4>
                        <span 
                          className={`status-badge ${assignment.status.toLowerCase()}`}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: assignment.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7',
                            color: assignment.status === 'ACTIVE' ? '#166534' : '#92400e'
                          }}
                        >
                          {assignment.status}
                        </span>
                      </div>
                      
                      {assignment.package?.description && (
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '15px' }}>
                          {assignment.package.description}
                        </p>
                      )}
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
                        {assignment.package?.subjects?.map((subject, idx) => (
                          <span 
                            key={idx}
                            style={{
                              background: '#e0e7ff',
                              color: '#3730a3',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                      
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        <div style={{ marginBottom: '5px' }}>
                          <strong>Content Types:</strong> {assignment.package?.contentTypes?.join(', ') || 'All'}
                        </div>
                        <div style={{ marginBottom: '5px' }}>
                          <strong>Start Date:</strong> {new Date(assignment.startDate).toLocaleDateString()}
                        </div>
                        {assignment.endDate && (
                          <div>
                            <strong>End Date:</strong> {new Date(assignment.endDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="actions-section">
            <div className="bulk-actions-card medical-card">
              <div className="section-header-medical">
                <h3>📤 Bulk Upload</h3>
              </div>
              <p className="upload-description">Upload CSV files to add multiple students or faculty members at once</p>
              <div className="upload-actions">
                <button className="btn btn-primary-medical" onClick={() => navigate('/college-admin/bulk-upload-students')}>
                  📁 Upload Students
                </button>
                <button className="btn btn-outline-medical" onClick={() => navigate('/college-admin/bulk-upload-faculty')}>
                  📁 Upload Faculty
                </button>
              </div>
              <div className="divider-medical"></div>
              <h4>Bulk Student Operations</h4>
              <p>Select students from the Students tab to perform batch operations</p>
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

        {activeTab === 'notifications' && (
          <div className="notifications-section">
            <NotificationManager />
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default CollegeAdminDashboard;
