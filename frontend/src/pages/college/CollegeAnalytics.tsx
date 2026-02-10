import React, { useState, useEffect } from 'react';
import { courseAnalyticsService, CourseAnalyticsOverview, CourseAnalytics } from '../../services/course-analytics.service';
import { ratingsService, CollegeRatingItem } from '../../services/ratings.service';
import { useAuth } from '../../context/AuthContext';
import CollegeLayout from '../../components/college/CollegeLayout';
import { BarChart3, TrendingUp, Star, Users, BookOpen, RefreshCw, Award } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const CollegeAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'courses' | 'teachers'>('courses');
  const [overview, setOverview] = useState<CourseAnalyticsOverview | null>(null);
  const [courseRatings, setCourseRatings] = useState<CollegeRatingItem[]>([]);
  const [teacherRatings, setTeacherRatings] = useState<CollegeRatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [ov, cr, tr] = await Promise.allSettled([
        user?.collegeId ? courseAnalyticsService.getCourseAnalyticsOverview(user.collegeId) : Promise.resolve(null),
        user?.collegeId ? ratingsService.getCollegeCourseRatings(user.collegeId) : Promise.resolve([]),
        user?.collegeId ? ratingsService.getCollegeTeacherRatings(user.collegeId) : Promise.resolve([]),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (cr.status === 'fulfilled') setCourseRatings(cr.value as CollegeRatingItem[]);
      if (tr.status === 'fulfilled') setTeacherRatings(tr.value as CollegeRatingItem[]);
    } catch (err: any) { setError(err.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} size={14} fill={i <= full ? '#F59E0B' : 'none'} color={i <= full ? '#F59E0B' : '#D1D5DB'} />
        ))}
        <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 600, color: 'var(--bo-text-primary)' }}>{rating.toFixed(1)}</span>
      </div>
    );
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
        <div className="loading-title">Loading Analytics</div>
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
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Analytics & Performance</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Course performance and faculty ratings</p>
        </div>
        <button className="bo-btn bo-btn-outline" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Summary Cards */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Courses', value: overview.totalCourses, color: '#059669', icon: <BookOpen size={22} /> },
            { label: 'Avg Completion', value: `${overview.summary?.avgCompletionRate?.toFixed(0) || 0}%`, color: '#10B981', icon: <TrendingUp size={22} /> },
            { label: 'Avg Test Score', value: `${overview.summary?.avgTestScore?.toFixed(0) || 0}%`, color: '#3B82F6', icon: <Award size={22} /> },
            { label: 'Students Enrolled', value: overview.summary?.totalStudentsEnrolled || 0, color: '#8B5CF6', icon: <Users size={22} /> },
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
      )}

      {/* Tab Switcher */}
      <div className="bo-card" style={{ padding: 4, marginBottom: 16, display: 'flex', gap: 4 }}>
        <button onClick={() => setTab('courses')} style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === 'courses' ? '#059669' : 'transparent', color: tab === 'courses' ? 'white' : 'var(--bo-text-secondary)' }}>
          <BookOpen size={14} style={{ marginRight: 6 }} /> Course Performance
        </button>
        <button onClick={() => setTab('teachers')} style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === 'teachers' ? '#059669' : 'transparent', color: tab === 'teachers' ? 'white' : 'var(--bo-text-secondary)' }}>
          <Star size={14} style={{ marginRight: 6 }} /> Teacher Ratings
        </button>
      </div>

      {tab === 'courses' && (
        <>
          {/* Course Performance Table */}
          <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
            {overview && overview.analytics.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bo-bg)', borderBottom: '1px solid var(--bo-border)' }}>
                    {['Course', 'Faculty', 'Students', 'Completion', 'Avg Score', 'Pass Rate', 'Year'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overview.analytics.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--bo-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bo-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 500 }}>{c.courseTitle}</div>
                        <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontFamily: 'monospace' }}>{c.courseCode}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--bo-text-secondary)' }}>{c.faculty || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{c.totalStudents}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 50, height: 6, borderRadius: 3, background: '#E5E7EB' }}>
                            <div style={{ width: `${c.completionRate}%`, height: '100%', borderRadius: 3, background: c.completionRate >= 70 ? '#10B981' : c.completionRate >= 40 ? '#F59E0B' : '#EF4444' }} />
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>{c.completionRate.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: c.avgTestScore >= 60 ? '#10B981' : '#F59E0B' }}>{c.avgTestScore.toFixed(0)}%</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: c.passRate >= 60 ? '#10B981' : '#EF4444' }}>{c.passRate.toFixed(0)}%</td>
                      <td style={{ padding: '10px 14px', color: 'var(--bo-text-muted)', fontSize: 12 }}>{({'YEAR_1':'Year 1','YEAR_2':'Year 2','YEAR_3':'Year 3','YEAR_3_MINOR':'Year 3 (Part 1)','YEAR_3_MAJOR':'Year 3 (Part 2)','YEAR_4':'Year 4','YEAR_5':'Year 5','FIRST_YEAR':'1st Year','SECOND_YEAR':'2nd Year','THIRD_YEAR':'3rd Year','FOURTH_YEAR':'4th Year','FIFTH_YEAR':'5th Year','INTERNSHIP':'Internship','PART_1':'Part 1','PART_2':'Part 2'} as Record<string,string>)[c.academicYear] || c.academicYear}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
                <BarChart3 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 500 }}>No course data yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Analytics will appear once courses are active</div>
              </div>
            )}
          </div>

          {/* Course Ratings */}
          {courseRatings.length > 0 && (
            <div className="bo-card" style={{ padding: 20, marginTop: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Course Ratings</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {courseRatings.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: 'var(--bo-bg)', border: '1px solid var(--bo-border)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{r.courseTitle || 'Unknown Course'}</div>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{r.totalRatings} ratings</div>
                    </div>
                    {renderStars(r.averageRating)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'teachers' && (
        <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
          {teacherRatings.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bo-bg)', borderBottom: '1px solid var(--bo-border)' }}>
                  {['Teacher', 'Average Rating', 'Total Ratings'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teacherRatings.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--bo-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bo-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{t.teacherName || 'Unknown'}</td>
                    <td style={{ padding: '10px 14px' }}>{renderStars(t.averageRating)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--bo-text-secondary)' }}>{t.totalRatings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
              <Star size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 500 }}>No teacher ratings yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Ratings will appear once students submit feedback</div>
            </div>
          )}
        </div>
      )}
    </CollegeLayout>
  );
};

export default CollegeAnalytics;
