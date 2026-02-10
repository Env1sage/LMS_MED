import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { facultyAnalyticsService, CourseAnalytics, StudentDetail, BatchSummary } from '../../services/faculty-analytics.service';
import { ArrowLeft, Download, Search, Eye } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';

const FacultyStudentTracking: React.FC = () => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'steps' | 'batches'>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('progressPercent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => { if (courseId) loadData(); }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [a, b] = await Promise.all([
        facultyAnalyticsService.getCourseAnalytics(courseId!),
        facultyAnalyticsService.getBatchSummary(courseId!),
      ]);
      setAnalytics(a);
      setBatches(b);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'summary' | 'detailed' | 'csv') => {
    try {
      if (format === 'csv') {
        await facultyAnalyticsService.downloadCsvReport(courseId!);
      } else {
        const report = await facultyAnalyticsService.generateReport(courseId!, format);
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report-${format}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch { alert('Failed to download report'); }
  };

  const formatTime = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      COMPLETED: { bg: '#D1FAE5', color: '#065F46', label: 'Completed' },
      IN_PROGRESS: { bg: '#FEF3C7', color: '#92400E', label: 'In Progress' },
      NOT_STARTED: { bg: '#E5E7EB', color: '#374151', label: 'Not Started' },
      ASSIGNED: { bg: '#DBEAFE', color: '#1E40AF', label: 'Assigned' },
    };
    const s = map[status] || { bg: '#E5E7EB', color: '#374151', label: status };
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  const getTypeBadge = (type: string) => {
    const icons: Record<string, string> = { VIDEO: '🎬', BOOK: '📚', MCQ: '❓' };
    return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#F3F4F6' }}>{icons[type] || '📄'} {type}</span>;
  };

  const filteredStudents = (analytics?.studentDetails || []).filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (search) {
      const t = search.toLowerCase();
      return s.studentName?.toLowerCase().includes(t) || s.enrollmentNumber?.toLowerCase().includes(t) || s.email?.toLowerCase().includes(t);
    }
    return true;
  }).sort((a, b) => {
    const av = (a as any)[sortField] ?? '';
    const bv = (b as any)[sortField] ?? '';
    return sortOrder === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

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
        <div className="loading-title">Loading Student Tracking...</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </FacultyLayout>
  );
  if (error || !analytics) {
    return (
      <FacultyLayout>
        <div className="bo-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#DC2626', marginBottom: 16 }}>{error || 'No data'}</p>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/courses')}>Back</button>
        </div>
      </FacultyLayout>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'students', label: `Students (${analytics.summary.totalAssigned})` },
    { key: 'steps', label: `Steps (${analytics.summary.totalSteps})` },
    { key: 'batches', label: `Batches (${batches.length})` },
  ];

  return (
    <FacultyLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(`/faculty/courses/${courseId}`)} style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}><ArrowLeft size={18} /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--bo-text-primary)' }}>📊 {analytics.courseTitle}</h1>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>Student Progress & Analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bo-btn bo-btn-outline" style={{ fontSize: 13 }} onClick={() => handleDownload('summary')}>📥 Summary</button>
          <button className="bo-btn bo-btn-outline" style={{ fontSize: 13 }} onClick={() => handleDownload('csv')}>📥 CSV</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Enrolled', value: analytics.summary.totalAssigned, icon: '👥', color: ACCENT },
          { label: 'Completed', value: analytics.summary.completed, icon: '✅', color: '#10B981' },
          { label: 'In Progress', value: analytics.summary.inProgress, icon: '🔄', color: '#F59E0B' },
          { label: 'Not Started', value: analytics.summary.notStarted, icon: '⏸️', color: '#6B7280' },
          { label: 'Completion Rate', value: `${analytics.summary.completionRate}%`, icon: '📈', color: ACCENT },
        ].map((s, i) => (
          <div key={i} className="bo-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--bo-border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)} style={{
            padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: activeTab === t.key ? 600 : 400,
            color: activeTab === t.key ? ACCENT : 'var(--bo-text-secondary)',
            borderBottom: activeTab === t.key ? `2px solid ${ACCENT}` : '2px solid transparent', marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Progress Distribution */}
          <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Progress Distribution</h3>
            {analytics.summary.totalAssigned > 0 && (
              <>
                <div style={{ height: 24, display: 'flex', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ width: `${(analytics.summary.completed / analytics.summary.totalAssigned) * 100}%`, background: '#10B981', transition: 'width 0.5s' }} />
                  <div style={{ width: `${(analytics.summary.inProgress / analytics.summary.totalAssigned) * 100}%`, background: '#F59E0B', transition: 'width 0.5s' }} />
                  <div style={{ width: `${(analytics.summary.notStarted / analytics.summary.totalAssigned) * 100}%`, background: '#D1D5DB', transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} /> Completed</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} /> In Progress</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D1D5DB', display: 'inline-block' }} /> Not Started</span>
                </div>
              </>
            )}
          </div>
          {/* Step Overview */}
          <div className="bo-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Step Completion Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
              {analytics.stepAnalytics.map(step => (
                <div key={step.stepId} style={{ padding: 16, background: 'var(--bo-bg)', borderRadius: 8, border: '1px solid var(--bo-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT }}>Step {step.stepNumber}</span>
                    <div style={{ display: 'flex', gap: 4 }}>{getTypeBadge(step.stepType)} {step.mandatory && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#FEE2E2', color: '#DC2626', fontWeight: 600 }}>Required</span>}</div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{step.learningUnit.title}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div><div style={{ fontWeight: 700, color: '#10B981' }}>{step.completionRate}%</div><div style={{ color: 'var(--bo-text-muted)' }}>Completion</div></div>
                    <div><div style={{ fontWeight: 700 }}>{step.completedCount}/{analytics.summary.totalAssigned}</div><div style={{ color: 'var(--bo-text-muted)' }}>Completed</div></div>
                    <div><div style={{ fontWeight: 700 }}>{formatTime(step.avgTimeSpent)}</div><div style={{ color: 'var(--bo-text-muted)' }}>Avg Time</div></div>
                  </div>
                  <div style={{ height: 4, background: '#E5E7EB', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${step.completionRate}%`, background: ACCENT, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'students' && (
        <div className="bo-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff' }}>
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="NOT_STARTED">Not Started</option>
            </select>
            <select value={`${sortField}-${sortOrder}`} onChange={e => { const [f, o] = e.target.value.split('-'); setSortField(f); setSortOrder(o as 'asc' | 'desc'); }} style={{ padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff' }}>
              <option value="progressPercent-desc">Progress ↓</option>
              <option value="progressPercent-asc">Progress ↑</option>
              <option value="studentName-asc">Name A-Z</option>
              <option value="lastActivity-desc">Recent Activity</option>
            </select>
          </div>
          {filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--bo-text-muted)' }}>No students match</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bo-border)' }}>
                    {['Student', 'Status', 'Progress', 'Steps', 'Time', 'Last Activity', ''].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--bo-text-muted)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => (
                    <tr key={s.studentId} style={{ borderBottom: '1px solid var(--bo-border)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 500 }}>{s.studentName}</div>
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{getStatusBadge(s.status)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', minWidth: 50 }}>
                            <div style={{ height: '100%', width: `${s.progressPercent}%`, background: s.progressPercent >= 80 ? '#10B981' : s.progressPercent >= 50 ? '#F59E0B' : '#EF4444', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{s.progressPercent}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{s.completedSteps}/{s.totalSteps}</td>
                      <td style={{ padding: '10px 12px' }}>{formatTime(s.totalTimeSpent)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--bo-text-secondary)' }}>{s.lastActivity ? formatDate(s.lastActivity) : 'Never'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => navigate(`/faculty/courses/${courseId}/students/${s.studentId}`)} title="View Details" style={{ padding: 6, border: '1px solid var(--bo-border)', borderRadius: 6, background: '#fff', cursor: 'pointer', color: ACCENT }}>
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'steps' && (
        <div className="bo-card" style={{ padding: 24 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--bo-border)' }}>
                  {['#', 'Step', 'Type', 'Required', 'Attempted', 'Completed', 'Avg Progress', 'Avg Time'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--bo-text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.stepAnalytics.map(step => (
                  <tr key={step.stepId} style={{ borderBottom: '1px solid var(--bo-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: ACCENT }}>{step.stepNumber}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{step.learningUnit.title}</td>
                    <td style={{ padding: '10px 12px' }}>{getTypeBadge(step.stepType)}</td>
                    <td style={{ padding: '10px 12px' }}>{step.mandatory ? '✅' : '➖'}</td>
                    <td style={{ padding: '10px 12px' }}>{step.totalAttempted}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 600 }}>{step.completedCount}/{analytics.summary.totalAssigned}</span>
                      <span style={{ color: 'var(--bo-text-muted)', marginLeft: 4 }}>({step.completionRate}%)</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', minWidth: 40 }}>
                          <div style={{ height: '100%', width: `${step.avgCompletionPercent}%`, background: ACCENT, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{step.avgCompletionPercent}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{formatTime(step.avgTimeSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'batches' && (
        <div>
          {batches.length === 0 ? (
            <div className="bo-card" style={{ padding: 40, textAlign: 'center', color: 'var(--bo-text-muted)' }}>No batch data available</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {batches.map((b, i) => (
                <div key={i} className="bo-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{b.departmentName}</h4>
                    <span style={{ fontSize: 12, color: 'var(--bo-text-muted)', padding: '3px 8px', background: 'var(--bo-bg)', borderRadius: 4 }}>{({'YEAR_1':'Year 1','YEAR_2':'Year 2','YEAR_3':'Year 3','YEAR_3_MINOR':'Year 3 (Part 1)','YEAR_3_MAJOR':'Year 3 (Part 2)','YEAR_4':'Year 4','YEAR_5':'Year 5','FIRST_YEAR':'1st Year','SECOND_YEAR':'2nd Year','THIRD_YEAR':'3rd Year','FOURTH_YEAR':'4th Year','FIFTH_YEAR':'5th Year','INTERNSHIP':'Internship','PART_1':'Part 1','PART_2':'Part 2'} as Record<string,string>)[b.academicYear] || b.academicYear?.replace(/_/g, ' ')}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 13, marginBottom: 12 }}>
                    <div><span style={{ color: 'var(--bo-text-muted)' }}>Total:</span> <strong>{b.totalStudents}</strong></div>
                    <div><span style={{ color: 'var(--bo-text-muted)' }}>Completed:</span> <strong style={{ color: '#10B981' }}>{b.completed}</strong></div>
                    <div><span style={{ color: 'var(--bo-text-muted)' }}>In Progress:</span> <strong style={{ color: '#F59E0B' }}>{b.inProgress}</strong></div>
                    <div><span style={{ color: 'var(--bo-text-muted)' }}>Not Started:</span> <strong>{b.notStarted}</strong></div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 6 }}>Completion Rate</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${b.completionRate}%`, background: ACCENT, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>{b.completionRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </FacultyLayout>
  );
};

export default FacultyStudentTracking;
