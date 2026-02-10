import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import { 
  Bell, CheckCircle, Clock, AlertTriangle, BookOpen, 
  ClipboardList, Megaphone, Check, CheckCheck, Filter, X
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  senderName: string | null;
  actionUrl: string | null;
  category: string;
}

const StudentNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'DEADLINE' | 'COURSE' | 'ANNOUNCEMENT'>('ALL');
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get('/student-portal/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await apiService.post(`/student-portal/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await apiService.post('/student-portal/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getFilteredNotifications = () => {
    if (filter === 'ALL') return notifications;
    if (filter === 'UNREAD') return notifications.filter(n => !n.isRead);
    return notifications.filter(n => n.category === filter);
  };

  const getCategoryIcon = (category: string, type: string) => {
    switch (category) {
      case 'DEADLINE': return <AlertTriangle size={18} />;
      case 'COURSE': return <BookOpen size={18} />;
      case 'ANNOUNCEMENT': 
        if (type === 'ACADEMIC') return <ClipboardList size={18} />;
        return <Megaphone size={18} />;
      default: return <Bell size={18} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '#ef4444';
      case 'HIGH': return '#f59e0b';
      case 'NORMAL': return 'var(--bo-accent)';
      case 'LOW': return 'var(--bo-text-muted)';
      default: return 'var(--bo-accent)';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '#fef2f2';
      case 'HIGH': return '#fffbeb';
      case 'NORMAL': return 'var(--bo-bg)';
      case 'LOW': return 'var(--bo-bg)';
      default: return 'var(--bo-bg)';
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

  const filtered = getFilteredNotifications();

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
          <div className="loading-title">Loading Notifications</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>
            Notifications
          </h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button 
            className="bo-btn bo-btn-outline"
            onClick={markAllRead}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13 }}
          >
            <CheckCheck size={16} /> Mark All Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 20,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {[
          { key: 'ALL', label: 'All', count: notifications.length },
          { key: 'UNREAD', label: 'Unread', count: unreadCount },
          { key: 'DEADLINE', label: 'Deadlines', count: notifications.filter(n => n.category === 'DEADLINE').length },
          { key: 'COURSE', label: 'Courses', count: notifications.filter(n => n.category === 'COURSE').length },
          { key: 'ANNOUNCEMENT', label: 'Announcements', count: notifications.filter(n => n.category === 'ANNOUNCEMENT').length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: filter === tab.key ? '2px solid var(--bo-accent)' : '1px solid var(--bo-border)',
              background: filter === tab.key ? 'var(--bo-accent)' : 'var(--bo-card-bg)',
              color: filter === tab.key ? '#fff' : 'var(--bo-text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: filter === tab.key ? 'rgba(255,255,255,0.3)' : 'var(--bo-border-light)',
                padding: '1px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bo-card" style={{ padding: 20, marginBottom: 16, borderLeft: '4px solid var(--bo-danger)' }}>
          <p style={{ color: 'var(--bo-danger)', margin: 0, fontSize: 14 }}>{error}</p>
          <button className="bo-btn bo-btn-primary" onClick={fetchNotifications} style={{ marginTop: 12, fontSize: 13 }}>
            Retry
          </button>
        </div>
      )}

      {/* Notification List */}
      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((notif) => (
            <div
              key={notif.id}
              className="bo-card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                cursor: notif.actionUrl ? 'pointer' : 'default',
                background: notif.isRead ? 'var(--bo-card-bg)' : getPriorityBg(notif.priority),
                borderLeft: `4px solid ${getPriorityColor(notif.priority)}`,
                opacity: notif.isRead ? 0.75 : 1,
                transition: 'all 0.2s ease',
              }}
              onClick={() => {
                if (!notif.isRead) markAsRead(notif.id);
                if (notif.actionUrl) navigate(notif.actionUrl);
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
            >
              {/* Icon */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: `${getPriorityColor(notif.priority)}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: getPriorityColor(notif.priority),
                flexShrink: 0,
              }}>
                {getCategoryIcon(notif.category, notif.type)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ 
                    fontSize: 14, 
                    fontWeight: notif.isRead ? 500 : 700, 
                    color: 'var(--bo-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {notif.title}
                  </span>
                  {!notif.isRead && (
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: getPriorityColor(notif.priority),
                      flexShrink: 0,
                    }} />
                  )}
                </div>
                <p style={{ 
                  fontSize: 13, 
                  color: 'var(--bo-text-muted)', 
                  margin: 0,
                  marginBottom: 6,
                  lineHeight: 1.4,
                }}>
                  {notif.message}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> {formatTimeAgo(notif.createdAt)}
                  </span>
                  {notif.senderName && (
                    <span>• {notif.senderName}</span>
                  )}
                  <span style={{
                    padding: '1px 8px',
                    borderRadius: 10,
                    background: 'var(--bo-border-light)',
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}>
                    {notif.category.toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {!notif.isRead && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                    title="Mark as read"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '1px solid var(--bo-border)',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--bo-text-muted)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { 
                      e.currentTarget.style.background = 'var(--bo-accent)';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.borderColor = 'var(--bo-accent)';
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--bo-text-muted)';
                      e.currentTarget.style.borderColor = 'var(--bo-border)';
                    }}
                  >
                    <Check size={14} />
                  </button>
                )}
                {notif.isRead && (
                  <CheckCircle size={16} color="var(--bo-success)" style={{ opacity: 0.5 }} />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bo-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Bell size={48} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ color: 'var(--bo-text-primary)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {filter === 'ALL' ? 'No Notifications' : `No ${filter.toLowerCase()} notifications`}
          </h3>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, margin: 0 }}>
            {filter === 'UNREAD' ? "You're all caught up!" : "Nothing to show here yet."}
          </p>
          {filter !== 'ALL' && (
            <button 
              className="bo-btn bo-btn-outline" 
              onClick={() => setFilter('ALL')}
              style={{ marginTop: 16, fontSize: 13 }}
            >
              View All Notifications
            </button>
          )}
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentNotifications;
