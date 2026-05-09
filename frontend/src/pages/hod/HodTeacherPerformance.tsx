/**
 * HOD Teacher Performance page — adapts TeacherPerformance for HodLayout.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import HodLayout from '../../components/hod/HodLayout';
import { ratingsService, CollegeRatingItem, RatingStats } from '../../services/ratings.service';
import { courseAnalyticsService, CourseAnalyticsOverview, CourseAnalytics } from '../../services/course-analytics.service';
import { TrendingUp, Star, RefreshCw, Search, Users, Award, BookOpen, BarChart3 } from 'lucide-react';
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

const HodTeacherPerformance: React.FC = () => {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

      const facultyMap = new Map<string, { courses: CourseAnalytics[] }>();
      if ((overview as any)?.analytics) {
        for (const course of (overview as any).analytics) {
          const tid = (course as any).facultyId || 'unknown';
          if (!facultyMap.has(tid)) facultyMap.set(tid, { courses: [] });
          facultyMap.get(tid)!.courses.push(course);
        }
      }

      const rows: TeacherRow[] = ratings.map(r => {
        const tid = r.teacherId || 'unknown';
        const courses = facultyMap.get(tid)?.courses || [];
        const avgCompletion = courses.length > 0 ? courses.reduce((a, c) => a + (c.completionRate || 0), 0) / courses.length : 0;
        const totalStudents = courses.reduce((a, c) => a + (c.totalStudents || 0), 0);
        const effectiveness = r.averageRating * 0.4 + (avgCompletion / 100) * 60;
        return {
          teacherId: r.teacherId || String(Math.random()), teacherName: r.teacherName || 'Unknown',
          averageRating: r.averageRating, totalRatings: r.totalRatings,
          courseCount: courses.length, avgCourseCompletion: avgCompletion,
          avgStudentScore: 0, totalStudents, effectivenessScore: effectiveness,
        };
      });
      setTeachers(rows.sort((a, b) => b.effectivenessScore - a.effectivenessScore));
    } catch (err: any) {
      setError(err.message || 'Failed to load teacher performance');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = teachers.filter(t => !search || t.teacherName.toLowerCase().includes(search.toLowerCase()));

  return (
    <HodLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <TrendingUp size={24} color="#D97706" />
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Teacher Performance</h1>
        <button onClick={fetchData} className="bo-btn bo-btn-outline" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search teacher…"
            style={{ paddingLeft: 32, width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
      </div>

      <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>No data available</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--bo-border)' }}>
                {['Teacher', 'Rating', 'Reviews', 'Courses', 'Avg Completion', 'Students', 'Effectiveness'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.teacherId} style={{ borderBottom: '1px solid var(--bo-border)', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{t.teacherName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={13} fill="#F59E0B" color="#F59E0B" />
                      <span style={{ fontWeight: 600, color: '#D97706' }}>{t.averageRating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--bo-text-muted)' }}>{t.totalRatings}</td>
                  <td style={{ padding: '12px 16px' }}>{t.courseCount}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${t.avgCourseCompletion}%`, background: '#059669', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12 }}>{t.avgCourseCompletion.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{t.totalStudents}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: t.effectivenessScore >= 60 ? '#ECFDF5' : t.effectivenessScore >= 40 ? '#FFFBEB' : '#FEF2F2',
                      color: t.effectivenessScore >= 60 ? '#059669' : t.effectivenessScore >= 40 ? '#D97706' : '#DC2626',
                    }}>{t.effectivenessScore.toFixed(0)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </HodLayout>
  );
};

export default HodTeacherPerformance;
