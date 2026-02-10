import React, { useState, useEffect } from 'react';
import governanceService, { Notification } from '../../services/governance.service';
import CollegeLayout from '../../components/college/CollegeLayout';
import { Bell, PlusCircle, Trash2, X, Eye, EyeOff, Send, CheckCircle, AlertCircle } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const CollegeNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [form, setForm] = useState<{ title: string; message: string; priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'; audience: 'ALL' | 'FACULTY' | 'STUDENTS' }>({ title: '', message: '', priority: 'NORMAL', audience: 'ALL' });

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
    <CollegeLayout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Notifications</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Send and manage notifications</p>
        </div>
        <button className="bo-btn bo-btn-primary" style={{ background: '#059669' }} onClick={() => setShowCreate(true)}>
          <PlusCircle size={14} /> New Notification
        </button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>{error}</span><button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}>×</button></div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

      <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="page-loading-screen" style={{ padding: 40 }}>
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
        ) : notifications.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Bell size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 500 }}>No notifications yet</div>
            <div style={{ color: 'var(--bo-text-muted)', fontSize: 12, marginTop: 4 }}>Create one to notify students and faculty</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 0 }}>
            {notifications.map(n => (
              <div key={n.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--bo-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bo-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                    {priorityBadge(n.priority || 'NORMAL')}
                    {n.audience && (
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: '#F3F4F6', color: 'var(--bo-text-secondary)' }}>
                        {n.audience}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', margin: 0, lineHeight: 1.5 }}>{n.message}</p>
                  <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 6 }}>
                    {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <button onClick={() => handleDelete(n.id)} style={{ padding: 5, border: '1px solid var(--bo-border)', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', color: '#EF4444', marginLeft: 12 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--bo-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Create Notification</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Title <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Notification title" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Message <span style={{ color: '#EF4444' }}>*</span></label>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required placeholder="Write your notification message..." rows={4} style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' }))} style={inputStyle}>
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Target Audience</label>
                  <select value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value as 'ALL' | 'FACULTY' | 'STUDENTS' }))} style={inputStyle}>
                    <option value="ALL">All</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="FACULTY">Faculty Only</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="bo-btn bo-btn-outline" onClick={() => setShowCreate(false)} disabled={modalLoading}>Cancel</button>
                <button type="submit" className="bo-btn bo-btn-primary" style={{ background: '#059669' }} disabled={modalLoading}>
                  <Send size={14} /> {modalLoading ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CollegeLayout>
  );
};

export default CollegeNotifications;
