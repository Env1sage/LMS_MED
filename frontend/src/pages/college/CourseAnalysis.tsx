import React, { useState, useEffect } from 'react';
import { courseAnalyticsService, CourseAnalyticsOverview, CourseAnalytics as CourseAnalyticsType, CourseComparison, CourseDetails } from '../../services/course-analytics.service';
import { ratingsService, CollegeRatingItem, RatingStats, RatingType } from '../../services/ratings.service';
import { useAuth } from '../../context/AuthContext';
import CollegeLayout from '../../components/college/CollegeLayout';
import {
  BookOpen, TrendingUp, Award, Users, RefreshCw, BarChart3,
  Star, Clock, X, ChevronDown, ChevronUp, Search, Target,
  CheckCircle, AlertCircle, FileText, Layers, Eye, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const formatYear = (y: string) => {
  const m: Record<string, string> = {
    FIRST_YEAR: '1st Year', SECOND_YEAR: '2nd Year', THIRD_YEAR: '3rd Year',
    FOURTH_YEAR: '4th Year', FIFTH_YEAR: '5th Year', INTERNSHIP: 'Internship',
    YEAR_1: '1st Year', YEAR_2: '2nd Year', YEAR_3: '3rd Year',
    YEAR_4: '4th Year', YEAR_5: '5th Year',
    YEAR_3_MINOR: 'Year 3 (Part 1)', YEAR_3_MAJOR: 'Year 3 (Part 2)',
    YEAR_1_MINOR: '1st Year (Part 1)', YEAR_2_MINOR: '2nd Year (Part 1)',
    YEAR_4_MINOR: '4th Year (Part 1)', YEAR_5_MINOR: '5th Year (Part 1)',
    PART_1: 'Part 1', PART_2: 'Part 2',
    PRE_CLINICAL: 'Pre-Clinical', PARA_CLINICAL: 'Para-Clinical', CLINICAL: 'Clinical',
  };
  return m[y] || y.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const RadialGauge = ({ value, size = 56, sw = 5, color }: { value: number; size?: number; sw?: number; color: string }) => {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, o = c - (Math.min(value, 100) / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
};

const metricColors = [
  { from: '#10B981', to: '#059669', label: 'Completion Rate' },
  { from: '#3B82F6', to: '#2563EB', label: 'Average Test Score' },
  { from: '#8B5CF6', to: '#7C3AED', label: 'Pass Rate' },
];

const CourseAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<CourseAnalyticsOverview | null>(null);
  const [comparison, setComparison] = useState<CourseComparison[]>([]);
  const [courseRatings, setCourseRatings] = useState<CollegeRatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'comparison' | 'detail'>('overview');
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'students' | 'tests' | 'units' | 'competencies'>('students');
  const [sortField, setSortField] = useState<string>('completionRate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    if (!user?.collegeId) return;
    setLoading(true); setError(null);
    try {
      const [ov, cmp, cr] = await Promise.allSettled([
        courseAnalyticsService.getCourseAnalyticsOverview(user.collegeId),
        courseAnalyticsService.getCourseComparison(user.collegeId),
        ratingsService.getCollegeCourseRatings(user.collegeId),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (cmp.status === 'fulfilled') setComparison(cmp.value);
      if (cr.status === 'fulfilled') setCourseRatings(cr.value);
    } catch (err: any) { setError(err.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const loadCourseDetail = async (courseId: string) => {
    setSelectedCourseId(courseId); setDetailLoading(true); setTab('detail'); setDetailTab('students');
    try { setCourseDetail(await courseAnalyticsService.getCourseDetails(courseId)); }
    catch { setCourseDetail(null); }
    finally { setDetailLoading(false); }
  };

  const closeCourseDetail = () => { setSelectedCourseId(null); setCourseDetail(null); setTab('overview'); };

  const renderStars = (rating: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={13} fill={i <= Math.floor(rating) ? '#F59E0B' : 'none'} color={i <= rating ? '#F59E0B' : '#D1D5DB'} />
      ))}
      <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 600 }}>{rating.toFixed(1)}</span>
    </div>
  );

  const scoreColor = (s: number) => s >= 70 ? '#10B981' : s >= 40 ? '#F59E0B' : '#EF4444';
  const scoreArrow = (s: number) => s >= 60 ? <ArrowUpRight size={13} /> : s >= 40 ? <Minus size={13} /> : <ArrowDownRight size={13} />;
  const statusBadge = (status: string) => {
    const c: Record<string, { bg: string; color: string }> = {
      COMPLETED: { bg: '#ECFDF5', color: '#10B981' }, IN_PROGRESS: { bg: '#EFF6FF', color: '#3B82F6' },
      NOT_STARTED: { bg: '#F3F4F6', color: '#6B7280' }, ASSIGNED: { bg: '#FEF3C7', color: '#D97706' },
      PUBLISHED: { bg: '#ECFDF5', color: '#059669' }, DRAFT: { bg: '#F3F4F6', color: '#6B7280' },
    };
    const col = c[status] || c.NOT_STARTED;
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: col.bg, color: col.color, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{status.replace('_', ' ')}</span>;
  };

  const getCourseRating = (courseId: string) => courseRatings.find(r => r.courseId === courseId);

  const filteredAnalytics = (overview?.analytics || [])
    .filter(c => !search || c.courseTitle.toLowerCase().includes(search.toLowerCase()) || (c.courseCode || '').toLowerCase().includes(search.toLowerCase()) || (c.faculty || '').toLowerCase().includes(search.toLowerCase()));

  const thStyle: React.CSSProperties = { padding: '13px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.7px' };

  if (loading) return (
    <CollegeLayout>
      <div className="page-loading-screen">
        <div className="loading-rings"><div className="loading-ring loading-ring-1" /><div className="loading-ring loading-ring-2" /><div className="loading-ring loading-ring-3" /></div>
        <div className="loading-dots"><div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" /></div>
        <div className="loading-title">Loading Course Analysis</div>
        <div className="loading-bar-track"><div className="loading-bar-fill" /></div>
      </div>
    </CollegeLayout>
  );

  return (
    <CollegeLayout>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.3px' }}>Course Analysis</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Deep dive into course metrics, student engagement and test performance</p>
        </div>
        <button className="bo-btn bo-btn-outline" onClick={fetchData} style={{ gap: 6 }}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13, border: '1px solid #FECACA' }}>{error}</div>}

      {/* ── Summary Cards with accent bar ── */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total Courses', value: overview.totalCourses, color: '#059669', icon: <BookOpen size={20} />, sub: 'active' },
            { label: 'Avg Completion', value: `${(overview.summary?.avgCompletionRate || 0).toFixed(0)}%`, color: '#10B981', icon: <TrendingUp size={20} />, sub: 'across all courses' },
            { label: 'Avg Test Score', value: `${(overview.summary?.avgTestScore || 0).toFixed(0)}%`, color: '#3B82F6', icon: <Target size={20} />, sub: 'overall' },
            { label: 'Avg Pass Rate', value: `${(overview.summary?.avgPassRate || 0).toFixed(0)}%`, color: '#8B5CF6', icon: <Award size={20} />, sub: 'students passing' },
            { label: 'Enrolled', value: overview.summary?.totalStudentsEnrolled || 0, color: '#F59E0B', icon: <Users size={20} />, sub: 'total students' },
          ].map((c, i) => (
            <div key={i} className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 3, background: `linear-gradient(90deg, ${c.color}, ${c.color}88)` }} />
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', marginTop: 2 }}>{c.sub}</div>
                  </div>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>{c.icon}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Pills ── */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 6, background: 'var(--bo-bg)', padding: 4, borderRadius: 12, border: '1px solid var(--bo-border)' }}>
        {[
          { key: 'overview', label: 'Course Overview', icon: <BarChart3 size={14} /> },
          { key: 'comparison', label: 'Course Comparison', icon: <Layers size={14} /> },
          ...(selectedCourseId ? [{ key: 'detail', label: 'Course Detail', icon: <Eye size={14} /> }] : []),
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: tab === t.key ? '#059669' : 'transparent', color: tab === t.key ? 'white' : 'var(--bo-text-secondary)',
            transition: 'all 0.2s', boxShadow: tab === t.key ? '0 2px 8px rgba(5,150,105,0.25)' : 'none',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ═══════ OVERVIEW TAB ═══════ */}
      {tab === 'overview' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses by title, code, or faculty..."
              style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--bo-border)', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--bo-bg)' }} />
          </div>

          <div className="bo-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12 }}>
            {filteredAnalytics.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #0a2e36, #1a4a54)' }}>
                    <th style={thStyle}>Course</th>
                    <th style={thStyle}>Faculty</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Students</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Completion</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Avg Score</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Pass Rate</th>
                    <th style={thStyle}>Rating</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Year</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 70 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnalytics.map((c, i) => {
                    const rating = getCourseRating(c.courseId);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--bo-border)', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fffe')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{c.courseTitle}</div>
                          <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontFamily: 'monospace' }}>{c.courseCode}</div>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--bo-text-secondary)', fontSize: 13 }}>{c.faculty || '—'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{c.totalStudents}</div>
                          <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                            <span style={{ color: '#10B981' }}>{c.completedStudents}</span> · <span style={{ color: '#3B82F6' }}>{c.inProgressStudents}</span> · <span style={{ color: '#9CA3AF' }}>{c.notStartedStudents}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <div style={{ width: 50, height: 6, borderRadius: 3, background: '#E5E7EB' }}>
                              <div style={{ width: `${Math.min(c.completionRate, 100)}%`, height: '100%', borderRadius: 3, background: scoreColor(c.completionRate), transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 12, minWidth: 30 }}>{c.completionRate.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${scoreColor(c.avgTestScore)}12`, color: scoreColor(c.avgTestScore), display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {scoreArrow(c.avgTestScore)} {c.avgTestScore.toFixed(0)}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: scoreColor(c.passRate) }}>{c.passRate.toFixed(0)}%</td>
                        <td style={{ padding: '12px 14px' }}>{rating ? renderStars(rating.averageRating) : <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>No ratings</span>}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: '#F0F9FF', color: '#0284C7' }}>{formatYear(c.academicYear)}</span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button onClick={() => loadCourseDetail(c.courseId)} style={{
                            padding: '6px 12px', borderRadius: 8, border: '1px solid #059669', background: 'transparent',
                            color: '#059669', fontWeight: 600, fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.color = 'white'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#059669'; }}>
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <BookOpen size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600 }}>No course data</div>
                <div style={{ color: 'var(--bo-text-muted)', fontSize: 12, marginTop: 4 }}>Course analytics appear once courses are active</div>
              </div>
            )}
          </div>

          {filteredAnalytics.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--bo-text-muted)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
              <span style={{ padding: '2px 8px', borderRadius: 8, background: 'var(--bo-bg)', fontWeight: 600 }}>{filteredAnalytics.length}</span>
              course{filteredAnalytics.length !== 1 ? 's' : ''} {search && 'matching filter'}
            </div>
          )}
        </div>
      )}

      {/* ═══════ COMPARISON TAB ═══════ */}
      {tab === 'comparison' && (
        <div>
          {comparison.length > 0 ? (
            <>
              {/* Unified grouped comparison - each course shows all 3 metrics */}
              <div className="bo-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Course Performance Comparison</h3>
                <p style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 24 }}>Completion, test score and pass rate side by side</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {comparison.map((c, ci) => (
                    <div key={ci} style={{ padding: '18px 20px', borderRadius: 12, background: ci % 2 === 0 ? '#FAFBFC' : 'transparent', border: '1px solid var(--bo-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{c.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'monospace' }}>{c.code}</span>
                            <span>·</span>
                            <span>{formatYear(c.year)}</span>
                            <span>·</span>
                            <span>{c.enrolledStudents} students</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Clock size={13} color="var(--bo-text-muted)" />
                          <span style={{ fontSize: 12, color: 'var(--bo-text-secondary)', fontWeight: 500 }}>{c.avgTimeSpentMinutes.toFixed(0)} min avg</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { label: 'Completion', value: c.avgCompletion, color: metricColors[0] },
                          { label: 'Test Score', value: c.avgScore, color: metricColors[1] },
                          { label: 'Pass Rate', value: c.passRate, color: metricColors[2] },
                        ].map((metric, mi) => (
                          <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ width: 80, fontSize: 11, fontWeight: 600, color: 'var(--bo-text-secondary)', textAlign: 'right' }}>{metric.label}</span>
                            <div style={{ flex: 1, height: 20, borderRadius: 6, background: '#F3F4F6', position: 'relative', overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min(metric.value, 100)}%`, height: '100%', borderRadius: 6,
                                background: `linear-gradient(90deg, ${metric.color.from}, ${metric.color.to})`, transition: 'width 0.6s',
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
                              }}>
                                {metric.value > 15 && <span style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{metric.value.toFixed(0)}%</span>}
                              </div>
                              {metric.value <= 15 && (
                                <span style={{ position: 'absolute', left: `${Math.min(metric.value, 100)}%`, top: '50%', transform: 'translateY(-50%)', marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--bo-text-secondary)' }}>{metric.value.toFixed(0)}%</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 20, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--bo-border)' }}>
                  {metricColors.map((mc, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${mc.from}, ${mc.to})` }} />
                      <span style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 500 }}>{mc.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparison summary table */}
              <div className="bo-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12, marginTop: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #0a2e36, #1a4a54)' }}>
                      <th style={thStyle}>Course</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Year</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Enrolled</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Completion</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Avg Score</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Pass Rate</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Avg Time</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Tests</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--bo-border)', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fffe')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{c.title}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--bo-text-muted)' }}>{c.code}</div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: '#F0F9FF', color: '#0284C7' }}>{formatYear(c.year)}</span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{c.enrolledStudents}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: scoreColor(c.avgCompletion) }}>{c.avgCompletion.toFixed(0)}%</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${scoreColor(c.avgScore)}12`, color: scoreColor(c.avgScore), display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {scoreArrow(c.avgScore)} {c.avgScore.toFixed(0)}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: scoreColor(c.passRate) }}>{c.passRate.toFixed(0)}%</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <Clock size={12} color="var(--bo-text-muted)" />
                            <span style={{ fontSize: 12, color: 'var(--bo-text-secondary)' }}>{c.avgTimeSpentMinutes.toFixed(0)}m</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--bo-text-secondary)', fontWeight: 500 }}>{c.totalTests}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--bo-text-secondary)', fontWeight: 500 }}>{c.totalLearningUnits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
              <Layers size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>No comparison data</div>
              <div style={{ color: 'var(--bo-text-muted)', fontSize: 12, marginTop: 4 }}>Need at least one active course with student data</div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ COURSE DETAIL TAB ═══════ */}
      {tab === 'detail' && (
        <div>
          {detailLoading ? (
            <div className="bo-card" style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
              <div className="bo-spinner" style={{ marginRight: 8 }} /> Loading course details...
            </div>
          ) : courseDetail ? (
            <div>
              {/* Course Header */}
              <div className="bo-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #059669, #10B981, #3B82F6)' }} />
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>{courseDetail.course.title}</h2>
                        {statusBadge(courseDetail.course.status)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4, background: '#F3F4F6' }}>{courseDetail.course.code}</span>
                        <span>·</span>
                        <span>Faculty: <strong style={{ color: 'var(--bo-text-primary)' }}>{courseDetail.course.faculty}</strong></span>
                        <span>·</span>
                        <span>{formatYear(courseDetail.course.academicYear)}</span>
                      </div>
                      {courseDetail.course.description && (
                        <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginTop: 10, lineHeight: 1.5 }}>{courseDetail.course.description}</p>
                      )}
                    </div>
                    <button onClick={closeCourseDetail} style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', background: 'white',
                      color: 'var(--bo-text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}><X size={14} /> Close</button>
                  </div>

                  {/* Stats Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 20 }}>
                    {[
                      { label: 'Students', value: courseDetail.statistics.totalStudents, color: '#059669' },
                      { label: 'Learning Units', value: courseDetail.statistics.totalLearningUnits, color: '#3B82F6' },
                      { label: 'Tests', value: courseDetail.statistics.totalTests, color: '#8B5CF6' },
                      { label: 'Competencies', value: courseDetail.statistics.totalCompetencies, color: '#F59E0B' },
                      { label: 'Completion', value: `${(courseDetail.statistics.completionRate || 0).toFixed(0)}%`, color: '#10B981' },
                    ].map((st, i) => (
                      <div key={i} style={{ position: 'relative', padding: '14px 16px', borderRadius: 12, background: `${st.color}06`, border: `1px solid ${st.color}18`, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: st.color }}>{st.value}</div>
                        <div style={{ fontSize: 9, color: 'var(--bo-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: 4, letterSpacing: '0.5px' }}>{st.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detail Sub-tabs */}
              <div style={{ marginBottom: 16, display: 'flex', gap: 6, background: 'var(--bo-bg)', padding: 4, borderRadius: 12, border: '1px solid var(--bo-border)' }}>
                {[
                  { key: 'students', label: `Students (${courseDetail.studentPerformance?.length || 0})`, icon: <Users size={13} /> },
                  { key: 'tests', label: `Tests (${courseDetail.testPerformance?.length || 0})`, icon: <Target size={13} /> },
                  { key: 'units', label: `Units (${courseDetail.learningUnits?.length || 0})`, icon: <Layers size={13} /> },
                  { key: 'competencies', label: `Competencies (${courseDetail.competencies?.length || 0})`, icon: <Award size={13} /> },
                ].map(t => (
                  <button key={t.key} onClick={() => setDetailTab(t.key as any)} style={{
                    flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    background: detailTab === t.key ? '#059669' : 'transparent', color: detailTab === t.key ? 'white' : 'var(--bo-text-secondary)',
                    transition: 'all 0.2s', boxShadow: detailTab === t.key ? '0 2px 8px rgba(5,150,105,0.25)' : 'none',
                  }}>{t.icon} {t.label}</button>
                ))}
              </div>

              {/* Students Sub-tab */}
              {detailTab === 'students' && (
                <div className="bo-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12 }}>
                  {courseDetail.studentPerformance && courseDetail.studentPerformance.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #0a2e36, #1a4a54)' }}>
                          <th style={thStyle}>Student</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Year</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Progress</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Steps</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Started</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseDetail.studentPerformance.map((sp, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--bo-border)', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fffe')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>{sp.studentName}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: '#F0F9FF', color: '#0284C7' }}>{formatYear(sp.year)}</span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>{statusBadge(sp.status)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <div style={{ width: 50, height: 6, borderRadius: 3, background: '#E5E7EB' }}>
                                  <div style={{ width: `${Math.min(sp.completionPercentage, 100)}%`, height: '100%', borderRadius: 3, background: scoreColor(sp.completionPercentage), transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: 12, color: scoreColor(sp.completionPercentage), minWidth: 30 }}>{sp.completionPercentage.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--bo-text-secondary)' }}>
                              <span style={{ color: '#059669', fontWeight: 700 }}>{sp.completedSteps}</span>
                              <span style={{ color: 'var(--bo-text-muted)' }}> / {sp.totalSteps}</span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, color: 'var(--bo-text-muted)' }}>{sp.startedAt ? new Date(sp.startedAt).toLocaleDateString() : '—'}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, color: 'var(--bo-text-muted)' }}>{sp.completedAt ? new Date(sp.completedAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: 60, textAlign: 'center' }}>
                      <Users size={36} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 8 }} />
                      <div style={{ fontSize: 14, fontWeight: 600 }}>No student enrollment data</div>
                    </div>
                  )}
                </div>
              )}

              {/* Tests Sub-tab */}
              {detailTab === 'tests' && (
                <div style={{ display: 'grid', gap: 14 }}>
                  {courseDetail.testPerformance && courseDetail.testPerformance.length > 0 ? courseDetail.testPerformance.map((test, ti) => (
                    <div key={ti} className="bo-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12 }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bo-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFBFC' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{test.testTitle}</div>
                          <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 3 }}>
                            {test.totalQuestions} questions · {test.totalAttempts} attempt{test.totalAttempts !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'var(--bo-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Avg Score</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(test.avgScore) }}>{test.avgScore.toFixed(0)}%</div>
                          </div>
                          <div style={{ width: 1, height: 30, background: 'var(--bo-border)' }} />
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'var(--bo-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pass Rate</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(test.passRate) }}>{test.passRate.toFixed(0)}%</div>
                          </div>
                        </div>
                      </div>
                      {test.attempts && test.attempts.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: 'linear-gradient(135deg, #0a2e36, #1a4a54)' }}>
                              {['Student', 'Score', 'Result', 'Submitted'].map(h => (
                                <th key={h} style={{ ...thStyle, fontSize: 9 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {test.attempts.slice(0, 10).map((a, ai) => (
                              <tr key={ai} style={{ borderBottom: '1px solid var(--bo-border)' }}>
                                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{a.studentName}</td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${scoreColor(a.score)}12`, color: scoreColor(a.score) }}>{a.score.toFixed(0)}%</span>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  {a.passed
                                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontWeight: 600, fontSize: 12 }}><CheckCircle size={13} /> Passed</span>
                                    : <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444', fontWeight: 600, fontSize: 12 }}><AlertCircle size={13} /> Failed</span>
                                  }
                                </td>
                                <td style={{ padding: '10px 14px', color: 'var(--bo-text-muted)', fontSize: 11 }}>{new Date(a.submittedAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )) : (
                    <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
                      <Target size={36} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 8 }} />
                      <div style={{ fontSize: 14, fontWeight: 600 }}>No test data available</div>
                    </div>
                  )}
                </div>
              )}

              {/* Learning Units Sub-tab */}
              {detailTab === 'units' && (
                <div className="bo-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12 }}>
                  {courseDetail.learningUnits && courseDetail.learningUnits.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #0a2e36, #1a4a54)' }}>
                          <th style={{ ...thStyle, textAlign: 'center', width: 60 }}>Step</th>
                          <th style={thStyle}>Title</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Type</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseDetail.learningUnits.map((lu, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--bo-border)', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fffe')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                                {lu.stepNumber}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>{lu.title}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: '#3B82F6', textTransform: 'uppercase' }}>{lu.type}</span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              {lu.mandatory
                                ? <span style={{ color: '#EF4444', fontWeight: 700, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}><AlertCircle size={12} /> Required</span>
                                : <span style={{ color: 'var(--bo-text-muted)', fontSize: 11 }}>Optional</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: 60, textAlign: 'center' }}>
                      <FileText size={36} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 8 }} />
                      <div style={{ fontSize: 14, fontWeight: 600 }}>No learning units configured</div>
                    </div>
                  )}
                </div>
              )}

              {/* Competencies Sub-tab */}
              {detailTab === 'competencies' && (
                <div className="bo-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12 }}>
                  {courseDetail.competencies && courseDetail.competencies.length > 0 ? (
                    <div style={{ display: 'grid', gap: 0 }}>
                      {courseDetail.competencies.map((comp, i) => (
                        <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--bo-border)', display: 'flex', alignItems: 'flex-start', gap: 12, transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fffe')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <span style={{ padding: '4px 12px', borderRadius: 8, background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', color: '#059669', fontWeight: 700, fontSize: 12, fontFamily: 'monospace', flexShrink: 0, border: '1px solid #A7F3D0' }}>
                            {comp.code}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--bo-text-secondary)', lineHeight: 1.6 }}>{comp.description}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: 60, textAlign: 'center' }}>
                      <Award size={36} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 8 }} />
                      <div style={{ fontSize: 14, fontWeight: 600 }}>No competencies linked</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
              <BookOpen size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>Failed to load course details</div>
              <button className="bo-btn bo-btn-outline" onClick={() => { if (selectedCourseId) loadCourseDetail(selectedCourseId); }} style={{ marginTop: 12 }}>Retry</button>
            </div>
          )}
        </div>
      )}
    </CollegeLayout>
  );
};

export default CourseAnalysis;
