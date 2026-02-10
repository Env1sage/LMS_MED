import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import { Calendar, Clock, BookOpen, FileText, ChevronLeft, ChevronRight, Bell, AlertTriangle, Target, GraduationCap } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface CalendarEvent {
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
}

interface CalendarDay {
  date: string;
  dayName: string;
  isToday: boolean;
  events: CalendarEvent[];
}

const StudentSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);

  // Fetch calendar data for the entire visible month
  const fetchMonthEvents = useCallback(async (date: Date) => {
    try {
      setLoading(true);

      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Build week-start dates covering the entire month
      const weekDates: string[] = [];
      const cur = new Date(firstDay);
      const dayOfWeek = cur.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      cur.setDate(cur.getDate() + mondayOffset);

      while (cur <= lastDay || weekDates.length === 0) {
        weekDates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 7);
      }
      weekDates.push(cur.toISOString().split('T')[0]);

      // Fetch all weeks in parallel
      const responses = await Promise.all(
        weekDates.map(d =>
          apiService.get(`/student-portal/calendar/week?date=${d}`).catch(() => ({ data: { days: [] } }))
        )
      );

      // Merge and deduplicate events by id
      const eventMap = new Map<string, CalendarEvent>();
      responses.forEach(res => {
        const days: CalendarDay[] = res.data?.days || [];
        days.forEach(day => {
          day.events.forEach(event => {
            eventMap.set(event.id, event);
          });
        });
      });

      setAllEvents(Array.from(eventMap.values()));
    } catch (err: any) {
      console.error('Failed to fetch calendar:', err);
      setAllEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthEvents(currentDate);
  }, [currentDate, fetchMonthEvents]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startingDayOfWeek: firstDay.getDay() };
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return allEvents.filter(e => e.date === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CLASS': case 'LECTURE': return '#6366f1';
      case 'TEST': case 'EXAM': return '#ef4444';
      case 'ASSIGNMENT': return '#f59e0b';
      case 'DEADLINE': case 'COURSE_DEADLINE': return '#dc2626';
      case 'NOTIFICATION': return '#8b5cf6';
      case 'EVENT': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CLASS': case 'LECTURE': return <GraduationCap size={16} />;
      case 'TEST': case 'EXAM': return <FileText size={16} />;
      case 'ASSIGNMENT': return <Target size={16} />;
      case 'DEADLINE': case 'COURSE_DEADLINE': return <AlertTriangle size={16} />;
      case 'NOTIFICATION': return <Bell size={16} />;
      default: return <Calendar size={16} />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'CLASS': case 'LECTURE': return 'Class';
      case 'TEST': case 'EXAM': return 'Test';
      case 'ASSIGNMENT': return 'Assignment';
      case 'DEADLINE': return 'Deadline';
      case 'COURSE_DEADLINE': return 'Course Due';
      case 'NOTIFICATION': return 'Notice';
      default: return type;
    }
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(startingDayOfWeek).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const selectedDateEvents = getEventsForDate(selectedDate);
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  // Monthly stats
  const monthEvents = allEvents.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });
  const deadlineCount = monthEvents.filter(e => e.isDeadline).length;
  const testCount = monthEvents.filter(e => e.type === 'TEST' || e.type === 'ASSIGNMENT').length;

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
          <div className="loading-title">Loading Schedule</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
          My Schedule
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          View your classes, tests, assignments, and deadlines
        </p>
      </div>

      {/* Month Summary Stats */}
      <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
        <div className="bo-stat-card">
          <div className="bo-stat-icon blue"><Calendar size={22} /></div>
          <div className="bo-stat-value">{monthEvents.length}</div>
          <div className="bo-stat-label">Events This Month</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon purple"><FileText size={22} /></div>
          <div className="bo-stat-value">{testCount}</div>
          <div className="bo-stat-label">Tests / Assignments</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon orange"><AlertTriangle size={22} /></div>
          <div className="bo-stat-value">{deadlineCount}</div>
          <div className="bo-stat-label">Upcoming Deadlines</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon green"><Bell size={22} /></div>
          <div className="bo-stat-value">{monthEvents.filter(e => e.type === 'NOTIFICATION').length}</div>
          <div className="bo-stat-label">Notices</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Calendar */}
        <div className="bo-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)' }}>
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={goToToday} className="bo-btn bo-btn-outline" style={{ padding: '6px 14px', fontSize: 13 }}>Today</button>
              <button onClick={previousMonth} className="bo-btn bo-btn-outline" style={{ padding: '6px 12px' }}><ChevronLeft size={18} /></button>
              <button onClick={nextMonth} className="bo-btn bo-btn-outline" style={{ padding: '6px 12px' }}><ChevronRight size={18} /></button>
            </div>
          </div>

          {/* Day Labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--bo-text-muted)', padding: '8px 0' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {weeks.flat().map((day, index) => {
              if (day === null) return <div key={`empty-${index}`} style={{ aspectRatio: '1', minHeight: 80 }} />;

              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const events = getEventsForDate(date);
              const isSelected = selectedDate.toDateString() === date.toDateString();
              const isTodayDate = isToday(date);
              const hasDeadline = events.some(e => e.isDeadline);

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    aspectRatio: '1', minHeight: 80,
                    border: `2px solid ${isSelected ? 'var(--bo-accent)' : isTodayDate ? '#6366f1' : 'var(--bo-border)'}`,
                    borderRadius: 8, padding: 8, cursor: 'pointer',
                    background: isSelected ? 'var(--bo-accent-light)' : isTodayDate ? 'rgba(99,102,241,0.06)' : 'white',
                    transition: 'all 0.2s', position: 'relative', display: 'flex', flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--bo-accent-light)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = isTodayDate ? '#6366f1' : 'var(--bo-border)'; }}
                >
                  <div style={{
                    fontSize: 14, fontWeight: isTodayDate ? 700 : 600,
                    color: isSelected ? 'var(--bo-accent)' : isTodayDate ? '#6366f1' : 'var(--bo-text-primary)',
                    marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    {day}
                    {isTodayDate && (
                      <span style={{ fontSize: 8, background: '#6366f1', color: 'white', borderRadius: 4, padding: '1px 4px', fontWeight: 700 }}>TODAY</span>
                    )}
                  </div>
                  {events.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 'auto' }}>
                      {events.slice(0, 3).map((event, idx) => (
                        <div key={idx} style={{ width: '100%', height: 4, borderRadius: 2, background: getTypeColor(event.type), opacity: event.isDeadline ? 1 : 0.7 }} />
                      ))}
                      {events.length > 3 && (
                        <div style={{ fontSize: 9, color: 'var(--bo-text-muted)', marginTop: 1, fontWeight: 600 }}>+{events.length - 3} more</div>
                      )}
                    </div>
                  )}
                  {hasDeadline && (
                    <div style={{ position: 'absolute', top: 4, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', padding: '12px 0', borderTop: '1px solid var(--bo-border)' }}>
            {[
              { label: 'Test', color: '#ef4444' },
              { label: 'Assignment', color: '#f59e0b' },
              { label: 'Deadline', color: '#dc2626' },
              { label: 'Notice', color: '#8b5cf6' },
              { label: 'Class', color: '#6366f1' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Events for Selected Date */}
        <div>
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {isToday(selectedDate) && (
              <span style={{ fontSize: 12, color: 'var(--bo-accent)', fontWeight: 500 }}>Today</span>
            )}
            {selectedDateEvents.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>
                {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {selectedDateEvents.length === 0 ? (
            <div className="bo-card" style={{ padding: 32, textAlign: 'center' }}>
              <Calendar size={36} style={{ color: 'var(--bo-text-muted)', opacity: 0.5, margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, color: 'var(--bo-text-muted)' }}>No events scheduled</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedDateEvents.map(event => (
                <div
                  key={event.id}
                  className="bo-card"
                  onClick={() => event.actionUrl && navigate(event.actionUrl)}
                  style={{
                    padding: 16, borderLeft: `4px solid ${getTypeColor(event.type)}`,
                    cursor: event.actionUrl ? 'pointer' : 'default', transition: 'transform 0.15s',
                  }}
                  onMouseEnter={(e) => { if (event.actionUrl) e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: 12, marginBottom: 8 }}>
                    <div style={{ color: getTypeColor(event.type), marginTop: 2, flexShrink: 0 }}>
                      {getTypeIcon(event.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
                        {event.title}
                      </div>
                      {event.description && (
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 6 }}>{event.description}</div>
                      )}
                      {event.courseName && (
                        <div style={{ fontSize: 12, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <BookOpen size={11} /> {event.courseName}
                        </div>
                      )}
                      {event.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--bo-text-secondary)' }}>
                          <Clock size={12} />
                          {event.time}{event.endTime && ` – ${event.endTime}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4,
                      background: `${getTypeColor(event.type)}18`, color: getTypeColor(event.type),
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>
                      {getTypeBadge(event.type)}
                    </span>
                    {event.isDeadline && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>
                        ⏰ DEADLINE
                      </span>
                    )}
                    {event.priority === 'URGENT' && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>URGENT</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming deadlines panel */}
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const upcomingDeadlines = monthEvents
              .filter(e => e.isDeadline && new Date(e.date) >= today)
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 5);
            if (upcomingDeadlines.length === 0) return null;
            return (
              <div className="bo-card" style={{ padding: 20, marginTop: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} color="#ef4444" /> Upcoming Deadlines
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {upcomingDeadlines.map(dl => (
                    <div key={dl.id} onClick={() => { setSelectedDate(new Date(dl.date)); if (dl.actionUrl) navigate(dl.actionUrl); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, background: '#fef2f2', cursor: 'pointer', fontSize: 12 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                      <div style={{ flex: 1, color: 'var(--bo-text-primary)', fontWeight: 500 }}>
                        {dl.title.replace(/^⏰\s*Deadline:\s*/, '').replace(/^📚\s*Course Deadline:\s*/, '')}
                      </div>
                      <div style={{ color: '#dc2626', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {new Date(dl.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentSchedule;
