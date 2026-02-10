import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { facultyAnalyticsService, StudentProgressDetail } from '../../services/faculty-analytics.service';
import { ArrowLeft, Clock, CheckCircle, Lock } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';

const FacultyStudentProgress: React.FC = () => {
  const navigate = useNavigate();
  const { courseId, studentId } = useParams<{ courseId: string; studentId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<StudentProgressDetail | null>(null);

  useEffect(() => { if (courseId && studentId) loadData(); }, [courseId, studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await facultyAnalyticsService.getStudentProgress(courseId!, studentId!);
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load student progress');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s: number) => {
    if (s < 60) return `${s} seconds`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} minutes`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      COMPLETED: { bg: '#D1FAE5', color: '#065F46', label: 'Completed' },
      IN_PROGRESS: { bg: '#FEF3C7', color: '#92400E', label: 'In Progress' },
      NOT_STARTED: { bg: '#E5E7EB', color: '#374151', label: 'Not Started' },
      ASSIGNED: { bg: '#DBEAFE', color: '#1E40AF', label: 'Assigned' },
    };
    const s = map[status] || { bg: '#E5E7EB', color: '#374151', label: status };
    return <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  const getStepIcon = (type: string) => ({ VIDEO: '🎬', BOOK: '📚', MCQ: '❓' }[type] || '📄');

  if (loading) return (
    <FacultyLayout>
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
        <div className="loading-title">Loading Student Progress...</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </FacultyLayout>
  );
  if (error || !data) {
    return (
      <FacultyLayout>
        <div className="bo-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#DC2626', marginBottom: 16 }}>{error || 'No data'}</p>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate(`/faculty/courses/${courseId}/tracking`)}>Back to Tracking</button>
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(`/faculty/courses/${courseId}/tracking`)} style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}><ArrowLeft size={18} /></button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>Student Progress</h1>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>{data.student.fullName}</p>
        </div>
      </div>

      {/* Student Info */}
      <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Name</div><div style={{ fontWeight: 600 }}>{data.student.fullName}</div></div>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Email</div><div style={{ fontWeight: 600, fontSize: 13 }}>{data.student.email}</div></div>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Enrollment</div><div style={{ fontWeight: 600 }}>{data.student.enrollmentNumber}</div></div>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Status</div>{getStatusBadge(data.assignment.status)}</div>
        </div>
      </div>

      {/* Assignment Timeline */}
      <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Assignment Timeline</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { label: 'Assigned', value: formatDate(data.assignment.assignedAt), color: ACCENT },
            { label: 'Started', value: formatDate(data.assignment.startedAt), color: '#3B82F6' },
            { label: 'Completed', value: formatDate(data.assignment.completedAt), color: '#10B981' },
            { label: 'Due Date', value: formatDate(data.assignment.dueDate), color: '#F59E0B' },
          ].map((item, i) => (
            <div key={i} style={{ padding: 14, background: 'var(--bo-bg)', borderRadius: 8, borderLeft: `3px solid ${item.color}` }}>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Progress Summary</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: ACCENT }}>{data.progress.progressPercent}%</div>
            <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Overall Progress</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ height: 12, background: '#E5E7EB', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ height: '100%', width: `${data.progress.progressPercent}%`, background: ACCENT, borderRadius: 6, transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
              <div><span style={{ fontWeight: 700, color: '#10B981' }}>{data.progress.completedSteps}</span> <span style={{ color: 'var(--bo-text-muted)' }}>completed</span></div>
              <div><span style={{ fontWeight: 700 }}>{data.progress.totalSteps}</span> <span style={{ color: 'var(--bo-text-muted)' }}>total steps</span></div>
              <div><span style={{ fontWeight: 700 }}>{formatTime(data.progress.totalTimeSpent)}</span> <span style={{ color: 'var(--bo-text-muted)' }}>total time</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="bo-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>Learning Flow Progress</h3>
        <div>
          {data.steps.map((step, idx) => (
            <div key={step.stepId} style={{ display: 'flex', gap: 16, marginBottom: idx < data.steps.length - 1 ? 0 : 0 }}>
              {/* Timeline dot & line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step.isCompleted ? '#10B981' : step.isLocked ? '#E5E7EB' : ACCENT,
                  color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>
                  {step.isCompleted ? '✓' : step.isLocked ? '🔒' : step.stepNumber}
                </div>
                {idx < data.steps.length - 1 && <div style={{ width: 2, flex: 1, background: step.isCompleted ? '#10B981' : '#E5E7EB', minHeight: 20 }} />}
              </div>
              {/* Content */}
              <div style={{ flex: 1, paddingBottom: 16 }}>
                <div style={{
                  padding: 16, borderRadius: 8, border: '1px solid var(--bo-border)',
                  background: step.isLocked ? '#F9FAFB' : '#fff', opacity: step.isLocked ? 0.7 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>Step {step.stepNumber}</span>
                        <span style={{ fontSize: 12 }}>{getStepIcon(step.stepType)} {step.stepType}</span>
                        {step.mandatory && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#FEE2E2', color: '#DC2626', fontWeight: 600 }}>Required</span>}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{step.learningUnit.title}</div>
                    </div>
                    <div style={{ fontSize: 12, color: step.isCompleted ? '#10B981' : 'var(--bo-text-muted)', fontWeight: 600 }}>
                      {step.completionPercent}%
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 8 }}>
                    <span>Est: {Math.round(step.learningUnit.estimatedDuration / 60)}min</span>
                    {step.timeSpent > 0 && <span>Spent: {formatTime(step.timeSpent)}</span>}
                    {step.lastAccessed && <span>Last: {new Date(step.lastAccessed).toLocaleDateString()}</span>}
                  </div>
                  <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${step.completionPercent}%`, background: step.isCompleted ? '#10B981' : step.isLocked ? '#D1D5DB' : ACCENT, borderRadius: 3 }} />
                  </div>
                  {step.isLocked && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} /> Complete previous mandatory steps to unlock
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FacultyLayout>
  );
};

export default FacultyStudentProgress;
