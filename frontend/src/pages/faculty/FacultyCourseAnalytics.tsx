import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { courseService } from '../../services/course.service';
import { ArrowLeft, Search, Users, BarChart3 } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';

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

const FacultyCourseAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [course, setCourse] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [courseData, analyticsData] = await Promise.all([
        courseService.getById(id!),
        courseService.getAnalytics(id!),
      ]);
      setCourse(courseData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const filtered = (analytics?.studentDetails || []).filter(s => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (search) {
      const t = search.toLowerCase();
      return s.studentName?.toLowerCase().includes(t) || s.email?.toLowerCase().includes(t);
    }
    return true;
  });

  const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

  const getProgressColor = (p: number) => p >= 80 ? '#10B981' : p >= 50 ? '#F59E0B' : '#EF4444';

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      COMPLETED: { bg: '#D1FAE5', color: '#065F46', label: 'Completed' },
      IN_PROGRESS: { bg: '#FEF3C7', color: '#92400E', label: 'In Progress' },
      ASSIGNED: { bg: '#E5E7EB', color: '#374151', label: 'Assigned' },
    };
    const s = map[status] || { bg: '#E5E7EB', color: '#374151', label: status };
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
  };

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
        <div className="loading-title">Loading Course Analytics...</div>
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
          <p style={{ color: '#DC2626', marginBottom: 16 }}>{error || 'No analytics available'}</p>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/courses')}>Back to Courses</button>
        </div>
      </FacultyLayout>
    );
  }

  const circumference = 2 * Math.PI * 70;

  return (
    <FacultyLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(`/faculty/courses/${id}`)} style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}><ArrowLeft size={18} /></button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>Course Analytics</h1>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>{course?.title}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate(`/faculty/courses/${id}/tracking`)}>
            <Users size={16} /> Detailed Tracking
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Assigned', value: analytics.totalAssigned, icon: '👥', color: ACCENT },
          { label: 'Completed', value: analytics.completed, icon: '✅', color: '#10B981' },
          { label: 'In Progress', value: analytics.inProgress, icon: '⏳', color: '#F59E0B' },
          { label: 'Not Started', value: analytics.notStarted, icon: '⭕', color: '#6B7280' },
        ].map((s, i) => (
          <div key={i} className="bo-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text-primary)' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Completion Rate Circle */}
      <div className="bo-card" style={{ padding: 24, marginBottom: 28, textAlign: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px', color: 'var(--bo-text-primary)' }}>Overall Completion Rate</h3>
        <svg width="160" height="160" style={{ margin: '0 auto', display: 'block' }}>
          <circle cx="80" cy="80" r="70" fill="none" stroke="#E5E7EB" strokeWidth="14" />
          <circle cx="80" cy="80" r="70" fill="none" stroke={ACCENT} strokeWidth="14"
            strokeDasharray={`${circumference * analytics.completionRate / 100} ${circumference}`}
            strokeLinecap="round" transform="rotate(-90 80 80)" style={{ transition: 'stroke-dasharray 0.8s' }} />
          <text x="80" y="86" textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--bo-text-primary)">{analytics.completionRate.toFixed(1)}%</text>
        </svg>
        <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, marginTop: 12 }}>
          {analytics.completed} of {analytics.totalAssigned} students completed
        </p>
      </div>

      {/* Student Table */}
      <div className="bo-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--bo-text-primary)' }}>Student Progress</h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
            <input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff' }}>
            <option value="ALL">All Status</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--bo-text-muted)' }}>No students match filters</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--bo-border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--bo-text-muted)', fontWeight: 500 }}>Student</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--bo-text-muted)', fontWeight: 500 }}>Assigned</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--bo-text-muted)', fontWeight: 500 }}>Started</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--bo-text-muted)', fontWeight: 500 }}>Progress</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--bo-text-muted)', fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.studentId} style={{ borderBottom: '1px solid var(--bo-border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 500 }}>{s.studentName}</div>
                      <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{s.email}</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--bo-text-secondary)' }}>{formatDate(s.assignedAt)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--bo-text-secondary)' }}>{formatDate(s.startedAt)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                          <div style={{ height: '100%', width: `${s.progress}%`, background: getProgressColor(s.progress), borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: getProgressColor(s.progress), minWidth: 36 }}>{s.progress.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{getStatusBadge(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--bo-text-muted)' }}>
          Showing {filtered.length} of {analytics.studentDetails.length} students
        </div>
      </div>
    </FacultyLayout>
  );
};

export default FacultyCourseAnalytics;
