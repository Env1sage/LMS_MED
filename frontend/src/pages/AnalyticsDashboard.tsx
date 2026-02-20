import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  BarChart3, Users, BookOpen, Award, Building2, Globe2,
  LogIn, ShieldAlert, Download, GraduationCap,
  UserCheck, Trophy, AlertTriangle, Filter, RefreshCw, FileSpreadsheet,
  ChevronDown, ChevronUp, Star, Clock, Target, Zap, FileText, TrendingUp, X
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
  studentEmail: string;
  email: string;
  collegeName: string;
  city: string | null;
  state: string | null;
  currentYear: number;
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  completionRate: number;
  academicProgress: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    completionRate: number;
  };
  practiceStats: {
    totalPractice: number;
    totalPracticeSessions: number;
    totalQuestions: number;
    totalCorrect: number;
    correctAnswers: number;
    accuracy: number;
    totalTimeSpent: number;
    avgSessionDuration: number;
  };
  testPerformance: {
    testsAttempted: number;
    testsCompleted: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
  };
  recentActivity: {
    lastLoginAt: string | null;
    lastActivityAt: string | null;
    daysActive: number;
  };
}

interface TeacherPerformance {
  teacherId: string;
  teacherName: string;
  email: string;
  collegeName: string;
  city: string | null;
  state: string | null;
  totalCourses: number;
  activeCourses: number;
  totalStudents: number;
  completedStudents: number;
  studentCompletionRate: number;
  avgRating: number;
  totalRatings: number;
  lastActive: string | null;
  contentUploaded: number;
  materialsShared: number;
}

interface CoursePerformance {
  courseId: string;
  courseTitle: string;
  courseCode: string | null;
  collegeName: string;
  city: string | null;
  state: string | null;
  facultyName: string;
  facultyEmail: string | null;
  status: string;
  totalSteps: number;
  totalUnits: number;
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
  city: string | null;
  state: string | null;
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
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [colleges, setColleges] = useState<{ id: string; name: string; city?: string; state?: string }[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'desc' });
  const [selectedStudent, setSelectedStudent] = useState<StudentPerformance | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherPerformance | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: any[]; fullRows: any[] } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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
      const collegeList = Array.isArray(cols) ? cols.map((c: any) => ({ 
        id: c.id, 
        name: c.name,
        city: c.city,
        state: c.state
      })) : [];
      setColleges(collegeList);
      
      // Extract unique states, cities
      const uniqueStates = Array.from(new Set(collegeList.map(c => c.state).filter(Boolean))) as string[];
      const uniqueCities = Array.from(new Set(collegeList.map(c => c.city).filter(Boolean))) as string[];
      
      setStates(uniqueStates.sort());
      setCities(uniqueCities.sort());
      setFilteredCities(uniqueCities.sort());
    } catch (err) { console.error(err); }
  };

  // Update filtered cities when state changes
  useEffect(() => {
    if (stateFilter) {
      const citiesInState = colleges
        .filter(c => c.state === stateFilter)
        .map(c => c.city)
        .filter(Boolean) as string[];
      const uniqueCitiesInState = Array.from(new Set(citiesInState)).sort();
      setFilteredCities(uniqueCitiesInState);
      // Reset city filter if current city is not in the selected state
      if (cityFilter && !uniqueCitiesInState.includes(cityFilter)) {
        setCityFilter('');
      }
    } else {
      setFilteredCities(cities);
    }
  }, [stateFilter, colleges, cities, cityFilter]);

  const fetchStudentData = useCallback(async () => {
    setTabLoading(true);
    try {
      const params = new URLSearchParams();
      if (collegeFilter) params.append('collegeId', collegeFilter);
      if (stateFilter) params.append('state', stateFilter);
      if (cityFilter) params.append('city', cityFilter);
      params.append('limit', '10000'); // Get all students
      const res = await apiService.get(`/bitflow-owner/analytics/student-progress?${params.toString()}`);
      setStudentData(res.data);
    } catch (err) { console.error(err); } finally { setTabLoading(false); }
  }, [collegeFilter, stateFilter, cityFilter]);

  const fetchTeacherData = useCallback(async () => {
    setTabLoading(true);
    try {
      const params = new URLSearchParams();
      if (collegeFilter) params.append('collegeId', collegeFilter);
      if (stateFilter) params.append('state', stateFilter);
      if (cityFilter) params.append('city', cityFilter);
      params.append('limit', '10000'); // Get all teachers
      const res = await apiService.get(`/bitflow-owner/analytics/teacher-performance?${params.toString()}`);
      setTeacherData(res.data);
    } catch (err) { console.error(err); } finally { setTabLoading(false); }
  }, [collegeFilter, stateFilter, cityFilter]);

  const fetchCourseData = useCallback(async () => {
    setTabLoading(true);
    try {
      const params = new URLSearchParams();
      if (collegeFilter) params.append('collegeId', collegeFilter);
      if (stateFilter) params.append('state', stateFilter);
      if (cityFilter) params.append('city', cityFilter);
      params.append('limit', '10000'); // Get all courses
      const res = await apiService.get(`/bitflow-owner/analytics/course-performance?${params.toString()}`);
      setCourseData(res.data);
    } catch (err) { console.error(err); } finally { setTabLoading(false); }
  }, [collegeFilter, stateFilter, cityFilter]);

  const fetchCollegeComparison = useCallback(async () => {
    setTabLoading(true);
    try {
      const params = new URLSearchParams();
      if (stateFilter) params.append('state', stateFilter);
      if (cityFilter) params.append('city', cityFilter);
      params.append('limit', '10000'); // Get all colleges
      const res = await apiService.get(`/bitflow-owner/analytics/college-comparison?${params.toString()}`);
      setCollegeData(res.data);
    } catch (err) { console.error(err); } finally { setTabLoading(false); }
  }, [stateFilter, cityFilter]);

  const activeFilterCount = [collegeFilter, stateFilter, cityFilter].filter(Boolean).length;

  const clearFilters = () => {
    setCollegeFilter('');
    setStateFilter('');
    setCityFilter('');
  };

  useEffect(() => {
    if (activeTab === 'students') fetchStudentData();
    else if (activeTab === 'teachers') fetchTeacherData();
    else if (activeTab === 'courses') fetchCourseData();
    else if (activeTab === 'colleges') fetchCollegeComparison();
  }, [activeTab, collegeFilter, stateFilter, cityFilter, fetchStudentData, fetchTeacherData, fetchCourseData, fetchCollegeComparison]);

  const handleExport = async (reportType: string) => {
    setExporting(true);
    try {
      // Use current filtered data instead of fetching
      let csvHeaders: string[] = [];
      let rows: any[] = [];
      let dataSource: any[] = [];

      if (reportType === 'student-performance' && studentData?.students) {
        dataSource = studentData.students;
        csvHeaders = ['Student Name', 'Email', 'College', 'State', 'City', 'Year', 'Total Courses', 'Completed', 'In Progress', 'Completion %', 'Practice Sessions', 'Questions Attempted', 'Correct Answers', 'Accuracy %', 'Time Spent (hrs)', 'Avg Session (min)', 'Tests Attempted', 'Tests Completed', 'Avg Test Score', 'Highest Score', 'Lowest Score', 'Last Login', 'Days Active'];
        rows = dataSource.map((s: any) => [
          s.studentName, s.studentEmail, s.collegeName, s.state || 'N/A', s.city || 'N/A', s.currentYear,
          s.academicProgress?.totalCourses || 0, 
          s.academicProgress?.completedCourses || 0,
          s.academicProgress?.inProgressCourses || 0, 
          s.academicProgress?.completionRate || 0,
          s.practiceStats?.totalPracticeSessions || 0,
          s.practiceStats?.totalQuestions || 0,
          s.practiceStats?.correctAnswers || 0,
          s.practiceStats?.accuracy || 0,
          Math.round((s.practiceStats?.totalTimeSpent || 0) / 3600 * 100) / 100,
          Math.round((s.practiceStats?.avgSessionDuration || 0) / 60),
          s.testPerformance?.testsAttempted || 0,
          s.testPerformance?.testsCompleted || 0,
          s.testPerformance?.avgScore || 0,
          s.testPerformance?.highestScore || 0,
          s.testPerformance?.lowestScore || 0,
          s.recentActivity?.lastLoginAt ? new Date(s.recentActivity.lastLoginAt).toLocaleDateString() : 'Never',
          s.recentActivity?.daysActive || 0,
        ]);
      } else if (reportType === 'teacher-performance' && teacherData?.teachers) {
        dataSource = teacherData.teachers;
        csvHeaders = ['Teacher Name', 'Email', 'College', 'State', 'City', 'Total Courses', 'Active Courses', 'Total Students', 'Completed Students', 'Completion %', 'Avg Rating', 'Total Ratings', 'Last Active'];
        rows = dataSource.map((t: any) => [
          t.teacherName, t.email, t.collegeName, t.state || 'N/A', t.city || 'N/A',
          t.totalCourses, t.activeCourses,
          t.totalStudents, t.completedStudents, t.studentCompletionRate,
          t.avgRating || 'N/A', t.totalRatings || 0,
          t.lastActive ? new Date(t.lastActive).toLocaleDateString() : 'Never',
        ]);
      } else if (reportType === 'course-performance' && courseData?.courses) {
        dataSource = courseData.courses;
        csvHeaders = ['Course Title', 'College', 'State', 'City', 'Faculty', 'Status', 'Steps', 'Enrolled', 'Completed', 'Completion Rate', 'Avg Rating'];
        rows = dataSource.map((c: any) => [
          c.courseTitle, c.collegeName, c.state || 'N/A', c.city || 'N/A', c.facultyName, c.status, c.totalSteps,
          c.enrolledStudents, c.completedStudents, `${c.completionRate}%`, c.avgRating || 'N/A',
        ]);
      } else if (reportType === 'college-comparison' && collegeData?.colleges) {
        dataSource = collegeData.colleges;
        csvHeaders = ['College', 'Code', 'State', 'City', 'Students', 'Faculty', 'Courses', 'Packages', 'Enrollments', 'Completed', 'Completion Rate', 'Accuracy', 'Engagement Score'];
        rows = dataSource.map((c: any) => [
          c.collegeName, c.collegeCode, c.state || 'N/A', c.city || 'N/A', c.studentCount, c.facultyCount, c.courseCount,
          c.packageCount, c.totalEnrollments, c.completedEnrollments,
          `${c.completionRate}%`, `${c.avgAccuracy}%`, c.engagementScore,
        ]);
      }

      // Show preview modal with first 10 rows, but store all rows for export
      setPreviewData({ headers: csvHeaders, rows: rows.slice(0, 10), fullRows: rows });
      setShowPreview(true);
      setExporting(false);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to prepare export. Please try again.');
      setExporting(false);
    }
  };

  const confirmExport = () => {
    if (!previewData) return;
    
    const csvContent = [
      previewData.headers.join(','),
      ...previewData.fullRows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const reportType = activeTab === 'students' ? 'student-performance' :
                       activeTab === 'teachers' ? 'teacher-performance' :
                       activeTab === 'courses' ? 'course-performance' : 'college-comparison';
    
    const filterSuffix = stateFilter ? `_${stateFilter}` : cityFilter ? `_${cityFilter}` : collegeFilter ? `_college` : '';
    link.download = `${reportType}${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowPreview(false);
    setPreviewData(null);
  };

  const handlePdfExport = async (reportType: string) => {
    setExporting(true);
    try {
      // Use the same filtered data logic as CSV export
      let dataToExport: any = null;
      
      if (reportType === 'student-performance') {
        dataToExport = studentData;
      } else if (reportType === 'teacher-performance') {
        dataToExport = teacherData;
      } else if (reportType === 'course-performance') {
        dataToExport = courseData;
      } else if (reportType === 'college-comparison') {
        dataToExport = collegeData;
      }

      await generatePdfReport(reportType, dataToExport, { analytics, dashboard });
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
    <div
      onClick={onClick}
      style={{
        background: 'white', padding: 24, borderRadius: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s', position: 'relative', overflow: 'hidden'
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
        }
      }}
      onMouseOut={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
        }
      }}
    >
      <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.05 }}>
        <TrendingUp size={80} />
      </div>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', marginBottom: 16, boxShadow: `0 4px 12px ${color}40`
      }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{label}</div>
      {trend && <div style={{ fontSize: 12, color: color, marginTop: 8, fontWeight: 600 }}>{trend}</div>}
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
      <div className="bo-page" style={{ background: 'linear-gradient(to bottom, #f8f9fc, #ffffff)' }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '40px 32px', borderRadius: 20, marginBottom: 24,
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
                <BarChart3 size={32} /> Analytics & Performance
              </h1>
              <p style={{ margin: '8px 0 0 0', fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
                Comprehensive platform insights, performance tracking & reports
              </p>
            </div>
            <button style={{
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'white', padding: '12px 24px', borderRadius: 10,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 600, transition: 'all 0.3s'
            }} onClick={() => {
              if (activeTab === 'overview') fetchOverview();
              else if (activeTab === 'students') fetchStudentData();
              else if (activeTab === 'teachers') fetchTeacherData();
              else if (activeTab === 'courses') fetchCourseData();
              else if (activeTab === 'colleges') fetchCollegeComparison();
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}>
              <RefreshCw size={16} /> Refresh Data
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 24, padding: 6,
          background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
        }}>
          {([
            { key: 'overview' as TabType, icon: <BarChart3 size={16} />, label: 'Overview', color: '#667eea' },
            { key: 'students' as TabType, icon: <GraduationCap size={16} />, label: 'Students', color: '#f093fb' },
            { key: 'teachers' as TabType, icon: <UserCheck size={16} />, label: 'Teachers', color: '#4facfe' },
            { key: 'courses' as TabType, icon: <BookOpen size={16} />, label: 'Courses', color: '#43e97b' },
            { key: 'colleges' as TabType, icon: <Building2 size={16} />, label: 'Colleges', color: '#fa709a' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '14px 20px', border: 'none',
                borderRadius: 12, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 14, fontWeight: 600, transition: 'all 0.3s',
                background: activeTab === tab.key ? `linear-gradient(135deg, ${tab.color}, ${tab.color}dd)` : 'transparent',
                color: activeTab === tab.key ? 'white' : '#6b7280',
                boxShadow: activeTab === tab.key ? `0 4px 12px ${tab.color}40` : 'none'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Filters with Location Dropdowns ── */}
        {['students', 'teachers', 'courses', 'colleges'].includes(activeTab) && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="bo-btn bo-btn-ghost bo-btn-sm"
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                  border: activeFilterCount > 0 ? '1.5px solid #667eea' : '1px solid #e5e7eb',
                  background: activeFilterCount > 0 ? 'linear-gradient(135deg, #667eea20, #764ba220)' : 'white',
                  color: activeFilterCount > 0 ? '#667eea' : '#6b7280',
                  borderRadius: 8, fontWeight: 500, fontSize: 13,
                }}
              >
                <Filter size={14} />
                Filters
                {activeFilterCount > 0 && (
                  <span style={{ background: '#667eea', color: '#fff', borderRadius: 99, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown size={13} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
              </button>

              {activeFilterCount > 0 && (
                <button 
                  className="bo-btn bo-btn-ghost bo-btn-sm" 
                  onClick={clearFilters} 
                  style={{ color: '#dc2626', fontSize: 12, gap: 4, display: 'flex', alignItems: 'center' }}
                >
                  <X size={13} /> Clear all
                </button>
              )}

              <span style={{ fontSize: 12, color: '#6b7280' }}>
                {activeTab === 'students' && studentData?.summary ? `${studentData.summary.totalStudents} students` :
                 activeTab === 'teachers' && teacherData?.summary ? `${teacherData.summary.totalTeachers} teachers` :
                 activeTab === 'courses' && courseData?.summary ? `${courseData.summary.totalCourses} courses` :
                 activeTab === 'colleges' && collegeData?.summary ? `${collegeData.summary.totalColleges} colleges` : ''}
              </span>

              <div style={{ marginLeft: 'auto' }}>
                <ExportDropdown
                  reportType={
                    activeTab === 'students' ? 'student-performance' :
                    activeTab === 'teachers' ? 'teacher-performance' : 'course-performance'
                  }
                  label="Export Report"
                />
              </div>
            </div>

            {/* Expandable Filter Panel */}
            {showFilters && (
              <div style={{
                background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
                padding: 20, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16,
                animation: 'lsFadeIn 0.2s ease', boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
              }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>College</label>
                  <select
                    value={collegeFilter}
                    onChange={e => setCollegeFilter(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8,
                      border: '2px solid #e5e7eb', outline: 'none', cursor: 'pointer',
                      background: 'white', transition: 'all 0.3s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="">All Colleges</option>
                    {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>State</label>
                  <select
                    value={stateFilter}
                    onChange={e => setStateFilter(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8,
                      border: '2px solid #e5e7eb', outline: 'none', cursor: 'pointer',
                      background: 'white', transition: 'all 0.3s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="">All States</option>
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>City</label>
                  <select
                    value={cityFilter}
                    onChange={e => setCityFilter(e.target.value)}
                    disabled={!stateFilter && filteredCities.length === 0}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8,
                      border: '2px solid #e5e7eb', outline: 'none', cursor: 'pointer',
                      background: 'white', transition: 'all 0.3s',
                      opacity: !stateFilter && filteredCities.length === 0 ? 0.5 : 1
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="">{stateFilter ? 'All Cities in ' + stateFilter : 'All Cities'}</option>
                    {filteredCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {collegeFilter && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px 4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: '#EEF2FF', color: '#4338CA' }}>
                    {colleges.find(c => c.id === collegeFilter)?.name || 'College'}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setCollegeFilter('')} />
                  </span>
                )}
                {stateFilter && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px 4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: '#FEF3C7', color: '#92400E' }}>
                    {stateFilter}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStateFilter('')} />
                  </span>
                )}
                {cityFilter && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px 4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: '#ECFDF5', color: '#065F46' }}>
                    {cityFilter}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setCityFilter('')} />
                  </span>
                )}
              </div>
            )}
          </>
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
              <div style={{
                background: 'white', padding: 28, borderRadius: 16,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white'
                  }}><BookOpen size={22} /></div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1f2937' }}>Content Breakdown</h3>
                </div>
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
              <div style={{
                background: 'white', padding: 28, borderRadius: 16,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white'
                  }}><Users size={22} /></div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1f2937' }}>User Distribution</h3>
                </div>
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
              <div style={{
                background: 'white', padding: 28, borderRadius: 16,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white'
                  }}><Zap size={22} /></div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1f2937' }}>Performance Quick View</h3>
                </div>
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
              <div style={{
                background: 'white', padding: 28, borderRadius: 16,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white'
                  }}><FileSpreadsheet size={22} /></div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1f2937' }}>Export Reports</h3>
                </div>
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
            ) : !studentData || !studentData.summary ? (
              <div className="bo-empty"><GraduationCap size={44} className="bo-empty-icon" /><h3>No Student Data</h3></div>
            ) : (
              <>
                <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
                  <StatCard icon={<Users size={20} />} value={studentData.summary.totalStudents || 0} label="Total Students" color="var(--bo-accent)" />
                  <StatCard icon={<Target size={20} />} value={`${studentData.summary.avgCompletionRate || 0}%`} label="Avg Completion Rate"
                    color={getPerformanceColor(studentData.summary.avgCompletionRate || 0)} />
                  <StatCard icon={<Zap size={20} />} value={`${studentData.summary.avgAccuracy || 0}%`} label="Avg Practice Accuracy"
                    color={getPerformanceColor(studentData.summary.avgAccuracy || 0)} />
                  <StatCard icon={<Trophy size={20} />} value={studentData.summary.topPerformers || 0} label="Top Performers (≥80%)" color="var(--bo-success)" />
                  <StatCard icon={<AlertTriangle size={20} />} value={studentData.summary.atRisk || 0} label="At Risk (<30%)" color="var(--bo-danger)" />
                </div>

                <div className="bo-card">
                  <div className="bo-table-wrap">
                    <table className="bo-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th style={{ minWidth: 180 }}>Student Name</th>
                          <th style={{ minWidth: 140 }}>College</th>
                          <th style={{ minWidth: 80 }}>Year</th>
                          <th style={{ minWidth: 100 }}>Completion</th>
                          <th style={{ minWidth: 100 }}>Practice</th>
                          <th style={{ minWidth: 100 }}>Tests</th>
                          <th style={{ minWidth: 100 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentData.students.map((s, i) => (
                          <tr 
                            key={s.studentId} 
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedStudent(s)}
                          >
                            <td style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
                              {i < 3 ? <Trophy size={16} style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32' }} /> : i + 1}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bo-accent)', cursor: 'pointer' }}>
                                {s.studentName}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{s.studentEmail}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13 }}>{s.collegeName}</div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{s.city}, {s.state}</div>
                            </td>
                            <td style={{ fontSize: 13 }}>Year {s.currentYear}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 50 }}>
                                  <ProgressBar value={s.academicProgress.completionRate} color={getPerformanceColor(s.academicProgress.completionRate)} />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: getPerformanceColor(s.academicProgress.completionRate) }}>
                                  {s.academicProgress.completionRate}%
                                </span>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.practiceStats.totalPracticeSessions} sessions</div>
                              <div style={{ fontSize: 11, color: getPerformanceColor(s.practiceStats.accuracy) }}>
                                {s.practiceStats.accuracy}% accuracy
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.testPerformance.testsCompleted} completed</div>
                              <div style={{ fontSize: 11, color: getPerformanceColor(s.testPerformance.avgScore) }}>
                                {s.testPerformance.avgScore}% avg
                              </div>
                            </td>
                            <td>
                              <span className={`bo-badge ${
                                s.academicProgress.completionRate >= 80 ? 'bo-badge-success' :
                                s.academicProgress.completionRate >= 50 ? 'bo-badge-warning' :
                                'bo-badge-danger'
                              }`}>
                                {s.academicProgress.completionRate >= 80 ? 'Excellent' :
                                 s.academicProgress.completionRate >= 50 ? 'Good' : 'At Risk'}
                              </span>
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
            ) : !teacherData || !teacherData.summary ? (
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
                          <th style={{ width: 40 }}>#</th>
                          <th style={{ minWidth: 180 }}>Teacher</th>
                          <th style={{ minWidth: 160 }}>College / Location</th>
                          <th style={{ minWidth: 120 }}>Courses</th>
                          <th style={{ minWidth: 140 }}>Student Progress</th>
                          <th style={{ minWidth: 120 }}>Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherData.teachers.map((t, i) => (
                          <tr 
                            key={t.teacherId}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedTeacher(t)}
                          >
                            <td style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
                              {i < 3 ? <Trophy size={16} style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32' }} /> : i + 1}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bo-accent)', cursor: 'pointer' }}>
                                {t.teacherName}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{t.email}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13 }}>{t.collegeName}</div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>
                                {t.city || 'N/A'}, {t.state || 'N/A'}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.activeCourses} active</div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{t.totalStudents} students</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 50 }}>
                                  <ProgressBar value={t.studentCompletionRate} color={getPerformanceColor(t.studentCompletionRate)} />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: getPerformanceColor(t.studentCompletionRate) }}>
                                  {t.studentCompletionRate}%
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={`bo-badge ${
                                t.studentCompletionRate >= 80 && t.avgRating >= 4 ? 'bo-badge-success' :
                                t.studentCompletionRate >= 50 ? 'bo-badge-warning' :
                                'bo-badge-danger'
                              }`}>
                                {t.studentCompletionRate >= 80 && t.avgRating >= 4 ? 'Excellent' :
                                 t.studentCompletionRate >= 50 ? 'Good' : 'Needs Attention'}
                              </span>
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
            ) : !courseData || !courseData.summary ? (
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
                          <th style={{ width: 40 }}>#</th>
                          <th style={{ minWidth: 180 }}>Course</th>
                          <th style={{ minWidth: 140 }}>College / Location</th>
                          <th style={{ minWidth: 120 }}>Faculty</th>
                          <th style={{ minWidth: 90 }}>Content</th>
                          <th style={{ minWidth: 120 }}>Enrollment</th>
                          <th style={{ minWidth: 130 }}>Completion Rate</th>
                          <th style={{ minWidth: 100 }}>Performance</th>
                          <th style={{ minWidth: 80 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseData.courses.map((c, i) => (
                          <tr key={c.courseId}>
                            <td style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{i + 1}</td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{c.courseTitle}</div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{c.courseCode || 'No code'}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: 12, fontWeight: 500 }}>{c.collegeName}</div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>
                                {c.city || 'N/A'}, {c.state || 'N/A'}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 12 }}>{c.facultyName}</div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{c.facultyEmail || ''}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{c.totalSteps} steps</div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{c.totalUnits || 0} units</div>
                            </td>
                            <td>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{c.enrolledStudents} enrolled</div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{c.completedStudents} completed</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <div style={{ width: 50 }}>
                                  <ProgressBar value={c.completionRate} color={getPerformanceColor(c.completionRate)} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: getPerformanceColor(c.completionRate) }}>
                                  {c.completionRate}%
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>completion</div>
                            </td>
                            <td>
                              {c.avgRating > 0 ? (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Star size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.avgRating}</span>
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{c.totalRatings || 0} reviews</div>
                                </>
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>No ratings</span>
                              )}
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
            ) : !collegeData || !collegeData.summary ? (
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
                          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 6 }}>
                            📍 {c.city || 'N/A'}, {c.state || 'N/A'}
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

        {/* ── Teacher Detail Modal ── */}
        {selectedTeacher && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%)',
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: 20
          }} onClick={() => setSelectedTeacher(null)}>
            <div style={{
              background: 'white', borderRadius: 24, maxWidth: 1100, width: '100%',
              maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex', flexDirection: 'column'
            }} onClick={(e) => e.stopPropagation()}>
              
              {/* Header with Gradient Background */}
              <div style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                padding: '32px 40px', color: 'white', position: 'relative'
              }}>
                <button onClick={() => setSelectedTeacher(null)} style={{
                  position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)',
                  border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%',
                  cursor: 'pointer', fontSize: 20, fontWeight: 600, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s'
                }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                   onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}>×</button>
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, fontWeight: 700, border: '3px solid rgba(255,255,255,0.3)'
                  }}>
                    {selectedTeacher.teacherName.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                      {selectedTeacher.teacherName}
                    </h2>
                    <div style={{ fontSize: 15, opacity: 0.95, marginBottom: 12 }}>
                      {selectedTeacher.email}
                    </div>
                    <div style={{
                      display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, opacity: 0.9
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20 }}>
                        <Building2 size={14} /> {selectedTeacher.collegeName}
                      </span>
                      {(selectedTeacher.city || selectedTeacher.state) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20 }}>
                          <Globe2 size={14} /> {selectedTeacher.city || 'N/A'}, {selectedTeacher.state || 'N/A'}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20 }}>
                        <UserCheck size={14} /> Faculty
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div style={{ padding: '32px 40px', overflow: 'auto', flex: 1 }}>
                
                {/* Key Metrics - Horizontal Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    borderRadius: 16, padding: 24, color: 'white', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                      <BookOpen size={80} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginBottom: 8 }}>ACTIVE COURSES</div>
                    <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
                      {selectedTeacher.activeCourses}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      {selectedTeacher.totalCourses} total courses
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    borderRadius: 16, padding: 24, color: 'white', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                      <Users size={80} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginBottom: 8 }}>TOTAL STUDENTS</div>
                    <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
                      {selectedTeacher.totalStudents}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      enrolled students
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    borderRadius: 16, padding: 24, color: 'white', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                      <Star size={80} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginBottom: 8 }}>AVG RATING</div>
                    <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
                      {selectedTeacher.avgRating > 0 ? selectedTeacher.avgRating.toFixed(1) : 'N/A'}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      {selectedTeacher.totalRatings > 0 ? `${selectedTeacher.totalRatings} reviews` : 'No ratings yet'}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  
                  {/* Student Progress */}
                  <div style={{
                    background: 'white', borderRadius: 16, padding: 24,
                    border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                      background: 'linear-gradient(135deg, #4facfe20, #00f2fe20)',
                      borderRadius: 10, marginBottom: 20
                    }}>
                      <Target size={18} style={{ color: '#4facfe' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>Student Progress</span>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>Completion Rate</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: getPerformanceColor(selectedTeacher.studentCompletionRate) }}>
                          {selectedTeacher.studentCompletionRate}%
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          width: `${selectedTeacher.studentCompletionRate}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${getPerformanceColor(selectedTeacher.studentCompletionRate)}, ${getPerformanceColor(selectedTeacher.studentCompletionRate)}dd)`,
                          transition: 'width 0.3s'
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Content Activity */}
                  <div style={{
                    background: 'white', borderRadius: 16, padding: 24,
                    border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                      background: 'linear-gradient(135deg, #43e97b20, #38f9d720)',
                      borderRadius: 10, marginBottom: 20
                    }}>
                      <FileText size={18} style={{ color: '#43e97b' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>Content Activity</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Uploads</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>{selectedTeacher.contentUploaded || 0}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Materials</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>{selectedTeacher.materialsShared || 0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Last Activity */}
                  <div style={{
                    background: 'white', borderRadius: 16, padding: 24,
                    border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                      background: 'linear-gradient(135deg, #fa709a20, #fee14020)',
                      borderRadius: 10, marginBottom: 20
                    }}>
                      <Clock size={18} style={{ color: '#fa709a' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>Last Activity</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>
                        {selectedTeacher.lastActive ? new Date(selectedTeacher.lastActive).toLocaleDateString('en-US', { 
                          month: 'long', day: 'numeric', year: 'numeric' 
                        }) : 'Never'}
                      </div>
                      {selectedTeacher.lastActive && (
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                          {new Date(selectedTeacher.lastActive).toLocaleTimeString('en-US', { 
                            hour: '2-digit', minute: '2-digit' 
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Course Stats */}
                  <div style={{
                    background: 'white', borderRadius: 16, padding: 24,
                    border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                      background: 'linear-gradient(135deg, #667eea20, #764ba220)',
                      borderRadius: 10, marginBottom: 20
                    }}>
                      <BookOpen size={18} style={{ color: '#667eea' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>Course Overview</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Active</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{selectedTeacher.activeCourses}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>{selectedTeacher.totalCourses}</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Student Detail Modal ── */}
        {selectedStudent && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: 20
          }} onClick={() => setSelectedStudent(null)}>
            <div style={{
              background: 'white', borderRadius: 24, maxWidth: 1100, width: '100%',
              maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex', flexDirection: 'column'
            }} onClick={(e) => e.stopPropagation()}>
              
              {/* Header with Gradient Background */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '32px 40px', color: 'white', position: 'relative'
              }}>
                <button onClick={() => setSelectedStudent(null)} style={{
                  position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)',
                  border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%',
                  cursor: 'pointer', fontSize: 20, fontWeight: 600, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s'
                }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                   onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}>×</button>
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, fontWeight: 700, border: '3px solid rgba(255,255,255,0.3)'
                  }}>
                    {selectedStudent.studentName.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                      {selectedStudent.studentName}
                    </h2>
                    <div style={{ fontSize: 15, opacity: 0.95, marginBottom: 12 }}>
                      {selectedStudent.studentEmail}
                    </div>
                    <div style={{
                      display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, opacity: 0.9
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20 }}>
                        <Building2 size={14} /> {selectedStudent.collegeName}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20 }}>
                        <Globe2 size={14} /> {selectedStudent.city}, {selectedStudent.state}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20 }}>
                        <GraduationCap size={14} /> Year {selectedStudent.currentYear}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div style={{ padding: '32px 40px', overflow: 'auto', flex: 1 }}>
                
                {/* Key Metrics - Horizontal Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 16, padding: 24, color: 'white', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                      <BookOpen size={80} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginBottom: 8 }}>COMPLETION RATE</div>
                    <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
                      {selectedStudent.academicProgress.completionRate}%
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      {selectedStudent.academicProgress.completedCourses} of {selectedStudent.academicProgress.totalCourses} courses completed
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: 16, padding: 24, color: 'white', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                      <Zap size={80} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginBottom: 8 }}>PRACTICE ACCURACY</div>
                    <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
                      {selectedStudent.practiceStats.accuracy}%
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      {selectedStudent.practiceStats.correctAnswers} of {selectedStudent.practiceStats.totalQuestions} correct
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    borderRadius: 16, padding: 24, color: 'white', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                      <Trophy size={80} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginBottom: 8 }}>TEST AVERAGE</div>
                    <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
                      {selectedStudent.testPerformance.avgScore}%
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      {selectedStudent.testPerformance.testsCompleted} tests completed
                    </div>
                  </div>
                </div>

                {/* Detailed Stats - Modern Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                  
                  {/* Academic Progress */}
                  <div style={{
                    background: 'linear-gradient(to bottom, #f8f9fa, white)',
                    borderRadius: 16, padding: 28, border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                      }}>
                        <BookOpen size={24} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#212529' }}>Academic Progress</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', borderRadius: 10, border: '1px solid #e9ecef' }}>
                        <span style={{ fontSize: 14, color: '#6c757d', fontWeight: 500 }}>Total Courses</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#212529' }}>{selectedStudent.academicProgress.totalCourses}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#d1fae5', borderRadius: 10, border: '1px solid #a7f3d0' }}>
                        <span style={{ fontSize: 14, color: '#065f46', fontWeight: 500 }}>Completed</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#047857' }}>{selectedStudent.academicProgress.completedCourses}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fef3c7', borderRadius: 10, border: '1px solid #fcd34d' }}>
                        <span style={{ fontSize: 14, color: '#92400e', fontWeight: 500 }}>In Progress</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#d97706' }}>{selectedStudent.academicProgress.inProgressCourses}</span>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Overall Progress</div>
                        <ProgressBar value={selectedStudent.academicProgress.completionRate} color={getPerformanceColor(selectedStudent.academicProgress.completionRate)} height={10} />
                      </div>
                    </div>
                  </div>

                  {/* Practice Statistics */}
                  <div style={{
                    background: 'linear-gradient(to bottom, #f8f9fa, white)',
                    borderRadius: 16, padding: 28, border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                      }}>
                        <Zap size={24} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#212529' }}>Practice Statistics</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Sessions', value: selectedStudent.practiceStats.totalPracticeSessions },
                        { label: 'Questions', value: selectedStudent.practiceStats.totalQuestions },
                        { label: 'Correct', value: selectedStudent.practiceStats.correctAnswers, highlight: true },
                        { label: 'Time Spent', value: `${Math.round(selectedStudent.practiceStats.totalTimeSpent / 3600 * 10) / 10}h` },
                      ].map((item, i) => (
                        <div key={i} style={{
                          padding: '14px', background: item.highlight ? '#d1fae5' : 'white',
                          borderRadius: 10, border: `1px solid ${item.highlight ? '#a7f3d0' : '#e9ecef'}`,
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: item.highlight ? '#047857' : '#212529', marginBottom: 4 }}>
                            {item.value}
                          </div>
                          <div style={{ fontSize: 12, color: item.highlight ? '#065f46' : '#6c757d', fontWeight: 500 }}>
                            {item.label}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 16, padding: '12px 16px', background: 'white', borderRadius: 10, border: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#6c757d', fontWeight: 500 }}>Avg Session</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#212529' }}>{Math.round(selectedStudent.practiceStats.avgSessionDuration / 60)} min</span>
                    </div>
                  </div>

                  {/* Test Performance */}
                  <div style={{
                    background: 'linear-gradient(to bottom, #f8f9fa, white)',
                    borderRadius: 16, padding: 28, border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                      }}>
                        <Trophy size={24} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#212529' }}>Test Performance</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1, padding: '14px', background: 'white', borderRadius: 10, border: '1px solid #e9ecef', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: '#212529', marginBottom: 4 }}>{selectedStudent.testPerformance.testsAttempted}</div>
                          <div style={{ fontSize: 12, color: '#6c757d', fontWeight: 500 }}>Attempted</div>
                        </div>
                        <div style={{ flex: 1, padding: '14px', background: '#d1fae5', borderRadius: 10, border: '1px solid #a7f3d0', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: '#047857', marginBottom: 4 }}>{selectedStudent.testPerformance.testsCompleted}</div>
                          <div style={{ fontSize: 12, color: '#065f46', fontWeight: 500 }}>Completed</div>
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)', borderRadius: 10, border: '1px solid #c7d2fe' }}>
                        <div style={{ fontSize: 13, color: '#4338ca', marginBottom: 6, fontWeight: 600 }}>Average Score</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#4f46e5' }}>{selectedStudent.testPerformance.avgScore}%</div>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1, padding: '12px', background: 'white', borderRadius: 10, border: '1px solid #e9ecef' }}>
                          <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4, fontWeight: 600 }}>HIGHEST</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>{selectedStudent.testPerformance.highestScore}%</div>
                        </div>
                        <div style={{ flex: 1, padding: '12px', background: 'white', borderRadius: 10, border: '1px solid #e9ecef' }}>
                          <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4, fontWeight: 600 }}>LOWEST</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>{selectedStudent.testPerformance.lowestScore}%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div style={{
                    background: 'linear-gradient(to bottom, #f8f9fa, white)',
                    borderRadius: 16, padding: 28, border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                      }}>
                        <Clock size={24} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#212529' }}>Recent Activity</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ padding: '16px', background: 'white', borderRadius: 10, border: '1px solid #e9ecef' }}>
                        <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 6, fontWeight: 600 }}>Last Login</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#212529' }}>
                          {selectedStudent.recentActivity.lastLoginAt
                            ? new Date(selectedStudent.recentActivity.lastLoginAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Never'}
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'white', borderRadius: 10, border: '1px solid #e9ecef' }}>
                        <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 6, fontWeight: 600 }}>Last Activity</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#212529' }}>
                          {selectedStudent.recentActivity.lastActivityAt
                            ? new Date(selectedStudent.recentActivity.lastActivityAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Never'}
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', borderRadius: 10, border: '1px solid #fed6e3', textAlign: 'center' }}>
                        <div style={{ fontSize: 13, color: '#6b21a8', marginBottom: 6, fontWeight: 600 }}>Days Active</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#7c3aed' }}>{selectedStudent.recentActivity.daysActive}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Export Preview Modal ── */}
        {showPreview && previewData && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: 20
          }} onClick={() => setShowPreview(false)}>
            <div className="bo-card" style={{
              maxWidth: 1200, width: '100%', maxHeight: '90vh', overflow: 'auto'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '2px solid var(--bo-border)', paddingBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Export Preview</h2>
                  <div style={{ fontSize: 14, color: 'var(--bo-text-muted)', marginTop: 4 }}>
                    {previewData.fullRows.length} records ready to export
                    {stateFilter && ` • Filtered by State: ${stateFilter}`}
                    {cityFilter && ` • City: ${cityFilter}`}
                    {collegeFilter && ` • Specific College`}
                  </div>
                </div>
                <button onClick={() => setShowPreview(false)} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--bo-text-muted)'
                }}>×</button>
              </div>

              <div style={{ marginBottom: 20, padding: 12, background: '#FEF3C7', borderRadius: 8, border: '1px solid #FCD34D' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <AlertTriangle size={16} style={{ color: '#F59E0B' }} />
                  <span style={{ fontWeight: 500 }}>Showing first 10 rows as preview. All {previewData.fullRows.length} records will be exported.</span>
                </div>
              </div>

              <div style={{ overflow: 'auto', maxHeight: '50vh', marginBottom: 20, border: '1px solid var(--bo-border)', borderRadius: 8 }}>
                <table className="bo-table" style={{ fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bo-bg)', zIndex: 1 }}>
                    <tr>
                      {previewData.headers.map((h, i) => (
                        <th key={i} style={{ fontSize: 11, padding: 8, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell: any, j: number) => (
                          <td key={j} style={{ fontSize: 11, padding: 8, whiteSpace: 'nowrap' }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  className="bo-btn"
                  onClick={() => setShowPreview(false)}
                  style={{ background: '#F3F4F6', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  className="bo-btn bo-btn-primary"
                  onClick={confirmExport}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Download size={16} />
                  Download CSV ({previewData.fullRows.length} records)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AnalyticsDashboard;