/**
 * HOD Notifications — same as CollegeNotifications but inside HodLayout.
 */
import React, { useState, useEffect } from 'react';
import governanceService, { Notification } from '../../services/governance.service';
import HodLayout from '../../components/hod/HodLayout';
import { Bell, PlusCircle, Trash2, X } from 'lucide-react';
import NotificationDetailModal from '../../components/notifications/NotificationDetailModal';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';
import { formatDate } from '../../utils/dateUtils';

const HodNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [form, setForm] = useState<{
    title: string; message: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    audience: 'ALL' | 'FACULTY' | 'STUDENTS';
  }>({ title: '', message: '', priority: 'NORMAL', audience: 'ALL' });

  useEffect(() => { fetchNotifications(); }, []);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); } }, [success]);

  const fetchNotifications = async () => {
    setLoading(true); setError(null);
    try {
      const data = await governanceService.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load notifications'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true); setError(null);
    try {
      await governanceService.createNotification(form);
      setSuccess('Notification sent'); setShowCreate(false);
      setForm({ title: '', message: '', priority: 'NORMAL', audience: 'ALL' });
      await fetchNotifications();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
    finally { setModalLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this notification?')) return;
    try { await governanceService.deleteNotification(id); setSuccess('Deleted'); await fetchNotifications(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const priorityBadge = (priority: string) => {
    const c: Record<string, { bg: string; color: string }> = {
      HIGH: { bg: '#FEF2F2', color: '#DC2626' },
      URGENT: { bg: '#FEF2F2', color: '#DC2626' },
      NORMAL: { bg: '#EFF6FF', color: '#2563EB' },
      LOW: { bg: '#F3F4F6', color: '#6B7280' },
    };
    const col = c[priority] || c.NORMAL;
    return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: col.bg, color: col.color }}>{priority}</span>;
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block' };

  return (
    <HodLayout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bell size={24} color="#9333EA" />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>Notifications</h1>
            <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Notifications you have created and sent to your department</p>
          </div>
        </div>
        <button className="bo-btn bo-btn-primary" style={{ background: '#059669', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowCreate(true)}>
          <PlusCircle size={14} /> New Notification
        </button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 480, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Send Notification</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Title *</label>
                <input required style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Message *</label>
                <textarea required style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Notification message" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}>
                    {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Audience</label>
                  <select style={inputStyle} value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value as any }))}>
                    {[['ALL', 'All Users'], ['FACULTY', 'Faculty Only'], ['STUDENTS', 'Students Only']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} className="bo-btn bo-btn-outline">Cancel</button>
                <button type="submit" className="bo-btn bo-btn-primary" disabled={modalLoading} style={{ background: '#059669' }}>
                  {modalLoading ? 'Sending…' : 'Send Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="bo-card" style={{ textAlign: 'center', padding: 48 }}>
          <Bell size={40} color="var(--bo-text-muted)" style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ color: 'var(--bo-text-muted)' }}>No notifications yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map(n => (
            <div key={n.id} className="bo-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer' }}
              onClick={() => setSelectedNotif(n)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{n.title}</span>
                  {priorityBadge(n.priority)}
                </div>
                <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{n.message}</p>
                <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>
                  {n.createdAt ? formatDate(n.createdAt) : ''}
                  {n.audience && ` · ${n.audience}`}
                  <span style={{ marginLeft: 8, color: '#9333EA' }}>· Click to view</span>
                </span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }} title="Delete"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-danger)', padding: 4, borderRadius: 6, flexShrink: 0 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      <NotificationDetailModal
        notification={selectedNotif}
        onClose={() => setSelectedNotif(null)}
      />
    </HodLayout>
  );
};

export default HodNotifications;
