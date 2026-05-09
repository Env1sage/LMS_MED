/**
 * HOD Course Analysis page — course analytics in HodLayout.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import HodLayout from '../../components/hod/HodLayout';
import { courseAnalyticsService, CourseAnalyticsOverview, CourseAnalytics } from '../../services/course-analytics.service';
import { ratingsService, CollegeRatingItem } from '../../services/ratings.service';
import { BookOpen, Star, RefreshCw, Search, TrendingUp, Users, Award } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const YEAR_LABELS: Record<string, string> = {
  FIRST_YEAR: '1st Year', SECOND_YEAR: '2nd Year', YEAR_3_PART1: 'Year 3 Part 1',
  YEAR_3_PART2: 'Year 3 Part 2', INTERNSHIP: 'Internship',
};

const HodCourseAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<CourseAnalyticsOverview | null>(null);
  const [courseRatings, setCourseRatings] = useState<CollegeRatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [ov, cr] = await Promise.allSettled([
        user?.collegeId ? courseAnalyticsService.getCourseAnalyticsOverview(user.collegeId) : Promise.resolve(null),
        user?.collegeId ? ratingsService.getCollegeCourseRatings(user.collegeId) : Promise.resolve([]),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (cr.status === 'fulfilled') setCourseRatings(cr.value as CollegeRatingItem[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load course analysis');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const courses: CourseAnalytics[] = (overview as any)?.analytics || [];
  const filteredCourses = courses.filter(c =>
    !search || (c as any).title?.toLowerCase().includes(search.toLowerCase())
  );

  const ratingMap = new Map(courseRatings.map(r => [r.courseId, r]));

  return (
    <HodLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <BookOpen size={24} color="#0891B2" />
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Course Analysis</h1>
        <button onClick={fetchData} className="bo-btn bo-btn-outline" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}

      {/* Summary */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total Courses', value: overview.totalCourses ?? 0, color: '#0891B2', icon: <BookOpen size={16} /> },
            { label: 'Total Students', value: (overview as any).summary?.totalStudentsEnrolled ?? 0, color: '#7C3AED', icon: <Users size={16} /> },
            { label: 'Avg Completion', value: `${((overview as any).summary?.avgCompletionRate ?? 0).toFixed(0)}%`, color: '#D97706', icon: <Award size={16} /> },
            { label: 'Avg Test Score', value: `${((overview as any).summary?.avgTestScore ?? 0).toFixed(1)}`, color: '#059669', icon: <TrendingUp size={16} /> },
          ].map((s, i) => (
            <div key={i} className="bo-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search course…"
            style={{ paddingLeft: 32, width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
      </div>

      <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>Loading…</div>
        ) : filteredCourses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>No course data available</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--bo-border)' }}>
                {['Course', 'Year', 'Enrolled', 'Completion', 'Rating'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((c, i) => {
                  const rating = ratingMap.get(c.courseId);
                  const completionRate = c.completionRate ?? 0;
                return (
                  <tr key={c.courseId} style={{ borderBottom: '1px solid var(--bo-border)', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, maxWidth: 220 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.courseTitle || c.courseId}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--bo-text-muted)' }}>
                      {YEAR_LABELS[c.academicYear] || c.academicYear || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{c.totalStudents ?? 0}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${completionRate}%`, background: completionRate >= 70 ? '#059669' : completionRate >= 40 ? '#F59E0B' : '#DC2626', borderRadius: 3 }} />
                        </div>
                        <span>{completionRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {rating ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={13} fill="#F59E0B" color="#F59E0B" />
                          <span style={{ fontWeight: 600, color: '#D97706' }}>{rating.averageRating.toFixed(1)}</span>
                          <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>({rating.totalRatings})</span>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </HodLayout>
  );
};

export default HodCourseAnalysis;
