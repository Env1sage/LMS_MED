import React, { useState, useEffect, useCallback } from 'react';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import governanceService, { Notification } from '../../services/governance.service';
import facultyAssignmentService from '../../services/faculty-assignment.service';
import { Bell, Check, Send, X, AlertCircle } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';

const typeConfig: Record<string, { icon: string; color: string }> = {
  ANNOUNCEMENT: { icon: '📢', color: '#6366F1' },
  SCHEDULE_CHANGE: { icon: '📅', color: '#F59E0B' },
  ACADEMIC_NOTICE: { icon: '🎓', color: '#10B981' },
  SYSTEM_ALERT: { icon: '⚙️', color: '#EF4444' },
};

const priorityConfig: Record<string, { bg: string; color: string }> = {
  LOW: { bg: '#E5E7EB', color: '#374151' },
  NORMAL: { bg: '#DBEAFE', color: '#1E40AF' },
  HIGH: { bg: '#FEF3C7', color: '#92400E' },
  URGENT: { bg: '#FEE2E2', color: '#991B1B' },
};

type ActiveTab = 'received' | 'send' | 'sent';

const FacultyNotifications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('received');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [showRead, setShowRead] = useState(true);

  // Daily limit
  const [dailyLimit, setDailyLimit] = useState({ used: 0, remaining: 3, max: 3 });

  // Send form
  const [sendForm, setSendForm] = useState({ title: '', message: '', type: 'ANNOUNCEMENT', priority: 'NORMAL', audience: 'STUDENTS' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [notifsResult, countResult, limitResult] = await Promise.allSettled([
        governanceService.getMyNotifications(),
        governanceService.getUnreadNotificationCount(),
        facultyAssignmentService.getDailyLimit(),
      ]);
      if (notifsResult.status === 'fulfilled') {
        setNotifications(notifsResult.value || []);
      } else {
        console.error('Failed to load notifications:', notifsResult.reason);
        setNotifications([]);
      }
      if (countResult.status === 'fulfilled') {
        setUnreadCount(countResult.value?.count || 0);
      }
      if (limitResult.status === 'fulfilled') {
        setDailyLimit(limitResult.value);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSentNotifications = useCallback(async () => {
    try {
      const data = await facultyAssignmentService.getSentNotifications();
      setSentNotifications(data);
    } catch (err) {
      console.error('Failed to load sent notifications:', err);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);
  useEffect(() => { if (activeTab === 'sent') loadSentNotifications(); }, [activeTab, loadSentNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await governanceService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleSend = async () => {
    try {
      if (!sendForm.title.trim() || !sendForm.message.trim()) {
        setError('Title and message are required');
        return;
      }
      if (dailyLimit.remaining <= 0) {
        setError('Daily notification limit reached (max 3 per day)');
        return;
      }
      setSending(true);
      setError('');
      await facultyAssignmentService.sendNotification(sendForm);
      setSuccess('Notification sent successfully!');
      setSendForm({ title: '', message: '', type: 'ANNOUNCEMENT', priority: 'NORMAL', audience: 'STUDENTS' });
      setDailyLimit(prev => ({ ...prev, used: prev.used + 1, remaining: prev.remaining - 1 }));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const filtered = notifications
    .filter(n => !filterType || n.type === filterType)
    .filter(n => showRead || !n.isRead);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return (
    <FacultyLayout>
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
        <div className="loading-title">Loading Notifications...</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </FacultyLayout>
  );

  return (
    <FacultyLayout>
      {/* Alerts */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#FEE2E2', color: '#991B1B', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
          {error} <X size={16} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', background: '#D1FAE5', color: '#065F46', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          ✅ {success}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>🔔 Notifications</h1>
          {unreadCount > 0 && (
            <span style={{ padding: '4px 12px', borderRadius: 20, background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 700 }}>{unreadCount} unread</span>
          )}
        </div>
        {/* Daily limit badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: dailyLimit.remaining > 0 ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, border: `1px solid ${dailyLimit.remaining > 0 ? '#BBF7D0' : '#FECACA'}` }}>
          <Send size={14} style={{ color: dailyLimit.remaining > 0 ? '#16A34A' : '#DC2626' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: dailyLimit.remaining > 0 ? '#16A34A' : '#DC2626' }}>
            {dailyLimit.remaining}/{dailyLimit.max} sends remaining today
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--bo-border)' }}>
        {[
          { key: 'received' as ActiveTab, label: 'Received', icon: <Bell size={15} />, badge: unreadCount },
          { key: 'send' as ActiveTab, label: 'Send Notification', icon: <Send size={15} /> },
          { key: 'sent' as ActiveTab, label: 'Sent', icon: <Check size={15} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '12px 24px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 14, fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? ACCENT : 'var(--bo-text-secondary)',
              borderBottom: activeTab === t.key ? `2px solid ${ACCENT}` : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
            }}>
            {t.icon} {t.label}
            {t.badge ? <span style={{ padding: '2px 8px', borderRadius: 10, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700 }}>{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ═══ RECEIVED TAB ═══ */}
      {activeTab === 'received' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bo-bg)', borderRadius: 8 }}>
              <button onClick={() => setFilterType('')} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: !filterType ? ACCENT : 'transparent', color: !filterType ? '#fff' : 'var(--bo-text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>All</button>
              {Object.keys(typeConfig).map(t => (
                <button key={t} onClick={() => setFilterType(filterType === t ? '' : t)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: filterType === t ? ACCENT : 'transparent', color: filterType === t ? '#fff' : 'var(--bo-text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {typeConfig[t].icon} {t.replace('_', ' ')}
                </button>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--bo-text-secondary)', cursor: 'pointer', marginLeft: 'auto' }}>
              <input type="checkbox" checked={showRead} onChange={e => setShowRead(e.target.checked)} style={{ accentColor: ACCENT }} />
              Show read
            </label>
          </div>

          {/* Notification List */}
          {filtered.length === 0 ? (
            <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
              <Bell size={48} style={{ color: 'var(--bo-text-muted)', marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>No notifications</h3>
              <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14 }}>You're all caught up!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(n => {
                const tc = typeConfig[n.type] || { icon: '📌', color: ACCENT };
                const pc = priorityConfig[n.priority] || priorityConfig.NORMAL;
                return (
                  <div key={n.id} className="bo-card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${n.isRead ? 'var(--bo-border)' : tc.color}`, opacity: n.isRead ? 0.8 : 1 }}>
                    <div style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${tc.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {tc.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                          <h3 style={{ fontSize: 15, fontWeight: n.isRead ? 500 : 700, margin: 0, color: 'var(--bo-text-primary)' }}>{n.title}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: pc.bg, color: pc.color }}>{n.priority}</span>
                            <span style={{ fontSize: 12, color: 'var(--bo-text-muted)', whiteSpace: 'nowrap' }}>{formatDate(n.createdAt || '')}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>{n.message}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 11, color: tc.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {tc.icon} {n.type.replace('_', ' ')}
                          </span>
                          {!n.isRead && (
                            <button onClick={() => markAsRead(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--bo-border)', background: '#fff', cursor: 'pointer', fontSize: 12, color: ACCENT, fontWeight: 600 }}>
                              <Check size={12} /> Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══ SEND TAB ═══ */}
      {activeTab === 'send' && (
        <div style={{ maxWidth: 600 }}>
          {dailyLimit.remaining <= 0 ? (
            <div className="bo-card" style={{ padding: 40, textAlign: 'center' }}>
              <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, marginBottom: 8, color: '#DC2626' }}>Daily Limit Reached</h3>
              <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14 }}>
                You've used all {dailyLimit.max} notifications for today. Your limit resets at midnight.
              </p>
            </div>
          ) : (
            <div className="bo-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>
                ✉️ Send Notification to Students
              </h3>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Title *</label>
                <input value={sendForm.title} onChange={e => setSendForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Assignment Due Reminder"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 14 }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Message *</label>
                <textarea value={sendForm.message} onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))}
                  rows={4} placeholder="Write your notification message..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 14, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Type</label>
                  <select value={sendForm.type} onChange={e => setSendForm(f => ({ ...f, type: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13 }}>
                    <option value="ANNOUNCEMENT">📢 Announcement</option>
                    <option value="ACADEMIC_NOTICE">🎓 Academic Notice</option>
                    <option value="SCHEDULE_CHANGE">📅 Schedule Change</option>
                    <option value="SYSTEM_ALERT">⚙️ System Alert</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Priority</label>
                  <select value={sendForm.priority} onChange={e => setSendForm(f => ({ ...f, priority: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13 }}>
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Audience</label>
                  <select value={sendForm.audience} onChange={e => setSendForm(f => ({ ...f, audience: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13 }}>
                    <option value="STUDENTS">All My Students</option>
                    <option value="BATCH">My Batch</option>
                    <option value="DEPARTMENT">My Department</option>
                  </select>
                </div>
              </div>

              {/* Remaining count */}
              <div style={{ padding: '10px 14px', background: '#F5F3FF', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={14} style={{ color: ACCENT }} />
                <span style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>
                  You have <strong style={{ color: ACCENT }}>{dailyLimit.remaining}</strong> notification{dailyLimit.remaining !== 1 ? 's' : ''} remaining today
                </span>
              </div>

              <button onClick={handleSend} disabled={sending} className="bo-btn bo-btn-primary"
                style={{ width: '100%', background: ACCENT, padding: '12px', fontWeight: 600, fontSize: 15, opacity: sending ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Send size={16} /> {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ SENT TAB ═══ */}
      {activeTab === 'sent' && (
        <>
          {sentNotifications.length === 0 ? (
            <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
              <Send size={48} style={{ color: 'var(--bo-text-muted)', marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>No sent notifications</h3>
              <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14 }}>Notifications you send will appear here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sentNotifications.map((n: any) => {
                const tc = typeConfig[n.type] || { icon: '📌', color: ACCENT };
                const pc = priorityConfig[n.priority] || priorityConfig.NORMAL;
                return (
                  <div key={n.id} className="bo-card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${tc.color}` }}>
                    <div style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${tc.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {tc.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--bo-text-primary)' }}>{n.title}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: pc.bg, color: pc.color }}>{n.priority}</span>
                            <span style={{ fontSize: 12, color: 'var(--bo-text-muted)', whiteSpace: 'nowrap' }}>{formatDate(n.createdAt || '')}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>{n.message}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 11, color: tc.color, fontWeight: 600 }}>
                            {tc.icon} {n.type?.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>
                            👁️ {n.readCount || 0} read  •  🎯 {n.audience || 'STUDENTS'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </FacultyLayout>
  );
};

export default FacultyNotifications;
