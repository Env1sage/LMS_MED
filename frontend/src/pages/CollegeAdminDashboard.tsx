import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../services/student.service';
import governanceService from '../services/governance.service';
import { packagesService } from '../services/packages.service';
import { courseAnalyticsService, CourseAnalyticsOverview } from '../services/course-analytics.service';
import { useAuth } from '../context/AuthContext';
import CollegeLayout from '../components/college/CollegeLayout';
import {
  GraduationCap, Users, Building2, UserCog, BookOpen,
  TrendingUp, BarChart3, PlusCircle, ArrowRight, RefreshCw,
  Upload, ClipboardList, Bell, Package, Activity
} from 'lucide-react';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

interface StudentStat {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byYear: Array<{ year: string; count: number }>;
}

const POLL_INTERVAL = 30000;

const CollegeAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<StudentStat | null>(null);
  const [deptCount, setDeptCount] = useState(0);
  const [facultyCount, setFacultyCount] = useState(0);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalyticsOverview | null>(null);
  const [packageCount, setPackageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [statsRes, deptRes, facultyRes, analyticsRes, pkgRes] = await Promise.allSettled([
        studentService.getStats(),
        governanceService.getDepartments(),
        governanceService.getFacultyUsers(),
        user?.collegeId ? courseAnalyticsService.getCourseAnalyticsOverview(user.collegeId) : Promise.resolve(null),
        user?.collegeId ? packagesService.getCollegePackages(user.collegeId) : Promise.resolve([]),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (deptRes.status === 'fulfilled') setDeptCount(Array.isArray(deptRes.value) ? deptRes.value.length : 0);
      if (facultyRes.status === 'fulfilled') setFacultyCount(Array.isArray(facultyRes.value) ? facultyRes.value.length : 0);
      if (analyticsRes.status === 'fulfilled') setCourseAnalytics(analyticsRes.value);
      if (pkgRes.status === 'fulfilled') setPackageCount(Array.isArray(pkgRes.value) ? pkgRes.value.length : 0);
      setLastUpdated(new Date());
    } catch (err) { console.error('Dashboard load error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.collegeId]);

  useEffect(() => {
    loadDashboard();
    intervalRef.current = setInterval(() => loadDashboard(true), POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadDashboard]);

  const formatYear = (y: string) => {
    const m: Record<string, string> = { FIRST_YEAR: '1st Year', SECOND_YEAR: '2nd Year', THIRD_YEAR: '3rd Year', FOURTH_YEAR: '4th Year', FIFTH_YEAR: '5th Year', INTERNSHIP: 'Internship', YEAR_1: '1st Year', YEAR_2: '2nd Year', YEAR_3: '3rd Year', YEAR_4: '4th Year', YEAR_5: '5th Year', YEAR_3_MINOR: 'Year 3 (Part 1)', YEAR_3_MAJOR: 'Year 3 (Part 2)', PART_1: 'Part 1', PART_2: 'Part 2' };
    return m[y] || y.replace(/_/g, ' ');
  };

  const statusColor = (s: string) => {
    const c: Record<string, string> = { ACTIVE: '#10B981', INACTIVE: '#F59E0B', GRADUATED: '#3B82F6', DROPPED_OUT: '#EF4444', SUSPENDED: '#EF4444' };
    return c[s] || '#6B7280';
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
        <div className="loading-title">Loading College Dashboard</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </CollegeLayout>
  );

  const totalStudents = stats?.total || 0;
  const activeStudents = stats?.byStatus?.find(s => s.status === 'ACTIVE')?.count || 0;
  const graduatedStudents = stats?.byStatus?.find(s => s.status === 'GRADUATED')?.count || 0;
  const totalCourses = courseAnalytics?.totalCourses || 0;

  return (
    <CollegeLayout>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>College Administration</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>Medical Education Management Dashboard</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={() => loadDashboard(true)} disabled={refreshing} className="bo-btn bo-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Students', value: totalStudents, color: '#059669', icon: <GraduationCap size={22} /> },
          { label: 'Active Students', value: activeStudents, color: '#10B981', icon: <Users size={22} /> },
          { label: 'Faculty', value: facultyCount, color: '#3B82F6', icon: <UserCog size={22} /> },
          { label: 'Departments', value: deptCount, color: '#8B5CF6', icon: <Building2 size={22} /> },
          { label: 'Courses', value: totalCourses, color: '#F59E0B', icon: <BookOpen size={22} /> },
        ].map((s, i) => (
          <div key={i} className="bo-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginTop: 6 }}>{s.value}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Year Distribution + Status Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Year Distribution */}
        <div className="bo-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Student Distribution by Academic Year</h3>
          {stats?.byYear && stats.byYear.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
              {stats.byYear.map((item) => (
                <div key={item.year} style={{ padding: 14, borderRadius: 10, background: 'var(--bo-bg)', textAlign: 'center', border: '1px solid var(--bo-border)' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{item.count}</div>
                  <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>{formatYear(item.year)}</div>
                  <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: '#E5E7EB' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: '#059669', width: `${totalStudents > 0 ? (item.count / totalStudents) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--bo-text-muted)' }}>No year data available</div>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="bo-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Status Breakdown</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {(stats?.byStatus || []).map(item => (
              <div key={item.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: 'var(--bo-bg)', border: '1px solid var(--bo-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(item.status) }} />
                  <span style={{ fontSize: 13, color: 'var(--bo-text-primary)' }}>{item.status.replace(/_/g, ' ')}</span>
                </div>
                <span style={{ fontWeight: 700, color: statusColor(item.status) }}>{item.count}</span>
              </div>
            ))}
            {(!stats?.byStatus || stats.byStatus.length === 0) && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--bo-text-muted)', fontSize: 13 }}>No status data</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions + Analytics Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
        {/* Quick Actions */}
        <div className="bo-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="bo-btn bo-btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#059669' }} onClick={() => navigate('/college-admin/create-student')}>
              <PlusCircle size={16} /> Add Student
            </button>
            <button className="bo-btn bo-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/college-admin/students')}>
              <GraduationCap size={16} /> Manage Students
            </button>
            <button className="bo-btn bo-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/college-admin/faculty')}>
              <UserCog size={16} /> Manage Faculty
            </button>
            <button className="bo-btn bo-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/college-admin/departments')}>
              <Building2 size={16} /> Manage Departments
            </button>
            <button className="bo-btn bo-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/college-admin/bulk-upload')}>
              <Upload size={16} /> Bulk Upload
            </button>
            <button className="bo-btn bo-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/college-admin/notifications')}>
              <Bell size={16} /> Notifications
            </button>
          </div>
        </div>

        {/* Course Performance Overview */}
        <div className="bo-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Course Performance Overview</h3>
            <button className="bo-btn bo-btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => navigate('/college-admin/analytics')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          {courseAnalytics && courseAnalytics.analytics.length > 0 ? (
            <>
              {/* Summary Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Avg Completion', value: `${courseAnalytics.summary?.avgCompletionRate?.toFixed(0) || 0}%`, color: '#10B981' },
                  { label: 'Avg Test Score', value: `${courseAnalytics.summary?.avgTestScore?.toFixed(0) || 0}%`, color: '#3B82F6' },
                  { label: 'Pass Rate', value: `${courseAnalytics.summary?.avgPassRate?.toFixed(0) || 0}%`, color: '#8B5CF6' },
                ].map((m, i) => (
                  <div key={i} style={{ padding: 12, borderRadius: 8, background: 'var(--bo-bg)', textAlign: 'center', border: '1px solid var(--bo-border)' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>
              {/* Course List */}
              {courseAnalytics.analytics.slice(0, 5).map((course, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--bo-border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{course.courseTitle}</div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{course.totalStudents} students • {formatYear(course.academicYear)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 6, borderRadius: 3, background: '#E5E7EB' }}>
                      <div style={{ width: `${course.completionRate}%`, height: '100%', borderRadius: 3, background: course.completionRate >= 70 ? '#10B981' : course.completionRate >= 40 ? '#F59E0B' : '#EF4444' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bo-text-primary)', minWidth: 35 }}>{course.completionRate.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
              <BarChart3 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>No course analytics yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Analytics will appear once courses are active</div>
            </div>
          )}
        </div>
      </div>
    </CollegeLayout>
  );
};

export default CollegeAdminDashboard;

