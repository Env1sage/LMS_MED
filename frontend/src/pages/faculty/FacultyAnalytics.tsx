import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { facultyAnalyticsService, DashboardOverview, CourseAnalytics, McqAnalytics } from '../../services/faculty-analytics.service';
import {
  BarChart3, TrendingUp, Users, BookOpen, Award, ArrowRight,
  Search, Eye, ChevronDown, ChevronUp, Target, CheckCircle,
  AlertTriangle, GraduationCap, FileText, Zap
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';
type TabKey = 'overview' | 'students' | 'courses';

const FacultyAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Overview
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState('');

  // Students
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsData, setStudentsData] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState<'all' | 'active' | 'assigned'>('all');
  const [studentSort, setStudentSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'progress', dir: 'desc' });

  // Courses — drill into individual course
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalytics | null>(null);
  const [mcqAnalytics, setMcqAnalytics] = useState<McqAnalytics | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseTab, setCourseTab] = useState<'students' | 'steps' | 'mcq'>('students');

  // Load overview on mount
  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await facultyAnalyticsService.getDashboardOverview();
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  // Load students when tab switches
  const loadStudents = useCallback(async () => {
    try {
      setStudentsLoading(true);
      const res = await facultyAnalyticsService.getAllStudents(studentFilter);
      setStudentsData(res);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setStudentsLoading(false);
    }
  }, [studentFilter]);

  useEffect(() => {
    if (activeTab === 'students') loadStudents();
  }, [activeTab, loadStudents]);

  // Load course analytics when a course is selected
  const loadCourseAnalytics = async (courseId: string) => {
    try {
      setCourseLoading(true);
      setSelectedCourseId(courseId);
      setCourseTab('students');
      const [analytics, mcq] = await Promise.all([
        facultyAnalyticsService.getCourseAnalytics(courseId),
        facultyAnalyticsService.getMcqAnalytics(courseId).catch(() => null),
      ]);
      setCourseAnalytics(analytics);
      setMcqAnalytics(mcq);
    } catch (err) {
      console.error('Failed to load course analytics:', err);
    } finally {
      setCourseLoading(false);
    }
  };

  /* ═══════════ HELPERS ═══════════ */
  const pctColor = (p: number) => p >= 80 ? '#10B981' : p >= 50 ? '#F59E0B' : '#EF4444';
  const formatTime = (s: number) => {
    if (!s) return '0m';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  const statusBadge = (status: string) => {
    const m: Record<string, { bg: string; color: string; label: string }> = {
      COMPLETED: { bg: '#D1FAE5', color: '#065F46', label: 'Completed' },
      IN_PROGRESS: { bg: '#FEF3C7', color: '#92400E', label: 'In Progress' },
      NOT_STARTED: { bg: '#E5E7EB', color: '#374151', label: 'Not Started' },
      ASSIGNED: { bg: '#DBEAFE', color: '#1E40AF', label: 'Assigned' },
    };
    const s = m[status] || { bg: '#E5E7EB', color: '#374151', label: status };
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  /* ═══════════ LOADING / ERROR ═══════════ */
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
        <div className="loading-title">Loading Analytics...</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </FacultyLayout>
  );
  if (error || !data) return (
    <FacultyLayout>
      <div className="bo-card" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#DC2626' }}>{error || 'No data available'}</p>
        <button className="bo-btn bo-btn-outline" onClick={loadOverview} style={{ marginTop: 16 }}>Retry</button>
      </div>
    </FacultyLayout>
  );

  const ov = data.overview;
  const courses = data.courses || [];
  const completionRate = ov.overallCompletionRate || 0;

  /* ═══════════ STUDENT PERFORMANCE TAB LOGIC ═══════════ */
  const students = studentsData?.students || [];
  const filteredStudents = students
    .filter((s: any) => {
      if (!studentSearch) return true;
      const t = studentSearch.toLowerCase();
      return s.name?.toLowerCase().includes(t) || s.email?.toLowerCase().includes(t);
    })
    .sort((a: any, b: any) => {
      const { field, dir } = studentSort;
      let cmp = 0;
      if (field === 'name') cmp = (a.name || '').localeCompare(b.name || '');
      else if (field === 'progress') cmp = (a.progress || 0) - (b.progress || 0);
      else if (field === 'coursesEnrolled') cmp = (a.coursesEnrolled || 0) - (b.coursesEnrolled || 0);
      return dir === 'asc' ? cmp : -cmp;
    });

  const toggleStudentSort = (field: string) => {
    setStudentSort(prev => prev.field === field
      ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'desc' });
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (studentSort.field !== field) return <ChevronDown size={12} style={{ opacity: 0.25 }} />;
    return studentSort.dir === 'asc' ? <ChevronUp size={12} style={{ color: ACCENT }} /> : <ChevronDown size={12} style={{ color: ACCENT }} />;
  };

  // Student aggregate stats
  const totalStudents = studentsData?.total || 0;
  const activeStudents = students.filter((s: any) => s.isActive).length;
  const avgProgress = students.length > 0 ? Math.round(students.reduce((sum: number, s: any) => sum + (s.progress || 0), 0) / students.length) : 0;
  const topPerformers = students.filter((s: any) => (s.progress || 0) >= 80).length;
  const atRisk = students.filter((s: any) => (s.progress || 0) > 0 && (s.progress || 0) < 30).length;

  /* ═══════════ COURSE ANALYTICS DRILL-DOWN LOGIC ═══════════ */
  const ca = courseAnalytics;
  const filteredCourseStudents = (ca?.studentDetails || []).filter(s => {
    if (!courseSearch) return true;
    const t = courseSearch.toLowerCase();
    return s.studentName?.toLowerCase().includes(t) || s.email?.toLowerCase().includes(t);
  });

  /* ═══════════ TAB DEFINITIONS ═══════════ */
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { key: 'students', label: 'Student Performance', icon: <GraduationCap size={16} /> },
    { key: 'courses', label: 'Course Analysis', icon: <BookOpen size={16} /> },
  ];

  return (
    <FacultyLayout>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>
          📊 Analytics & Performance
        </h1>
        <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>
          Comprehensive student performance and course analysis
        </p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--bo-border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedCourseId(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '12px 24px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 14, fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? ACCENT : 'var(--bo-text-secondary)',
              borderBottom: activeTab === t.key ? `2px solid ${ACCENT}` : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB 1 — OVERVIEW
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total Courses', value: ov.totalCourses, icon: <BookOpen size={20} />, color: ACCENT },
              { label: 'Published', value: ov.publishedCourses, icon: <Award size={20} />, color: '#10B981' },
              { label: 'Total Assignments', value: ov.totalAssignments, icon: <BarChart3 size={20} />, color: '#3B82F6' },
              { label: 'Unique Students', value: ov.uniqueStudents, icon: <Users size={20} />, color: '#F59E0B' },
              { label: 'Completed', value: ov.completedAssignments, icon: <CheckCircle size={20} />, color: '#059669' },
              { label: 'In Progress', value: ov.inProgressAssignments, icon: <TrendingUp size={20} />, color: '#8B5CF6' },
            ].map((m, i) => (
              <div key={i} className="bo-card" style={{ padding: 18 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, marginBottom: 10 }}>{m.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>{m.value}</div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Completion Rate + Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Circle */}
            <div className="bo-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px', alignSelf: 'flex-start' }}>Overall Completion Rate</h3>
              <svg width={150} height={150} viewBox="0 0 150 150">
                <circle cx={75} cy={75} r={60} fill="none" stroke="#E5E7EB" strokeWidth={12} />
                <circle cx={75} cy={75} r={60} fill="none" stroke={ACCENT} strokeWidth={12}
                  strokeDasharray={`${2 * Math.PI * 60}`}
                  strokeDashoffset={`${2 * Math.PI * 60 * (1 - completionRate / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 75 75)" style={{ transition: 'stroke-dashoffset 0.8s' }} />
                <text x={75} y={70} textAnchor="middle" fontSize={26} fontWeight={700} fill="var(--bo-text-primary)">{completionRate}%</text>
                <text x={75} y={90} textAnchor="middle" fontSize={11} fill="var(--bo-text-muted)">Completion</text>
              </svg>
              <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 13 }}>
                <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, color: '#10B981', fontSize: 17 }}>{ov.completedAssignments}</div><div style={{ color: 'var(--bo-text-muted)' }}>Done</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, color: '#F59E0B', fontSize: 17 }}>{ov.inProgressAssignments}</div><div style={{ color: 'var(--bo-text-muted)' }}>Active</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, color: '#EF4444', fontSize: 17 }}>{ov.notStartedAssignments}</div><div style={{ color: 'var(--bo-text-muted)' }}>Pending</div></div>
              </div>
            </div>

            {/* Activity bars */}
            <div className="bo-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Activity Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Average Progress', value: `${ov.averageProgress || 0}%`, bar: ov.averageProgress || 0, color: ACCENT },
                  { label: 'Active Students (7d)', value: ov.activeStudentsLast7Days, bar: ov.uniqueStudents > 0 ? Math.round((ov.activeStudentsLast7Days / ov.uniqueStudents) * 100) : 0, color: '#3B82F6' },
                  { label: 'Draft Courses', value: ov.draftCourses, bar: ov.totalCourses > 0 ? Math.round((ov.draftCourses / ov.totalCourses) * 100) : 0, color: '#F59E0B' },
                  { label: 'Published Courses', value: ov.publishedCourses, bar: ov.totalCourses > 0 ? Math.round((ov.publishedCourses / ov.totalCourses) * 100) : 0, color: '#10B981' },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: 'var(--bo-text-secondary)' }}>{item.label}</span>
                      <span style={{ fontWeight: 700, color: item.color }}>{item.value}</span>
                    </div>
                    <div style={{ height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(item.bar, 100)}%`, background: item.color, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick — Course List */}
          <div className="bo-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Course-wise Performance</h3>
              <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{courses.length} courses</span>
            </div>
            {courses.length === 0 ? (
              <p style={{ color: 'var(--bo-text-secondary)', textAlign: 'center', padding: 20 }}>No courses yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {courses.map((c: any) => {
                  const comp = c.completionRate || c.completedPercentage || 0;
                  const assigned = c.totalAssigned || c.assignmentCount || 0;
                  const completed = c.completedCount || 0;
                  return (
                    <div key={c.courseId || c.id}
                      style={{ padding: 14, border: '1px solid var(--bo-border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onClick={() => { setActiveTab('courses'); loadCourseAnalytics(c.courseId || c.id); }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bo-border)')}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title || c.courseTitle}</div>
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{assigned} assigned · {completed} completed</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div style={{ width: 90 }}>
                          <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${comp}%`, background: pctColor(comp), borderRadius: 3 }} />
                          </div>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: pctColor(comp), minWidth: 40, textAlign: 'right' }}>{comp}%</span>
                        <ArrowRight size={16} style={{ color: 'var(--bo-text-muted)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2 — STUDENT PERFORMANCE
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'students' && (
        <>
          {studentsLoading ? (
            <div className="bo-loading"><div className="bo-spinner" /></div>
          ) : (
            <>
              {/* Student Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Total Students', value: totalStudents, icon: <Users size={20} />, color: ACCENT },
                  { label: 'Active Students', value: activeStudents, icon: <Zap size={20} />, color: '#10B981' },
                  { label: 'Average Progress', value: `${avgProgress}%`, icon: <TrendingUp size={20} />, color: '#3B82F6' },
                  { label: 'Top Performers', value: topPerformers, icon: <Award size={20} />, color: '#059669', sub: '≥ 80% progress' },
                  { label: 'At Risk', value: atRisk, icon: <AlertTriangle size={20} />, color: '#EF4444', sub: '< 30% progress' },
                ].map((m, i) => (
                  <div key={i} className="bo-card" style={{ padding: 18 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, marginBottom: 10 }}>{m.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>{m.label}</div>
                    {(m as any).sub && <div style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>{(m as any).sub}</div>}
                  </div>
                ))}
              </div>

              {/* Performance Distribution */}
              <div className="bo-card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Performance Distribution</h3>
                {(() => {
                  const buckets = [
                    { label: 'Excellent (80-100%)', min: 80, max: 100, color: '#10B981' },
                    { label: 'Good (60-79%)', min: 60, max: 79, color: '#3B82F6' },
                    { label: 'Average (40-59%)', min: 40, max: 59, color: '#F59E0B' },
                    { label: 'Below Average (20-39%)', min: 20, max: 39, color: '#F97316' },
                    { label: 'Poor (0-19%)', min: 0, max: 19, color: '#EF4444' },
                  ];
                  const counts = buckets.map(b => students.filter((s: any) => {
                    const p = s.progress || 0;
                    return p >= b.min && p <= b.max;
                  }).length);
                  const maxCount = Math.max(...counts, 1);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {buckets.map((b, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 170, fontSize: 13, color: 'var(--bo-text-secondary)', flexShrink: 0 }}>{b.label}</div>
                          <div style={{ flex: 1, height: 22, background: '#F3F4F6', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ height: '100%', width: `${(counts[i] / maxCount) * 100}%`, background: b.color, borderRadius: 6, transition: 'width 0.5s', minWidth: counts[i] > 0 ? 24 : 0 }} />
                          </div>
                          <div style={{ width: 40, textAlign: 'right', fontWeight: 700, fontSize: 14, color: b.color }}>{counts[i]}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Student Courses Breakdown */}
              {students.length > 0 && (
                <div className="bo-card" style={{ padding: 24, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Enrollment Overview</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Enrollment distribution */}
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 12 }}>Courses per Student</h4>
                      {(() => {
                        const dist: Record<number, number> = {};
                        students.forEach((s: any) => { dist[s.coursesEnrolled || 0] = (dist[s.coursesEnrolled || 0] || 0) + 1; });
                        const entries = Object.entries(dist).sort((a, b) => Number(a[0]) - Number(b[0]));
                        const maxVal = Math.max(...entries.map(e => Number(e[1])), 1);
                        return entries.map(([numCourses, count]) => (
                          <div key={numCourses} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ width: 70, fontSize: 12, color: 'var(--bo-text-muted)' }}>{numCourses} course{Number(numCourses) !== 1 ? 's' : ''}</span>
                            <div style={{ flex: 1, height: 14, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(Number(count) / maxVal) * 100}%`, background: ACCENT, borderRadius: 4 }} />
                            </div>
                            <span style={{ width: 30, fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{count}</span>
                          </div>
                        ));
                      })()}
                    </div>
                    {/* Activity distribution */}
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 12 }}>Activity Status</h4>
                      {[
                        { label: 'Active', count: activeStudents, color: '#10B981' },
                        { label: 'Inactive', count: totalStudents - activeStudents, color: '#EF4444' },
                      ].map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: 'var(--bo-text-secondary)', flex: 1 }}>{s.label}</span>
                          <span style={{ fontWeight: 700, fontSize: 16, color: s.color }}>{s.count}</span>
                          <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                            ({totalStudents > 0 ? Math.round((s.count / totalStudents) * 100) : 0}%)
                          </span>
                        </div>
                      ))}
                      {/* Progress donut */}
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                        <svg width={100} height={100} viewBox="0 0 100 100">
                          <circle cx={50} cy={50} r={38} fill="none" stroke="#E5E7EB" strokeWidth={10} />
                          <circle cx={50} cy={50} r={38} fill="none" stroke={ACCENT} strokeWidth={10}
                            strokeDasharray={`${2 * Math.PI * 38}`}
                            strokeDashoffset={`${2 * Math.PI * 38 * (1 - avgProgress / 100)}`}
                            strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.5s' }} />
                          <text x={50} y={46} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--bo-text-primary)">{avgProgress}%</text>
                          <text x={50} y={60} textAnchor="middle" fontSize={9} fill="var(--bo-text-muted)">Avg Progress</text>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Search + Filter */}
              <div className="bo-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>All Students</h3>
                  <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{filteredStudents.length} of {totalStudents}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--bo-text-muted)' }} />
                    <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                      placeholder="Search by name or email..."
                      style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bo-bg)', borderRadius: 8 }}>
                    {(['all', 'active', 'assigned'] as const).map(f => (
                      <button key={f} onClick={() => setStudentFilter(f)}
                        style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: studentFilter === f ? ACCENT : 'transparent', color: studentFilter === f ? '#fff' : 'var(--bo-text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize' }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                {filteredStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 50, color: 'var(--bo-text-muted)' }}>
                    <Users size={40} style={{ marginBottom: 10 }} />
                    <p>No students found</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: 'var(--bo-bg)' }}>
                          <th onClick={() => toggleStudentSort('name')} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Student <SortIcon field="name" /></span>
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>Year</th>
                          <th onClick={() => toggleStudentSort('coursesEnrolled')} style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>Courses <SortIcon field="coursesEnrolled" /></span>
                          </th>
                          <th onClick={() => toggleStudentSort('progress')} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Progress <SortIcon field="progress" /></span>
                          </th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>Status</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>Courses</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s: any) => {
                          const p = s.progress || 0;
                          return (
                            <tr key={s.id} style={{ borderTop: '1px solid var(--bo-border)', transition: 'background 0.1s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${pctColor(p)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: pctColor(p), flexShrink: 0 }}>
                                    {s.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{s.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--bo-text-secondary)' }}>{({'YEAR_1':'Year 1','YEAR_2':'Year 2','YEAR_3':'Year 3','YEAR_3_MINOR':'Year 3 (Part 1)','YEAR_3_MAJOR':'Year 3 (Part 2)','YEAR_4':'Year 4','YEAR_5':'Year 5','FIRST_YEAR':'1st Year','SECOND_YEAR':'2nd Year','THIRD_YEAR':'3rd Year','FOURTH_YEAR':'4th Year','FIFTH_YEAR':'5th Year','INTERNSHIP':'Internship','PART_1':'Part 1','PART_2':'Part 2'} as Record<string,string>)[s.academicYear] || s.academicYear?.replace(/_/g, ' ') || '—'}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: ACCENT }}>{s.coursesEnrolled || 0}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, height: 7, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
                                    <div style={{ height: '100%', width: `${p}%`, background: pctColor(p), borderRadius: 4, transition: 'width 0.3s' }} />
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: pctColor(p), minWidth: 36, textAlign: 'right' }}>{p}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                  background: s.isActive ? '#D1FAE5' : '#FEE2E2',
                                  color: s.isActive ? '#065F46' : '#DC2626',
                                }}>{s.isActive ? 'Active' : 'Inactive'}</span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', maxWidth: 150 }}>
                                  {(s.courseNames || []).slice(0, 2).join(', ')}
                                  {(s.courseNames || []).length > 2 && ` +${s.courseNames.length - 2}`}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 3 — COURSE ANALYSIS
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'courses' && !selectedCourseId && (
        <div className="bo-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>Select a Course to Analyze</h3>
          {courses.length === 0 ? (
            <p style={{ color: 'var(--bo-text-muted)', textAlign: 'center', padding: 30 }}>No courses available</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {courses.map((c: any) => {
                const comp = c.completionRate || c.completedPercentage || 0;
                const assigned = c.totalAssigned || c.assignmentCount || 0;
                return (
                  <div key={c.courseId || c.id} className="bo-card"
                    onClick={() => loadCourseAnalytics(c.courseId || c.id)}
                    style={{ padding: 20, cursor: 'pointer', border: '1px solid var(--bo-border)', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = `0 4px 12px ${ACCENT}15`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    {/* Accent strip */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: pctColor(comp) }} />
                    <h4 style={{ fontSize: 15, fontWeight: 600, margin: '4px 0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title || c.courseTitle}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 12 }}>
                      <span>{assigned} students</span>
                      <span>{c.stepCount || 0} steps</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${comp}%`, background: pctColor(comp), borderRadius: 4 }} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: pctColor(comp) }}>{comp}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, gap: 4, fontSize: 12, color: ACCENT, fontWeight: 600 }}>
                      View Analysis <ArrowRight size={14} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ COURSE DRILL-DOWN ═══ */}
      {activeTab === 'courses' && selectedCourseId && (
        <>
          {courseLoading ? (
            <div className="bo-loading"><div className="bo-spinner" /></div>
          ) : !ca ? (
            <div className="bo-card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: '#DC2626' }}>Failed to load course analytics</p>
              <button className="bo-btn bo-btn-outline" onClick={() => setSelectedCourseId(null)} style={{ marginTop: 16 }}>← Back to courses</button>
            </div>
          ) : (
            <>
              {/* Back + Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <button onClick={() => setSelectedCourseId(null)} style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  ← Back
                </button>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--bo-text-primary)' }}>{ca.courseTitle}</h2>
                  <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', margin: '2px 0 0' }}>{({'YEAR_1':'Year 1','YEAR_2':'Year 2','YEAR_3':'Year 3','YEAR_3_MINOR':'Year 3 (Part 1)','YEAR_3_MAJOR':'Year 3 (Part 2)','YEAR_4':'Year 4','YEAR_5':'Year 5','FIRST_YEAR':'1st Year','SECOND_YEAR':'2nd Year','THIRD_YEAR':'3rd Year','FOURTH_YEAR':'4th Year','FIFTH_YEAR':'5th Year','INTERNSHIP':'Internship','PART_1':'Part 1','PART_2':'Part 2'} as Record<string,string>)[ca.academicYear] || ca.academicYear?.replace(/_/g, ' ')} · {ca.status}</p>
                </div>
                <button className="bo-btn bo-btn-outline" style={{ fontSize: 13 }} onClick={() => navigate(`/faculty/courses/${selectedCourseId}/tracking`)}>
                  📥 Detailed Tracking & Reports
                </button>
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Enrolled', value: ca.summary.totalAssigned, color: ACCENT, icon: '👥' },
                  { label: 'Completed', value: ca.summary.completed, color: '#10B981', icon: '✅' },
                  { label: 'In Progress', value: ca.summary.inProgress, color: '#F59E0B', icon: '🔄' },
                  { label: 'Not Started', value: ca.summary.notStarted, color: '#6B7280', icon: '⏸️' },
                  { label: 'Completion Rate', value: `${ca.summary.completionRate}%`, color: ACCENT, icon: '📈' },
                  { label: 'Total Steps', value: ca.summary.totalSteps, color: '#3B82F6', icon: '📋' },
                ].map((s, i) => (
                  <div key={i} className="bo-card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Completion Donut + Distribution Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div className="bo-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', alignSelf: 'flex-start' }}>Completion Rate</h3>
                  <svg width={130} height={130} viewBox="0 0 130 130">
                    <circle cx={65} cy={65} r={52} fill="none" stroke="#E5E7EB" strokeWidth={10} />
                    <circle cx={65} cy={65} r={52} fill="none" stroke={ACCENT} strokeWidth={10}
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      strokeDashoffset={`${2 * Math.PI * 52 * (1 - ca.summary.completionRate / 100)}`}
                      strokeLinecap="round" transform="rotate(-90 65 65)" style={{ transition: 'stroke-dashoffset 0.8s' }} />
                    <text x={65} y={60} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--bo-text-primary)">{ca.summary.completionRate}%</text>
                    <text x={65} y={78} textAnchor="middle" fontSize={10} fill="var(--bo-text-muted)">Complete</text>
                  </svg>
                </div>
                <div className="bo-card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Progress Distribution</h3>
                  {ca.summary.totalAssigned > 0 && (
                    <>
                      <div style={{ height: 22, display: 'flex', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ width: `${(ca.summary.completed / ca.summary.totalAssigned) * 100}%`, background: '#10B981' }} title="Completed" />
                        <div style={{ width: `${(ca.summary.inProgress / ca.summary.totalAssigned) * 100}%`, background: '#F59E0B' }} title="In Progress" />
                        <div style={{ width: `${(ca.summary.notStarted / ca.summary.totalAssigned) * 100}%`, background: '#D1D5DB' }} title="Not Started" />
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} /> Completed ({ca.summary.completed})</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} /> In Progress ({ca.summary.inProgress})</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D1D5DB', display: 'inline-block' }} /> Not Started ({ca.summary.notStarted})</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Sub-tabs: Students | Steps | MCQ */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--bo-border)' }}>
                {[
                  { key: 'students', label: `Students (${ca.summary.totalAssigned})`, icon: <Users size={15} /> },
                  { key: 'steps', label: `Steps (${ca.summary.totalSteps})`, icon: <FileText size={15} /> },
                  { key: 'mcq', label: 'MCQ Analysis', icon: <Target size={15} /> },
                ].map(t => (
                  <button key={t.key} onClick={() => setCourseTab(t.key as any)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: 13, fontWeight: courseTab === t.key ? 600 : 400,
                      color: courseTab === t.key ? ACCENT : 'var(--bo-text-secondary)',
                      borderBottom: courseTab === t.key ? `2px solid ${ACCENT}` : '2px solid transparent',
                      marginBottom: -2,
                    }}>{t.icon} {t.label}</button>
                ))}
              </div>

              {/* Students sub-tab */}
              {courseTab === 'students' && (
                <div className="bo-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--bo-text-muted)' }} />
                      <input value={courseSearch} onChange={e => setCourseSearch(e.target.value)}
                        placeholder="Search students..."
                        style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  {filteredCourseStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 30, color: 'var(--bo-text-muted)' }}>No students match</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: 'var(--bo-bg)' }}>
                            {['Student', 'Status', 'Progress', 'Steps', 'Time Spent', 'Last Activity', ''].map(h => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCourseStudents.map(s => (
                            <tr key={s.studentId} style={{ borderTop: '1px solid var(--bo-border)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 500 }}>{s.studentName}</div>
                                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{s.email}</div>
                              </td>
                              <td style={{ padding: '10px 12px' }}>{statusBadge(s.status)}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', minWidth: 50 }}>
                                    <div style={{ height: '100%', width: `${s.progressPercent}%`, background: pctColor(s.progressPercent), borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: pctColor(s.progressPercent) }}>{s.progressPercent}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: 13 }}>{s.completedSteps}/{s.totalSteps}</td>
                              <td style={{ padding: '10px 12px', fontSize: 13 }}>{formatTime(s.totalTimeSpent)}</td>
                              <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--bo-text-muted)' }}>{s.lastActivity ? formatDate(s.lastActivity) : 'Never'}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <button onClick={() => navigate(`/faculty/courses/${selectedCourseId}/students/${s.studentId}`)}
                                  title="View Details"
                                  style={{ padding: 5, border: '1px solid var(--bo-border)', borderRadius: 6, background: '#fff', cursor: 'pointer', color: ACCENT, display: 'flex', alignItems: 'center' }}>
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

              {/* Steps sub-tab */}
              {courseTab === 'steps' && (
                <div className="bo-card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Step-by-Step Analytics</h3>
                  {(ca.stepAnalytics || []).length === 0 ? (
                    <p style={{ color: 'var(--bo-text-muted)', textAlign: 'center', padding: 20 }}>No steps in this course</p>
                  ) : (
                    <>
                      {/* Visual step cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 20 }}>
                        {ca.stepAnalytics.map(step => (
                          <div key={step.stepId} style={{ padding: 16, background: 'var(--bo-bg)', borderRadius: 10, border: '1px solid var(--bo-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>Step {step.stepNumber}</span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#F3F4F6' }}>
                                  {step.stepType === 'VIDEO' ? '🎬' : step.stepType === 'BOOK' ? '📚' : '❓'} {step.stepType}
                                </span>
                                {step.mandatory && <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#FEE2E2', color: '#DC2626' }}>Required</span>}
                              </div>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.learningUnit.title}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 12 }}>
                              <div>
                                <div style={{ fontWeight: 700, color: '#10B981' }}>{step.completionRate}%</div>
                                <div style={{ color: 'var(--bo-text-muted)' }}>Completion</div>
                              </div>
                              <div>
                                <div style={{ fontWeight: 700 }}>{step.completedCount}/{ca.summary.totalAssigned}</div>
                                <div style={{ color: 'var(--bo-text-muted)' }}>Completed</div>
                              </div>
                              <div>
                                <div style={{ fontWeight: 700 }}>{formatTime(step.avgTimeSpent)}</div>
                                <div style={{ color: 'var(--bo-text-muted)' }}>Avg Time</div>
                              </div>
                            </div>
                            <div style={{ height: 5, background: '#E5E7EB', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${step.completionRate}%`, background: pctColor(step.completionRate), borderRadius: 3 }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Steps table */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: 'var(--bo-bg)' }}>
                              {['#', 'Step', 'Type', 'Required', 'Attempted', 'Completed', 'Avg Progress', 'Avg Time'].map(h => (
                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ca.stepAnalytics.map(step => (
                              <tr key={step.stepId} style={{ borderTop: '1px solid var(--bo-border)' }}>
                                <td style={{ padding: '10px 12px', fontWeight: 700, color: ACCENT }}>{step.stepNumber}</td>
                                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{step.learningUnit.title}</td>
                                <td style={{ padding: '10px 12px' }}>{step.stepType}</td>
                                <td style={{ padding: '10px 12px' }}>{step.mandatory ? '✅' : '—'}</td>
                                <td style={{ padding: '10px 12px' }}>{step.totalAttempted}</td>
                                <td style={{ padding: '10px 12px' }}>{step.completedCount}/{ca.summary.totalAssigned} ({step.completionRate}%)</td>
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
                    </>
                  )}
                </div>
              )}

              {/* MCQ sub-tab */}
              {courseTab === 'mcq' && (
                <div className="bo-card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>MCQ Performance Analysis</h3>
                  {!mcqAnalytics ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>
                      <Target size={40} style={{ marginBottom: 10 }} />
                      <p>No MCQ data available for this course</p>
                    </div>
                  ) : (
                    <>
                      {/* MCQ Summary */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
                        {[
                          { label: 'Total Attempts', value: mcqAnalytics.summary.totalAttempts, icon: '📝', color: ACCENT },
                          { label: 'Correct Answers', value: mcqAnalytics.summary.correctAttempts, icon: '✅', color: '#10B981' },
                          { label: 'Average Score', value: `${(mcqAnalytics.summary.avgScore || 0).toFixed(1)}%`, icon: '📊', color: '#3B82F6' },
                          { label: 'Accuracy', value: mcqAnalytics.summary.totalAttempts > 0 ? `${Math.round((mcqAnalytics.summary.correctAttempts / mcqAnalytics.summary.totalAttempts) * 100)}%` : '0%', icon: '🎯', color: '#059669' },
                        ].map((s, i) => (
                          <div key={i} className="bo-card" style={{ padding: 16, textAlign: 'center' }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* By Difficulty */}
                      {mcqAnalytics.byDifficulty && mcqAnalytics.byDifficulty.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: 'var(--bo-text-primary)' }}>Performance by Difficulty Level</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                            {mcqAnalytics.byDifficulty.map((d, i) => {
                              const acc = d.accuracy || 0;
                              return (
                                <div key={i} style={{ padding: 18, background: 'var(--bo-bg)', borderRadius: 10, border: '1px solid var(--bo-border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <span style={{
                                      padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                      background: d.level === 'EASY' ? '#D1FAE5' : d.level === 'MEDIUM' ? '#FEF3C7' : '#FEE2E2',
                                      color: d.level === 'EASY' ? '#065F46' : d.level === 'MEDIUM' ? '#92400E' : '#DC2626',
                                    }}>{d.level}</span>
                                    <span style={{ fontSize: 20, fontWeight: 700, color: pctColor(acc) }}>{acc}%</span>
                                  </div>
                                  <div style={{ height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                                    <div style={{ height: '100%', width: `${acc}%`, background: pctColor(acc), borderRadius: 4 }} />
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--bo-text-muted)' }}>
                                    <span>{d.attempts} attempts</span>
                                    <span>{d.correct} correct</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* MCQ Steps */}
                      {mcqAnalytics.mcqSteps && mcqAnalytics.mcqSteps.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: 'var(--bo-text-primary)' }}>MCQ Learning Units</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {mcqAnalytics.mcqSteps.map((step, i) => (
                              <div key={i} style={{ padding: 12, background: 'var(--bo-bg)', borderRadius: 8, border: '1px solid var(--bo-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 16 }}>❓</span>
                                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{step.title}</span>
                                <span style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontFamily: 'monospace' }}>{step.learningUnitId.slice(0, 8)}...</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </FacultyLayout>
  );
};

export default FacultyAnalytics;
