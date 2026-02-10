import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import CourseRating from '../../components/CourseRating';
import { 
  BookOpen, Calendar, TrendingUp, Play, CheckCircle, Clock, AlertCircle, Bell,
  ChevronLeft, ChevronRight, AlertTriangle, ClipboardList, Megaphone, ExternalLink
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

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
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    createdAt: string;
    isRead: boolean;
  }>;
  unreadNotificationCount?: number;
}

interface CalendarDay {
  date: string;
  dayName: string;
  isToday: boolean;
  events: Array<{
    id: string;
    date: string;
    time: string | null;
    endTime: string | null;
    title: string;
    description: string | null;
    type: string;
    priority: string;
    courseName: string | null;
    actionUrl: string | null;
    testId: string | null;
    isDeadline: boolean;
  }>;
}

interface WeekCalendarData {
  weekStart: string;
  weekEnd: string;
  days: CalendarDay[];
  totalEvents: number;
  upcomingDeadlines: number;
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [calendarData, setCalendarData] = useState<WeekCalendarData | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [dashRes, notifRes] = await Promise.allSettled([
        apiService.get('/student-portal/dashboard'),
        apiService.get('/student-portal/notifications'),
      ]);
      
      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value.data);
      }
      if (notifRes.status === 'fulfilled') {
        setNotifications(notifRes.value.data.notifications?.slice(0, 5) || []);
        setUnreadCount(notifRes.value.data.unreadCount || 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeekCalendar = useCallback(async (date: Date) => {
    try {
      setCalendarLoading(true);
      const dateStr = date.toISOString().split('T')[0];
      const response = await apiService.get(`/student-portal/calendar/week?date=${dateStr}`);
      setCalendarData(response.data);
      // Auto-select today if it's in this week
      const today = response.data.days?.find((d: CalendarDay) => d.isToday);
      setSelectedDay(today || response.data.days?.[0] || null);
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchWeekCalendar(currentWeekDate);
  }, [currentWeekDate, fetchWeekCalendar]);

  // Auto-refresh calendar every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWeekCalendar(currentWeekDate);
    }, 60000);
    return () => clearInterval(interval);
  }, [currentWeekDate, fetchWeekCalendar]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekDate(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekDate(new Date());
  };

  const handleRatingSubmit = async (courseId: number, rating: number) => {
    try {
      await apiService.post(`/student-portal/courses/${courseId}/rate`, { rating });
      alert('✅ Thank you for rating this course!');
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      alert(error.response?.data?.message || 'Failed to submit rating');
    }
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'TEST': return '#ef4444';
      case 'ASSIGNMENT': return '#f59e0b';
      case 'DEADLINE': case 'COURSE_DEADLINE': return '#ef4444';
      case 'NOTIFICATION': return '#6366f1';
      case 'CLASS': return 'var(--bo-accent)';
      case 'EXAM': return '#dc2626';
      default: return 'var(--bo-info)';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'TEST': case 'EXAM': return <ClipboardList size={14} />;
      case 'ASSIGNMENT': return <ClipboardList size={14} />;
      case 'DEADLINE': case 'COURSE_DEADLINE': return <AlertTriangle size={14} />;
      case 'NOTIFICATION': return <Bell size={14} />;
      default: return <Calendar size={14} />;
    }
  };

  const getNotifPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '#ef4444';
      case 'HIGH': return '#f59e0b';
      default: return 'var(--bo-accent)';
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <StudentLayout>
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
          <div className="loading-title">Loading Student Dashboard</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (error) {
    return (
      <StudentLayout>
        <div style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--bo-card-bg)', borderRadius: 'var(--bo-radius-lg)', boxShadow: 'var(--bo-shadow)' }}>
          <AlertCircle size={48} color="var(--bo-danger)" style={{ marginBottom: 16 }} />
          <h2 style={{ color: 'var(--bo-text-primary)', marginBottom: 10, fontSize: 20, fontWeight: 700 }}>Unable to Load Dashboard</h2>
          <p style={{ color: 'var(--bo-text-muted)', marginBottom: 20, fontSize: 14 }}>{error}</p>
          <button className="bo-btn bo-btn-primary" onClick={fetchDashboardData}>
            Try Again
          </button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
          Welcome back, {(dashboardData?.student.fullName || user?.fullName || 'Student').split(' ')[0]}!
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          {dashboardData?.student.studentId || 'Student'} • {dashboardData?.student.semester || 'Academic Year'}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
        <div className="bo-stat-card">
          <div className="bo-stat-icon blue">
            <BookOpen size={22} />
          </div>
          <div className="bo-stat-value">{dashboardData?.progressSummary.totalCourses || 0}</div>
          <div className="bo-stat-label">My Courses</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon green">
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

      {/* ===== WEEK CALENDAR ===== */}
      <div className="bo-card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
        {/* Calendar Header */}
        <div style={{ 
          padding: '16px 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid var(--bo-border)',
          background: 'var(--bo-bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Calendar size={20} color="var(--bo-accent)" />
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--bo-text-primary)' }}>
              Week Calendar
            </h3>
            {calendarData && (
              <span style={{ 
                fontSize: 13, color: 'var(--bo-text-muted)',
                padding: '2px 10px', background: 'var(--bo-border-light)', borderRadius: 12
              }}>
                {calendarData.totalEvents} event{calendarData.totalEvents !== 1 ? 's' : ''}
                {calendarData.upcomingDeadlines > 0 && (
                  <> • <span style={{ color: '#ef4444', fontWeight: 600 }}>{calendarData.upcomingDeadlines} deadline{calendarData.upcomingDeadlines !== 1 ? 's' : ''}</span></>
                )}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              onClick={() => goToCurrentWeek()} 
              className="bo-btn bo-btn-outline"
              style={{ padding: '4px 12px', fontSize: 12 }}
            >
              Today
            </button>
            <button
              onClick={() => navigateWeek('prev')}
              style={{ 
                width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--bo-border)',
                background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--bo-text-secondary)'
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text-primary)', minWidth: 200, textAlign: 'center' }}>
              {calendarData ? new Date(calendarData.weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) 
                + ' – ' + new Date(new Date(calendarData.weekEnd).getTime() - 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : '...'}
            </span>
            <button
              onClick={() => navigateWeek('next')}
              style={{ 
                width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--bo-border)',
                background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--bo-text-secondary)'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Day Tabs */}
        {calendarData && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            borderBottom: '1px solid var(--bo-border)',
          }}>
            {calendarData.days.map((day) => {
              const dayDate = new Date(day.date + 'T00:00:00');
              const isSelected = selectedDay?.date === day.date;
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    padding: '12px 8px',
                    border: 'none',
                    borderBottom: isSelected ? '3px solid var(--bo-accent)' : '3px solid transparent',
                    background: day.isToday ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500 }}>
                    {day.dayName.slice(0, 3)}
                  </div>
                  <div style={{ 
                    fontSize: 20, 
                    fontWeight: day.isToday ? 700 : 500,
                    color: day.isToday ? '#fff' : isSelected ? 'var(--bo-accent)' : 'var(--bo-text-primary)',
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto',
                    background: day.isToday ? 'var(--bo-accent)' : 'transparent',
                  }}>
                    {dayDate.getDate()}
                  </div>
                  {day.events.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 6 }}>
                      {day.events.slice(0, 3).map((e, i) => (
                        <div key={i} style={{ 
                          width: 6, height: 6, borderRadius: '50%', 
                          background: getEventTypeColor(e.type) 
                        }} />
                      ))}
                      {day.events.length > 3 && (
                        <span style={{ fontSize: 9, color: 'var(--bo-text-muted)' }}>+{day.events.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Day Events */}
        <div style={{ padding: 20, minHeight: 160 }}>
          {calendarLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--bo-text-muted)' }}>
              <Clock size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Loading calendar...</p>
            </div>
          ) : selectedDay ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 12 }}>
                {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {selectedDay.isToday && <span style={{ marginLeft: 8, color: 'var(--bo-accent)', fontSize: 12, fontWeight: 500 }}>• Today</span>}
              </div>
              {selectedDay.events.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedDay.events.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => event.actionUrl && navigate(event.actionUrl)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--bo-radius)',
                        border: `1px solid var(--bo-border)`,
                        borderLeft: `4px solid ${getEventTypeColor(event.type)}`,
                        background: event.isDeadline ? '#fef2f2' : 'var(--bo-card-bg)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        cursor: event.actionUrl ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (event.actionUrl) e.currentTarget.style.transform = 'translateX(4px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
                    >
                      <div style={{ 
                        color: getEventTypeColor(event.type), 
                        marginTop: 2,
                        width: 28, height: 28, borderRadius: 6,
                        background: `${getEventTypeColor(event.type)}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {getEventIcon(event.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bo-text-primary)', marginBottom: 2 }}>
                          {event.title}
                        </div>
                        {event.description && (
                          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>{event.description}</div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                          {event.time && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={11} /> {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
                            </span>
                          )}
                          {event.courseName && <span>📚 {event.courseName}</span>}
                          {event.isDeadline && (
                            <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <AlertTriangle size={11} /> Deadline
                            </span>
                          )}
                        </div>
                      </div>
                      {event.actionUrl && (
                        <ExternalLink size={14} color="var(--bo-text-muted)" style={{ flexShrink: 0, marginTop: 4 }} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--bo-text-muted)' }}>
                  <Calendar size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>No events for this day</p>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--bo-text-muted)' }}>
              <p style={{ margin: 0, fontSize: 14 }}>Select a day to view events</p>
            </div>
          )}
        </div>

        {/* View Full Calendar Link */}
        <div style={{ padding: '0 20px 16px' }}>
          <button 
            className="bo-btn bo-btn-outline" 
            onClick={() => navigate('/student/schedule')}
            style={{ width: '100%', fontSize: 13 }}
          >
            View Full Calendar
          </button>
        </div>
      </div>

      {/* Notifications + Progress Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Live Notifications */}
        <div className="bo-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={20} /> Notifications
              {unreadCount > 0 && (
                <span style={{
                  background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 12,
                  fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: 'center',
                }}>
                  {unreadCount}
                </span>
              )}
            </h3>
            <button 
              className="bo-btn bo-btn-outline" 
              onClick={() => navigate('/student/notifications')} 
              style={{ padding: '4px 12px', fontSize: 12 }}
            >
              View All
            </button>
          </div>
          
          {notifications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.map((notif: any) => (
                <div
                  key={notif.id}
                  onClick={() => notif.actionUrl && navigate(notif.actionUrl)}
                  style={{
                    padding: 12,
                    borderRadius: 'var(--bo-radius)',
                    borderLeft: `3px solid ${getNotifPriorityColor(notif.priority)}`,
                    background: notif.isRead ? 'var(--bo-bg)' : `${getNotifPriorityColor(notif.priority)}08`,
                    cursor: notif.actionUrl ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
                >
                  <div style={{ 
                    fontSize: 13, fontWeight: notif.isRead ? 500 : 700, color: 'var(--bo-text-primary)', marginBottom: 3,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {notif.title}
                    {!notif.isRead && <span style={{ width: 6, height: 6, borderRadius: '50%', background: getNotifPriorityColor(notif.priority) }} />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', lineHeight: 1.3 }}>
                    {notif.message?.substring(0, 80)}{notif.message?.length > 80 ? '...' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 4 }}>
                    {formatTimeAgo(notif.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--bo-text-muted)' }}>
              <Bell size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 14 }}>No notifications</p>
            </div>
          )}
        </div>

        {/* Progress Overview */}
        <div className="bo-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={20} /> Overall Progress
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ position: 'relative', width: 120, height: 120 }}>
              <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bo-border-light)" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke="var(--bo-accent)" strokeWidth="10"
                  strokeDasharray={`${(dashboardData?.progressSummary.averageProgress || 0) * 3.14} 314`}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--bo-accent)' }}>
                  {dashboardData?.progressSummary.averageProgress || 0}%
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
                  {dashboardData?.progressSummary.totalCourses || 0}
                </div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Total Courses</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-success)' }}>
                  {dashboardData?.progressSummary.completedCourses || 0}
                </div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Completed</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-info)' }}>
                  {dashboardData?.progressSummary.inProgressCourses || 0}
                </div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>In Progress</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Courses */}
      <div className="bo-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} /> My Courses
          </h3>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate('/student/courses')} style={{ padding: '6px 12px', fontSize: 13 }}>
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
                  <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginTop: 4, marginBottom: 8 }}>
                    👨‍🏫 {course.facultyName}
                  </p>
                  <div onClick={(e) => e.stopPropagation()}>
                    <CourseRating 
                      courseId={course.id} 
                      onRatingSubmit={(rating) => handleRatingSubmit(course.id, rating)}
                    />
                  </div>
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
    </StudentLayout>
  );
};

export default StudentDashboard;
