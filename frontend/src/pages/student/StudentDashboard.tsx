import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import CourseRating from '../../components/CourseRating';
import {
  BookOpen, TrendingUp, Play, CheckCircle, Clock, AlertCircle,
  ChevronLeft, ChevronRight, Calendar,
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
  courses: Array<{
    id: number;
    title: string;
    code: string;
    facultyName: string;
    progress: number;
    totalLessons: number;
    completedLessons: number;
    userRating?: number;
  }>;
}

interface CalendarItem {
  id: string;
  date: string;
  time?: string;
  title: string;
  type: string;
  priority?: string;
  courseName?: string;
}

interface MonthCalendarData {
  year: number;
  month: number;
  items: CalendarItem[];
}

const EVENT_COLORS: Record<string, string> = {
  TEST: '#ef4444',
  ASSIGNMENT: '#f59e0b',
  LECTURE: '#3b82f6',
  CLASS: '#3b82f6',
  EXAM: '#dc2626',
  HOLIDAY: '#10b981',
  ANNOUNCEMENT: '#8b5cf6',
  DEADLINE: '#ef4444',
  DEFAULT: '#6b7280',
};

function getEventColor(type: string) {
  return EVENT_COLORS[type?.toUpperCase()] || EVENT_COLORS.DEFAULT;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calData, setCalData] = useState<MonthCalendarData | null>(null);
  const [calLoading, setCalLoading] = useState(false);
  const todayInitStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [selectedDay, setSelectedDay] = useState<string | null>(todayInitStr);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const dashRes = await apiService.get('/student-portal/dashboard');
      setDashboardData(dashRes.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCalendar = useCallback(async (year: number, month: number) => {
    try {
      setCalLoading(true);
      const res = await apiService.get(`/student-portal/calendar/month?year=${year}&month=${month}`);
      setCalData(res.data);
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
      setCalData({ year, month, items: [] });
    } finally {
      setCalLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => { fetchCalendar(calYear, calMonth); }, [fetchCalendar, calYear, calMonth]);

  const handleRatingSubmit = async (courseId: number, rating: number) => {
    try {
      await apiService.post(`/student-portal/courses/${courseId}/rate`, { rating });
      setDashboardData(prev => prev ? {
        ...prev,
        courses: prev.courses.map(c => c.id === courseId ? { ...c, userRating: rating } : c),
      } : prev);
    } catch (error: any) {
      console.error('Error submitting rating:', error);
    }
  };

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Build calendar grid
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDow = new Date(calYear, calMonth - 1, 1).getDay();
  const eventsByDate: Record<string, CalendarItem[]> = {};
  (calData?.items || []).forEach(item => {
    if (!eventsByDate[item.date]) eventsByDate[item.date] = [];
    eventsByDate[item.date].push(item);
  });

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];

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
          <div className="loading-bar-track"><div className="loading-bar-fill"></div></div>
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
          <button className="bo-btn bo-btn-primary" onClick={fetchDashboardData}>Try Again</button>
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
          <div className="bo-stat-icon blue"><BookOpen size={22} /></div>
          <div className="bo-stat-value">{dashboardData?.progressSummary.totalCourses || 0}</div>
          <div className="bo-stat-label">My Courses</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon green"><CheckCircle size={22} /></div>
          <div className="bo-stat-value">{dashboardData?.progressSummary.completedCourses || 0}</div>
          <div className="bo-stat-label">Completed</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon purple"><Play size={22} /></div>
          <div className="bo-stat-value">{dashboardData?.progressSummary.inProgressCourses || 0}</div>
          <div className="bo-stat-label">In Progress</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon orange"><Clock size={22} /></div>
          <div className="bo-stat-value">{dashboardData?.progressSummary.totalStudyHours || 0}h</div>
          <div className="bo-stat-label">Study Hours</div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bo-card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={20} /> Overall Progress
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
          {/* Donut */}
          <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
            <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="70" cy="70" r="56" fill="none" stroke="var(--bo-border-light)" strokeWidth="12" />
              <circle cx="70" cy="70" r="56" fill="none" stroke="var(--bo-accent)" strokeWidth="12"
                strokeDasharray={`${(dashboardData?.progressSummary.averageProgress || 0) * 3.52} 352`}
                strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--bo-accent)' }}>
                {dashboardData?.progressSummary.averageProgress || 0}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>avg</div>
            </div>
          </div>
          {/* Stat numbers */}
          <div style={{ display: 'flex', gap: 40 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--bo-text-primary)' }}>{dashboardData?.progressSummary.totalCourses || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Total Courses</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--bo-success)' }}>{dashboardData?.progressSummary.completedCourses || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Completed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--bo-info)' }}>{dashboardData?.progressSummary.inProgressCourses || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>In Progress</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: '#f59e0b' }}>{dashboardData?.progressSummary.totalStudyHours || 0}h</div>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Study Hours</div>
            </div>
          </div>
          {/* Progress bars */}
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--bo-text-secondary)', marginBottom: 5 }}>
                <span>Completed</span>
                <span style={{ fontWeight: 600, color: 'var(--bo-success)' }}>
                  {dashboardData?.progressSummary.completedCourses || 0} / {dashboardData?.progressSummary.totalCourses || 0}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--bo-border-light)', borderRadius: 4 }}>
                <div style={{ height: '100%', background: 'var(--bo-success)', borderRadius: 4, transition: 'width 0.4s ease',
                  width: dashboardData?.progressSummary.totalCourses
                    ? `${(dashboardData.progressSummary.completedCourses / dashboardData.progressSummary.totalCourses) * 100}%` : '0%' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--bo-text-secondary)', marginBottom: 5 }}>
                <span>In Progress</span>
                <span style={{ fontWeight: 600, color: 'var(--bo-info)' }}>
                  {dashboardData?.progressSummary.inProgressCourses || 0} / {dashboardData?.progressSummary.totalCourses || 0}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--bo-border-light)', borderRadius: 4 }}>
                <div style={{ height: '100%', background: 'var(--bo-info)', borderRadius: 4, transition: 'width 0.4s ease',
                  width: dashboardData?.progressSummary.totalCourses
                    ? `${(dashboardData.progressSummary.inProgressCourses / dashboardData.progressSummary.totalCourses) * 100}%` : '0%' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--bo-text-secondary)', marginBottom: 5 }}>
                <span>Average Progress</span>
                <span style={{ fontWeight: 600, color: 'var(--bo-accent)' }}>{dashboardData?.progressSummary.averageProgress || 0}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--bo-border-light)', borderRadius: 4 }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--bo-accent), var(--bo-info))', borderRadius: 4, transition: 'width 0.4s ease',
                  width: `${dashboardData?.progressSummary.averageProgress || 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Month Calendar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 24, alignItems: 'start' }}>
        {/* Left: Calendar */}
        <div className="bo-card" style={{ padding: 24 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={20} /> {MONTHS[calMonth - 1]} {calYear}
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {calLoading && <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Loading…</span>}
              <button className="bo-btn bo-btn-outline" onClick={prevMonth}
                style={{ padding: '4px 10px', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={16} />
              </button>
              <button className="bo-btn bo-btn-outline" onClick={() => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth() + 1); setSelectedDay(todayStr); }}
                style={{ padding: '4px 10px', fontSize: 12 }}>Today</button>
              <button className="bo-btn bo-btn-outline" onClick={nextMonth}
                style={{ padding: '4px 10px', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--bo-text-muted)', padding: '4px 0', textTransform: 'uppercase' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: 72, borderRadius: 6 }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const events = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDay;
              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  style={{
                    minHeight: 72, borderRadius: 6, padding: '6px 6px 4px', cursor: 'pointer',
                    background: isSelected ? 'var(--bo-accent-light, #e0e7ff)' : isToday ? 'var(--bo-accent-bg, #f0f4ff)' : 'var(--bo-bg-secondary, #f9fafb)',
                    border: (isToday || isSelected) ? '2px solid var(--bo-accent)' : '1px solid var(--bo-border-light)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected && !isToday) (e.currentTarget as HTMLDivElement).style.background = 'var(--bo-card-bg)'; }}
                  onMouseLeave={e => { if (!isSelected && !isToday) (e.currentTarget as HTMLDivElement).style.background = 'var(--bo-bg-secondary, #f9fafb)'; }}
                >
                  <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--bo-accent)' : 'var(--bo-text-primary)', marginBottom: 4 }}>
                    {day}
                  </div>
                  {events.slice(0, 2).map((ev, idx) => (
                    <div key={idx} style={{ fontSize: 10, fontWeight: 500, background: getEventColor(ev.type), color: '#fff', borderRadius: 3, padding: '1px 4px', marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {ev.title}
                    </div>
                  ))}
                  {events.length > 2 && <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', fontWeight: 500 }}>+{events.length - 2} more</div>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
            {[['TEST', 'Test'], ['ASSIGNMENT', 'Assignment'], ['LECTURE', 'Lecture'], ['HOLIDAY', 'Holiday'], ['ANNOUNCEMENT', 'Notice']].map(([type, label]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--bo-text-secondary)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: getEventColor(type), flexShrink: 0 }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Day detail panel */}
        <div style={{ position: 'sticky', top: 16 }}>
          {/* Date header */}
          <div className="bo-card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
              {selectedDay
                ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            {(selectedDay === todayStr || (!selectedDay)) && (
              <span style={{ fontSize: 12, color: 'var(--bo-accent)', fontWeight: 600, marginTop: 2, display: 'block' }}>Today</span>
            )}
            <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>
              {selectedEvents.length > 0 ? `${selectedEvents.length} event${selectedEvents.length !== 1 ? 's' : ''}` : 'No events scheduled'}
            </div>
          </div>

          {/* Events */}
          {selectedEvents.length === 0 ? (
            <div className="bo-card" style={{ padding: 32, textAlign: 'center' }}>
              <Calendar size={36} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, margin: '0 auto 10px', display: 'block' }} />
              <div style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
                {selectedDay ? 'No events on this day' : 'Click a day to see events'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className="bo-card"
                  style={{ padding: 14, borderLeft: `4px solid ${getEventColor(ev.type)}`, cursor: 'default' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text-primary)', lineHeight: 1.3 }}>{ev.title}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: getEventColor(ev.type), color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {ev.type}
                    </span>
                  </div>
                  {ev.courseName && (
                    <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      📚 {ev.courseName}
                    </div>
                  )}
                  {ev.time && (
                    <div style={{ fontSize: 12, color: 'var(--bo-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      🕐 {ev.time}
                    </div>
                  )}
                  {ev.priority && ev.priority !== 'NORMAL' && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: ev.priority === 'URGENT' ? '#fef2f2' : '#fffbeb', color: ev.priority === 'URGENT' ? '#dc2626' : '#d97706' }}>
                        {ev.priority}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
                style={{ padding: 20, cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid var(--bo-border)' }}
                onClick={() => navigate(`/student/courses/${course.id}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--bo-shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--bo-shadow-sm)'; }}
              >
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>{course.title}</h4>
                  <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', margin: 0 }}>{course.code}</p>
                  <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginTop: 4, marginBottom: 8 }}>👨‍🏫 {course.facultyName}</p>
                  <div onClick={e => e.stopPropagation()}>
                    <CourseRating courseId={course.id} currentRating={course.userRating || 0}
                      onRatingSubmit={(rating) => handleRatingSubmit(course.id, rating)} />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 8 }}>
                    <span>{course.progress}% Complete</span>
                    <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bo-border-light)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--bo-accent), var(--bo-info))',
                      width: `${course.progress}%`,
                      transition: 'width 0.3s ease'
                    }} />
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
