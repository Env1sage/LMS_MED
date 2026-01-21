import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService } from '../services/course.service';
import '../styles/CourseAnalytics.css';

interface AnalyticsData {
  totalAssigned: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
  studentDetails: Array<{
    studentId: string;
    studentName: string;
    email: string;
    assignedAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
    status: string;
    progress: number;
  }>;
}

const CourseAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadAnalytics();
  }, [id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [courseData, analyticsData] = await Promise.all([
        courseService.getById(id!),
        courseService.getAnalytics(id!)
      ]);
      setCourse(courseData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStudents = () => {
    if (!analytics) return [];
    
    let filtered = analytics.studentDetails;

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(student => student.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        student.studentName.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; class: string } } = {
      'COMPLETED': { label: 'Completed', class: 'success' },
      'IN_PROGRESS': { label: 'In Progress', class: 'warning' },
      'ASSIGNED': { label: 'Assigned', class: 'secondary' }
    };
    
    const statusInfo = statusMap[status] || { label: status, class: 'secondary' };
    return <span className={`badge badge-${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return <div className="analytics-container"><div className="loading">Loading...</div></div>;
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/faculty')} className="btn btn-secondary">Back to Dashboard</button>
      </div>
    );
  }

  if (!analytics) {
    return <div className="analytics-container"><div className="error-message">Analytics not found</div></div>;
  }

  const filteredStudents = getFilteredStudents();

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1>Course Analytics</h1>
          <p className="course-title">{course?.title} - {course?.academicYear}</p>
        </div>
        <button onClick={() => navigate('/faculty')} className="btn btn-secondary">Back to Dashboard</button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <span>👥</span>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Assigned</div>
            <div className="stat-value">{analytics.totalAssigned}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <span>✅</span>
          </div>
          <div className="stat-info">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{analytics.completed}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            <span>⏳</span>
          </div>
          <div className="stat-info">
            <div className="stat-label">In Progress</div>
            <div className="stat-value">{analytics.inProgress}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' }}>
            <span>⭕</span>
          </div>
          <div className="stat-info">
            <div className="stat-label">Not Started</div>
            <div className="stat-value">{analytics.notStarted}</div>
          </div>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="analytics-section">
        <h2>Overall Completion Rate</h2>
        <div className="completion-rate-card">
          <div className="completion-circle">
            <svg width="200" height="200">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="20"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="20"
                strokeDasharray={`${2 * Math.PI * 80 * analytics.completionRate / 100} ${2 * Math.PI * 80}`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
              <text x="100" y="105" textAnchor="middle" fontSize="36" fontWeight="bold" fill="#1f2937">
                {analytics.completionRate.toFixed(1)}%
              </text>
            </svg>
          </div>
          <p className="completion-text">
            {analytics.completed} out of {analytics.totalAssigned} students have completed the course
          </p>
        </div>
      </div>

      {/* Student Details */}
      <div className="analytics-section">
        <h2>Student Progress Details</h2>
        
        <div className="filters-row">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Status</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="empty-state">
            <p>No students found matching your filters</p>
          </div>
        ) : (
          <div className="students-table">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Assigned Date</th>
                  <th>Started Date</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.studentId}>
                    <td>{student.studentName}</td>
                    <td>{student.email}</td>
                    <td>{formatDate(student.assignedAt)}</td>
                    <td>{formatDate(student.startedAt)}</td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-bar-container">
                          <div 
                            className="progress-bar-fill" 
                            style={{ 
                              width: `${student.progress}%`,
                              backgroundColor: getProgressColor(student.progress)
                            }}
                          ></div>
                        </div>
                        <span className="progress-text">{student.progress.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(student.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="results-count">
          Showing {filteredStudents.length} of {analytics.studentDetails.length} students
        </div>
      </div>
    </div>
  );
};

export default CourseAnalytics;
