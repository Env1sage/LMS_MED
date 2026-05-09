import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { 
  BookOpen, Calendar, BarChart3, FileText, Target, 
  Library, Award, Clock, TrendingUp, Play, CheckCircle,
  AlertCircle, User, LogOut, Bell
} from 'lucide-react';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

interface DashboardData {
  student: {
    id: number;
    fullName: string;
    email: string;
    studentId: string;
    semester?: string;
  };
  progressSummary: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    averageProgress: number;
    totalStudyHours: number;
  };
  todaysAgenda: Array<{
    type: string;
    title: string;
    time?: string;
    courseName?: string;
    testId?: number;
  }>;
  courses: Array<{
    id: number;
    title: string;
    code: string;
    facultyName: string;
    progress: number;
    totalLessons: number;
    completedLessons: number;
  }>;
}

interface Test {
  id: number;
  title: string;
  type: string;
  courseName: string;
  totalQuestions: number;
  duration: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  status: string;
  attemptStatus?: string;
  score?: number;
  percentage?: number;
}

type ActiveTab = 'dashboard' | 'courses' | 'tests' | 'library' | 'analytics';

const StudentPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get('/student-portal/dashboard');
      setDashboardData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTests = useCallback(async () => {
    try {
      const response = await apiService.get('/student-portal/tests');
      setTests(response.data || []);
    } catch (err) {
      console.error('Failed to fetch tests:', err);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeTab === 'tests') {
      fetchTests();
    }
  }, [activeTab, fetchTests]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="bo-page">
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
          <div className="loading-title">Loading Dashboard</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bo-page">
        <div style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--bo-card-bg)', borderRadius: 'var(--bo-radius-lg)', margin: '20px', boxShadow: 'var(--bo-shadow)' }}>
          <AlertCircle size={48} color="var(--bo-danger)" style={{ marginBottom: 16 }} />
          <h2 style={{ color: 'var(--bo-text-primary)', marginBottom: 10, fontSize: 20, fontWeight: 700 }}>Unable to Load Dashboard</h2>
          <p style={{ color: 'var(--bo-text-muted)', marginBottom: 20, fontSize: 14 }}>{error}</p>
          <button className="bo-btn bo-btn-primary" onClick={fetchDashboardData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <>
      {/* Stats Overview */}
      <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
        <div className="bo-stat-card">
          <div className="bo-stat-icon green">
            <BookOpen size={22} />
          </div>
          <div className="bo-stat-value">{dashboardData?.progressSummary.totalCourses || 0}</div>
          <div className="bo-stat-label">My Courses</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon blue">
            <CheckCircle size={22} />
          </div>
          <div className="bo-stat-value">{dashboardData?.progressSummary.completedCourses || 0}</div>
          <div className="bo-stat-label">Completed</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon purple">
            <Play size={22} />
          </div>
          <div className="bo-stat-value">{dashboardData?.progressSummary.inProgressCourses || 0}</div>
          <div className="bo-stat-label">In Progress</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon orange">
            <Clock size={22} />
          </div>
          <div className="bo-stat-value">{dashboardData?.progressSummary.totalStudyHours || 0}h</div>
          <div className="bo-stat-label">Study Hours</div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bo-card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={20} /> Overall Progress
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                stroke="var(--bo-border-light)"
                strokeWidth="12"
              />
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                stroke="var(--bo-accent)"
                strokeWidth="12"
                strokeDasharray={`${(dashboardData?.progressSummary.averageProgress || 0) * 3.77} 377`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--bo-accent)' }}>
                {dashboardData?.progressSummary.averageProgress || 0}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Complete</div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
                {dashboardData?.progressSummary.totalCourses || 0}
              </div>
              <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginTop: 4 }}>Total Courses</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-success)' }}>
                {dashboardData?.progressSummary.completedCourses || 0}
              </div>
              <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginTop: 4 }}>Completed</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-info)' }}>
                {dashboardData?.progressSummary.inProgressCourses || 0}
              </div>
              <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginTop: 4 }}>In Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Agenda */}
      {dashboardData?.todaysAgenda && dashboardData.todaysAgenda.length > 0 && (
        <div className="bo-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} /> Today's Agenda
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dashboardData.todaysAgenda.map((item, idx) => (
              <div 
                key={idx}
                style={{
                  padding: 16,
                  background: item.type === 'TEST' ? 'var(--bo-danger-light)' : 'var(--bo-bg)',
                  borderRadius: 'var(--bo-radius)',
                  border: `1px solid ${item.type === 'TEST' ? '#fca5a5' : 'var(--bo-border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16
                }}
              >
                <div style={{ minWidth: 70, fontWeight: 600, color: 'var(--bo-accent)', fontSize: 13 }}>
                  {item.time || 'All Day'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 2 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
                    {item.courseName}
                  </div>
                </div>
                {item.type === 'TEST' && item.testId && (
                  <button 
                    className="bo-btn bo-btn-primary"
                    onClick={() => navigate(`/student/tests/${item.testId}`)}
                    style={{ padding: '8px 16px', fontSize: 13 }}
                  >
                    Start Test
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Courses */}
      <div className="bo-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} /> My Courses
          </h3>
          <button className="bo-btn bo-btn-outline" onClick={() => setActiveTab('courses')} style={{ padding: '6px 12px', fontSize: 13 }}>
            View All
          </button>
        </div>
        
        {dashboardData?.courses && dashboardData.courses.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {dashboardData.courses.slice(0, 4).map((course) => (
              <div 
                key={course.id}
                className="bo-card"
                style={{ 
                  padding: 20, 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid var(--bo-border)'
                }}
                onClick={() => navigate(`/student/courses/${course.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--bo-shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--bo-shadow-sm)';
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>
                    {course.title}
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', margin: 0 }}>
                    {course.code}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginTop: 4, margin: 0 }}>
                    👨‍🏫 {course.facultyName}
                  </p>
                </div>
                
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 8 }}>
                    <span>{course.progress}% Complete</span>
                    <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bo-border-light)', borderRadius: 3, overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        background: 'linear-gradient(90deg, var(--bo-accent), var(--bo-info))', 
                        width: `${course.progress}%`,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--bo-text-muted)' }}>
            <BookOpen size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p style={{ margin: 0 }}>No courses assigned yet</p>
          </div>
        )}
      </div>
    </>
  );

  const renderCourses = () => (
    <div className="bo-card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>All My Courses</h3>
      {dashboardData?.courses && dashboardData.courses.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {dashboardData.courses.map((course) => (
            <div 
              key={course.id}
              className="bo-card"
              style={{ padding: 20, cursor: 'pointer', border: '1px solid var(--bo-border)' }}
              onClick={() => navigate(`/student/courses/${course.id}`)}
            >
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{course.title}</h4>
              <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 4 }}>{course.code}</p>
              <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: 12 }}>👨‍🏫 {course.facultyName}</p>
              <div style={{ height: 6, background: 'var(--bo-border-light)', borderRadius: 3, marginBottom: 8 }}>
                <div style={{ height: '100%', background: 'var(--bo-accent)', width: `${course.progress}%`, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                {course.progress}% • {course.completedLessons}/{course.totalLessons} lessons
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--bo-text-muted)' }}>
          <BookOpen size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p>No courses available</p>
        </div>
      )}
    </div>
  );

  const renderTests = () => (
    <div className="bo-card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>My Tests & Assessments</h3>
      {tests.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tests.map((test) => (
            <div 
              key={test.id}
              style={{
                padding: 20,
                background: 'var(--bo-bg)',
                borderRadius: 'var(--bo-radius)',
                border: '1px solid var(--bo-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{test.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 4 }}>{test.courseName}</p>
                <div style={{ fontSize: 12, color: 'var(--bo-text-secondary)' }}>
                  {test.totalQuestions} questions • {test.duration} minutes
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {test.attemptStatus === 'COMPLETED' ? (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--bo-success)' }}>
                      {test.percentage?.toFixed(0)}%
                    </div>
                    <button 
                      className="bo-btn bo-btn-outline" 
                      onClick={() => navigate(`/student/tests/${test.id}/results`)}
                      style={{ padding: '6px 12px', fontSize: 13, marginTop: 8 }}
                    >
                      View Results
                    </button>
                  </div>
                ) : (
                  <button 
                    className="bo-btn bo-btn-primary"
                    onClick={() => navigate(`/student/tests/${test.id}`)}
                    style={{ padding: '8px 16px' }}
                  >
                    Start Test
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--bo-text-muted)' }}>
          <FileText size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p>No tests available</p>
        </div>
      )}
    </div>
  );

  const renderLibrary = () => (
    <div className="bo-card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Library size={20} /> My Library
      </h3>
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--bo-text-muted)' }}>
        <Library size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
        <p>Library content will be displayed here</p>
        <button 
          className="bo-btn bo-btn-primary" 
          onClick={() => navigate('/student/self-paced')}
          style={{ marginTop: 16 }}
        >
          Browse Self-Paced Content
        </button>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="bo-card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart3 size={20} /> Performance Analytics
      </h3>
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--bo-text-muted)' }}>
        <BarChart3 size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
        <p>Analytics and performance data will be displayed here</p>
      </div>
    </div>
  );

  return (
    <div className="bo-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div className="bo-card" style={{ padding: '20px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ 
              width: 48, 
              height: 48, 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--bo-accent), #8B5CF6)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontSize: 18, 
              fontWeight: 700 
            }}>
              {getInitials(dashboardData?.student.fullName || user?.fullName || 'Student')}
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>
                Welcome back, {(dashboardData?.student.fullName || user?.fullName || 'Student').split(' ')[0]}!
              </h1>
              <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', margin: '4px 0 0 0' }}>
                {dashboardData?.student.studentId || 'Student'} • {dashboardData?.student.semester || 'Semester'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="bo-btn bo-btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}>
              <Bell size={16} />
            </button>
            <button className="bo-btn bo-btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}>
              <User size={16} /> Profile
            </button>
            <button className="bo-btn bo-btn-secondary" onClick={handleLogout} style={{ padding: '8px 16px', fontSize: 13 }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="bo-card" style={{ padding: 12, marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
            { key: 'courses', label: 'My Courses', icon: <BookOpen size={16} /> },
            { key: 'tests', label: 'Tests', icon: <FileText size={16} /> },
            { key: 'library', label: 'Library', icon: <Library size={16} /> },
            { key: 'analytics', label: 'Analytics', icon: <TrendingUp size={16} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as ActiveTab)}
              style={{
                padding: '10px 18px',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 'var(--bo-radius-sm)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: activeTab === tab.key ? 'var(--bo-accent-light)' : 'transparent',
                color: activeTab === tab.key ? 'var(--bo-accent)' : 'var(--bo-text-secondary)',
                transition: 'var(--bo-transition)'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'courses' && renderCourses()}
        {activeTab === 'tests' && renderTests()}
        {activeTab === 'library' && renderLibrary()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
};

export default StudentPortal;
