import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import ProfileModal from '../components/common/ProfileModal';
import RatingForm from '../components/RatingForm';
import { RatingType } from '../services/ratings.service';
import { NotificationBell } from '../components/notifications';
import '../styles/StudentPortal.css';

// Icons - using emoji for simplicity
const Icons = {
  dashboard: '🏠',
  tests: '📝',
  practice: '🎯',
  library: '📚',
  analytics: '📊',
  calendar: '📅',
  notification: '🔔',
  play: '▶️',
  check: '✓',
  clock: '⏰',
  star: '⭐',
  book: '📖',
  video: '🎬',
  arrow: '→',
  up: '↑',
  down: '↓',
  chart: '📈',
};

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
    deadline?: string;
    testId?: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  notifications: Array<{
    id: number;
    type: string;
    title: string;
    message: string;
    priority: string;
    createdAt: string;
    isRead: boolean;
  }>;
  courses: Array<{
    id: number;
    title: string;
    code: string;
    facultyId: string;
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
  courseCode: string;
  totalQuestions: number;
  duration: number;
  totalMarks: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  status: string;
  attemptStatus?: string;
  score?: number;
  percentage?: number;
}

type ActiveTab = 'dashboard' | 'tests' | 'practice' | 'library' | 'analytics' | 'schedule' | 'self-paced' | 'assignments';

// Library item interface for API response
interface LibraryItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  topic: string;
  duration: number | null;
  thumbnail: string | null;
  courseTitle: string;
  courseId: string;
  type: 'ebook' | 'video' | 'interactive';
}

interface LibraryData {
  totalItems: number;
  ebooks: LibraryItem[];
  videos: LibraryItem[];
  interactives: LibraryItem[];
}

// Helper to get display info for library items
const getLibraryItemDisplay = (item: LibraryItem, type: 'ebook' | 'video' | 'interactive') => {
  const colors = {
    ebook: 'linear-gradient(135deg, #10b981, #059669)',
    video: 'linear-gradient(135deg, #ef4444, #dc2626)',
    interactive: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  };
  const icons = {
    ebook: '📖',
    video: '🎬',
    interactive: '🧬',
  };
  return {
    ...item,
    type,
    icon: icons[type],
    bgColor: colors[type],
    format: type === 'ebook' ? 'PDF' : '',
    durationDisplay: item.duration ? `${item.duration} mins` : '',
  };
};

const StudentPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [testTab, setTestTab] = useState<'active' | 'upcoming' | 'completed' | 'to-complete' | 'deadline'>('to-complete');
  const [error, setError] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'ebook' | 'video' | 'interactive'>('all');
  const [libraryTab, setLibraryTab] = useState<'enrolled' | 'purchased'>('enrolled');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [libraryData, setLibraryData] = useState<LibraryData | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  
  // Assignments state
  const [assignmentsTab, setAssignmentsTab] = useState<'pending' | 'completed'>('pending');
  
  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{
    entityId: string;
    entityName: string;
    ratingType: RatingType;
  } | null>(null);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [scheduleEvents, setScheduleEvents] = useState<Array<{
    id: string;
    title: string;
    type: string;
    startTime: string;
    endTime?: string;
  }>>([]);

  useEffect(() => {
    fetchDashboardData();
    fetchSchedule();
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [calendarMonth]);

  useEffect(() => {
    if (activeTab === 'tests') {
      fetchMyTests();
    }
    if (activeTab === 'library') {
      fetchMyLibrary();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/student-portal/dashboard');
      setDashboardData(response.data);
    } catch (err: any) {
      console.error('Error fetching dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      const startDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
      const endDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
      const response = await apiService.get('/student-portal/schedule', {
        params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
      });
      setScheduleEvents(response.data.schedule || []);
    } catch (err) {
      console.error('Error fetching schedule:', err);
    }
  };

  const fetchMyTests = async () => {
    try {
      const response = await apiService.get('/student-portal/tests');
      setTests(response.data);
    } catch (err: any) {
      console.error('Error fetching tests:', err);
    }
  };

  const fetchMyLibrary = async () => {
    try {
      setLibraryLoading(true);
      const response = await apiService.get('/student-portal/library');
      setLibraryData(response.data);
    } catch (err: any) {
      console.error('Error fetching library:', err);
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleStartTest = (testId: number) => {
    navigate(`/student/tests/${testId}`);
  };

  const handleViewCourse = (courseId: number) => {
    navigate(`/student/courses/${courseId}`);
  };

  // Rating handlers
  const handleOpenRating = (entityId: string, entityName: string, ratingType: RatingType) => {
    setRatingTarget({ entityId, entityName, ratingType });
    setShowRatingModal(true);
  };

  const handleRatingSuccess = () => {
    setShowRatingModal(false);
    setRatingTarget(null);
    // Optionally refresh data to show updated ratings
    fetchDashboardData();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getTestsByStatus = (status: 'active' | 'upcoming' | 'completed' | 'to-complete' | 'deadline') => {
    let filteredTests = tests.filter(test => {
      if (status === 'active') return test.status === 'ACTIVE';
      if (status === 'upcoming') return test.status === 'SCHEDULED';
      if (status === 'completed') return test.attemptStatus === 'GRADED' || test.attemptStatus === 'SUBMITTED';
      if (status === 'to-complete') return test.status === 'ACTIVE' || test.status === 'SCHEDULED';
      if (status === 'deadline') return test.status === 'ACTIVE' || test.status === 'SCHEDULED';
      return false;
    });
    
    // Sort by deadline if deadline tab is selected
    if (status === 'deadline') {
      filteredTests.sort((a, b) => {
        const deadlineA = a.scheduledEnd ? new Date(a.scheduledEnd).getTime() : Infinity;
        const deadlineB = b.scheduledEnd ? new Date(b.scheduledEnd).getTime() : Infinity;
        return deadlineA - deadlineB;
      });
    }
    
    return filteredTests;
  };

  if (loading) {
    return (
      <div className="student-portal">
        <div className="student-portal-container">
          <div className="loading-state" style={{ textAlign: 'center', padding: '100px 0' }}>
            <div className="loading-spinner" style={{ 
              width: '50px', 
              height: '50px', 
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <p style={{ color: '#64748b' }}>Loading your dashboard...</p>
          </div>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-portal">
        <div className="student-portal-container">
          <div className="error-state" style={{ 
            textAlign: 'center', 
            padding: '100px 0',
            background: '#fff',
            borderRadius: '16px',
            margin: '20px'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>😕</div>
            <h2 style={{ color: '#0f172a', marginBottom: '10px' }}>Oops! Something went wrong</h2>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>{error}</p>
            <button className="btn btn-primary" onClick={fetchDashboardData}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <>
      {/* Progress Overview */}
      <div className="progress-overview">
        <h2>{Icons.chart} My Progress</h2>
        <div className="overall-progress">
          <div className="progress-circle">
            <svg width="120" height="120">
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <circle className="progress-circle-bg" cx="60" cy="60" r="52" />
              <circle
                className="progress-circle-fill"
                cx="60"
                cy="60"
                r="52"
                strokeDasharray={`${(dashboardData?.progressSummary.averageProgress || 0) * 3.27} 327`}
              />
            </svg>
            <div className="progress-circle-text">
              <div className="progress-circle-value">{dashboardData?.progressSummary.averageProgress || 0}%</div>
              <div className="progress-circle-label">Overall</div>
            </div>
          </div>
          <div className="progress-details">
            <div className="progress-detail-item">
              <div className="progress-detail-value">{dashboardData?.progressSummary.totalCourses || 0}</div>
              <div className="progress-detail-label">Total Courses</div>
            </div>
            <div className="progress-detail-item">
              <div className="progress-detail-value">{dashboardData?.progressSummary.completedCourses || 0}</div>
              <div className="progress-detail-label">Completed</div>
            </div>
            <div className="progress-detail-item">
              <div className="progress-detail-value">{dashboardData?.progressSummary.inProgressCourses || 0}</div>
              <div className="progress-detail-label">In Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Agenda */}
      <div className="agenda-section">
        <div className="agenda-header">
          <h2>{Icons.calendar} Today's Agenda</h2>
          <span className="agenda-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="agenda-items">
          {dashboardData?.todaysAgenda && Array.isArray(dashboardData.todaysAgenda) && dashboardData.todaysAgenda.length > 0 ? (
            dashboardData.todaysAgenda.map((item, index) => (
              <div key={index} className={`agenda-item ${item.type === 'TEST' ? 'urgent' : ''}`}>
                <span className="agenda-item-time">{item.time || 'All Day'}</span>
                <div className="agenda-item-content">
                  <div className="agenda-item-title">{item.title}</div>
                  <div className="agenda-item-subtitle">{item.courseName}</div>
                </div>
                {item.type === 'TEST' && item.testId && (
                  <button className="btn btn-sm btn-primary" onClick={() => handleStartTest(item.testId!)}>
                    Start {Icons.arrow}
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon">{Icons.check}</div>
              <h3>All caught up!</h3>
              <p>No scheduled activities for today</p>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Grid - Stats */}
      <div className="dashboard-grid">
        <div className="stat-card success">
          <div className="stat-card-header">
            <div className="stat-card-icon">{Icons.check}</div>
          </div>
          <div className="stat-card-value">{dashboardData?.progressSummary.completedCourses || 0}</div>
          <div className="stat-card-label">Courses Completed</div>
          <div className="stat-card-trend up">{Icons.up} Keep it up!</div>
        </div>
        <div className="stat-card info">
          <div className="stat-card-header">
            <div className="stat-card-icon">{Icons.play}</div>
          </div>
          <div className="stat-card-value">{dashboardData?.progressSummary.inProgressCourses || 0}</div>
          <div className="stat-card-label">Courses In Progress</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-card-header">
            <div className="stat-card-icon">{Icons.clock}</div>
          </div>
          <div className="stat-card-value">{dashboardData?.progressSummary.totalStudyHours || 0}</div>
          <div className="stat-card-label">Study Hours</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-card-header">
            <div className="stat-card-icon">{Icons.tests}</div>
          </div>
          <div className="stat-card-value">{dashboardData && Array.isArray(dashboardData.todaysAgenda) ? dashboardData.todaysAgenda.filter(a => a.type === 'TEST').length : 0}</div>
          <div className="stat-card-label">Pending Tests</div>
        </div>
      </div>

      {/* My Courses */}
      <div className="courses-section">
        <div className="section-header">
          <h2>{Icons.book} My Courses</h2>
          <a href="#" className="view-all" onClick={(e) => { e.preventDefault(); }}>
            View All {Icons.arrow}
          </a>
        </div>
        <div className="courses-grid">
          {dashboardData?.courses && dashboardData.courses.length > 0 ? (
            dashboardData.courses.slice(0, 4).map((course) => (
              <div key={course.id} className="course-card">
                <div className="course-card-header">
                  <h3>{course.title}</h3>
                  <p>{course.code}</p>
                  {course.facultyName && (
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                      👨‍🏫 {course.facultyName}
                    </p>
                  )}
                </div>
                <div className="course-card-body">
                  <div className="course-progress">
                    <div className="course-progress-bar">
                      <div 
                        className="course-progress-fill" 
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <div className="course-progress-text">
                      <span>{course.progress}% Complete</span>
                      <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                    </div>
                  </div>
                  <div className="course-card-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleViewCourse(course.id)}
                    >
                      {course.progress > 0 ? 'Continue' : 'Start'} {Icons.arrow}
                    </button>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => handleOpenRating(String(course.id), course.title, RatingType.COURSE)}
                      title="Rate this course"
                    >
                      {Icons.star} Course
                    </button>
                    {course.facultyId && (
                      <button 
                        className="btn btn-outline-secondary"
                        onClick={() => handleOpenRating(course.facultyId, course.facultyName || 'Teacher', RatingType.TEACHER)}
                        title="Rate this teacher"
                      >
                        👨‍🏫 Teacher
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '60px 0' }}>
              <div className="empty-state-icon">{Icons.book}</div>
              <h3>No courses assigned yet</h3>
              <p>Your faculty will assign courses to you soon.</p>
            </div>
          )}
        </div>
      </div>

      {/* Calendar & Notifications Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px' }}>
        {/* Calendar */}
        <div className="calendar-section">
          <div className="calendar-header">
            <h2>{Icons.calendar} Academic Calendar</h2>
            <div className="calendar-nav">
              <button 
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                style={{ padding: '4px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >{'<'}</button>
              <h3 style={{ margin: '0 12px', fontSize: '1rem', fontWeight: '600' }}>
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button 
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                style={{ padding: '4px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >{'>'}</button>
            </div>
          </div>
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}
            {Array.from({ length: 35 }, (_, i) => {
              const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
              const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
              const day = i - firstDayOfMonth + 1;
              const isValidDay = day > 0 && day <= daysInMonth;
              const today = new Date();
              const isToday = isValidDay && 
                day === today.getDate() && 
                calendarMonth.getMonth() === today.getMonth() && 
                calendarMonth.getFullYear() === today.getFullYear();
              
              // Check if this day has any events
              const dayEvents = scheduleEvents.filter(event => {
                const eventDate = new Date(event.startTime);
                return eventDate.getDate() === day && 
                       eventDate.getMonth() === calendarMonth.getMonth() &&
                       eventDate.getFullYear() === calendarMonth.getFullYear();
              });
              const hasEvent = dayEvents.length > 0;
              
              return (
                <div 
                  key={i} 
                  className={`calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`}
                  title={hasEvent ? dayEvents.map(e => e.title).join(', ') : ''}
                >
                  {isValidDay && <span className="calendar-day-number">{day}</span>}
                </div>
              );
            })}
          </div>
          {/* Upcoming Events List */}
          {scheduleEvents.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#475569' }}>Upcoming Events</h4>
              {scheduleEvents.slice(0, 3).map(event => (
                <div key={event.id} style={{ 
                  padding: '8px', 
                  marginBottom: '6px', 
                  background: 'white', 
                  borderRadius: '6px',
                  borderLeft: `3px solid ${event.type === 'TEST' ? '#ef4444' : '#3b82f6'}`,
                  fontSize: '0.85rem'
                }}>
                  <div style={{ fontWeight: 500, color: '#1e293b' }}>{event.title}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    {new Date(event.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements & Notifications */}
        <div className="notifications-section">
          <div className="section-header">
            <h2>{Icons.notification} Announcements</h2>
          </div>
          <div className="notifications-list">
            {dashboardData?.notifications && dashboardData.notifications.length > 0 ? (
              dashboardData.notifications.map((notification) => (
                <div key={notification.id} className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}>
                  <div className="notification-icon">
                    {notification.type === 'ANNOUNCEMENT' && '📢'}
                    {notification.type === 'REMINDER' && '⏰'}
                    {notification.type === 'ALERT' && '⚠️'}
                    {notification.type === 'INFO' && 'ℹ️'}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {new Date(notification.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  {notification.priority === 'HIGH' && (
                    <span className="notification-badge urgent">Urgent</span>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon">{Icons.notification}</div>
                <h3>No announcements</h3>
                <p>You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const renderTests = () => (
    <div className="tests-section">
      <div className="section-header">
        <h2>{Icons.tests} My Tests</h2>
      </div>

      <div className="tests-tabs">
        <button 
          className={`test-tab ${testTab === 'to-complete' ? 'active' : ''}`}
          onClick={() => setTestTab('to-complete')}
        >
          📋 To Complete <span className="badge">{getTestsByStatus('to-complete').length}</span>
        </button>
        <button 
          className={`test-tab ${testTab === 'deadline' ? 'active' : ''}`}
          onClick={() => setTestTab('deadline')}
        >
          ⏰ By Deadline <span className="badge">{getTestsByStatus('deadline').length}</span>
        </button>
        <button 
          className={`test-tab ${testTab === 'active' ? 'active' : ''}`}
          onClick={() => setTestTab('active')}
        >
          Active <span className="badge">{getTestsByStatus('active').length}</span>
        </button>
        <button 
          className={`test-tab ${testTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setTestTab('upcoming')}
        >
          Upcoming <span className="badge">{getTestsByStatus('upcoming').length}</span>
        </button>
        <button 
          className={`test-tab ${testTab === 'completed' ? 'active' : ''}`}
          onClick={() => setTestTab('completed')}
        >
          Completed <span className="badge">{getTestsByStatus('completed').length}</span>
        </button>
      </div>

      <div className="tests-list">
        {getTestsByStatus(testTab).length > 0 ? (
          getTestsByStatus(testTab).map((test) => (
            <div key={test.id} className={`test-card ${testTab === 'to-complete' || testTab === 'deadline' ? (test.status === 'ACTIVE' ? 'active' : 'upcoming') : testTab}`}>
              <div className={`test-icon ${test.status === 'ACTIVE' ? 'active' : test.status === 'SCHEDULED' ? 'upcoming' : 'completed'}`}>
                {test.status === 'ACTIVE' ? Icons.play : test.status === 'SCHEDULED' ? Icons.clock : Icons.check}
              </div>
              <div className="test-info">
                <h4>{test.title}</h4>
                <div className="test-meta">
                  <span className="test-meta-item">{Icons.book} {test.courseName}</span>
                  <span className="test-meta-item">{Icons.tests} {test.totalQuestions} Questions</span>
                  <span className="test-meta-item">{Icons.clock} {test.duration} mins</span>
                  <span className="test-meta-item">{Icons.star} {test.totalMarks} marks</span>
                </div>
                {testTab === 'deadline' && test.scheduledEnd && (
                  <div className="deadline-info">
                    ⏱️ Deadline: {formatDate(test.scheduledEnd)} at {formatTime(test.scheduledEnd)}
                  </div>
                )}
              </div>
              <div className="test-status">
                <span className={`test-status-badge ${test.status === 'ACTIVE' ? 'active' : test.status === 'SCHEDULED' ? 'upcoming' : 'completed'}`}>
                  {test.status === 'ACTIVE' ? 'Take Now' : test.status === 'SCHEDULED' ? 'Scheduled' : `${test.percentage || 0}%`}
                </span>
                {test.status === 'ACTIVE' && (
                  <button className="btn btn-sm btn-success" onClick={() => handleStartTest(test.id)}>
                    Start Test {Icons.arrow}
                  </button>
                )}
                {test.status === 'SCHEDULED' && test.scheduledStart && (
                  <span className="test-countdown">{formatDate(test.scheduledStart)}</span>
                )}
                {testTab === 'completed' && test.score !== undefined && (
                  <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/student/tests/${test.id}/results`)}>
                    View Results
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ padding: '60px 0' }}>
            <div className="empty-state-icon">
              {testTab === 'to-complete' ? '📋' : testTab === 'deadline' ? '⏰' : testTab === 'active' ? '📝' : testTab === 'upcoming' ? '📅' : '✅'}
            </div>
            <h3>{testTab === 'to-complete' ? 'No tests to complete' : testTab === 'deadline' ? 'No pending tests' : `No ${testTab} tests`}</h3>
            <p>
              {testTab === 'to-complete' 
                ? 'All caught up! No tests need your attention right now.'
                : testTab === 'deadline'
                ? 'No tests with upcoming deadlines'
                : testTab === 'active' 
                ? 'No tests are available to take right now' 
                : testTab === 'upcoming' 
                ? 'No upcoming tests scheduled'
                : 'You haven\'t completed any tests yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPractice = () => (
    <div className="tests-section">
      <div className="section-header">
        <h2>{Icons.practice} Practice Zone</h2>
      </div>
      <div className="empty-state" style={{ padding: '100px 0', background: '#fff', borderRadius: '16px' }}>
        <div className="empty-state-icon" style={{ fontSize: '4rem' }}>{Icons.practice}</div>
        <h3>Practice Mode Coming Soon!</h3>
        <p>Unlimited practice questions with instant feedback will be available here.</p>
      </div>
    </div>
  );

  const getFilteredLibraryItems = () => {
    if (!libraryData) return [];
    
    // Combine all library items with type info
    const allItems = [
      ...libraryData.ebooks.map(item => getLibraryItemDisplay(item, 'ebook')),
      ...libraryData.videos.map(item => getLibraryItemDisplay(item, 'video')),
      ...libraryData.interactives.map(item => getLibraryItemDisplay(item, 'interactive')),
    ];

    return allItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
                           (item.description || '').toLowerCase().includes(librarySearch.toLowerCase()) ||
                           (item.subject || '').toLowerCase().includes(librarySearch.toLowerCase()) ||
                           (item.topic || '').toLowerCase().includes(librarySearch.toLowerCase());
      const matchesFilter = libraryFilter === 'all' || item.type === libraryFilter;
      return matchesSearch && matchesFilter;
    });
  };

  const renderLibrary = () => {
    const filteredItems = getFilteredLibraryItems();
    const totalItems = libraryData?.totalItems || 0;
    
    if (libraryLoading) {
      return (
        <div className="tests-section">
          <div className="section-header">
            <h2>{Icons.library} My Library</h2>
          </div>
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40, border: '4px solid #e5e7eb', borderTop: '4px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p>Loading library content...</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="tests-section">
        <div className="section-header">
          <h2>{Icons.library} My Library</h2>
        </div>
        
        {/* Library Tabs - Enrolled vs Purchased */}
        <div className="library-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button 
            className={`library-tab-btn ${libraryTab === 'enrolled' ? 'active' : ''}`}
            onClick={() => setLibraryTab('enrolled')}
            style={{
              padding: '12px 24px',
              border: libraryTab === 'enrolled' ? '2px solid #6366f1' : '2px solid #e2e8f0',
              background: libraryTab === 'enrolled' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#fff',
              color: libraryTab === 'enrolled' ? '#fff' : '#475569',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            📚 Enrolled Content
            <span style={{
              background: libraryTab === 'enrolled' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.85rem'
            }}>{totalItems}</span>
          </button>
          <button 
            className={`library-tab-btn ${libraryTab === 'purchased' ? 'active' : ''}`}
            onClick={() => setLibraryTab('purchased')}
            style={{
              padding: '12px 24px',
              border: libraryTab === 'purchased' ? '2px solid #10b981' : '2px solid #e2e8f0',
              background: libraryTab === 'purchased' ? 'linear-gradient(135deg, #10b981, #059669)' : '#fff',
              color: libraryTab === 'purchased' ? '#fff' : '#475569',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            🛒 Purchased Content
            <span style={{
              background: libraryTab === 'purchased' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.85rem'
            }}>0</span>
          </button>
        </div>
        
        {libraryTab === 'enrolled' ? (
          <>
            {/* Search and Filter Bar */}
            <div className="library-search-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="library-search-input"
                  placeholder="Search by title, subject, or keyword..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                />
                {librarySearch && (
                  <button 
                    className="search-clear-btn"
                    onClick={() => setLibrarySearch('')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="library-filters">
                <button 
                  className={`filter-btn ${libraryFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setLibraryFilter('all')}
                >
                  All ({totalItems})
                </button>
                <button 
                  className={`filter-btn ${libraryFilter === 'ebook' ? 'active' : ''}`}
                  onClick={() => setLibraryFilter('ebook')}
                >
                  📖 E-Books ({libraryData?.ebooks.length || 0})
                </button>
                <button 
                  className={`filter-btn ${libraryFilter === 'video' ? 'active' : ''}`}
                  onClick={() => setLibraryFilter('video')}
                >
                  🎬 Videos ({libraryData?.videos.length || 0})
                </button>
                <button 
                  className={`filter-btn ${libraryFilter === 'interactive' ? 'active' : ''}`}
                  onClick={() => setLibraryFilter('interactive')}
                >
                  🧬 Interactive ({libraryData?.interactives.length || 0})
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div className="library-results-info">
              <span>Showing {filteredItems.length} of {totalItems} items</span>
              {librarySearch && <span className="search-term">for "{librarySearch}"</span>}
            </div>
            
            {filteredItems.length > 0 ? (
              <div className="library-grid">
                {filteredItems.map(item => (
                  <div className="library-card" key={item.id}>
                    <div className="library-card-thumbnail" style={{ background: item.bgColor }}>
                      {item.icon}
                    </div>
                    <div className="library-card-body">
                      <h4>{item.title}</h4>
                      <p>{item.description || `${item.subject} - ${item.topic}`}</p>
                      <div className="library-card-meta">
                        <span className={`library-type-badge ${item.type}`}>
                          {item.type === 'ebook' ? 'E-Book' : item.type === 'video' ? 'Video' : 'Interactive'}
                        </span>
                        <span>{item.format || item.durationDisplay}</span>
                      </div>
                      {item.courseTitle && (
                        <div className="library-card-course">
                          📚 {item.courseTitle}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : totalItems === 0 ? (
              <div className="empty-state" style={{ padding: '60px 0', background: '#fff', borderRadius: '16px', marginTop: '20px' }}>
                <div className="empty-state-icon" style={{ fontSize: '3rem' }}>📚</div>
                <h3>No Content Available</h3>
                <p>Your library is empty. Content will appear here when you're enrolled in courses.</p>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '60px 0', background: '#fff', borderRadius: '16px', marginTop: '20px' }}>
                <div className="empty-state-icon" style={{ fontSize: '3rem' }}>🔍</div>
                <h3>No Results Found</h3>
                <p>Try adjusting your search or filter to find what you're looking for.</p>
                <button 
                  className="btn-primary" 
                  style={{ marginTop: '16px' }}
                  onClick={() => { setLibrarySearch(''); setLibraryFilter('all'); }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state" style={{ padding: '80px 0', background: '#fff', borderRadius: '16px', marginTop: '20px' }}>
            <div className="empty-state-icon" style={{ fontSize: '4rem' }}>🛒</div>
            <h3>No Purchased Content Yet</h3>
            <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
              You haven't purchased any content yet. Visit the marketplace to explore and purchase learning materials.
            </p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '24px', padding: '12px 32px' }}
              onClick={() => navigate('/student/marketplace')}
            >
              🛍️ Browse Marketplace
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAnalytics = () => (
    <div className="analytics-section">
      <div className="analytics-card">
        <h3>{Icons.chart} Subject-wise Performance</h3>
        <div className="subject-performance-list">
          <div className="subject-item">
            <span className="subject-name">Anatomy</span>
            <div className="subject-bar">
              <div className="subject-bar-fill" style={{ width: '85%', background: 'linear-gradient(90deg, #10b981, #06b6d4)' }} />
            </div>
            <span className="subject-score">85%</span>
          </div>
          <div className="subject-item">
            <span className="subject-name">Physiology</span>
            <div className="subject-bar">
              <div className="subject-bar-fill" style={{ width: '72%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
            </div>
            <span className="subject-score">72%</span>
          </div>
          <div className="subject-item">
            <span className="subject-name">Biochemistry</span>
            <div className="subject-bar">
              <div className="subject-bar-fill" style={{ width: '68%', background: 'linear-gradient(90deg, #f59e0b, #f97316)' }} />
            </div>
            <span className="subject-score">68%</span>
          </div>
          <div className="subject-item">
            <span className="subject-name">Pharmacology</span>
            <div className="subject-bar">
              <div className="subject-bar-fill" style={{ width: '90%', background: 'linear-gradient(90deg, #10b981, #06b6d4)' }} />
            </div>
            <span className="subject-score">90%</span>
          </div>
        </div>
      </div>
      <div className="analytics-card">
        <h3>{Icons.star} Quick Stats</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
            <span style={{ color: '#64748b' }}>Tests Attempted</span>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>12</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
            <span style={{ color: '#64748b' }}>Average Score</span>
            <span style={{ fontWeight: '700', color: '#10b981' }}>78.5%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
            <span style={{ color: '#64748b' }}>Best Subject</span>
            <span style={{ fontWeight: '700', color: '#6366f1' }}>Pharmacology</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
            <span style={{ color: '#64748b' }}>Needs Improvement</span>
            <span style={{ fontWeight: '700', color: '#f59e0b' }}>Biochemistry</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="calendar-section">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button>{'<'}</button>
          <h3>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <button>{'>'}</button>
        </div>
      </div>
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        {Array.from({ length: 35 }, (_, i) => {
          const day = i - new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() + 1;
          const isToday = day === new Date().getDate() && day > 0 && day <= 31;
          const hasEvent = [5, 12, 18, 25].includes(day);
          return (
            <div 
              key={i} 
              className={`calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`}
            >
              {day > 0 && day <= 31 && <span className="calendar-day-number">{day}</span>}
            </div>
          );
        })}
      </div>
      
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Upcoming Events</h4>
        <div className="agenda-items">
          <div className="agenda-item">
            <span className="agenda-item-time">10:00</span>
            <div className="agenda-item-content">
              <div className="agenda-item-title">Anatomy Lecture</div>
              <div className="agenda-item-subtitle">Room 101</div>
            </div>
          </div>
          <div className="agenda-item urgent">
            <span className="agenda-item-time">14:00</span>
            <div className="agenda-item-content">
              <div className="agenda-item-title">Physiology Test</div>
              <div className="agenda-item-subtitle">Online - Duration: 60 mins</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Assignments renderer with Pending/Completed tabs
  const renderAssignments = () => {
    const pendingAssignments = dashboardData?.todaysAgenda?.filter(item => item.type === 'ASSIGNMENT' || item.type === 'TEST') || [];
    const completedAssignments = tests.filter(t => t.attemptStatus === 'SUBMITTED' || t.attemptStatus === 'GRADED');
    
    return (
      <div className="tests-section">
        <div className="section-header">
          <h2>📋 My Assignments</h2>
        </div>
        
        {/* Assignment Tabs */}
        <div className="assignments-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button 
            className={`assignment-tab-btn ${assignmentsTab === 'pending' ? 'active' : ''}`}
            onClick={() => setAssignmentsTab('pending')}
            style={{
              padding: '14px 28px',
              border: assignmentsTab === 'pending' ? '2px solid #f59e0b' : '2px solid #e2e8f0',
              background: assignmentsTab === 'pending' ? 'linear-gradient(135deg, #f59e0b, #f97316)' : '#fff',
              color: assignmentsTab === 'pending' ? '#fff' : '#475569',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s ease',
              fontSize: '1rem'
            }}
          >
            ⏳ Pending
            <span style={{
              background: assignmentsTab === 'pending' ? 'rgba(255,255,255,0.25)' : '#fef3c7',
              color: assignmentsTab === 'pending' ? '#fff' : '#92400e',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 700
            }}>{pendingAssignments.length}</span>
          </button>
          <button 
            className={`assignment-tab-btn ${assignmentsTab === 'completed' ? 'active' : ''}`}
            onClick={() => setAssignmentsTab('completed')}
            style={{
              padding: '14px 28px',
              border: assignmentsTab === 'completed' ? '2px solid #10b981' : '2px solid #e2e8f0',
              background: assignmentsTab === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : '#fff',
              color: assignmentsTab === 'completed' ? '#fff' : '#475569',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s ease',
              fontSize: '1rem'
            }}
          >
            ✅ Completed
            <span style={{
              background: assignmentsTab === 'completed' ? 'rgba(255,255,255,0.25)' : '#d1fae5',
              color: assignmentsTab === 'completed' ? '#fff' : '#065f46',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 700
            }}>{completedAssignments.length}</span>
          </button>
        </div>
        
        {assignmentsTab === 'pending' ? (
          <div className="assignments-list">
            {pendingAssignments.length > 0 ? (
              pendingAssignments.map((assignment, index) => (
                <div key={index} className="assignment-card" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '20px',
                  background: '#fff',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  borderLeft: '4px solid #f59e0b'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginRight: '16px'
                  }}>
                    {assignment.type === 'TEST' ? '📝' : '📋'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontWeight: 600 }}>{assignment.title}</h4>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                      {assignment.courseName} • Due: {assignment.deadline || assignment.time || 'No deadline'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {assignment.type === 'TEST' && assignment.testId && (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleStartTest(assignment.testId!)}
                        style={{ padding: '10px 20px' }}
                      >
                        Start Now →
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: '80px 0', background: '#fff', borderRadius: '16px' }}>
                <div className="empty-state-icon" style={{ fontSize: '4rem' }}>🎉</div>
                <h3>All Caught Up!</h3>
                <p style={{ color: '#64748b' }}>You have no pending assignments. Great job!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="assignments-list">
            {completedAssignments.length > 0 ? (
              completedAssignments.map((assignment) => (
                <div key={assignment.id} className="assignment-card" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '20px',
                  background: '#fff',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  borderLeft: '4px solid #10b981'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginRight: '16px'
                  }}>
                    ✅
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontWeight: 600 }}>{assignment.title}</h4>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                      {assignment.courseName} • {assignment.courseCode}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: 700, 
                        color: (assignment.percentage || 0) >= 70 ? '#10b981' : (assignment.percentage || 0) >= 50 ? '#f59e0b' : '#ef4444'
                      }}>
                        {assignment.percentage || 0}%
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {assignment.score || 0}/{assignment.totalMarks} marks
                      </div>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => navigate(`/student/tests/${assignment.id}/results`)}
                      style={{ padding: '10px 16px' }}
                    >
                      View Results
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: '80px 0', background: '#fff', borderRadius: '16px' }}>
                <div className="empty-state-icon" style={{ fontSize: '4rem' }}>📝</div>
                <h3>No Completed Assignments</h3>
                <p style={{ color: '#64748b' }}>Complete your pending assignments to see them here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="student-portal">
      <div className="student-portal-container">
        {/* Header */}
        <div className="student-header">
          <div className="student-header-info">
            <div className="student-avatar">
              {getInitials(dashboardData?.student.fullName || user?.fullName || 'S')}
            </div>
            <div className="student-header-text">
              <h1>Welcome back, {(dashboardData?.student.fullName || user?.fullName || 'Student').split(' ')[0]}!</h1>
              <p>{dashboardData?.student.studentId || 'Student'} • {dashboardData?.student.semester || 'Semester'}</p>
            </div>
          </div>
          <div className="student-header-actions">
            <NotificationBell />
            <button className="btn btn-outline" onClick={() => setShowProfileModal(true)}>
              👤 Profile
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {/* Profile Modal */}
        <ProfileModal
          user={user}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />

        {/* Navigation Tabs */}
        <nav className="student-nav">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="icon">{Icons.dashboard}</span>
            Dashboard
          </button>
          <button 
            className={`nav-tab ${activeTab === 'tests' ? 'active' : ''}`}
            onClick={() => setActiveTab('tests')}
          >
            <span className="icon">{Icons.tests}</span>
            My Tests
          </button>
          <button 
            className={`nav-tab ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            <span className="icon">📋</span>
            Assignments
          </button>
          <button 
            className={`nav-tab ${activeTab === 'practice' ? 'active' : ''}`}
            onClick={() => setActiveTab('practice')}
          >
            <span className="icon">{Icons.practice}</span>
            Practice Zone
          </button>
          <button 
            className={`nav-tab ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <span className="icon">{Icons.library}</span>
            My Library
          </button>
          <button 
            className={`nav-tab ${activeTab === 'self-paced' ? 'active' : ''}`}
            onClick={() => navigate('/student/self-paced')}
          >
            <span className="icon">📚</span>
            Self-Paced Learning
          </button>
          <button 
            className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <span className="icon">{Icons.analytics}</span>
            Analytics
          </button>
          <button 
            className={`nav-tab ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <span className="icon">{Icons.calendar}</span>
            Schedule
          </button>
        </nav>

        {/* Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'tests' && renderTests()}
        {activeTab === 'assignments' && renderAssignments()}
        {activeTab === 'practice' && renderPractice()}
        {activeTab === 'library' && renderLibrary()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'schedule' && renderSchedule()}
      </div>

      {/* Rating Modal */}
      {showRatingModal && ratingTarget && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <RatingForm
              entityId={ratingTarget.entityId}
              entityName={ratingTarget.entityName}
              ratingType={ratingTarget.ratingType}
              onSuccess={handleRatingSuccess}
              onCancel={() => setShowRatingModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPortal;
