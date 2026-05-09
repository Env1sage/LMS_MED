import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import { FileText, Clock, CheckCircle, Calendar, Target, BookOpen, Award } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';
import { formatDateTime } from '../../utils/dateUtils';

// Match actual API response from GET /student-portal/tests
interface LatestAttempt {
  id: string;
  status: string;
  score: number | null;
  percentageScore: number | null;
  submittedAt: string | null;
}

interface Test {
  id: string;
  title: string;
  description?: string;
  subject: string;
  type: 'SCHEDULED_TEST' | 'PRACTICE_TEST' | 'ASSIGNMENT' | 'QUIZ';
  status: string;
  course?: { title: string; courseCode: string } | null;
  courseId?: string;
  faculty?: string;
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  dueDate?: string | null;
  attemptCount: number;
  maxAttempts: number;
  canAttempt: boolean;
  latestAttempt: LatestAttempt | null;
  // Derived client-side
  _hasCompleted?: boolean;
  _bestScore?: number | null;
  _bestPercentage?: number | null;
}

const typeLabels: Record<string, string> = {
  'SCHEDULED_TEST': 'Scheduled',
  'PRACTICE_TEST': 'Practice',
  'ASSIGNMENT': 'Assignment',
  'QUIZ': 'Quiz',
};

const typeColors: Record<string, { bg: string; text: string }> = {
  'SCHEDULED_TEST': { bg: '#eef2ff', text: '#6366f1' },
  'PRACTICE_TEST': { bg: '#f0fdf4', text: '#16a34a' },
  'ASSIGNMENT': { bg: '#eff6ff', text: '#2563eb' },
  'QUIZ': { bg: '#fefce8', text: '#ca8a04' },
};

const StudentTests: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Test[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState('');

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get('/student-portal/tests');
      const rawTests: Test[] = Array.isArray(response.data) ? response.data : [];
      
      // Enrich with derived fields
      const enriched = rawTests.map(t => {
        const la = t.latestAttempt;
        const hasCompleted = la !== null && (
          la.status === 'SUBMITTED' || la.status === 'COMPLETED' || 
          la.status === 'TIMED_OUT' || la.status === 'GRADED'
        );
        
        return {
          ...t,
          _hasCompleted: hasCompleted,
          _bestScore: hasCompleted ? la?.score : null,
          _bestPercentage: hasCompleted ? la?.percentageScore : null,
        };
      });
      
      setTests(enriched);
    } catch (err: any) {
      console.error('Failed to fetch tests:', err);
      setError(err.response?.data?.message || 'Failed to load tests');
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const filteredTests = tests.filter(test => {
    if (filter === 'all') return true;
    if (filter === 'pending') return test.canAttempt && !test._hasCompleted;
    if (filter === 'completed') return test._hasCompleted || (test.attemptCount > 0 && !test.canAttempt);
    if (filter === 'assignment') return test.type === 'ASSIGNMENT';
    if (filter === 'quiz') return test.type === 'QUIZ' || test.type === 'PRACTICE_TEST';
    if (filter === 'scheduled') return test.type === 'SCHEDULED_TEST';
    return true;
  });

  const statusCounts = {
    all: tests.length,
    pending: tests.filter(t => t.canAttempt && !t._hasCompleted).length,
    completed: tests.filter(t => t._hasCompleted).length,
    assignments: tests.filter(t => t.type === 'ASSIGNMENT').length,
  };

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
          <div className="loading-title">Loading Tests</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
          Tests & Assessments
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          View and attempt your assignments, quizzes, and tests
        </p>
      </div>

      {/* Stats */}
      <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
        <div className="bo-stat-card">
          <div className="bo-stat-icon blue">
            <FileText size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.all}</div>
          <div className="bo-stat-label">Total Tests</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon orange">
            <Clock size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.pending}</div>
          <div className="bo-stat-label">Pending</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon green">
            <CheckCircle size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.completed}</div>
          <div className="bo-stat-label">Completed</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon purple">
            <BookOpen size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.assignments}</div>
          <div className="bo-stat-label">Assignments</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bo-card" style={{ padding: '12px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'All Tests' },
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
            { value: 'assignment', label: 'Assignments' },
            { value: 'quiz', label: 'Quizzes & Practice' },
            { value: 'scheduled', label: 'Scheduled' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--bo-radius)',
                border: filter === f.value ? 'none' : '1px solid var(--bo-border)',
                background: filter === f.value ? 'var(--bo-accent)' : 'transparent',
                color: filter === f.value ? '#fff' : 'var(--bo-text-secondary)',
                fontSize: 13,
                fontWeight: filter === f.value ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tests List */}
      {error && (
        <div className="bo-card" style={{ padding: 24, marginBottom: 24, textAlign: 'center', color: 'var(--bo-danger)' }}>
          {error}
        </div>
      )}

      {filteredTests.length === 0 ? (
        <div className="bo-card" style={{ padding: 80, textAlign: 'center' }}>
          <FileText size={64} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 8 }}>
            No tests found
          </h3>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>
            {filter !== 'all' ? 'Try adjusting your filter' : 'No tests are available at the moment'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredTests.map((test) => {
            const typeColor = typeColors[test.type] || typeColors['ASSIGNMENT'];
            
            return (
              <div 
                key={test.id}
                className="bo-card"
                style={{ 
                  padding: 24,
                  border: '1px solid var(--bo-border)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/student/tests/${test.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--bo-shadow-md)';
                  e.currentTarget.style.borderColor = '#6366f1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--bo-shadow-sm)';
                  e.currentTarget.style.borderColor = 'var(--bo-border)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', margin: 0 }}>
                        {test.title}
                      </h3>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                        background: typeColor.bg, color: typeColor.text
                      }}>
                        {typeLabels[test.type] || test.type}
                      </span>
                      {test._hasCompleted && (
                        <span style={{ 
                          padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: '#f0fdf4',
                          color: '#16a34a'
                        }}>
                          ✓ Completed ({test.attemptCount}/{test.maxAttempts} attempts)
                        </span>
                      )}
                      {!test._hasCompleted && test.canAttempt && test.latestAttempt?.status === 'IN_PROGRESS' && (
                        <span style={{ 
                          padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: '#fef3c7', color: '#d97706'
                        }}>
                          ⏳ In Progress
                        </span>
                      )}
                      {!test._hasCompleted && test.canAttempt && !test.latestAttempt && (
                        <span style={{ 
                          padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: '#fff7ed', color: '#ea580c'
                        }}>
                          Pending
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: 14, color: 'var(--bo-text-secondary)', marginBottom: 16 }}>
                      📚 {test.subject} {test.course ? `• ${typeof test.course === 'object' ? test.course.title : test.course}` : ''} {test.faculty ? `• ${test.faculty}` : ''}
                    </p>

                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: 'var(--bo-text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={14} />
                        {test.totalQuestions} questions
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={14} />
                        {test.durationMinutes} minutes
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Target size={14} />
                        {test.totalMarks} marks
                      </div>
                      {test.scheduledStartTime && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={14} />
                          {formatDateTime(test.scheduledStartTime)}
                        </div>
                      )}
                    </div>

                    {/* Show latest score for completed tests */}
                    {test._hasCompleted && test._bestScore !== null && test._bestScore !== undefined && (
                      <div style={{ 
                        marginTop: 16, padding: 12, borderRadius: 8,
                        background: '#eef2ff',
                        display: 'inline-flex', alignItems: 'center', gap: 8
                      }}>
                        <Award size={16} style={{ color: '#6366f1' }} />
                        <span style={{ 
                          fontSize: 14, fontWeight: 600,
                          color: '#6366f1'
                        }}>
                          Latest Score: {test._bestScore}/{test.totalMarks} ({test._bestPercentage?.toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {test.canAttempt && !test._hasCompleted && (
                      <button 
                        className="bo-btn bo-btn-primary"
                        onClick={(e) => { e.stopPropagation(); navigate(`/student/tests/${test.id}`); }}
                      >
                        {test.latestAttempt?.status === 'IN_PROGRESS' ? 'Continue' : 'Start Test'}
                      </button>
                    )}
                    {test.canAttempt && test._hasCompleted && (
                      <button 
                        className="bo-btn bo-btn-primary"
                        onClick={(e) => { e.stopPropagation(); navigate(`/student/tests/${test.id}`); }}
                      >
                        Retake
                      </button>
                    )}
                    {test._hasCompleted && (
                      <button 
                        className="bo-btn bo-btn-outline"
                        onClick={(e) => { e.stopPropagation(); navigate(`/student/tests/${test.id}/results`); }}
                      >
                        View Results
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentTests;
