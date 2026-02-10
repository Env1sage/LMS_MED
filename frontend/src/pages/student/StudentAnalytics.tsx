import React, { useEffect, useState, useCallback } from 'react';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import { BarChart3, TrendingUp, Award, Target, Calendar, BookOpen, FileText } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface AnalyticsData {
  overview: {
    totalCourses: number;
    completedCourses: number;
    averageScore: number;
    testsAttempted: number;
    testsPassed: number;
    practiceQuestions: number;
  };
  subjectPerformance: Array<{
    subject: string;
    averageScore: number;
    testsAttempted: number;
    totalTests: number;
  }>;
  courseProgress: Array<{
    courseId: string;
    title: string;
    code: string | null;
    status: string;
    completedSteps: number;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  recentTests: Array<{
    id: string;
    title: string;
    courseName: string;
    score: number;
    totalMarks: number;
    completedAt: string;
    passed: boolean;
  }>;
  trends: {
    weeklyScores: number[];
    isImproving: boolean;
  };
  practiceStats: {
    totalSessions: number;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    totalTimeSpent: number;
  };
}

const StudentAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get('/student-portal/analytics');
      setAnalytics(response.data);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="page-loading-screen">
          <div className="loading-rings">
            <div className="loading-ring loading-ring-1"></div>
            <div className="loading-ring loading-ring-2"></div>
            <div className="loading-ring loading-ring-3"></div>
          </div>
          <div className="loading-dots">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
          <div className="loading-title">Loading Analytics</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (error || !analytics) {
    return (
      <StudentLayout>
        <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
          <BarChart3 size={64} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 8 }}>
            Unable to load analytics
          </h3>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginBottom: 20 }}>{error}</p>
          <button className="bo-btn bo-btn-primary" onClick={fetchAnalytics}>
            Try Again
          </button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
          Analytics & Performance
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          Track your learning progress and performance metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
        <div className="bo-stat-card">
          <div className="bo-stat-icon blue">
            <BookOpen size={22} />
          </div>
          <div className="bo-stat-value">{analytics.overview.completedCourses}/{analytics.overview.totalCourses}</div>
          <div className="bo-stat-label">Courses Completed</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon green">
            <Award size={22} />
          </div>
          <div className="bo-stat-value">{(analytics.overview.averageScore || 0).toFixed(1)}%</div>
          <div className="bo-stat-label">Average Score</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon purple">
            <FileText size={22} />
          </div>
          <div className="bo-stat-value">{analytics.overview.testsAttempted}</div>
          <div className="bo-stat-label">Tests Attempted</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon orange">
            <TrendingUp size={22} />
          </div>
          <div className="bo-stat-value">{analytics.overview.totalCourses > 0 ? Math.round((analytics.overview.completedCourses / analytics.overview.totalCourses) * 100) : 0}%</div>
          <div className="bo-stat-label">Overall Progress</div>
        </div>
      </div>

      {/* Overall Performance */}
      <div className="bo-card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={20} /> Overall Performance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--bo-accent)', marginBottom: 8 }}>
              {(analytics.overview.averageScore || 0).toFixed(1)}%
            </div>
            <div style={{ fontSize: 14, color: 'var(--bo-text-muted)' }}>Average Score</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--bo-success)', marginBottom: 8 }}>
              {analytics.overview.totalCourses > 0 ? Math.round((analytics.overview.completedCourses / analytics.overview.totalCourses) * 100) : 0}%
            </div>
            <div style={{ fontSize: 14, color: 'var(--bo-text-muted)' }}>Course Progress</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--bo-info)', marginBottom: 8 }}>
              {analytics.practiceStats?.totalSessions || 0}
            </div>
            <div style={{ fontSize: 14, color: 'var(--bo-text-muted)' }}>Practice Sessions</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--bo-warning)', marginBottom: 8 }}>
              {analytics.practiceStats?.accuracy || 0}%
            </div>
            <div style={{ fontSize: 14, color: 'var(--bo-text-muted)' }}>Practice Accuracy</div>
          </div>
        </div>
      </div>

      {/* Subject Performance */}
      {analytics.subjectPerformance && analytics.subjectPerformance.length > 0 && (
        <div className="bo-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={20} /> Subject Performance
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {analytics.subjectPerformance.map((subject, idx) => (
              <div key={idx} style={{ padding: 16, background: 'var(--bo-bg)', borderRadius: 'var(--bo-radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, color: 'var(--bo-text-primary)' }}>{subject.subject}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--bo-text-muted)' }}>
                    <span>{subject.testsAttempted}/{subject.totalTests} tests</span>
                    <span style={{ fontWeight: 600, color: 'var(--bo-accent)' }}>{subject.averageScore.toFixed(1)}%</span>
                  </div>
                </div>
                <div style={{ height: 8, background: 'var(--bo-border-light)', borderRadius: 4, overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: `linear-gradient(90deg, ${subject.averageScore >= 75 ? 'var(--bo-success)' : subject.averageScore >= 50 ? 'var(--bo-warning)' : 'var(--bo-danger)'}, var(--bo-accent))`,
                      width: `${subject.averageScore}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Progress */}
      {analytics.courseProgress && analytics.courseProgress.length > 0 && (
        <div className="bo-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} /> Course Progress
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {analytics.courseProgress.map((course, idx) => {
              const isCompleted = course.status === 'COMPLETED';
              const progress = isCompleted ? 100 : (course.completedSteps > 0 ? Math.min(Math.round((course.completedSteps / Math.max(course.completedSteps + 1, 2)) * 100), 90) : 0);
              const displayDate = course.completedAt || course.startedAt;
              return (
              <div 
                key={idx}
                style={{ 
                  padding: 16, 
                  background: 'var(--bo-bg)', 
                  borderRadius: 'var(--bo-radius)',
                  border: `1px solid ${isCompleted ? '#86efac' : 'var(--bo-border)'}`
                }}
              >
                <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 6 }}>
                  {course.title}
                </h4>
                {course.code && (
                  <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginBottom: 10, fontFamily: 'monospace' }}>{course.code}</div>
                )}
                <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ 
                    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: isCompleted ? '#dcfce7' : '#dbeafe',
                    color: isCompleted ? '#16a34a' : '#2563eb'
                  }}>{course.status.replace('_', ' ')}</span>
                  <span>{course.completedSteps} step{course.completedSteps !== 1 ? 's' : ''} completed</span>
                </div>
                <div style={{ height: 6, background: 'var(--bo-border-light)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: isCompleted ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, var(--bo-accent), var(--bo-info))',
                      width: `${progress}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{progress}% complete</span>
                  {displayDate && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} />
                      {new Date(displayDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Tests */}
      {analytics.recentTests && analytics.recentTests.length > 0 && (
        <div className="bo-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} /> Recent Test Results
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {analytics.recentTests.map((test) => (
              <div 
                key={test.id}
                style={{ 
                  padding: 16, 
                  background: test.passed ? 'var(--bo-success-light)' : 'var(--bo-danger-light)',
                  borderRadius: 'var(--bo-radius)',
                  border: `1px solid ${test.passed ? '#86efac' : '#fca5a5'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>
                      {test.title}
                    </h4>
                    <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', margin: 0 }}>
                      {test.courseName}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: test.passed ? 'var(--bo-success)' : 'var(--bo-danger)' }}>
                      {test.score}/{test.totalMarks}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                      {((test.score / test.totalMarks) * 100).toFixed(1)}% • {test.passed ? 'Passed ✓' : 'Failed ✗'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 4 }}>
                      {new Date(test.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentAnalytics;
