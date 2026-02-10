import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { facultyAnalyticsService, DashboardOverview } from '../../services/faculty-analytics.service';
import { BookOpen, Users, TrendingUp, FileText, BarChart3, Clock, ChevronRight, Plus } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';

const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 30000);
    return () => clearInterval(iv);
  }, []);

  const loadData = async () => {
    try {
      const res = await facultyAnalyticsService.getDashboardOverview();
      setData(res);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
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
          <div className="loading-title">Loading Faculty Dashboard</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </FacultyLayout>
    );
  }

  const o = data?.overview;
  const courses = data?.courses || [];

  const stats = [
    { label: 'Total Courses', value: o?.totalCourses || 0, icon: <BookOpen size={20} />, color: ACCENT },
    { label: 'Published', value: o?.publishedCourses || 0, icon: <TrendingUp size={20} />, color: '#10B981' },
    { label: 'Draft', value: o?.draftCourses || 0, icon: <FileText size={20} />, color: '#F59E0B' },
    { label: 'Unique Students', value: o?.uniqueStudents || 0, icon: <Users size={20} />, color: '#3B82F6' },
    { label: 'Completion Rate', value: `${(o?.overallCompletionRate || 0).toFixed(1)}%`, icon: <BarChart3 size={20} />, color: '#10B981' },
    { label: 'Active (7d)', value: o?.activeStudentsLast7Days || 0, icon: <Clock size={20} />, color: '#6366F1' },
  ];

  return (
    <FacultyLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>Faculty Dashboard</h1>
        <p style={{ color: 'var(--bo-text-secondary)', margin: '4px 0 0', fontSize: 14 }}>Welcome back — here's your teaching overview</p>
      </div>

      {error && <div style={{ padding: 12, background: '#FEE2E2', color: '#DC2626', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{error}</div>}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {stats.map((s, i) => (
          <div key={i} className="bo-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text-primary)' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bo-card" style={{ padding: 20, marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--bo-text-primary)' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="bo-btn bo-btn-primary" style={{ background: ACCENT, borderColor: ACCENT }} onClick={() => navigate('/faculty/create-course')}>
            <Plus size={16} /> Create Course
          </button>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/courses')}>
            <BookOpen size={16} /> My Courses
          </button>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/students')}>
            <Users size={16} /> My Students
          </button>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/analytics')}>
            <BarChart3 size={16} /> Analytics
          </button>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/self-paced')}>
            <FileText size={16} /> Self-Paced Resources
          </button>
        </div>
      </div>

      {/* Assignment Summary */}
      {o && (
        <div className="bo-card" style={{ padding: 20, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--bo-text-primary)' }}>Assignment Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Assignments', value: o.totalAssignments, color: ACCENT },
              { label: 'Completed', value: o.completedAssignments, color: '#10B981' },
              { label: 'In Progress', value: o.inProgressAssignments, color: '#F59E0B' },
              { label: 'Not Started', value: o.notStartedAssignments, color: '#6B7280' },
            ].map((item, i) => (
              <div key={i} style={{ padding: 14, background: `${item.color}08`, borderRadius: 8, border: `1px solid ${item.color}20` }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>{item.label}</div>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          {o.totalAssignments > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 6 }}>
                <span>Overall Progress</span>
                <span>{o.averageProgress.toFixed(1)}%</span>
              </div>
              <div style={{ height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${o.averageProgress}%`, background: ACCENT, borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Courses */}
      <div className="bo-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--bo-text-primary)' }}>Recent Courses</h3>
          <button className="bo-btn bo-btn-outline" style={{ fontSize: 13 }} onClick={() => navigate('/faculty/courses')}>View All <ChevronRight size={14} /></button>
        </div>
        {courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>
            <BookOpen size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>No courses yet. Create your first course!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {courses.slice(0, 5).map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bo-bg)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }} onClick={() => navigate(`/faculty/courses/${c.id}`)}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bo-text-primary)' }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                    {({'YEAR_1':'Year 1','YEAR_2':'Year 2','YEAR_3':'Year 3','YEAR_3_MINOR':'Year 3 (Part 1)','YEAR_3_MAJOR':'Year 3 (Part 2)','YEAR_4':'Year 4','YEAR_5':'Year 5','FIRST_YEAR':'1st Year','SECOND_YEAR':'2nd Year','THIRD_YEAR':'3rd Year','FOURTH_YEAR':'4th Year','FIFTH_YEAR':'5th Year','INTERNSHIP':'Internship','PART_1':'Part 1','PART_2':'Part 2'} as Record<string,string>)[c.academicYear] || c.academicYear?.replace(/_/g, ' ')} · {c.stepCount} steps · {c.assignmentCount} assigned
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: c.status === 'PUBLISHED' ? '#D1FAE5' : '#FEF3C7',
                    color: c.status === 'PUBLISHED' ? '#065F46' : '#92400E',
                  }}>{c.status}</span>
                  <ChevronRight size={16} style={{ color: 'var(--bo-text-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FacultyLayout>
  );
};

export default FacultyDashboard;
