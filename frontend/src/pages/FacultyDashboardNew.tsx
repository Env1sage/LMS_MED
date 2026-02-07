import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/course.service';
import { facultyAnalyticsService, DashboardOverview, StudentInfo } from '../services/faculty-analytics.service';
import { courseAnalyticsService, CourseComparison } from '../services/course-analytics.service';
import { useAuth } from '../context/AuthContext';
import ProfileModal from '../components/common/ProfileModal';
import { NotificationBell } from '../components/notifications';
import '../styles/FacultyDashboardNew.css';


const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'analytics' | 'comparison' | 'students' | 'self-paced'>('overview');
  const [courses, setCourses] = useState<any[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<DashboardOverview | null>(null);
  const [courseComparison, setCourseComparison] = useState<CourseComparison[]>([]);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [modalType, setModalType] = useState<'students' | 'assignments' | 'active' | 'progress'>('students');
  const [studentList, setStudentList] = useState<StudentInfo[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadAnalytics();
    loadCourseComparison();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'students') {
      loadStudents('all');
    } else if (activeTab === 'comparison') {
      loadCourseComparison();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
      loadStudents('all'); // Load students for performance analysis
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadAnalytics = async () => {
    try {
      const data = await facultyAnalyticsService.getDashboardOverview();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  const loadCourseComparison = async () => {
    try {
      setLoadingComparison(true);
      // Faculty users should not pass collegeId - backend will filter by their courses
      const data = await courseAnalyticsService.getCourseComparison();
      setCourseComparison(data);
    } catch (err) {
      console.error('Failed to load course comparison:', err);
      setCourseComparison([]);
    } finally {
      setLoadingComparison(false);
    }
  };

  const loadStudents = async (filter?: 'all' | 'active' | 'assigned') => {
    try {
      setLoadingStudents(true);
      const data = await facultyAnalyticsService.getAllStudents(filter);
      setStudentList(data.students);
    } catch (err) {
      console.error('Failed to load students:', err);
      setStudentList([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCardClick = (type: 'students' | 'assignments' | 'active' | 'progress') => {
    setModalType(type);
    setShowStudentModal(true);
    if (type === 'students' || type === 'progress') {
      loadStudents('all');
    } else if (type === 'active') {
      loadStudents('active');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await courseService.getAll();
      setCourses(data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatAcademicYear = (year: string) => {
    const yearMap: any = {
      YEAR_1: 'Year 1',
      YEAR_2: 'Year 2',
      YEAR_3_MINOR: 'Year 3 Minor',
      YEAR_3_MAJOR: 'Year 3 Major',
      INTERNSHIP: 'Internship',
    };
    return yearMap[year] || year;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      PUBLISHED: { label: 'Published', class: 'badge-success' },
      DRAFT: { label: 'Draft', class: 'badge-warning' },
      ARCHIVED: { label: 'Archived', class: 'badge-secondary' },
    };
    const config = statusConfig[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const getModalTitle = () => {
    switch (modalType) {
      case 'students': return 'All Students';
      case 'active': return 'Active Students';
      case 'assignments': return 'Course Assignments';
      case 'progress': return 'Student Progress';
      default: return 'Details';
    }
  };

  if (loading) {
    return (
      <div className="faculty-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalCourses: courses.length,
    publishedCourses: courses.filter((c: any) => c.status === 'PUBLISHED').length,
    draftCourses: courses.filter((c: any) => c.status === 'DRAFT').length,
    totalStudents: analyticsData?.overview.uniqueStudents || 0,
    activeStudents: analyticsData?.overview.activeStudentsLast7Days || 0,
    avgCompletion: analyticsData?.overview.overallCompletionRate || 0,
  };

  return (
    <div className="faculty-container">
      <div className="faculty-inner">
        {/* Modern Header */}
        <div className="faculty-header">
          <div className="header-left">
            <div className="faculty-icon">👨‍🏫</div>
            <div className="header-text">
              <h1>Faculty Portal</h1>
              <p className="header-subtitle">Welcome back, {user?.fullName}</p>
            </div>
          </div>
          <div className="header-right">
            <NotificationBell />
            <button className="btn-icon" onClick={() => setShowProfileModal(true)}>
              Profile
            </button>
            <button className="btn-secondary" onClick={handleLogout}>
              Logout
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

        {/* Navigation Tabs */}
        <div className="faculty-tabs">
          <button
            className={`faculty-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`faculty-tab ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            📚 My Courses
          </button>
          <button
            className={`faculty-tab ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            👥 Students
          </button>
          <button
            className={`faculty-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
          <button
            className={`faculty-tab ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
          >
            🔍 Course Comparison
          </button>
          <button
            className={`faculty-tab ${activeTab === 'self-paced' ? 'active' : ''}`}
            onClick={() => setActiveTab('self-paced')}
          >
            📚 Self-Paced Learning
          </button>
        </div>

        {/* Tab Content */}
        <div className="faculty-content">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-section">
              <div className="stats-grid-modern">
                <div className="stat-card-modern primary" onClick={() => setActiveTab('courses')}>
                  <div className="stat-icon-modern">📚</div>
                  <div className="stat-info">
                    <div className="stat-value-modern">{stats.totalCourses}</div>
                    <div className="stat-label-modern">Total Courses</div>
                  </div>
                </div>
                <div className="stat-card-modern success">
                  <div className="stat-icon-modern">✅</div>
                  <div className="stat-info">
                    <div className="stat-value-modern">{stats.publishedCourses}</div>
                    <div className="stat-label-modern">Published</div>
                  </div>
                </div>
                <div className="stat-card-modern warning">
                  <div className="stat-icon-modern">📝</div>
                  <div className="stat-info">
                    <div className="stat-value-modern">{stats.draftCourses}</div>
                    <div className="stat-label-modern">Drafts</div>
                  </div>
                </div>
                <div className="stat-card-modern info" onClick={() => handleCardClick('students')}>
                  <div className="stat-icon-modern">👥</div>
                  <div className="stat-info">
                    <div className="stat-value-modern">{stats.totalStudents}</div>
                    <div className="stat-label-modern">Total Students</div>
                  </div>
                </div>
                <div className="stat-card-modern accent" onClick={() => handleCardClick('active')}>
                  <div className="stat-icon-modern">🎓</div>
                  <div className="stat-info">
                    <div className="stat-value-modern">{stats.activeStudents}</div>
                    <div className="stat-label-modern">Active Students</div>
                  </div>
                </div>
                <div className="stat-card-modern purple">
                  <div className="stat-icon-modern">📈</div>
                  <div className="stat-info">
                    <div className="stat-value-modern">{stats.avgCompletion}%</div>
                    <div className="stat-label-modern">Avg Completion</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="section-card">
                <div className="section-header">
                  <h2>⚡ Quick Actions</h2>
                </div>
                <div className="quick-actions-grid">
                  <button className="action-btn" onClick={() => navigate('/faculty/create-course')}>
                    <span className="action-icon">➕</span>
                    <span className="action-text">Create New Course</span>
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('students')}>
                    <span className="action-icon">👥</span>
                    <span className="action-text">Manage Students</span>
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('analytics')}>
                    <span className="action-icon">📊</span>
                    <span className="action-text">View Analytics</span>
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('comparison')}>
                    <span className="action-icon">🔍</span>
                    <span className="action-text">Compare Courses</span>
                  </button>
                </div>
              </div>

              {/* Recent Courses */}
              <div className="section-card">
                <div className="section-header">
                  <h2>📚 Recent Courses</h2>
                  <button className="btn-text" onClick={() => setActiveTab('courses')}>
                    View All →
                  </button>
                </div>
                <div className="courses-list-modern">
                  {courses.slice(0, 5).map(course => (
                    <div key={course.id} className="course-card-modern" onClick={() => navigate(`/faculty/courses/${course.id}`)}>
                      <div className="course-card-header">
                        <h3>{course.title}</h3>
                        {getStatusBadge(course.status)}
                      </div>
                      <p className="course-code">{course.courseCode} • {formatAcademicYear(course.academicYear)}</p>
                      <div className="course-meta">
                        <span>📖 {course.learning_flow_steps?.length || 0} Units</span>
                        <span>👥 {course._count?.assignments || 0} Assigned</span>
                        <span>📝 {course._count?.tests || 0} Tests</span>
                      </div>
                      <div className="course-actions">
                        <button className="btn-link">View Details →</button>
                      </div>
                    </div>
                  ))}
                  {courses.length === 0 && (
                    <div className="empty-state-modern">
                      <div className="empty-icon">📚</div>
                      <h3>No Courses Yet</h3>
                      <p>Create your first course to get started</p>
                      <button className="btn-primary" onClick={() => navigate('/faculty/create-course')}>
                        + Create Course
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="section-card">
                <div className="section-header">
                  <h2>⚡ Quick Actions</h2>
                </div>
                <div className="quick-actions-grid">
                  <button className="action-btn" onClick={() => navigate('/faculty/create-course')}>
                    <span className="action-icon">➕</span>
                    <span className="action-text">Create New Course</span>
                  </button>
                  <button className="action-btn" onClick={() => navigate('/faculty/self-paced')}>
                    <span className="action-icon">📚</span>
                    <span className="action-text">Self-Paced Content</span>
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('students')}>
                    <span className="action-icon">👥</span>
                    <span className="action-text">View All Students</span>
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('comparison')}>
                    <span className="action-icon">🔍</span>
                    <span className="action-text">Compare Courses</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="courses-section">
              <div className="section-header-large">
                <div>
                  <h1>📚 My Courses</h1>
                  <p className="subtitle">Manage and track all your courses</p>
                </div>
                <button className="btn-primary" onClick={() => navigate('/faculty/create-course')}>
                  + Create New Course
                </button>
              </div>

              <div className="courses-grid-modern">
                {courses.map(course => (
                  <div key={course.id} className="course-card-full">
                    <div className="course-card-header">
                      <div>
                        <h3>{course.title}</h3>
                        <p className="course-code">{course.courseCode}</p>
                      </div>
                      {getStatusBadge(course.status)}
                    </div>
                    
                    {course.description && (
                      <p className="course-description">{course.description}</p>
                    )}

                    <div className="course-stats-row">
                      <div className="stat-item">
                        <span className="stat-icon">📅</span>
                        <span>{formatAcademicYear(course.academicYear)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">📖</span>
                        <span>{course.learning_flow_steps?.length || 0} Units</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">👥</span>
                        <span>{course._count?.assignments || 0} Students</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">📝</span>
                        <span>{course._count?.tests || 0} Tests</span>
                      </div>
                    </div>

                    <div className="course-actions-row">
                      <button 
                        className="btn-outline-small" 
                        onClick={() => navigate(`/faculty/courses/${course.id}`)}
                      >
                        View Details
                      </button>
                      <button 
                        className="btn-outline-small" 
                        onClick={() => navigate(`/faculty/courses/${course.id}/analytics`)}
                      >
                        📊 Analytics
                      </button>
                      <button 
                        className="btn-outline-small" 
                        onClick={() => navigate(`/faculty/courses/${course.id}/edit`)}
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {courses.length === 0 && (
                <div className="empty-state-large">
                  <div className="empty-icon-large">📚</div>
                  <h2>No Courses Created Yet</h2>
                  <p>Start by creating your first course to manage learning content for students</p>
                  <button className="btn-primary-large" onClick={() => navigate('/faculty/create-course')}>
                    + Create Your First Course
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="students-section">
              <div className="section-card">
                <div className="section-header-large">
                  <div>
                    <h1>👥 Students</h1>
                    <p className="subtitle">View and manage student progress</p>
                  </div>
                  <div className="filter-buttons">
                  <button 
                    className="btn-filter" 
                    onClick={() => loadStudents('all')}
                  >
                    All Students
                  </button>
                  <button 
                    className="btn-filter" 
                    onClick={() => loadStudents('active')}
                  >
                    Active Only
                  </button>
                  <button 
                    className="btn-filter" 
                    onClick={() => loadStudents('assigned')}
                  >
                    Assigned to Me
                  </button>
                </div>
              </div>

              {loadingStudents ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading students...</p>
                </div>
              ) : studentList.length > 0 ? (
                <div className="students-table-container">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Year</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentList.map((student: any) => (
                        <tr key={student.id}>
                          <td className="font-semibold">{student.name}</td>
                          <td>{student.year}</td>
                          <td>{student.email}</td>
                          <td>
                            <span className={`badge badge-${student.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                              {student.status}
                            </span>
                          </td>
                          <td>
                            <div className="progress-bar-inline">
                              <div 
                                className="progress-fill-inline" 
                                style={{ width: `${student.completionRate || 0}%` }}
                              ></div>
                              <span className="progress-text">{student.completionRate || 0}%</span>
                            </div>
                          </td>
                          <td>
                            <button 
                              className="btn-text-small"
                              onClick={() => navigate(`/faculty/students/${student.id}`)}
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state-modern">
                  <div className="empty-icon">👥</div>
                  <h3>No Students Found</h3>
                  <p>Students will appear here once they are assigned to your courses</p>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analyticsData && (
            <div className="analytics-section-wrapper">
              <div className="analytics-header">
                <h1 className="analytics-title">📈 Teaching Analytics</h1>
                <p className="analytics-subtitle">Comprehensive insights into your teaching performance and student outcomes</p>
              </div>

              {/* Key Metrics Cards */}
              <div className="analytics-metrics-grid">
                  <div className="metric-card primary-metric">
                    <div className="metric-icon">👥</div>
                    <div className="metric-content">
                      <div className="metric-value">{analyticsData.overview.uniqueStudents}</div>
                      <div className="metric-label">Total Students</div>
                      <div className="metric-trend">
                        <span className="trend-icon">↗</span>
                        <span className="trend-text">{analyticsData.overview.activeStudentsLast7Days} active (7 days)</span>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card success-metric">
                    <div className="metric-icon">✅</div>
                    <div className="metric-content">
                      <div className="metric-value">{analyticsData.overview.overallCompletionRate.toFixed(1)}%</div>
                      <div className="metric-label">Completion Rate</div>
                      <div className="metric-progress">
                        <div className="mini-progress-bar">
                          <div 
                            className="mini-progress-fill success" 
                            style={{ width: `${analyticsData.overview.overallCompletionRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card info-metric">
                    <div className="metric-icon">📊</div>
                    <div className="metric-content">
                      <div className="metric-value">{analyticsData.overview.averageProgress.toFixed(1)}%</div>
                      <div className="metric-label">Average Progress</div>
                      <div className="metric-progress">
                        <div className="mini-progress-bar">
                          <div 
                            className="mini-progress-fill info" 
                            style={{ width: `${analyticsData.overview.averageProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card warning-metric">
                    <div className="metric-icon">📚</div>
                    <div className="metric-content">
                      <div className="metric-value">{analyticsData.overview.totalCourses || analyticsData.courses?.length || 0}</div>
                      <div className="metric-label">Active Courses</div>
                      <div className="metric-trend">
                        <span className="trend-text">{analyticsData.overview.publishedCourses || 0} published</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Engagement Overview */}
                <div className="engagement-section">
                  <div className="section-header-analytics">
                    <h3>🎯 Student Engagement Overview</h3>
                    <span className="section-subtitle-analytics">Performance metrics across all courses</span>
                  </div>
                  <div className="engagement-card">
                    <div className="engagement-grid">
                      <div className="engagement-metric">
                        <div className="engagement-header">
                          <span className="engagement-title">Course Completion</span>
                          <span className="engagement-percentage">{analyticsData.overview.overallCompletionRate.toFixed(1)}%</span>
                        </div>
                        <div className="engagement-bar-container">
                          <div 
                            className="engagement-bar success"
                            style={{ width: `${analyticsData.overview.overallCompletionRate}%` }}
                          >
                            <span className="bar-label">{analyticsData.overview.completedAssignments || 0} completed</span>
                          </div>
                        </div>
                      </div>

                      <div className="engagement-metric">
                        <div className="engagement-header">
                          <span className="engagement-title">Student Progress</span>
                          <span className="engagement-percentage">{analyticsData.overview.averageProgress.toFixed(1)}%</span>
                        </div>
                        <div className="engagement-bar-container">
                          <div 
                            className="engagement-bar info"
                            style={{ width: `${analyticsData.overview.averageProgress}%` }}
                          >
                            <span className="bar-label">Average across all students</span>
                          </div>
                        </div>
                      </div>

                      <div className="engagement-metric">
                        <div className="engagement-header">
                          <span className="engagement-title">In Progress Assignments</span>
                          <span className="engagement-percentage">{((analyticsData.overview.inProgressAssignments / analyticsData.overview.totalAssignments) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="engagement-bar-container">
                          <div 
                            className="engagement-bar warning"
                            style={{ width: `${(analyticsData.overview.inProgressAssignments / analyticsData.overview.totalAssignments) * 100}%` }}
                          >
                            <span className="bar-label">{analyticsData.overview.inProgressAssignments || 0} in progress</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Performance Analysis */}
                <div className="student-performance-section">
                  <div className="section-header-analytics">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <h3>👨‍🎓 Student Performance Analysis</h3>
                        <span className="section-subtitle-analytics">Individual student progress and achievements</span>
                      </div>
                      <button 
                        className="btn-view-details"
                        onClick={() => {
                          setActiveTab('students');
                          loadStudents('all');
                        }}
                      >
                        View All Students →
                      </button>
                    </div>
                  </div>
                  
                  {studentList.length > 0 ? (
                    <div className="students-performance-table">
                      <table className="performance-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Email</th>
                            <th>Progress</th>
                            <th>Completed</th>
                            <th>In Progress</th>
                            <th>Avg Score</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentList.slice(0, 10).map((student: any) => (
                            <tr key={student.userId} className="performance-row">
                              <td>
                                <div className="student-info-cell">
                                  <div className="student-avatar">{student.name?.charAt(0) || 'S'}</div>
                                  <span className="student-name">{student.name || 'Unknown'}</span>
                                </div>
                              </td>
                              <td className="student-email">{student.email}</td>
                              <td>
                                <div className="progress-cell">
                                  <div className="table-progress-bar">
                                    <div 
                                      className="table-progress-fill"
                                      style={{ width: `${student.progress || 0}%` }}
                                    ></div>
                                  </div>
                                  <span className="progress-percentage">{student.progress || 0}%</span>
                                </div>
                              </td>
                              <td>
                                <span className="stat-badge success-badge">
                                  {student.completedAssignments || 0}
                                </span>
                              </td>
                              <td>
                                <span className="stat-badge warning-badge">
                                  {student.inProgressAssignments || 0}
                                </span>
                              </td>
                              <td>
                                <span className={`score-badge ${
                                  (student.averageScore || 0) >= 70 ? 'excellent' : 
                                  (student.averageScore || 0) >= 50 ? 'good' : 'needs-improvement'
                                }`}>
                                  {student.averageScore || 0}%
                                </span>
                              </td>
                              <td>
                                <span className={`status-indicator ${
                                  student.isActive ? 'active-status' : 'inactive-status'
                                }`}>
                                  {student.isActive ? '🟢 Active' : '⚪ Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {studentList.length > 10 && (
                        <div className="table-footer">
                          <p>Showing 10 of {studentList.length} students</p>
                          <button 
                            className="btn-text-primary"
                            onClick={() => {
                              setActiveTab('students');
                              loadStudents('all');
                            }}
                          >
                            View All →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state-modern">
                      <div className="empty-icon">👨‍🎓</div>
                      <h3>No Student Data Available</h3>
                      <p>Student performance data will appear once students are enrolled in your courses</p>
                      <button 
                        className="btn-primary-large"
                        onClick={() => loadStudents('all')}
                        style={{ marginTop: '1rem' }}
                      >
                        Load Students
                      </button>
                    </div>
                  )}
                </div>

                {/* Course Performance Table */}
                <div className="course-performance-section">
                  <div className="section-header-analytics">
                    <h3>📚 Course Performance Breakdown</h3>
                    <span className="section-subtitle-analytics">Detailed analytics for each course</span>
                  </div>
                    <span className="section-subtitle-analytics">Detailed analytics for each course</span>
                  </div>
                  {analyticsData.courses && analyticsData.courses.length > 0 ? (
                    <div className="courses-performance-grid">
                      {analyticsData.courses.map((course: any) => (
                        <div key={course.id} className="course-performance-card">
                          <div className="course-performance-header">
                            <div className="course-info">
                              <h4>{course.title}</h4>
                              <span className="course-meta">
                                {course.academicYear} • {course.assignmentCount || 0} assignments
                              </span>
                            </div>
                            <button 
                              className="btn-view-details"
                              onClick={() => navigate(`/faculty/courses/${course.id}/analytics`)}
                            >
                              View Details →
                            </button>
                          </div>
                          
                          <div className="course-stats-grid">
                            <div className="course-stat">
                              <div className="stat-icon-small">👥</div>
                              <div>
                                <div className="stat-value-small">{course.enrolledStudents || 0}</div>
                                <div className="stat-label-small">Students</div>
                              </div>
                            </div>

                            <div className="course-stat">
                              <div className="stat-icon-small">✅</div>
                              <div>
                                <div className="stat-value-small">{course.avgCompletion || 0}%</div>
                                <div className="stat-label-small">Completion</div>
                              </div>
                            </div>

                            <div className="course-stat">
                              <div className="stat-icon-small">📊</div>
                              <div>
                                <div className="stat-value-small">{course.avgScore || 0}%</div>
                                <div className="stat-label-small">Avg Score</div>
                              </div>
                            </div>

                            <div className="course-stat">
                              <div className="stat-icon-small">⏱️</div>
                              <div>
                                <div className="stat-value-small">{course.stepCount || 0}</div>
                                <div className="stat-label-small">Steps</div>
                              </div>
                            </div>
                          </div>

                          <div className="course-progress-visual">
                            <div className="progress-segment-container">
                              <div 
                                className="progress-segment completed"
                                style={{ width: `${course.avgCompletion || 0}%` }}
                                title={`Completed: ${course.avgCompletion || 0}%`}
                              ></div>
                              <div 
                                className="progress-segment in-progress"
                                style={{ width: `${100 - (course.avgCompletion || 0)}%` }}
                                title={`Remaining: ${100 - (course.avgCompletion || 0)}%`}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state-modern">
                      <div className="empty-icon">📊</div>
                      <h3>No Course Data Available</h3>
                      <p>Course analytics will appear once you have students enrolled in your courses</p>
                    </div>
                  )}
                </div>
          )}

          {/* Course Comparison Tab */}
          {activeTab === 'comparison' && (
            <div className="comparison-section">
              <div className="section-header-large">
                <h1>🔍 Course Comparison</h1>
                <p className="subtitle">Compare performance across all your courses</p>
              </div>

              {loadingComparison ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading course comparison data...</p>
                </div>
              ) : courseComparison && courseComparison.length > 0 ? (
                <div className="comparison-container">
                  <div className="table-responsive">
                    <table className="comparison-table">
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>Code</th>
                          <th>Year</th>
                          <th>Enrolled</th>
                          <th>Completion</th>
                          <th>Avg Score</th>
                          <th>Pass Rate</th>
                          <th>Learning Units</th>
                          <th>Tests</th>
                          <th>Avg Time (min)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseComparison.map((course, idx) => (
                          <tr key={idx} className="comparison-row">
                            <td className="font-semibold">{course.title}</td>
                            <td className="text-muted">{course.code}</td>
                            <td>{formatAcademicYear(course.year)}</td>
                            <td>{course.enrolledStudents}</td>
                            <td>
                              <div className="progress-bar-inline">
                                <div 
                                  className="progress-fill-inline" 
                                  style={{ width: `${course.avgCompletion}%` }}
                                ></div>
                                <span className="progress-text">{course.avgCompletion}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge badge-${course.avgScore >= 70 ? 'success' : course.avgScore >= 50 ? 'warning' : 'danger'}`}>
                                {course.avgScore}%
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-${course.passRate >= 70 ? 'success' : course.passRate >= 50 ? 'warning' : 'danger'}`}>
                                {course.passRate}%
                              </span>
                            </td>
                            <td>{course.totalLearningUnits}</td>
                            <td>{course.totalTests}</td>
                            <td>{Math.round(course.avgTimeSpentMinutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Comparison Charts */}
                  <div className="comparison-charts">
                    <div className="chart-card">
                      <h3>📊 Completion Rates Comparison</h3>
                      <div className="chart-bars">
                        {courseComparison.slice(0, 5).map((course, idx) => (
                          <div key={idx} className="chart-bar-item">
                            <span className="chart-label">{course.title}</span>
                            <div className="chart-bar-container">
                              <div 
                                className="chart-bar-fill" 
                                style={{ 
                                  width: `${course.avgCompletion}%`,
                                  background: course.avgCompletion >= 70 ? '#10b981' : course.avgCompletion >= 50 ? '#f59e0b' : '#ef4444'
                                }}
                              ></div>
                            </div>
                            <span className="chart-value">{course.avgCompletion}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="chart-card">
                      <h3>🎯 Average Scores Comparison</h3>
                      <div className="chart-bars">
                        {courseComparison.slice(0, 5).map((course, idx) => (
                          <div key={idx} className="chart-bar-item">
                            <span className="chart-label">{course.title}</span>
                            <div className="chart-bar-container">
                              <div 
                                className="chart-bar-fill" 
                                style={{ 
                                  width: `${course.avgScore}%`,
                                  background: course.avgScore >= 70 ? '#10b981' : course.avgScore >= 50 ? '#f59e0b' : '#ef4444'
                                }}
                              ></div>
                            </div>
                            <span className="chart-value">{course.avgScore}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Best/Worst Performers */}
                  <div className="performance-summary">
                    <div className="performance-card best">
                      <h3>🏆 Best Performing Course</h3>
                      {courseComparison.length > 0 && (() => {
                        const best = courseComparison.reduce((prev, current) => 
                          (prev.avgScore > current.avgScore) ? prev : current
                        );
                        return (
                          <div className="performance-details">
                            <h4>{best.title}</h4>
                            <div className="performance-stats">
                              <div className="perf-stat">
                                <span className="perf-label">Avg Score</span>
                                <span className="perf-value success">{best.avgScore}%</span>
                              </div>
                              <div className="perf-stat">
                                <span className="perf-label">Pass Rate</span>
                                <span className="perf-value success">{best.passRate}%</span>
                              </div>
                              <div className="perf-stat">
                                <span className="perf-label">Completion</span>
                                <span className="perf-value success">{best.avgCompletion}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="performance-card needs-attention">
                      <h3>⚠️ Needs Attention</h3>
                      {courseComparison.length > 0 && (() => {
                        const worst = courseComparison.reduce((prev, current) => 
                          (prev.avgScore < current.avgScore) ? prev : current
                        );
                        return (
                          <div className="performance-details">
                            <h4>{worst.title}</h4>
                            <div className="performance-stats">
                              <div className="perf-stat">
                                <span className="perf-label">Avg Score</span>
                                <span className="perf-value warning">{worst.avgScore}%</span>
                              </div>
                              <div className="perf-stat">
                                <span className="perf-label">Pass Rate</span>
                                <span className="perf-value warning">{worst.passRate}%</span>
                              </div>
                              <div className="perf-stat">
                                <span className="perf-label">Completion</span>
                                <span className="perf-value warning">{worst.avgCompletion}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state-large">
                  <div className="empty-icon-large">🔍</div>
                  <h2>No Comparison Data Available</h2>
                  <p>Course comparison data will appear once you have multiple courses with student activity</p>
                </div>
              )}
            </div>
          )}

          {/* Self-Paced Learning Tab */}
          {activeTab === 'self-paced' && (
            <div className="self-paced-section">
              <div className="section-card">
                <div className="section-header-large">
                  <div>
                    <h1>📚 Self-Paced Learning</h1>
                    <p className="subtitle">Explore and manage self-paced courses</p>
                  </div>
                  <button 
                    className="btn-primary-large" 
                    onClick={() => navigate('/faculty/self-paced')}
                  >
                    View All Self-Paced Courses →
                  </button>
                </div>

                <div className="empty-state-large">
                  <div className="empty-icon-large">🎓</div>
                  <h2>Self-Paced Learning Portal</h2>
                  <p>Access the dedicated self-paced learning section to create, manage, and track self-paced courses for students.</p>
                  <button 
                    className="btn-primary-large" 
                    onClick={() => navigate('/faculty/self-paced')}
                  >
                    Go to Self-Paced Portal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Modal */}
        <ProfileModal
          user={user}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />

        {/* Student List Modal */}
        {showStudentModal && (
          <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
            <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{getModalTitle()}</h2>
                <button className="modal-close" onClick={() => setShowStudentModal(false)}>×</button>
              </div>
              <div className="modal-body">
                {loadingStudents ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                  </div>
                ) : modalType === 'assignments' ? (
                  <div className="assignments-list">
                    {analyticsData?.courses?.map((course: any) => (
                      <div key={course.id} className="assignment-item">
                        <h4>{course.title}</h4>
                        <p>{course.enrolledStudents} students assigned</p>
                        <button 
                          className="btn-text"
                          onClick={() => {
                            setShowStudentModal(false);
                            navigate(`/faculty/courses/${course.id}`);
                          }}
                        >
                          View Course →
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Year</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentList.map((student: any) => (
                        <tr key={student.id}>
                          <td className="font-semibold">{student.name}</td>
                          <td>{student.year}</td>
                          <td>{student.email}</td>
                          <td>
                            <span className={`badge badge-${student.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                              {student.status}
                            </span>
                          </td>
                          <td>
                            <div className="progress-bar-inline">
                              <div 
                                className="progress-fill-inline" 
                                style={{ width: `${student.completionRate || 0}%` }}
                              ></div>
                              <span className="progress-text">{student.completionRate || 0}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowStudentModal(false)}>
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

export default FacultyDashboard;
