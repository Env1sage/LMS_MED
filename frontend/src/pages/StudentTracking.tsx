import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { facultyAnalyticsService, CourseAnalytics, StudentDetail, BatchSummary } from '../services/faculty-analytics.service';
import '../styles/FacultyPortal.css';

const StudentTracking: React.FC = () => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'steps' | 'batches'>('overview');
  const [studentFilter, setStudentFilter] = useState({
    status: '',
    search: '',
  });
  const [sortBy, setSortBy] = useState<{ field: string; order: 'asc' | 'desc' }>({
    field: 'progressPercent',
    order: 'desc',
  });

  useEffect(() => {
    if (courseId) {
      loadData();
    }
  }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsData, batchData] = await Promise.all([
        facultyAnalyticsService.getCourseAnalytics(courseId!),
        facultyAnalyticsService.getBatchSummary(courseId!),
      ]);
      setAnalytics(analyticsData);
      setBatchSummary(batchData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (format: 'summary' | 'detailed' | 'csv') => {
    try {
      if (format === 'csv') {
        await facultyAnalyticsService.downloadCsvReport(courseId!);
      } else {
        const report = await facultyAnalyticsService.generateReport(courseId!, format);
        // Download as JSON
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `course-report-${format}-${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err: any) {
      alert('Failed to download report');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      COMPLETED: { class: 'badge-success', label: 'Completed' },
      IN_PROGRESS: { class: 'badge-warning', label: 'In Progress' },
      NOT_STARTED: { class: 'badge-secondary', label: 'Not Started' },
      ASSIGNED: { class: 'badge-info', label: 'Assigned' },
    };
    const badge = badges[status] || { class: 'badge-secondary', label: status };
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  const getStepTypeBadge = (type: string) => {
    const badges: Record<string, { class: string; icon: string }> = {
      VIDEO: { class: 'badge-video', icon: '🎬' },
      BOOK: { class: 'badge-book', icon: '📚' },
      MCQ: { class: 'badge-mcq', icon: '❓' },
      NOTES: { class: 'badge-notes', icon: '📝' },
    };
    const badge = badges[type] || { class: 'badge-secondary', icon: '📄' };
    return <span className={`badge ${badge.class}`}>{badge.icon} {type}</span>;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredStudents = analytics?.studentDetails.filter(student => {
    if (studentFilter.status && student.status !== studentFilter.status) return false;
    if (studentFilter.search) {
      const search = studentFilter.search.toLowerCase();
      return (
        student.studentName.toLowerCase().includes(search) ||
        student.enrollmentNumber?.toLowerCase().includes(search) ||
        student.email?.toLowerCase().includes(search)
      );
    }
    return true;
  }).sort((a, b) => {
    const field = sortBy.field as keyof StudentDetail;
    const aVal = a[field] ?? '';
    const bVal = b[field] ?? '';
    if (sortBy.order === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  }) || [];

  if (loading) {
    return (
      <div className="student-tracking">
        <div className="loading">Loading analytics...</div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="student-tracking">
        <div className="alert alert-danger">
          {error || 'Failed to load data'}
          <button onClick={() => navigate('/faculty')}>← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-tracking">
      <div className="tracking-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/faculty')}>
            ← Back
          </button>
        </div>
        <div className="header-center">
          <h1>📊 {analytics.courseTitle}</h1>
          <p>Student Progress & Analytics</p>
        </div>
        <div className="header-right">
          <div className="dropdown">
            <button className="btn btn-secondary">📥 Download Report ▼</button>
            <div className="dropdown-content">
              <button onClick={() => handleDownloadReport('summary')}>Summary (JSON)</button>
              <button onClick={() => handleDownloadReport('detailed')}>Detailed (JSON)</button>
              <button onClick={() => handleDownloadReport('csv')}>Student List (CSV)</button>
            </div>
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <div className="card-value">{analytics.summary.totalAssigned}</div>
            <div className="card-label">Total Enrolled</div>
          </div>
        </div>
        <div className="summary-card success">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <div className="card-value">{analytics.summary.completed}</div>
            <div className="card-label">Completed</div>
          </div>
        </div>
        <div className="summary-card warning">
          <div className="card-icon">🔄</div>
          <div className="card-content">
            <div className="card-value">{analytics.summary.inProgress}</div>
            <div className="card-label">In Progress</div>
          </div>
        </div>
        <div className="summary-card secondary">
          <div className="card-icon">⏸️</div>
          <div className="card-content">
            <div className="card-value">{analytics.summary.notStarted}</div>
            <div className="card-label">Not Started</div>
          </div>
        </div>
        <div className="summary-card primary">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <div className="card-value">{analytics.summary.completionRate}%</div>
            <div className="card-label">Completion Rate</div>
          </div>
        </div>
      </div>

      <div className="tracking-tabs">
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
          Students ({analytics.summary.totalAssigned})
        </button>
        <button
          className={`tab ${activeTab === 'steps' ? 'active' : ''}`}
          onClick={() => setActiveTab('steps')}
        >
          Steps ({analytics.summary.totalSteps})
        </button>
        <button
          className={`tab ${activeTab === 'batches' ? 'active' : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          Batches ({batchSummary.length})
        </button>
      </div>

      <div className="tracking-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="progress-distribution">
              <h3>Progress Distribution</h3>
              <div className="distribution-bar">
                <div
                  className="bar-segment completed"
                  style={{ width: `${(analytics.summary.completed / analytics.summary.totalAssigned) * 100}%` }}
                  title={`Completed: ${analytics.summary.completed}`}
                />
                <div
                  className="bar-segment in-progress"
                  style={{ width: `${(analytics.summary.inProgress / analytics.summary.totalAssigned) * 100}%` }}
                  title={`In Progress: ${analytics.summary.inProgress}`}
                />
                <div
                  className="bar-segment not-started"
                  style={{ width: `${(analytics.summary.notStarted / analytics.summary.totalAssigned) * 100}%` }}
                  title={`Not Started: ${analytics.summary.notStarted}`}
                />
              </div>
              <div className="distribution-legend">
                <span className="legend-item"><span className="dot completed"></span> Completed</span>
                <span className="legend-item"><span className="dot in-progress"></span> In Progress</span>
                <span className="legend-item"><span className="dot not-started"></span> Not Started</span>
              </div>
            </div>

            <div className="step-completion-overview">
              <h3>Step Completion Overview</h3>
              <div className="steps-grid">
                {analytics.stepAnalytics.map((step) => (
                  <div key={step.stepId} className="step-card">
                    <div className="step-header">
                      <span className="step-number">Step {step.stepNumber}</span>
                      {getStepTypeBadge(step.stepType)}
                      {step.mandatory && <span className="mandatory-badge">Required</span>}
                    </div>
                    <div className="step-title">{step.learningUnit.title}</div>
                    <div className="step-stats">
                      <div className="stat">
                        <span className="stat-value">{step.completionRate}%</span>
                        <span className="stat-label">Completion</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{step.completedCount}/{analytics.summary.totalAssigned}</span>
                        <span className="stat-label">Completed</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{formatTime(step.avgTimeSpent)}</span>
                        <span className="stat-label">Avg Time</span>
                      </div>
                    </div>
                    <div className="step-progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${step.completionRate}%` }}
                      />
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
              <select
                value={studentFilter.status}
                onChange={(e) => setStudentFilter({ ...studentFilter, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="NOT_STARTED">Not Started</option>
              </select>
              <input
                type="text"
                placeholder="Search by name, email, or enrollment..."
                value={studentFilter.search}
                onChange={(e) => setStudentFilter({ ...studentFilter, search: e.target.value })}
              />
              <select
                value={`${sortBy.field}-${sortBy.order}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy({ field, order: order as 'asc' | 'desc' });
                }}
              >
                <option value="progressPercent-desc">Progress (High to Low)</option>
                <option value="progressPercent-asc">Progress (Low to High)</option>
                <option value="studentName-asc">Name (A-Z)</option>
                <option value="lastActivity-desc">Recent Activity</option>
              </select>
            </div>

            <div className="students-table">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Steps</th>
                    <th>Time Spent</th>
                    <th>Last Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.studentId}>
                      <td>
                        <div className="student-info">
                          <strong>{student.studentName}</strong>
                          <small>{student.email}</small>
                          <small className="enrollment">{student.enrollmentNumber}</small>
                        </div>
                      </td>
                      <td>{getStatusBadge(student.status)}</td>
                      <td>
                        <div className="progress-cell">
                          <div className="progress-bar-mini">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${student.progressPercent}%` }}
                            />
                          </div>
                          <span>{student.progressPercent}%</span>
                        </div>
                      </td>
                      <td>{student.completedSteps}/{student.totalSteps}</td>
                      <td>{formatTime(student.totalTimeSpent)}</td>
                      <td>{student.lastActivity ? formatDate(student.lastActivity) : 'Never'}</td>
                      <td>
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/faculty/courses/${courseId}/students/${student.studentId}`)}
                          title="View Details"
                        >
                          👁️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStudents.length === 0 && (
                <div className="empty-state">No students match your filters</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="steps-section">
            <table className="steps-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Step</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Attempted</th>
                  <th>Completed</th>
                  <th>Avg Progress</th>
                  <th>Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {analytics.stepAnalytics.map((step) => (
                  <tr key={step.stepId}>
                    <td>{step.stepNumber}</td>
                    <td>{step.learningUnit.title}</td>
                    <td>{getStepTypeBadge(step.stepType)}</td>
                    <td>{step.mandatory ? '✅' : '➖'}</td>
                    <td>{step.totalAttempted}</td>
                    <td>
                      <span className="completion-ratio">
                        {step.completedCount}/{analytics.summary.totalAssigned}
                      </span>
                      <span className="completion-percent">({step.completionRate}%)</span>
                    </td>
                    <td>
                      <div className="progress-bar-mini">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${step.avgCompletionPercent}%` }}
                        />
                      </div>
                      <span>{step.avgCompletionPercent}%</span>
                    </td>
                    <td>{formatTime(step.avgTimeSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'batches' && (
          <div className="batches-section">
            <div className="batch-cards">
              {batchSummary.map((batch, index) => (
                <div key={index} className="batch-card">
                  <div className="batch-header">
                    <h4>{batch.departmentName}</h4>
                    <span className="academic-year">{batch.academicYear.replace('_', ' ')}</span>
                  </div>
                  <div className="batch-stats">
                    <div className="stat-row">
                      <span>Total Students:</span>
                      <strong>{batch.totalStudents}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Completed:</span>
                      <strong className="success">{batch.completed}</strong>
                    </div>
                    <div className="stat-row">
                      <span>In Progress:</span>
                      <strong className="warning">{batch.inProgress}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Not Started:</span>
                      <strong className="secondary">{batch.notStarted}</strong>
                    </div>
                  </div>
                  <div className="batch-completion">
                    <div className="completion-label">Completion Rate</div>
                    <div className="completion-bar">
                      <div 
                        className="completion-fill" 
                        style={{ width: `${batch.completionRate}%` }}
                      />
                    </div>
                    <div className="completion-value">{batch.completionRate}%</div>
                  </div>
                </div>
              ))}
            </div>
            {batchSummary.length === 0 && (
              <div className="empty-state">No batch data available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTracking;
