import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/course.service';
import '../styles/FacultyDashboard.css';

const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'analytics'>('overview');
  const [courses, setCourses] = useState<any[]>([]);
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

  useEffect(() => {
    loadData();
  }, []);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
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
            <button className="btn btn-secondary" onClick={handleLogout} style={{ marginLeft: '10px' }}>
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
                              <button
                                className="btn-icon"
                                onClick={() => navigate(`/faculty/assign-course/${course.id}`)}
                                title="Assign Students"
                              >
                                👥
                              </button>
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
              <h3>Course Performance Overview</h3>
              <p>Select a course from the "My Courses" tab to view detailed analytics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
