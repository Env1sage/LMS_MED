import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import {
  FileText, Clock, CheckCircle, AlertCircle, Award,
  ChevronRight, BarChart3, Timer, Target, TrendingUp,
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';
import { formatDate } from '../../utils/dateUtils';

interface LatestAttempt {
  id: string;
  status: string;
  score: number | null;
  percentageScore: number | null;
  isPassed: boolean | null;
  submittedAt: string | null;
  timeSpent: number | null;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  subject: string;
  course?: { title: string; courseCode: string } | null;
  totalQuestions: number;
  totalMarks: number;
  passingMarks: number | null;
  durationMinutes: number;
  dueDate?: string | null;
  assignedAt: string;
  status: string;
  canAttempt: boolean;
  attemptCount: number;
  maxAttempts: number;
  latestAttempt: LatestAttempt | null;
  bestScore: number | null;
  bestPercentage: number | null;
}

const StudentAssignments: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState('');

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get('/student-portal/assignments');
      setAssignments(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Failed to fetch assignments:', err);
      setError(err.response?.data?.message || 'Failed to load assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const filtered = assignments.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return a.canAttempt && !a.latestAttempt?.submittedAt;
    if (filter === 'completed') return !!a.latestAttempt?.submittedAt;
    if (filter === 'overdue') return a.dueDate && new Date(a.dueDate) < new Date() && !a.latestAttempt?.submittedAt;
    return true;
  });

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.canAttempt && !a.latestAttempt?.submittedAt).length,
    completed: assignments.filter(a => !!a.latestAttempt?.submittedAt).length,
    avgScore: (() => {
      const scored = assignments.filter(a => a.bestPercentage !== null);
      if (scored.length === 0) return 0;
      return Math.round(scored.reduce((s, a) => s + (a.bestPercentage || 0), 0) / scored.length);
    })(),
  };

  const getDueBadge = (dueDate?: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: 'Overdue', color: '#ef4444', bg: '#fef2f2' };
    if (days === 0) return { text: 'Due Today', color: '#f59e0b', bg: '#fffbeb' };
    if (days <= 2) return { text: `Due in ${days}d`, color: '#f59e0b', bg: '#fffbeb' };
    return { text: `Due ${formatDate(due)}`, color: '#6b7280', bg: '#f9fafb' };
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
          <div className="loading-dots"><div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div></div>
          <div className="loading-title">Loading Assignments</div>
          <div className="loading-bar-track"><div className="loading-bar-fill"></div></div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
          Assignments
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          MCQ-based assignments from your teachers — attempt, review results, track progress
        </p>
      </div>

      {error && (
        <div className="bo-card" style={{ padding: 16, marginBottom: 20, background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
        <div className="bo-stat-card">
          <div className="bo-stat-icon blue"><FileText size={22} /></div>
          <div className="bo-stat-value">{stats.total}</div>
          <div className="bo-stat-label">Total Assignments</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon orange"><Clock size={22} /></div>
          <div className="bo-stat-value">{stats.pending}</div>
          <div className="bo-stat-label">Pending</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon green"><CheckCircle size={22} /></div>
          <div className="bo-stat-value">{stats.completed}</div>
          <div className="bo-stat-label">Completed</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon purple"><TrendingUp size={22} /></div>
          <div className="bo-stat-value">{stats.avgScore}%</div>
          <div className="bo-stat-label">Avg Score</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bo-card" style={{ padding: '12px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
            { value: 'overdue', label: 'Overdue' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                border: 'none', cursor: 'pointer',
                background: filter === f.value ? '#3b82f6' : '#f3f4f6',
                color: filter === f.value ? '#fff' : '#374151',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment Cards */}
      {filtered.length === 0 ? (
        <div className="bo-card" style={{ padding: 40, textAlign: 'center' }}>
          <Target size={40} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--bo-text-muted)', fontSize: 15 }}>
            {filter === 'all' ? 'No assignments yet' : `No ${filter} assignments`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map(a => {
            const dueBadge = getDueBadge(a.dueDate);
            const isCompleted = !!a.latestAttempt?.submittedAt;
            const isPassed = a.latestAttempt?.isPassed;

            return (
              <div key={a.id} className="bo-card" style={{ padding: 20, transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  {/* Left side */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                        background: '#eff6ff', color: '#2563eb',
                      }}>
                        MCQ Assignment
                      </span>
                      {dueBadge && (
                        <span style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: dueBadge.bg, color: dueBadge.color,
                        }}>
                          {dueBadge.text}
                        </span>
                      )}
                      {isCompleted && (
                        <span style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: isPassed ? '#f0fdf4' : '#fef2f2',
                          color: isPassed ? '#16a34a' : '#dc2626',
                        }}>
                          {isPassed ? '✓ Passed' : '✗ Failed'}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>
                      {a.title}
                    </h3>
                    {a.description && (
                      <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 8 }}>
                        {a.description}
                      </p>
                    )}
                    {a.course && (
                      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                        Course: {a.course.title} ({a.course.courseCode})
                      </p>
                    )}

                    {/* Meta chips */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#6b7280' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FileText size={14} /> {a.totalQuestions} Questions
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Award size={14} /> {a.totalMarks} Marks
                      </span>
                      {a.durationMinutes > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Timer size={14} /> {a.durationMinutes} min
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BarChart3 size={14} /> {a.attemptCount}/{a.maxAttempts} attempts
                      </span>
                    </div>
                  </div>

                  {/* Right side: Score + Action */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                    {isCompleted && a.bestPercentage !== null && (
                      <div style={{
                        padding: '10px 16px', borderRadius: 12, textAlign: 'center',
                        background: (a.bestPercentage >= 70) ? '#f0fdf4' : (a.bestPercentage >= 40) ? '#fffbeb' : '#fef2f2',
                        minWidth: 90,
                      }}>
                        <div style={{
                          fontSize: 22, fontWeight: 700,
                          color: (a.bestPercentage >= 70) ? '#16a34a' : (a.bestPercentage >= 40) ? '#ca8a04' : '#dc2626',
                        }}>
                          {Math.round(a.bestPercentage)}%
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          {a.bestScore}/{a.totalMarks}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (isCompleted && a.latestAttempt) {
                          navigate(`/student/assignments/${a.id}/results`);
                        } else {
                          navigate(`/student/assignments/${a.id}`);
                        }
                      }}
                      style={{
                        padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        background: isCompleted ? '#f3f4f6' : '#3b82f6',
                        color: isCompleted ? '#374151' : '#fff',
                      }}
                    >
                      {isCompleted ? 'View Results' : a.attemptCount > 0 ? 'Continue' : 'Start'}
                      <ChevronRight size={16} />
                    </button>
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

export default StudentAssignments;
