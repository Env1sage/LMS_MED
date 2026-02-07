import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { facultyAnalyticsService, StudentProgressDetail } from '../services/faculty-analytics.service';
import '../styles/FacultyPortal.css';
import '../styles/StudentProgressDetail.css';

const StudentProgressDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { courseId, studentId } = useParams<{ courseId: string; studentId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<StudentProgressDetail | null>(null);

  useEffect(() => {
    if (courseId && studentId) {
      loadData();
    }
  }, [courseId, studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await facultyAnalyticsService.getStudentProgress(courseId!, studentId!);
      setProgressData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load student progress');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes`;
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
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getStepIcon = (type: string) => {
    const icons: Record<string, string> = {
      VIDEO: '🎬',
      BOOK: '📚',
      MCQ: '❓',
      NOTES: '📝',
    };
    return icons[type] || '📄';
  };

  if (loading) {
    return (
      <div className="student-progress-detail">
        <div className="loading">Loading student progress...</div>
      </div>
    );
  }

  if (error || !progressData) {
    return (
      <div className="student-progress-detail">
        <div className="alert alert-danger">
          {error || 'Failed to load data'}
          <button onClick={() => navigate(`/faculty/courses/${courseId}/tracking`)}>
            ← Back to Tracking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-progress-detail">
      <div className="detail-header">
        <button 
          className="btn-back" 
          onClick={() => navigate(`/faculty/courses/${courseId}/tracking`)}
        >
          ← Back to Student Tracking
        </button>
        <h1>Student Progress Details</h1>
      </div>

      <div className="student-info-card">
        <div className="info-row">
          <div className="info-item">
            <label>Student Name</label>
            <span>{progressData.student.fullName}</span>
          </div>
          <div className="info-item">
            <label>Email</label>
            <span>{progressData.student.email}</span>
          </div>
          <div className="info-item">
            <label>Enrollment</label>
            <span>{progressData.student.enrollmentNumber}</span>
          </div>
          <div className="info-item">
            <label>Status</label>
            {getStatusBadge(progressData.assignment.status)}
          </div>
        </div>
      </div>

      <div className="assignment-info">
        <div className="info-grid">
          <div className="info-box">
            <label>Assigned Date</label>
            <span>{formatDate(progressData.assignment.assignedAt)}</span>
          </div>
          <div className="info-box">
            <label>Started Date</label>
            <span>{formatDate(progressData.assignment.startedAt)}</span>
          </div>
          <div className="info-box">
            <label>Completed Date</label>
            <span>{formatDate(progressData.assignment.completedAt)}</span>
          </div>
          <div className="info-box">
            <label>Due Date</label>
            <span>{formatDate(progressData.assignment.dueDate)}</span>
          </div>
        </div>
      </div>

      <div className="progress-summary">
        <div className="summary-card">
          <div className="summary-value">{progressData.progress.progressPercent}%</div>
          <div className="summary-label">Overall Progress</div>
          <div className="progress-bar-large">
            <div 
              className="progress-fill" 
              style={{ width: `${progressData.progress.progressPercent}%` }}
            />
          </div>
        </div>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-value">{progressData.progress.completedSteps}</span>
            <span className="stat-label">Completed Steps</span>
          </div>
          <div className="stat">
            <span className="stat-value">{progressData.progress.totalSteps}</span>
            <span className="stat-label">Total Steps</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatTime(progressData.progress.totalTimeSpent)}</span>
            <span className="stat-label">Total Time</span>
          </div>
        </div>
      </div>

      <div className="steps-progress">
        <h2>Learning Flow Progress</h2>
        <div className="steps-timeline">
          {progressData.steps.map((step, index) => (
            <div 
              key={step.stepId} 
              className={`step-item ${step.isCompleted ? 'completed' : ''} ${step.isLocked ? 'locked' : ''}`}
            >
              <div className="step-connector">
                {index > 0 && <div className="connector-line" />}
                <div className={`step-dot ${step.isCompleted ? 'completed' : step.isLocked ? 'locked' : 'pending'}`}>
                  {step.isCompleted ? '✓' : step.isLocked ? '🔒' : step.stepNumber}
                </div>
              </div>
              <div className="step-content">
                <div className="step-header">
                  <span className="step-number">Step {step.stepNumber}</span>
                  <span className="step-type">{getStepIcon(step.stepType)} {step.stepType}</span>
                  {step.mandatory && <span className="mandatory-tag">Required</span>}
                </div>
                <h4 className="step-title">{step.learningUnit.title}</h4>
                <div className="step-meta">
                  <span>Est. Duration: {Math.round(step.learningUnit.estimatedDuration / 60)} min</span>
                  {step.timeSpent > 0 && <span>Time Spent: {formatTime(step.timeSpent)}</span>}
                  {step.lastAccessed && <span>Last Access: {formatDate(step.lastAccessed)}</span>}
                </div>
                <div className="step-progress">
                  <div className="progress-bar-mini">
                    <div 
                      className={`progress-fill ${step.isLocked ? 'locked' : ''}`}
                      style={{ width: `${step.completionPercent}%` }}
                    />
                  </div>
                  <span className="progress-text">{step.completionPercent}%</span>
                </div>
                {step.isLocked && (
                  <div className="locked-message">
                    🔒 Complete previous mandatory steps to unlock
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentProgressDetailPage;
