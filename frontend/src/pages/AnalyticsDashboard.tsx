import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  BarChart3, Users, BookOpen, Award, Building2, Globe2,
  LogIn, ShieldAlert, Download, GraduationCap,
  UserCheck, Trophy, AlertTriangle, Filter, RefreshCw, FileSpreadsheet,
  ChevronDown, ChevronUp, Star, Clock, Target, Zap, FileText
} from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import { generatePdfReport } from '../utils/pdfReportGenerator';
import '../styles/bitflow-owner.css';

/* ── Interfaces ── */
interface PlatformAnalytics {
  activeColleges: number;
  suspendedColleges: number;
  activePublishers: number;
  suspendedPublishers: number;
  expiredPublishers: number;
  totalUsers: number;
  activeUsers: number;
  totalLogins: number;
  failedLoginAttempts: number;
  dailyActiveUsers: { date: string; count: number }[];
  usersByRole: { role: string; count: number }[];
}

interface DashboardData {
  totalColleges: number;
  totalPublishers: number;
  totalUsers: number;
  studentCount: number;
  facultyCount: number;
  contentByType: { books: number; videos: number; mcqs: number };
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
}

interface StudentPerformance {
  studentId: string;
  studentName: string;
  email: string;
  collegeName: string;
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  completionRate: number;
  practiceStats: {
    totalPractice: number;
    totalQuestions: number;
    totalCorrect: number;
    accuracy: number;
    totalTimeSpent: number;
  };
}

interface TeacherPerformance {
  teacherId: string;
  teacherName: string;
  email: string;
  collegeName: string;
  totalCourses: number;
  activeCourses: number;
  totalStudents: number;
  completedStudents: number;
  studentCompletionRate: number;
  avgRating: number;
  totalRatings: number;
  lastActive: string | null;
}

interface CoursePerformance {
  courseId: string;
  courseTitle: string;
  collegeName: string;
  facultyName: string;
  status: string;
  totalSteps: number;
  enrolledStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  completionRate: number;
  avgRating: number;
  totalRatings: number;
}

interface CollegeComparison {
  collegeId: string;
  collegeName: string;
  collegeCode: string;
  studentCount: number;
  facultyCount: number;
  courseCount: number;
  packageCount: number;
  totalEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  avgAccuracy: number;
  totalPracticeTime: number;
  totalPracticeSessions: number;
  loginCount: number;
  engagementScore: number;
}

type TabType = 'overview' | 'students' | 'teachers' | 'courses' | 'colleges';

const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [studentData, setStudentData] = useState<{ summary: any; students: StudentPerformance[] } | null>(null);
  const [teacherData, setTeacherData] = useState<{ summary: any; teachers: TeacherPerformance[] } | null>(null);
  const [courseData, setCourseData] = useState<{ summary: any; courses: CoursePerformance[] } | null>(null);
  const [collegeData, setCollegeData] = useState<{ colleges: CollegeComparison[]; summary: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);
  const [exporting, setExporting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'desc' });

  useEffect(() => { fetchOverview(); fetchColleges(); }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [analyticsRes, dashRes] = await Promise.allSettled([
        apiService.get('/bitflow-owner/analytics'),
        apiService.get('/bitflow-owner/dashboard'),
      ]);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchColleges = async () => {
    try {
      const res = await apiService.get('/bitflow-owner/colleges');
      const cols = res.data?.colleges || res.data || [];
      setColleges(Array.isArray(cols) ? cols.map((c: any) => ({ id: c.id, name: c.name })) : []);
    } catch (err) { console.error(err); }
  };

  const fetchStudentData = useCallback(async () => {
    setTabLoading(true);
    try {
      const params = collegeFilter ? `?collegeId=${collegeFilter}` : '';
      const res = await apiService.get(`/bitflow-owner/analytics/student-performance${params}`);
      setStudentData(res.data);
    } catch (err) { console.error(err); } finally { setTabLoading(false); }
  }, [collegeFilter]);

  const fetchTeacherData = useCallback(async () => {
    setTabLoading(true);
    try {
      const params = collegeFilter ? `?collegeId=${collegeFilter}` : '';
      const res = await apiService.get(`/bitflow-owner/analytics/teacher-performance${params}`);
      setTeacherData(res.data);
    } catch (err) { console.error(err); } finally { setTabLoading(false); }
  }, [collegeFilter]);

  const fetchCourseData = useCallback(async () => {
    setTabLoading(true);
    try {
      const params = collegeFilter ? `?collegeId=${collegeFilter}` : '';
      const res = await apiService.get(`/bitflow-owner/analytics/course-performance${params}`);
      setCourseData(res.data);
    } catch (err) { console.error(err); } finally { setTabLoading(false); }
  }, [collegeFilter]);

  const fetchCollegeComparison = useCallback(async () => {
    setTabLoading(true);
    try {
      const res = await apiService.get('/bitflow-owner/analytics/college-comparison');
      setCollegeData(res.data);
    } catch (err) { console.error(err); } finally { setTabLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'students') fetchStudentData();
    else if (activeTab === 'teachers') fetchTeacherData();
    else if (activeTab === 'courses') fetchCourseData();
    else if (activeTab === 'colleges') fetchCollegeComparison();
  }, [activeTab, collegeFilter, fetchStudentData, fetchTeacherData, fetchCourseData, fetchCollegeComparison]);

  const handleExport = async (reportType: string) => {
    setExporting(true);
    try {
      const params = collegeFilter ? `?collegeId=${collegeFilter}` : '';
      const res = await apiService.get(`/bitflow-owner/analytics/export/${reportType}${params}`);
      const data = res.data;

      let csvContent = '';
      let rows: any[] = [];

      if (reportType === 'student-performance' && data.students) {
        csvContent = 'Student Name,Email,College,Total Courses,Completed,In Progress,Completion Rate,Practice Sessions,Accuracy,Time Spent (min)\n';
        rows = data.students.map((s: any) => [
          s.studentName, s.email, s.collegeName, s.totalCourses, s.completedCourses,
          s.inProgressCourses, `${s.completionRate}%`, s.practiceStats?.totalPractice || 0,
          `${s.practiceStats?.accuracy || 0}%`, Math.round((s.practiceStats?.totalTimeSpent || 0) / 60),
        ]);
      } else if (reportType === 'teacher-performance' && data.teachers) {
        csvContent = 'Teacher Name,Email,College,Total Courses,Active Courses,Total Students,Completion Rate,Avg Rating,Last Active\n';
        rows = data.teachers.map((t: any) => [
          t.teacherName, t.email, t.collegeName, t.totalCourses, t.activeCourses,
          t.totalStudents, `${t.studentCompletionRate}%`, t.avgRating || 'N/A',
          t.lastActive ? new Date(t.lastActive).toLocaleDateString() : 'Never',
        ]);
      } else if (reportType === 'course-performance' && data.courses) {
        csvContent = 'Course Title,College,Faculty,Status,Steps,Enrolled,Completed,Completion Rate,Avg Rating\n';
        rows = data.courses.map((c: any) => [
          c.courseTitle, c.collegeName, c.facultyName, c.status, c.totalSteps,
          c.enrolledStudents, c.completedStudents, `${c.completionRate}%`, c.avgRating || 'N/A',
        ]);
      } else if (reportType === 'college-comparison' && data.colleges) {
        csvContent = 'College,Code,Students,Faculty,Courses,Packages,Enrollments,Completed,Completion Rate,Accuracy,Engagement Score\n';
        rows = data.colleges.map((c: any) => [
          c.collegeName, c.collegeCode, c.studentCount, c.facultyCount, c.courseCount,
          c.packageCount, c.totalEnrollments, c.completedEnrollments,
          `${c.completionRate}%`, `${c.avgAccuracy}%`, c.engagementScore,
        ]);
      }

      csvContent += rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handlePdfExport = async (reportType: string) => {
    setExporting(true);
    try {
      const params = collegeFilter ? `?collegeId=${collegeFilter}` : '';
      const res = await apiService.get(`/bitflow-owner/analytics/export/${reportType}${params}`);
      await generatePdfReport(reportType, res.data, { analytics, dashboard });
    } catch (err) {
      console.error('PDF Export error:', err);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ExportDropdown: React.FC<{ reportType: string; label?: string }> = ({ reportType, label }) => (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={showExportMenu === reportType ? exportMenuRef : undefined}>
      <button
        className="bo-btn bo-btn-primary"
        onClick={() => setShowExportMenu(showExportMenu === reportType ? null : reportType)}
        disabled={exporting}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        {exporting ? (
          <><div className="bo-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Exporting...</>
        ) : (
          <><Download size={16} /> {label || 'Export'} <ChevronDown size={14} /></>
        )}
      </button>
      {showExportMenu === reportType && (
        <div style={{
          position: 'absolute', right: 0, top: '110%', zIndex: 50,
          background: 'white', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          border: '1px solid #E5E7EB', minWidth: 200, overflow: 'hidden',
        }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px',
              border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13,
              color: '#374151', transition: 'background 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#F3F4F6')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            onClick={() => { setShowExportMenu(null); handleExport(reportType); }}
          >
            <FileSpreadsheet size={16} style={{ color: '#10B981' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600 }}>Export as CSV</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Spreadsheet data format</div>
            </div>
          </button>
          <div style={{ height: 1, background: '#F3F4F6' }} />
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px',
              border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13,
              color: '#374151', transition: 'background 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#F3F4F6')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            onClick={() => { setShowExportMenu(null); handlePdfExport(reportType); }}
          >
            <FileText size={16} style={{ color: '#6366F1' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600 }}>Export as PDF</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Visual report with charts</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );

  const handleSort = (key: string) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc';
    setSortConfig({ key, direction });
  };

  const ProgressBar: React.FC<{ value: number; color?: string; height?: number }> = ({
    value, color = 'var(--bo-accent)', height = 8
  }) => (
    <div style={{ width: '100%', height, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(value, 100)}%`, height: '100%', background: color,
        borderRadius: 4, transition: 'width 0.5s ease'
      }} />
    </div>
  );

  const getPerformanceColor = (value: number) => {
    if (value >= 80) return 'var(--bo-success)';
    if (value >= 50) return '#F59E0B';
    if (value >= 30) return '#F97316';
    return 'var(--bo-danger)';
  };

  const SortHeader: React.FC<{ label: string; sortKey: string }> = ({ label, sortKey }) => (
    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(sortKey)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
        )}
      </div>
    </th>
  );

  const StatCard: React.FC<{
    icon: React.ReactNode; value: string | number; label: string;
    trend?: string; color?: string; onClick?: () => void;
  }> = ({ icon, value, label, trend, color = 'var(--bo-accent)', onClick }) => (
    <div className="bo-stat-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className="bo-stat-icon" style={{ background: `${color}15`, color }}>{icon}</div>
      <div className="bo-stat-value">{value}</div>
      <div className="bo-stat-label">{label}</div>
      {trend && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>{trend}</div>}
    </div>
  );

  const totalContent = dashboard?.contentByType
    ? dashboard.contentByType.books + dashboard.contentByType.videos + dashboard.contentByType.mcqs
    : 0;

  if (loading) {
    return <MainLayout loading={true} loadingMessage="Loading Analytics" />;
  }

  return (
    <MainLayout>
      <div className="bo-page">
        <div className="bo-page-header">
          <div>
            <h1 className="bo-page-title">Analytics & Performance</h1>
            <p className="bo-page-subtitle">Comprehensive platform insights, performance tracking & reports</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="bo-btn bo-btn-secondary" onClick={() => {
              if (activeTab === 'overview') fetchOverview();
              else if (activeTab === 'students') fetchStudentData();
              else if (activeTab === 'teachers') fetchTeacherData();
              else if (activeTab === 'courses') fetchCourseData();
              else if (activeTab === 'colleges') fetchCollegeComparison();
            }}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="bo-tabs" style={{ marginBottom: 20 }}>
          {([
            { key: 'overview' as TabType, icon: <BarChart3 size={16} />, label: 'Overview' },
            { key: 'students' as TabType, icon: <GraduationCap size={16} />, label: 'Student Performance' },
            { key: 'teachers' as TabType, icon: <UserCheck size={16} />, label: 'Teacher Performance' },
            { key: 'courses' as TabType, icon: <BookOpen size={16} />, label: 'Course Analysis' },
            { key: 'colleges' as TabType, icon: <Building2 size={16} />, label: 'College Comparison' },
          ]).map(tab => (
            <button
              key={tab.key}
              className={`bo-tab ${activeTab === tab.key ? 'bo-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── College Filter (for students/teachers/courses tabs) ── */}
        {['students', 'teachers', 'courses'].includes(activeTab) && (
          <div className="bo-filters" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <Filter size={16} style={{ color: 'var(--bo-text-muted)' }} />
              <select
                className="bo-filter-select"
                value={collegeFilter}
                onChange={e => setCollegeFilter(e.target.value)}
                style={{ minWidth: 250 }}
              >
                <option value="">All Colleges</option>
                {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <ExportDropdown
              reportType={
                activeTab === 'students' ? 'student-performance' :
                activeTab === 'teachers' ? 'teacher-performance' : 'course-performance'
              }
              label="Export Report"
            />
          </div>
        )}

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <>
            <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
              <StatCard icon={<Users size={20} />} value={analytics?.totalUsers ?? dashboard?.totalUsers ?? 0} label="Total Users"
                trend={`${analytics?.activeUsers ?? 0} active`} color="var(--bo-accent)" />
              <StatCard icon={<Building2 size={20} />} value={analytics?.activeColleges ?? dashboard?.totalColleges ?? 0} label="Active Colleges"
                color="var(--bo-success)" onClick={() => setActiveTab('colleges')} />
              <StatCard icon={<Globe2 size={20} />} value={analytics?.activePublishers ?? dashboard?.totalPublishers ?? 0} label="Active Publishers"
                color="#F59E0B" />
              <StatCard icon={<BookOpen size={20} />} value={totalContent} label="Total Content" color="#8B5CF6" />
              <StatCard icon={<LogIn size={20} />} value={analytics?.totalLogins ?? 0} label="Total Logins"
                color="var(--bo-info)" />
              <StatCard icon={<ShieldAlert size={20} />} value={analytics?.failedLoginAttempts ?? 0} label="Failed Logins"
                color="var(--bo-danger)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Content Breakdown */}
              <div className="bo-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Content Breakdown</h3>
                {dashboard?.contentByType ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { label: 'E-Books', count: dashboard.contentByType.books, color: 'var(--bo-accent)' },
                      { label: 'Videos', count: dashboard.contentByType.videos, color: 'var(--bo-success)' },
                      { label: 'MCQs', count: dashboard.contentByType.mcqs, color: '#F59E0B' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                          <span style={{ fontWeight: 500 }}>{item.label}</span>
                          <span style={{ color: 'var(--bo-text-muted)' }}>{item.count}</span>
                        </div>
                        <ProgressBar value={totalContent ? (item.count / totalContent) * 100 : 0} color={item.color} />
                      </div>
                    ))}
                  </div>
                ) : <div style={{ color: 'var(--bo-text-muted)', fontSize: 14, padding: 20, textAlign: 'center' }}>No content data</div>}
              </div>

              {/* User Distribution */}
              <div className="bo-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>User Distribution</h3>
                {analytics?.usersByRole && analytics.usersByRole.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {analytics.usersByRole.map((r, i) => {
                      const maxCount = Math.max(...analytics.usersByRole.map(u => u.count));
                      const colors = ['var(--bo-accent)', 'var(--bo-success)', 'var(--bo-info)', '#F59E0B', '#8B5CF6', 'var(--bo-danger)'];
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                            <span style={{ fontWeight: 500 }}>{r.role.replace(/_/g, ' ')}</span>
                            <span style={{ color: 'var(--bo-text-muted)' }}>{r.count} users</span>
                          </div>
                          <ProgressBar value={maxCount ? (r.count / maxCount) * 100 : 0} color={colors[i % colors.length]} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { label: 'Students', count: dashboard?.studentCount ?? 0, color: 'var(--bo-accent)' },
                      { label: 'Faculty', count: dashboard?.facultyCount ?? 0, color: 'var(--bo-success)' },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                          <span style={{ fontWeight: 500 }}>{item.label}</span>
                          <span style={{ color: 'var(--bo-text-muted)' }}>{item.count}</span>
                        </div>
                        <ProgressBar value={(dashboard?.totalUsers ?? 1) ? (item.count / (dashboard?.totalUsers ?? 1)) * 100 : 0} color={item.color} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Access Cards */}
              <div className="bo-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Performance Quick View</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Student Analysis', icon: <GraduationCap size={20} />, tab: 'students' as TabType, color: 'var(--bo-accent)' },
                    { label: 'Teacher Analysis', icon: <UserCheck size={20} />, tab: 'teachers' as TabType, color: 'var(--bo-success)' },
                    { label: 'Course Analysis', icon: <BookOpen size={20} />, tab: 'courses' as TabType, color: '#8B5CF6' },
                    { label: 'College Ranking', icon: <Trophy size={20} />, tab: 'colleges' as TabType, color: '#F59E0B' },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => setActiveTab(item.tab)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
                        background: `${item.color}08`, border: `1px solid ${item.color}20`,
                        borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = `${item.color}15`; }}
                      onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = `${item.color}08`; }}
                    >
                      <div style={{ color: item.color }}>{item.icon}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text-primary)' }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Center */}
              <div className="bo-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
                  <FileSpreadsheet size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                  Export Reports
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Student Performance Report', type: 'student-performance' },
                    { label: 'Teacher Performance Report', type: 'teacher-performance' },
                    { label: 'Course Analysis Report', type: 'course-performance' },
                    { label: 'College Comparison Report', type: 'college-comparison' },
                  ].map(report => (
                    <div key={report.type} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 8, border: '1px solid #F3F4F6',
                      background: '#FAFAFA',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{report.label}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="bo-btn bo-btn-ghost"
                          style={{ padding: '6px 10px', fontSize: 11, gap: 4 }}
                          onClick={() => handleExport(report.type)}
                          disabled={exporting}
                          title="Export as CSV"
                        >
                          <FileSpreadsheet size={13} style={{ color: '#10B981' }} /> CSV
                        </button>
                        <button
                          className="bo-btn bo-btn-ghost"
                          style={{ padding: '6px 10px', fontSize: 11, gap: 4 }}
                          onClick={() => handlePdfExport(report.type)}
                          disabled={exporting}
                          title="Export as PDF with charts"
                        >
                          <FileText size={13} style={{ color: '#6366F1' }} /> PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Student Performance Tab ── */}
        {activeTab === 'students' && (
          <>
            {tabLoading ? (
              <div className="bo-loading"><div className="bo-spinner" /> Loading student performance...</div>
            ) : !studentData ? (
              <div className="bo-empty"><GraduationCap size={44} className="bo-empty-icon" /><h3>No Student Data</h3></div>
            ) : (
              <>
                <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
                  <StatCard icon={<Users size={20} />} value={studentData.summary.totalStudents} label="Total Students" color="var(--bo-accent)" />
                  <StatCard icon={<Target size={20} />} value={`${studentData.summary.avgCompletionRate}%`} label="Avg Completion Rate"
                    color={getPerformanceColor(studentData.summary.avgCompletionRate)} />
                  <StatCard icon={<Zap size={20} />} value={`${studentData.summary.avgAccuracy}%`} label="Avg Practice Accuracy"
                    color={getPerformanceColor(studentData.summary.avgAccuracy)} />
                  <StatCard icon={<Trophy size={20} />} value={studentData.summary.topPerformers} label="Top Performers (≥80%)" color="var(--bo-success)" />
                  <StatCard icon={<AlertTriangle size={20} />} value={studentData.summary.atRisk} label="At Risk (<30%)" color="var(--bo-danger)" />
                </div>

                <div className="bo-card">
                  <div className="bo-table-wrap">
                    <table className="bo-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Student</th>
                          <th>College</th>
                          <SortHeader label="Courses" sortKey="totalCourses" />
                          <SortHeader label="Completed" sortKey="completedCourses" />
                          <SortHeader label="Completion %" sortKey="completionRate" />
                          <th>Practice Sessions</th>
                          <SortHeader label="Accuracy" sortKey="accuracy" />
                          <th>Time Spent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentData.students.map((s, i) => (
                          <tr key={s.studentId}>
                            <td style={{ fontSize: 13, color: 'var(--bo-text-muted)', width: 40 }}>
                              {i < 3 ? <Trophy size={16} style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32' }} /> : i + 1}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.studentName}</div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{s.email}</div>
                            </td>
                            <td style={{ fontSize: 13 }}>{s.collegeName}</td>
                            <td style={{ fontSize: 13 }}>{s.totalCourses}</td>
                            <td style={{ fontSize: 13 }}>{s.completedCourses}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 60 }}>
                                  <ProgressBar value={s.completionRate} color={getPerformanceColor(s.completionRate)} />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: getPerformanceColor(s.completionRate) }}>
                                  {s.completionRate}%
                                </span>
                              </div>
                            </td>
                            <td style={{ fontSize: 13 }}>{s.practiceStats.totalPractice}</td>
                            <td>
                              <span style={{ fontSize: 13, fontWeight: 600, color: getPerformanceColor(s.practiceStats.accuracy) }}>
                                {s.practiceStats.accuracy}%
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                              <Clock size={12} style={{ verticalAlign: 'text-bottom', marginRight: 3 }} />
                              {Math.round(s.practiceStats.totalTimeSpent / 60)}m
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {studentData.students.length === 0 && (
                    <div className="bo-empty" style={{ padding: 40 }}>
                      <GraduationCap size={44} className="bo-empty-icon" />
                      <h3>No student data for selected filter</h3>
                      <p>Try selecting a different college or remove the filter</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Teacher Performance Tab ── */}
        {activeTab === 'teachers' && (
          <>
            {tabLoading ? (
              <div className="bo-loading"><div className="bo-spinner" /> Loading teacher performance...</div>
            ) : !teacherData ? (
              <div className="bo-empty"><UserCheck size={44} className="bo-empty-icon" /><h3>No Teacher Data</h3></div>
            ) : (
              <>
                <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
                  <StatCard icon={<UserCheck size={20} />} value={teacherData.summary.totalTeachers} label="Total Teachers" color="var(--bo-accent)" />
                  <StatCard icon={<BookOpen size={20} />} value={teacherData.summary.totalCourses} label="Total Courses" color="#8B5CF6" />
                  <StatCard icon={<Target size={20} />} value={`${teacherData.summary.avgCompletionRate}%`} label="Avg Student Completion"
                    color={getPerformanceColor(teacherData.summary.avgCompletionRate)} />
                  <StatCard icon={<BarChart3 size={20} />} value={teacherData.summary.avgCoursesPerTeacher} label="Avg Courses/Teacher" color="var(--bo-info)" />
                  <StatCard icon={<Star size={20} />} value={teacherData.summary.avgRating || 'N/A'} label="Avg Rating" color="#F59E0B" />
                </div>

                <div className="bo-card">
                  <div className="bo-table-wrap">
                    <table className="bo-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Teacher</th>
                          <th>College</th>
                          <th>Courses</th>
                          <th>Students</th>
                          <SortHeader label="Student Completion" sortKey="studentCompletionRate" />
                          <th>Rating</th>
                          <th>Last Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherData.teachers.map((t, i) => (
                          <tr key={t.teacherId}>
                            <td style={{ fontSize: 13, color: 'var(--bo-text-muted)', width: 40 }}>
                              {i < 3 ? <Trophy size={16} style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32' }} /> : i + 1}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.teacherName}</div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{t.email}</div>
                            </td>
                            <td style={{ fontSize: 13 }}>{t.collegeName}</td>
                            <td style={{ fontSize: 13 }}>
                              {t.activeCourses}<span style={{ color: 'var(--bo-text-muted)' }}>/{t.totalCourses}</span>
                            </td>
                            <td style={{ fontSize: 13 }}>{t.totalStudents}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 60 }}>
                                  <ProgressBar value={t.studentCompletionRate} color={getPerformanceColor(t.studentCompletionRate)} />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: getPerformanceColor(t.studentCompletionRate) }}>
                                  {t.studentCompletionRate}%
                                </span>
                              </div>
                            </td>
                            <td>
                              {t.avgRating > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Star size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t.avgRating}</span>
                                  <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>({t.totalRatings})</span>
                                </div>
                              ) : <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>No ratings</span>}
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                              {t.lastActive ? new Date(t.lastActive).toLocaleDateString() : 'Never'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {teacherData.teachers.length === 0 && (
                    <div className="bo-empty" style={{ padding: 40 }}>
                      <UserCheck size={44} className="bo-empty-icon" />
                      <h3>No teacher data for selected filter</h3>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Course Analysis Tab ── */}
        {activeTab === 'courses' && (
          <>
            {tabLoading ? (
              <div className="bo-loading"><div className="bo-spinner" /> Loading course analysis...</div>
            ) : !courseData ? (
              <div className="bo-empty"><BookOpen size={44} className="bo-empty-icon" /><h3>No Course Data</h3></div>
            ) : (
              <>
                <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
                  <StatCard icon={<BookOpen size={20} />} value={courseData.summary.totalCourses} label="Total Courses" color="#8B5CF6" />
                  <StatCard icon={<Target size={20} />} value={`${courseData.summary.avgCompletionRate}%`} label="Avg Completion Rate"
                    color={getPerformanceColor(courseData.summary.avgCompletionRate)} />
                  <StatCard icon={<Users size={20} />} value={courseData.summary.totalEnrollments} label="Total Enrollments" color="var(--bo-accent)" />
                  <StatCard icon={<Award size={20} />} value={courseData.summary.totalCompletions} label="Total Completions" color="var(--bo-success)" />
                </div>

                <div className="bo-card">
                  <div className="bo-table-wrap">
                    <table className="bo-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Course</th>
                          <th>College</th>
                          <th>Faculty</th>
                          <th>Steps</th>
                          <th>Enrolled</th>
                          <SortHeader label="Completion %" sortKey="completionRate" />
                          <th>Rating</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseData.courses.map((c, i) => (
                          <tr key={c.courseId}>
                            <td style={{ fontSize: 13, color: 'var(--bo-text-muted)', width: 40 }}>{i + 1}</td>
                            <td><div style={{ fontWeight: 600, fontSize: 13 }}>{c.courseTitle}</div></td>
                            <td style={{ fontSize: 13 }}>{c.collegeName}</td>
                            <td style={{ fontSize: 13 }}>{c.facultyName}</td>
                            <td style={{ fontSize: 13 }}>{c.totalSteps}</td>
                            <td style={{ fontSize: 13 }}>
                              {c.completedStudents}<span style={{ color: 'var(--bo-text-muted)' }}>/{c.enrolledStudents}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 60 }}>
                                  <ProgressBar value={c.completionRate} color={getPerformanceColor(c.completionRate)} />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: getPerformanceColor(c.completionRate) }}>
                                  {c.completionRate}%
                                </span>
                              </div>
                            </td>
                            <td>
                              {c.avgRating > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Star size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.avgRating}</span>
                                </div>
                              ) : <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>—</span>}
                            </td>
                            <td>
                              <span className={`bo-badge ${c.status === 'PUBLISHED' ? 'bo-badge-success' : 'bo-badge-default'}`}>
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {courseData.courses.length === 0 && (
                    <div className="bo-empty" style={{ padding: 40 }}>
                      <BookOpen size={44} className="bo-empty-icon" />
                      <h3>No courses found for selected filter</h3>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── College Comparison Tab ── */}
        {activeTab === 'colleges' && (
          <>
            {tabLoading ? (
              <div className="bo-loading"><div className="bo-spinner" /> Loading college comparison...</div>
            ) : !collegeData ? (
              <div className="bo-empty"><Building2 size={44} className="bo-empty-icon" /><h3>No College Data</h3></div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ padding: '8px 16px', background: 'var(--bo-accent-light)', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Avg Completion</span>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bo-accent)' }}>{collegeData.summary.avgCompletionRate}%</div>
                    </div>
                    <div style={{ padding: '8px 16px', background: 'var(--bo-success-light)', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Avg Accuracy</span>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bo-success)' }}>{collegeData.summary.avgAccuracy}%</div>
                    </div>
                    <div style={{ padding: '8px 16px', background: '#FEF3C7', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Top College</span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>{collegeData.summary.topCollege}</div>
                    </div>
                  </div>
                  <ExportDropdown reportType="college-comparison" label="Export Report" />
                </div>

                {/* College Ranking Cards */}
                <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
                  {collegeData.colleges.map((c, i) => (
                    <div key={c.collegeId} className="bo-card" style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        {/* Rank */}
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                          fontSize: i < 3 ? 18 : 16,
                          background: i === 0 ? '#FEF3C7' : i === 1 ? '#F3F4F6' : i === 2 ? '#FED7AA' : '#F9FAFB',
                          color: i === 0 ? '#F59E0B' : i === 1 ? '#6B7280' : i === 2 ? '#EA580C' : 'var(--bo-text-muted)',
                          border: i < 3 ? '2px solid currentColor' : '1px solid #E5E7EB',
                        }}>
                          {i < 3 ? <Trophy size={20} /> : `#${i + 1}`}
                        </div>

                        {/* College Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 700 }}>{c.collegeName}</span>
                            <span className="bo-badge bo-badge-default" style={{ fontSize: 11 }}>{c.collegeCode}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                            <span><Users size={12} style={{ verticalAlign: 'text-bottom' }} /> {c.studentCount} students</span>
                            <span><UserCheck size={12} style={{ verticalAlign: 'text-bottom' }} /> {c.facultyCount} faculty</span>
                            <span><BookOpen size={12} style={{ verticalAlign: 'text-bottom' }} /> {c.courseCount} courses</span>
                            <span>📦 {c.packageCount} packages</span>
                          </div>
                        </div>

                        {/* Metrics */}
                        <div style={{ display: 'flex', gap: 24 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginBottom: 2 }}>Completion</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: getPerformanceColor(c.completionRate) }}>{c.completionRate}%</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginBottom: 2 }}>Accuracy</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: getPerformanceColor(c.avgAccuracy) }}>{c.avgAccuracy}%</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginBottom: 2 }}>Engagement</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: getPerformanceColor(c.engagementScore) }}>{c.engagementScore}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginBottom: 2 }}>Logins</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--bo-info)' }}>{c.loginCount}</div>
                          </div>
                        </div>
                      </div>

                      {/* Progress bars row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                            <span style={{ color: 'var(--bo-text-muted)' }}>Course Completion</span>
                            <span style={{ fontWeight: 600 }}>{c.completedEnrollments}/{c.totalEnrollments}</span>
                          </div>
                          <ProgressBar value={c.completionRate} color={getPerformanceColor(c.completionRate)} height={6} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                            <span style={{ color: 'var(--bo-text-muted)' }}>Practice Accuracy</span>
                            <span style={{ fontWeight: 600 }}>{c.avgAccuracy}%</span>
                          </div>
                          <ProgressBar value={c.avgAccuracy} color={getPerformanceColor(c.avgAccuracy)} height={6} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                            <span style={{ color: 'var(--bo-text-muted)' }}>Engagement Score</span>
                            <span style={{ fontWeight: 600 }}>{c.engagementScore}/100</span>
                          </div>
                          <ProgressBar value={c.engagementScore} color={getPerformanceColor(c.engagementScore)} height={6} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {collegeData.colleges.length === 0 && (
                  <div className="bo-empty">
                    <Building2 size={44} className="bo-empty-icon" />
                    <h3>No active colleges found</h3>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default AnalyticsDashboard;