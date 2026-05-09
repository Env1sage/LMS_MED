import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/course.service';
import { facultyAnalyticsService, DashboardOverview, StudentInfo } from '../services/faculty-analytics.service';
import { useAuth } from '../context/AuthContext';
import ProfileModal from '../components/common/ProfileModal';
import { NotificationBell } from '../components/notifications';
import './FacultyDashboard.css';

const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'analytics' | 'self-paced'>('overview');
  const [courses, setCourses] = useState<any[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<DashboardOverview | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [modalType, setModalType] = useState<'students' | 'assignments' | 'active' | 'progress'>('students');
  const [studentList, setStudentList] = useState<StudentInfo[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [stats, setStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    totalAssignments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    academicYear: '',
    search: '',
  });
  const [courseFilters, setCourseFilters] = useState({
    academicYear: 'all',
    status: 'all',
    hasAssignments: 'all',
  });
  const [showOnlyWithAssignments, setShowOnlyWithAssignments] = useState(false);

  useEffect(() => {
    loadData();
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await facultyAnalyticsService.getDashboardOverview();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
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
    // Load appropriate data based on type
    if (type === 'students' || type === 'progress') {
      loadStudents('all');
    } else if (type === 'active') {
      loadStudents('active');
    }
    // For 'assignments', we use analyticsData.courses directly, no API call needed
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await courseService.getAll();
      setCourses(data.data || []);
      
      // Calculate stats
      const total = data.data.length;
      const published = data.data.filter((c: any) => c.status === 'PUBLISHED').length;
      const draft = data.data.filter((c: any) => c.status === 'DRAFT').length;
      const assignments = data.data.reduce((sum: number, c: any) => sum + (c._count?.assignments || 0), 0);
      
      setStats({
        totalCourses: total,
        publishedCourses: published,
        draftCourses: draft,
        totalAssignments: assignments,
      });
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

  const handlePublish = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to publish this course? Once published, the learning flow cannot be modified.')) {
      return;
    }

    try {
      await courseService.publish(courseId);
      loadData();
      alert('Course published successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish course');
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      await courseService.delete(courseId);
      loadData();
      alert('Course deleted successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete course');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      DRAFT: <span className="badge badge-warning">Draft</span>,
      PUBLISHED: <span className="badge badge-success">Published</span>,
      ARCHIVED: <span className="badge badge-secondary">Archived</span>,
    };
    return badges[status] || status;
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

  const filteredCourses = courses.filter(course => {
    if (filters.status && course.status !== filters.status) return false;
    if (filters.academicYear && course.academicYear !== filters.academicYear) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return course.title.toLowerCase().includes(searchLower) ||
             course.description?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="faculty-dashboard">
        <div className="loading">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="faculty-dashboard">
      <div className="dashboard-inner">
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Faculty Portal</h1>
            <p>Create and manage structured learning journeys</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => navigate('/faculty/create-course')}>
              + Create Course
            </button>
            <NotificationBell />
            <button className="btn btn-outline" onClick={() => setShowProfileModal(true)} style={{ marginLeft: '10px' }}>
              👤 Profile
            </button>
            <button className="btn btn-secondary" onClick={handleLogout} style={{ marginLeft: '10px' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Profile Modal */}
        <ProfileModal
          user={user}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />

        {error && (
          <div className="alert alert-danger">
            {error}
            <button onClick={() => setError(null)}>×</button>
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
            className={`tab ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            My Courses
          </button>
          <button
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button
            className={`tab ${activeTab === 'self-paced' ? 'active' : ''}`}
            onClick={() => navigate('/faculty/self-paced')}
          >
            📚 Self-Paced Content
          </button>
        </div>

        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📚</div>
                  <div className="stat-details">
                    <div className="stat-value">{stats.totalCourses}</div>
                    <div className="stat-label">Total Courses</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-details">
                    <div className="stat-value">{stats.publishedCourses}</div>
                    <div className="stat-label">Published</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📝</div>
                  <div className="stat-details">
                    <div className="stat-value">{stats.draftCourses}</div>
                    <div className="stat-label">Drafts</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-details">
                    <div className="stat-value">{stats.totalAssignments}</div>
                    <div className="stat-label">Assignments</div>
                  </div>
                </div>
              </div>

              <div className="recent-courses">
                <h3>Recent Courses</h3>
                {courses.slice(0, 5).map(course => (
                  <div key={course.id} className="course-summary-card">
                    <div className="course-summary-header">
                      <h4>{course.title}</h4>
                      {getStatusBadge(course.status)}
                    </div>
                    <div className="course-summary-meta">
                      <span>{formatAcademicYear(course.academicYear)}</span>
                      <span>•</span>
                      <span>{course.learning_flow_steps?.length || 0} steps</span>
                      <span>•</span>
                      <span>{course._count?.assignments || 0} assignments</span>
                    </div>
                    <div className="course-summary-actions">
                      <button className="btn-link" onClick={() => navigate(`/faculty/courses/${course.id}`)}>
                        View Details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'courses' && (
            <>
              <div className="filters">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <select
                  value={filters.academicYear}
                  onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
                >
                  <option value="">All Years</option>
                  <option value="FIRST_YEAR">1st Year</option>
                  <option value="SECOND_YEAR">2nd Year</option>
                  <option value="THIRD_YEAR">3rd Year</option>
                  <option value="FOURTH_YEAR">4th Year</option>
                  <option value="FIFTH_YEAR">5th Year</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>

              <div className="courses-table">
                <table>
                  <thead>
                    <tr>
                      <th>Course Title</th>
                      <th>Academic Year</th>
                      <th>Steps</th>
                      <th>Assignments</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map(course => (
                      <tr key={course.id}>
                        <td>
                          <div className="course-title-cell">
                            <strong>{course.title}</strong>
                            {course.description && (
                              <small>{course.description.substring(0, 60)}...</small>
                            )}
                          </div>
                        </td>
                        <td>{formatAcademicYear(course.academicYear)}</td>
                        <td>{course.learning_flow_steps?.length || 0}</td>
                        <td>{course._count?.assignments || 0}</td>
                        <td>{getStatusBadge(course.status)}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-icon"
                              onClick={() => navigate(`/faculty/courses/${course.id}`)}
                              title="View Details"
                            >
                              👁️
                            </button>
                            {course.status === 'DRAFT' && (
                              <>
                                <button
                                  className="btn-icon"
                                  onClick={() => navigate(`/faculty/edit-course/${course.id}`)}
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn-icon"
                                  onClick={() => handlePublish(course.id)}
                                  title="Publish"
                                >
                                  🚀
                                </button>
                              </>
                            )}
                            {course.status === 'PUBLISHED' && (
                              <>
                                <button
                                  className="btn-icon"
                                  onClick={() => navigate(`/faculty/assign-course/${course.id}`)}
                                  title="Assign Students"
                                >
                                  👥
                                </button>
                                <button
                                  className="btn-icon"
                                  onClick={() => navigate(`/faculty/courses/${course.id}/tracking`)}
                                  title="Student Tracking"
                                >
                                  📈
                                </button>
                              </>
                            )}
                            <button
                              className="btn-icon"
                              onClick={() => navigate(`/faculty/courses/${course.id}/analytics`)}
                              title="Analytics"
                            >
                              📊
                            </button>
                            {course.status === 'DRAFT' && course._count?.assignments === 0 && (
                              <button
                                className="btn-icon btn-danger"
                                onClick={() => handleDelete(course.id)}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCourses.length === 0 && (
                  <div className="empty-state">
                    <p>No courses found</p>
                    <button className="btn btn-primary" onClick={() => navigate('/faculty/create-course')}>
                      Create Your First Course
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-overview">
              <h3>Student Analytics & Performance</h3>
              
              {analyticsData ? (
                <div className="analytics-grid">
                  {/* Key Metrics Cards */}
                  <div className="analytics-cards">
                    <div 
                      className="analytics-card clickable"
                      onClick={() => handleCardClick('students')}
                    >
                      <div className="card-icon">👥</div>
                      <div className="card-content">
                        <h4>Total Students</h4>
                        <div className="card-value">{analyticsData.overview.uniqueStudents}</div>
                        <p className="card-subtitle">Across all courses</p>
                      </div>
                    </div>

                    <div 
                      className="analytics-card clickable"
                      onClick={() => handleCardClick('assignments')}
                    >
                      <div className="card-icon">📚</div>
                      <div className="card-content">
                        <h4>Active Assignments</h4>
                        <div className="card-value">{analyticsData.overview.totalAssignments}</div>
                        <p className="card-subtitle">
                          {analyticsData.overview.completedAssignments} completed
                        </p>
                      </div>
                    </div>

                    <div 
                      className="analytics-card clickable"
                      onClick={() => handleCardClick('progress')}
                      title="Click to see student progress breakdown"
                    >
                      <div className="card-icon">📊</div>
                      <div className="card-content">
                        <h4>Average Progress</h4>
                        <div className="card-value">
                          {analyticsData.overview.averageProgress || 0}%
                        </div>
                        <p className="card-subtitle">
                          {analyticsData.overview.completedAssignments} fully completed
                        </p>
                      </div>
                    </div>

                    <div 
                      className="analytics-card clickable"
                      onClick={() => handleCardClick('active')}
                    >
                      <div className="card-icon">🔥</div>
                      <div className="card-content">
                        <h4>Active Students</h4>
                        <div className="card-value">
                          {analyticsData.overview.activeStudentsLast7Days}
                        </div>
                        <p className="card-subtitle">Last 7 days</p>
                      </div>
                    </div>
                  </div>

                  {/* Course Performance Section with Filters and Chart */}
                  <div className="course-performance-table">
                    <h4>📊 Course-wise Performance</h4>
                    
                    {/* Filters Bar */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '15px', 
                      marginBottom: '20px', 
                      padding: '15px', 
                      background: '#f8fafc', 
                      borderRadius: '8px',
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Academic Year</label>
                        <select
                          value={courseFilters.academicYear}
                          onChange={(e) => setCourseFilters({ ...courseFilters, academicYear: e.target.value })}
                          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', minWidth: '130px' }}
                        >
                          <option value="all">All Years</option>
                          <option value="YEAR_1">Year 1</option>
                          <option value="YEAR_2">Year 2</option>
                          <option value="YEAR_3">Year 3</option>
                          <option value="YEAR_4">Year 4</option>
                        </select>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Status</label>
                        <select
                          value={courseFilters.status}
                          onChange={(e) => setCourseFilters({ ...courseFilters, status: e.target.value })}
                          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', minWidth: '130px' }}
                        >
                          <option value="all">All Status</option>
                          <option value="PUBLISHED">Published</option>
                          <option value="DRAFT">Draft</option>
                        </select>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Assignments</label>
                        <select
                          value={courseFilters.hasAssignments}
                          onChange={(e) => setCourseFilters({ ...courseFilters, hasAssignments: e.target.value })}
                          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', minWidth: '150px' }}
                        >
                          <option value="all">All Courses</option>
                          <option value="with">With Assignments</option>
                          <option value="without">Without Assignments</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={() => setCourseFilters({ academicYear: 'all', status: 'all', hasAssignments: 'all' })}
                        style={{ 
                          padding: '8px 16px', 
                          borderRadius: '6px', 
                          border: '1px solid #e2e8f0', 
                          background: 'white',
                          cursor: 'pointer',
                          marginTop: 'auto'
                        }}
                      >
                        🔄 Reset
                      </button>
                      
                      <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#64748b', marginTop: 'auto' }}>
                        Showing {analyticsData.courses.filter(course => {
                          if (courseFilters.academicYear !== 'all' && course.academicYear !== courseFilters.academicYear) return false;
                          if (courseFilters.status !== 'all' && course.status !== courseFilters.status) return false;
                          if (courseFilters.hasAssignments === 'with' && course.assignmentCount === 0) return false;
                          if (courseFilters.hasAssignments === 'without' && course.assignmentCount > 0) return false;
                          return true;
                        }).length} of {analyticsData.courses.length} courses
                      </div>
                    </div>

                    {/* Course Distribution Chart */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '15px', 
                      marginBottom: '20px',
                      padding: '15px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px',
                      color: 'white'
                    }}>
                      <div style={{ textAlign: 'center', padding: '15px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                          {analyticsData.courses.filter(c => c.academicYear === 'YEAR_1').length}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Year 1 Courses</div>
                        <div style={{ 
                          height: '6px', 
                          background: 'rgba(255,255,255,0.3)', 
                          borderRadius: '3px', 
                          marginTop: '8px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${(analyticsData.courses.filter(c => c.academicYear === 'YEAR_1').length / analyticsData.courses.length * 100)}%`,
                            background: '#4ade80',
                            borderRadius: '3px'
                          }}/>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '15px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                          {analyticsData.courses.filter(c => c.academicYear === 'YEAR_2').length}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Year 2 Courses</div>
                        <div style={{ 
                          height: '6px', 
                          background: 'rgba(255,255,255,0.3)', 
                          borderRadius: '3px', 
                          marginTop: '8px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${(analyticsData.courses.filter(c => c.academicYear === 'YEAR_2').length / analyticsData.courses.length * 100)}%`,
                            background: '#60a5fa',
                            borderRadius: '3px'
                          }}/>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '15px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                          {analyticsData.courses.filter(c => c.assignmentCount > 0).length}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>With Assignments</div>
                        <div style={{ 
                          height: '6px', 
                          background: 'rgba(255,255,255,0.3)', 
                          borderRadius: '3px', 
                          marginTop: '8px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${(analyticsData.courses.filter(c => c.assignmentCount > 0).length / analyticsData.courses.length * 100)}%`,
                            background: '#fbbf24',
                            borderRadius: '3px'
                          }}/>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '15px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                          {analyticsData.courses.reduce((sum, c) => sum + c.assignmentCount, 0)}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Assignments</div>
                        <div style={{ 
                          height: '6px', 
                          background: 'rgba(255,255,255,0.3)', 
                          borderRadius: '3px', 
                          marginTop: '8px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            width: '100%',
                            background: '#f472b6',
                            borderRadius: '3px'
                          }}/>
                        </div>
                      </div>
                    </div>

                    <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <table className="performance-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ position: 'sticky', top: 0, background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', zIndex: 10 }}>Course Title</th>
                            <th style={{ position: 'sticky', top: 0, background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', zIndex: 10 }}>Academic Year</th>
                            <th style={{ position: 'sticky', top: 0, background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', zIndex: 10 }}>Status</th>
                            <th style={{ position: 'sticky', top: 0, background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', zIndex: 10 }}>Assignments</th>
                            <th style={{ position: 'sticky', top: 0, background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', zIndex: 10 }}>Steps</th>
                            <th style={{ position: 'sticky', top: 0, background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', zIndex: 10 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.courses
                            .filter(course => {
                              if (courseFilters.academicYear !== 'all' && course.academicYear !== courseFilters.academicYear) return false;
                              if (courseFilters.status !== 'all' && course.status !== courseFilters.status) return false;
                              if (courseFilters.hasAssignments === 'with' && course.assignmentCount === 0) return false;
                              if (courseFilters.hasAssignments === 'without' && course.assignmentCount > 0) return false;
                              return true;
                            })
                            .map((course) => (
                            <tr key={course.id}>
                              <td>
                                <strong>{course.title}</strong>
                              </td>
                              <td>
                                <span className="badge badge-info">
                                  {course.academicYear}
                                </span>
                              </td>
                              <td>
                                <span className={`badge badge-${course.status.toLowerCase()}`}>
                                  {course.status}
                                </span>
                              </td>
                              <td className="text-center">{course.assignmentCount}</td>
                              <td className="text-center">{course.stepCount}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => navigate(`/faculty/courses/${course.id}/analytics`)}
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {analyticsData.courses.filter(course => {
                        if (courseFilters.academicYear !== 'all' && course.academicYear !== courseFilters.academicYear) return false;
                        if (courseFilters.status !== 'all' && course.status !== courseFilters.status) return false;
                        if (courseFilters.hasAssignments === 'with' && course.assignmentCount === 0) return false;
                        if (courseFilters.hasAssignments === 'without' && course.assignmentCount > 0) return false;
                        return true;
                      }).length === 0 && (
                        <div className="no-data" style={{ padding: '40px', textAlign: 'center' }}>
                          <p>No courses match the selected filters</p>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setCourseFilters({ academicYear: 'all', status: 'all', hasAssignments: 'all' })}
                          >
                            Reset Filters
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="analytics-actions">
                    <h4>📈 Quick Actions</h4>
                    <div className="action-buttons">
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => navigate('/faculty/courses')}
                      >
                        View All Courses
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => setActiveTab('courses')}
                      >
                        Create New Course
                      </button>
                      <button
                        className="btn btn-outline-info"
                        onClick={() => loadAnalytics()}
                      >
                        Refresh Data
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="loading-state">
                  <p>Loading analytics data...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      {showStudentModal && (
        <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === 'students' && '👥 All Students'}
                {modalType === 'assignments' && '📚 Active Assignments'}
                {modalType === 'active' && '🔥 Active Students (Last 7 Days)'}
                {modalType === 'progress' && '📊 Student Progress Breakdown'}
              </h3>
              <button className="modal-close" onClick={() => setShowStudentModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {modalType === 'assignments' ? (
                /* Show Courses for Assignments Modal */
                analyticsData && analyticsData.courses.length > 0 ? (
                  <div className="student-list-container">
                    <table className="student-list-table">
                      <thead>
                        <tr>
                          <th>Course Title</th>
                          <th>Academic Year</th>
                          <th>Status</th>
                          <th>Assignments</th>
                          <th>Steps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.courses.filter(c => c.assignmentCount > 0).map((course) => (
                          <tr key={course.id}>
                            <td>
                              <div className="student-info">
                                <div className="student-avatar" style={{ backgroundColor: '#4f46e5' }}>
                                  📚
                                </div>
                                <span>{course.title}</span>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-info">
                                {course.academicYear.replace('YEAR_', 'Year ')}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${course.status.toLowerCase()}`}>
                                {course.status}
                              </span>
                            </td>
                            <td>
                              <strong>{course.assignmentCount}</strong> students
                            </td>
                            <td>{course.stepCount} steps</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                    <h4>No active assignments</h4>
                    <p className="text-muted">No courses have students assigned yet</p>
                  </div>
                )
              ) : loadingStudents ? (
                <div className="loading-state" style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="spinner"></div>
                  <p>Loading students...</p>
                </div>
              ) : studentList.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                  <h4>No students found</h4>
                  <p className="text-muted">
                    {modalType === 'active' 
                      ? 'No students have been active in the last 7 days'
                      : 'No students are currently enrolled in your courses'}
                  </p>
                </div>
              ) : (
                <div className="student-list-container">
                  {modalType === 'progress' && analyticsData && (
                    <div style={{ 
                      display: 'flex', 
                      gap: '20px', 
                      marginBottom: '20px', 
                      padding: '15px', 
                      background: '#f8fafc', 
                      borderRadius: '8px' 
                    }}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                          {analyticsData.overview.completedAssignments}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Completed</div>
                      </div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                          {analyticsData.overview.inProgressAssignments}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>In Progress</div>
                      </div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                          {analyticsData.overview.notStartedAssignments}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Not Started</div>
                      </div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>
                          {analyticsData.overview.averageProgress}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Average</div>
                      </div>
                    </div>
                  )}
                  <table className="student-list-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Academic Year</th>
                        <th>Courses</th>
                        <th>Progress</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(modalType === 'progress' 
                        ? [...studentList].sort((a, b) => b.progress - a.progress)
                        : studentList
                      ).map((student) => (
                        <tr key={student.id}>
                          <td>
                            <div className="student-info">
                              <div className="student-avatar">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <span>{student.name}</span>
                            </div>
                          </td>
                          <td className="text-muted">{student.email}</td>
                          <td>{student.academicYear.replace('YEAR_', 'Year ')}</td>
                          <td>
                            <span title={student.courseNames.join(', ')}>
                              {student.coursesEnrolled} course{student.coursesEnrolled !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${student.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {student.progress}%
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${student.status.toLowerCase().replace('_', '-')}`}>
                              {student.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStudentModal(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/faculty/courses')}>
                View All Courses
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <ProfileModal 
          user={user}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)} 
        />
      )}
    </div>
  );
};

export default FacultyDashboard;
