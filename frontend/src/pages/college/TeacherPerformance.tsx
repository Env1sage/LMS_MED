import React, { useState, useEffect } from 'react';
import { ratingsService, CollegeRatingItem, RatingStats, RatingType } from '../../services/ratings.service';
import { courseAnalyticsService, CourseAnalyticsOverview, CourseAnalytics } from '../../services/course-analytics.service';
import { useAuth } from '../../context/AuthContext';
import CollegeLayout from '../../components/college/CollegeLayout';
import { Users, Star, TrendingUp, Award, RefreshCw, ChevronDown, ChevronUp, BookOpen, BarChart3, MessageSquare, X, Search } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface TeacherRow {
  teacherId: string;
  teacherName: string;
  averageRating: number;
  totalRatings: number;
  courseCount: number;
  avgCourseCompletion: number;
  avgStudentScore: number;
  totalStudents: number;
  effectivenessScore: number;
}

const TeacherPerformance: React.FC = () => {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<RatingStats | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'effectivenessScore' | 'averageRating' | 'totalStudents' | 'avgCourseCompletion'>('effectivenessScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    if (!user?.collegeId) return;
    setLoading(true); setError(null);
    try {
      const [ratingsRes, overviewRes] = await Promise.allSettled([
        ratingsService.getCollegeTeacherRatings(user.collegeId),
        courseAnalyticsService.getCourseAnalyticsOverview(user.collegeId),
      ]);
      const ratings: CollegeRatingItem[] = ratingsRes.status === 'fulfilled' ? ratingsRes.value : [];
      const overview: CourseAnalyticsOverview | null = overviewRes.status === 'fulfilled' ? overviewRes.value : null;

      // Group courses by faculty
      const facultyMap = new Map<string, { courses: CourseAnalytics[]; }>();
      if (overview?.analytics) {
        for (const c of overview.analytics) {
          const name = c.faculty || 'Unknown';
          if (!facultyMap.has(name)) facultyMap.set(name, { courses: [] });
          facultyMap.get(name)!.courses.push(c);
        }
      }

      // Merge ratings + course data
      const allTeacherNames = new Set<string>();
      ratings.forEach(r => allTeacherNames.add(r.teacherName || 'Unknown'));
      facultyMap.forEach((_, name) => allTeacherNames.add(name));

      const rows: TeacherRow[] = [];
      const teacherNamesArr = Array.from(allTeacherNames);
      for (const name of teacherNamesArr) {
        const ratingItem = ratings.find(r => r.teacherName === name);
        const courseData = facultyMap.get(name);
        const courses = courseData?.courses || [];
        const courseCount = courses.length;
        const avgCompletion = courseCount > 0 ? courses.reduce((s, c) => s + (c.completionRate || 0), 0) / courseCount : 0;
        const avgScore = courseCount > 0 ? courses.reduce((s, c) => s + (c.avgTestScore || 0), 0) / courseCount : 0;
        const totalStudents = courses.reduce((s, c) => s + (c.totalStudents || 0), 0);
        const avgRating = ratingItem?.averageRating || 0;
        // Effectiveness = 40% rating + 30% completion + 30% test scores (normalized to 100)
        const effectiveness = (avgRating / 5 * 40) + (avgCompletion / 100 * 30) + (avgScore / 100 * 30);

        rows.push({
          teacherId: ratingItem?.teacherId || name,
          teacherName: name,
          averageRating: avgRating,
          totalRatings: ratingItem?.totalRatings || 0,
          courseCount,
          avgCourseCompletion: avgCompletion,
          avgStudentScore: avgScore,
          totalStudents,
          effectivenessScore: Math.round(effectiveness * 10) / 10,
        });
      }
      setTeachers(rows);
    } catch (err: any) { setError(err.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  const loadDetail = async (teacherId: string) => {
    if (expandedId === teacherId) { setExpandedId(null); setDetailData(null); return; }
    setExpandedId(teacherId); setDetailLoading(true); setDetailData(null);
    try {
      const data = await ratingsService.getEntityRatings(RatingType.TEACHER, teacherId);
      setDetailData(data);
    } catch { setDetailData(null); }
    finally { setDetailLoading(false); }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const renderStars = (rating: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14} fill={i <= Math.floor(rating) ? '#F59E0B' : (i - 0.5 <= rating ? '#F59E0B' : 'none')} color={i <= rating ? '#F59E0B' : '#D1D5DB'} />
      ))}
      <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 600 }}>{rating.toFixed(1)}</span>
    </div>
  );

  const renderDistributionBar = (dist: Record<number, number>) => {
    const total = Object.values(dist).reduce((s, v) => s + v, 0);
    if (total === 0) return <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>No ratings yet</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[5, 4, 3, 2, 1].map(star => {
          const count = dist[star] || 0;
          const pct = total > 0 ? (count / total * 100) : 0;
          return (
            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ width: 16, textAlign: 'right', fontWeight: 500, color: 'var(--bo-text-secondary)' }}>{star}</span>
              <Star size={12} fill="#F59E0B" color="#F59E0B" />
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#F3F4F6' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: star >= 4 ? '#10B981' : star >= 3 ? '#F59E0B' : '#EF4444', transition: 'width 0.3s' }} />
              </div>
              <span style={{ width: 32, textAlign: 'right', color: 'var(--bo-text-muted)', fontWeight: 500 }}>{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const effectivenessColor = (s: number) => s >= 70 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444';
  const effectivenessLabel = (s: number) => s >= 70 ? 'Excellent' : s >= 50 ? 'Good' : 'Needs Improvement';

  const filtered = teachers
    .filter(t => t.teacherName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortDir === 'desc' ? b[sortField] - a[sortField] : a[sortField] - b[sortField]);

  const summary = {
    total: teachers.length,
    avgRating: teachers.length > 0 ? teachers.reduce((s, t) => s + t.averageRating, 0) / teachers.length : 0,
    avgEffectiveness: teachers.length > 0 ? teachers.reduce((s, t) => s + t.effectivenessScore, 0) / teachers.length : 0,
    totalStudents: teachers.reduce((s, t) => s + t.totalStudents, 0),
  };

  if (loading) return (
    <CollegeLayout>
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
        <div className="loading-title">Loading Teacher Performance</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </CollegeLayout>
  );

  return (
    <CollegeLayout>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Teacher Performance Analysis</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Comprehensive faculty effectiveness metrics and student feedback</p>
        </div>
        <button className="bo-btn bo-btn-outline" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Faculty', value: summary.total, color: '#059669', icon: <Users size={22} /> },
          { label: 'Avg Rating', value: summary.avgRating.toFixed(1) + ' / 5', color: '#F59E0B', icon: <Star size={22} /> },
          { label: 'Avg Effectiveness', value: summary.avgEffectiveness.toFixed(0) + '%', color: '#3B82F6', icon: <TrendingUp size={22} /> },
          { label: 'Total Students', value: summary.totalStudents, color: '#8B5CF6', icon: <Award size={22} /> },
        ].map((s, i) => (
          <div key={i} className="bo-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginTop: 6 }}>{s.value}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Sort */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search faculty..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select value={sortField} onChange={e => setSortField(e.target.value as typeof sortField)}
          style={{ padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, background: 'white', cursor: 'pointer' }}>
          <option value="effectivenessScore">Sort by Effectiveness</option>
          <option value="averageRating">Sort by Rating</option>
          <option value="totalStudents">Sort by Students</option>
          <option value="avgCourseCompletion">Sort by Completion</option>
        </select>
        <button className="bo-btn bo-btn-outline" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} style={{ padding: '10px 14px' }}>
          {sortDir === 'desc' ? '↓ High to Low' : '↑ Low to High'}
        </button>
      </div>

      {/* Teacher Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
            <Users size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 500 }}>No faculty data found</div>
            <div style={{ color: 'var(--bo-text-muted)', fontSize: 12, marginTop: 4 }}>Faculty analytics will appear once courses are assigned</div>
          </div>
        ) : filtered.map((t, idx) => (
          <div key={t.teacherId} className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Main Row */}
            <div
              style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
              onClick={() => loadDetail(t.teacherId)}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bo-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Rank */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, flexShrink: 0,
                background: idx < 3 ? '#059669' : 'var(--bo-bg)', color: idx < 3 ? 'white' : 'var(--bo-text-secondary)'
              }}>
                #{idx + 1}
              </div>

              {/* Name + Meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{t.teacherName}</div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                  {t.courseCount} course{t.courseCount !== 1 ? 's' : ''} · {t.totalStudents} student{t.totalStudents !== 1 ? 's' : ''} · {t.totalRatings} rating{t.totalRatings !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Rating</div>
                  {renderStars(t.averageRating)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Completion</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 60, height: 6, borderRadius: 3, background: '#E5E7EB' }}>
                      <div style={{ width: `${Math.min(t.avgCourseCompletion, 100)}%`, height: '100%', borderRadius: 3, background: t.avgCourseCompletion >= 70 ? '#10B981' : t.avgCourseCompletion >= 40 ? '#F59E0B' : '#EF4444' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{t.avgCourseCompletion.toFixed(0)}%</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Avg Score</div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: t.avgStudentScore >= 60 ? '#10B981' : '#F59E0B' }}>{t.avgStudentScore.toFixed(0)}%</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Effectiveness</div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                    background: `${effectivenessColor(t.effectivenessScore)}15`,
                    color: effectivenessColor(t.effectivenessScore),
                  }}>
                    {t.effectivenessScore}% — {effectivenessLabel(t.effectivenessScore)}
                  </span>
                </div>
              </div>

              {expandedId === t.teacherId ? <ChevronUp size={18} color="var(--bo-text-muted)" /> : <ChevronDown size={18} color="var(--bo-text-muted)" />}
            </div>

            {/* Expanded Detail */}
            {expandedId === t.teacherId && (
              <div style={{ borderTop: '1px solid var(--bo-border)', padding: '20px', background: 'var(--bo-bg)' }}>
                {detailLoading ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--bo-text-muted)' }}><div className="bo-spinner" style={{ marginRight: 8 }} /> Loading details...</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Rating Distribution */}
                    <div style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid var(--bo-border)' }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BarChart3 size={16} color="#059669" /> Rating Distribution
                      </h4>
                      {detailData?.distribution ? renderDistributionBar(detailData.distribution) : (
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', padding: 16, textAlign: 'center' }}>No detailed rating data available</div>
                      )}
                      {detailData && (
                        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: '#ECFDF5', fontSize: 12 }}>
                          <strong>{detailData.totalRatings}</strong> total ratings · <strong>{detailData.averageRating.toFixed(1)}</strong> average
                        </div>
                      )}
                    </div>

                    {/* Student Feedback */}
                    <div style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid var(--bo-border)' }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MessageSquare size={16} color="#059669" /> Student Feedback
                      </h4>
                      {detailData?.feedbackList && detailData.feedbackList.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
                          {detailData.feedbackList.slice(0, 10).map((f, fi) => (
                            <div key={fi} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bo-bg)', border: '1px solid var(--bo-border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {[1, 2, 3, 4, 5].map(s => <Star key={s} size={11} fill={s <= f.rating ? '#F59E0B' : 'none'} color={s <= f.rating ? '#F59E0B' : '#D1D5DB'} />)}
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>{new Date(f.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p style={{ fontSize: 12, color: 'var(--bo-text-secondary)', margin: 0, lineHeight: 1.5 }}>{f.feedback || 'No written feedback'}</p>
                              <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', marginTop: 4 }}>— {f.studentName}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', padding: 16, textAlign: 'center' }}>No feedback submitted yet</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </CollegeLayout>
  );
};

export default TeacherPerformance;
