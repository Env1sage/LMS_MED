/**
 * HOD Analytics — department analytics overview.
 * Pulls the same data as CollegeAnalytics but renders inside HodLayout.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import HodLayout from '../../components/hod/HodLayout';
import { courseAnalyticsService, CourseAnalyticsOverview, CourseAnalytics } from '../../services/course-analytics.service';
import { ratingsService, CollegeRatingItem } from '../../services/ratings.service';
import { BarChart3, TrendingUp, Star, Users, BookOpen, RefreshCw, Award } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const HodAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'courses' | 'teachers'>('courses');
  const [overview, setOverview] = useState<CourseAnalyticsOverview | null>(null);
  const [courseRatings, setCourseRatings] = useState<CollegeRatingItem[]>([]);
  const [teacherRatings, setTeacherRatings] = useState<CollegeRatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [ov, cr, tr] = await Promise.allSettled([
        user?.collegeId ? courseAnalyticsService.getCourseAnalyticsOverview(user.collegeId) : Promise.resolve(null),
        user?.collegeId ? ratingsService.getCollegeCourseRatings(user.collegeId) : Promise.resolve([]),
        user?.collegeId ? ratingsService.getCollegeTeacherRatings(user.collegeId) : Promise.resolve([]),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value as any);
      if (cr.status === 'fulfilled') setCourseRatings(cr.value as CollegeRatingItem[]);
      if (tr.status === 'fulfilled') setTeacherRatings(tr.value as CollegeRatingItem[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const renderStars = (rating: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14} fill={i <= Math.floor(rating) ? '#F59E0B' : 'none'} color={i <= Math.floor(rating) ? '#F59E0B' : '#D1D5DB'} />
      ))}
      <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 600 }}>{rating.toFixed(1)}</span>
    </div>
  );

  return (
    <HodLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <BarChart3 size={24} color="#2563EB" />
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Analytics</h1>
        <button onClick={fetchData} className="bo-btn bo-btn-outline" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}

      {/* Summary stats */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Courses', value: (overview as any).totalCourses ?? 0, icon: <BookOpen size={18} />, color: '#2563EB' },
            { label: 'Avg Completion', value: `${((overview as any).summary?.avgCompletionRate ?? 0).toFixed(1)}%`, icon: <Award size={18} />, color: '#D97706' },
            { label: 'Total Students', value: (overview as any).summary?.totalStudentsEnrolled ?? 0, icon: <Users size={18} />, color: '#7C3AED' },
            { label: 'Avg Test Score', value: `${((overview as any).summary?.avgTestScore ?? 0).toFixed(1)}`, icon: <TrendingUp size={18} />, color: '#059669' },
          ].map((s, i) => (
            <div key={i} className="bo-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: s.color, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['courses', 'teachers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`bo-btn ${tab === t ? 'bo-btn-primary' : 'bo-btn-outline'}`} style={{ fontSize: 13, padding: '6px 16px' }}>
            {t === 'courses' ? 'Courses' : 'Teachers'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>Loading…</div>
      ) : (
        <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
          {tab === 'courses' ? (
            courseRatings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>No course data</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--bo-border)' }}>
                    {['Course', 'Rating', 'Reviews', 'Enrollments'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courseRatings.map((r, i) => (
                    <tr key={r.courseId || i} style={{ borderBottom: '1px solid var(--bo-border)', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{r.courseTitle}</td>
                      <td style={{ padding: '12px 16px' }}>{renderStars(r.averageRating)}</td>
                      <td style={{ padding: '12px 16px' }}>{r.totalRatings}</td>
                      <td style={{ padding: '12px 16px' }}>{(r as any).enrollmentCount ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            teacherRatings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>No teacher data</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--bo-border)' }}>
                    {['Teacher', 'Rating', 'Reviews'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teacherRatings.map((r, i) => (
                    <tr key={r.teacherId || i} style={{ borderBottom: '1px solid var(--bo-border)', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{r.teacherName}</td>
                      <td style={{ padding: '12px 16px' }}>{renderStars(r.averageRating)}</td>
                      <td style={{ padding: '12px 16px' }}>{r.totalRatings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}
    </HodLayout>
  );
};

export default HodAnalytics;
