import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import {
  LayoutDashboard, Users, Building, Bell, LogOut,
  RefreshCw, UserCheck, AlertCircle
} from 'lucide-react';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

interface Department {
  id: string;
  name: string;
  code: string;
  hodUserId?: string;
  _count?: { students: number; faculty_assignments: number };
}

interface FacultyUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  createdAt: string;
  isRead?: boolean;
}

const DeanDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'faculty' | 'notifications'>('overview');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculty, setFaculty] = useState<FacultyUser[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [deptRes, facRes, notifRes] = await Promise.allSettled([
        apiService.get('/governance/departments'),
        apiService.get('/governance/faculty-users'),
        apiService.get('/governance/notifications/my-notifications'),
      ]);
      if (deptRes.status === 'fulfilled') {
        const d = deptRes.value.data?.data || deptRes.value.data || [];
        setDepartments(Array.isArray(d) ? d : []);
      }
      if (facRes.status === 'fulfilled') {
        const f = facRes.value.data?.data || facRes.value.data || [];
        setFaculty(Array.isArray(f) ? f : []);
      }
      if (notifRes.status === 'fulfilled') {
        const n = notifRes.value.data?.data || notifRes.value.data || [];
        setNotifications(Array.isArray(n) ? n : []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await apiService.post(`/governance/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH': case 'URGENT': return 'var(--bo-danger)';
      case 'MEDIUM': return 'var(--bo-warning)';
      default: return 'var(--bo-primary)';
    }
  };

  if (loading) {
    return (
      <div className="bo-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
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
          <div className="loading-title">Loading Dean Portal</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bo-bg)' }}>
      {/* Sidebar */}
      <div style={{
        width: 260, background: '#fff', borderRight: '1px solid var(--bo-border)',
        display: 'flex', flexDirection: 'column', padding: '20px 0',
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--bo-border)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bo-primary)' }}>Dean Portal</div>
          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>
            {user?.fullName}
          </div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {[
            { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
            { id: 'departments', label: 'Departments', icon: <Building size={18} /> },
            { id: 'faculty', label: 'Faculty', icon: <Users size={18} /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, badge: notifications.filter(n => !n.isRead).length },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                marginBottom: 4, fontSize: 14, fontWeight: activeTab === item.id ? 600 : 400,
                background: activeTab === item.id ? 'var(--bo-primary-light)' : 'transparent',
                color: activeTab === item.id ? 'var(--bo-primary)' : 'var(--bo-text-secondary)',
              }}
            >
              {item.icon} {item.label}
              {item.badge ? (
                <span style={{
                  marginLeft: 'auto', background: 'var(--bo-danger)', color: '#fff',
                  borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600,
                }}>{item.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px 12px', borderTop: '1px solid var(--bo-border)' }}>
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--bo-danger)', fontSize: 14,
            }}
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {error && (
          <div style={{ padding: '12px 16px', background: 'var(--bo-danger-light)', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--bo-danger)', marginBottom: 20, fontSize: 14 }}>
            <AlertCircle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> {error}
          </div>
        )}

        {/* Overview */}
        {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text)' }}>
                Welcome, {user?.fullName}
              </h1>
              <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>Dean Dashboard — College Overview</p>
            </div>

            <div className="bo-stats-grid" style={{ marginBottom: 28 }}>
              {[
                { label: 'Departments', value: departments.length, color: 'var(--bo-primary)', icon: <Building size={20} /> },
                { label: 'Faculty Members', value: faculty.length, color: 'var(--bo-success)', icon: <Users size={20} /> },
                { label: 'Active Faculty', value: faculty.filter(f => f.status === 'ACTIVE').length, color: '#10B981', icon: <UserCheck size={20} /> },
                { label: 'Unread Notifications', value: notifications.filter(n => !n.isRead).length, color: 'var(--bo-warning)', icon: <Bell size={20} /> },
              ].map((s, i) => (
                <div key={i} className="bo-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', fontWeight: 500 }}>{s.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginTop: 8 }}>{s.value}</div>
                    </div>
                    <div style={{ color: s.color, opacity: 0.3 }}>{s.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Lists */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="bo-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>Departments</h3>
                  <button className="bo-btn bo-btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setActiveTab('departments')}>View All</button>
                </div>
                {departments.slice(0, 5).map(dept => (
                  <div key={dept.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bo-border)', fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{dept.name}</span>
                    <span style={{ color: 'var(--bo-text-muted)' }}>{dept.code}</span>
                  </div>
                ))}
                {departments.length === 0 && <div style={{ color: 'var(--bo-text-muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>No departments</div>}
              </div>

              <div className="bo-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>Recent Notifications</h3>
                  <button className="bo-btn bo-btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setActiveTab('notifications')}>View All</button>
                </div>
                {notifications.slice(0, 5).map(notif => (
                  <div key={notif.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--bo-border)', fontSize: 13, opacity: notif.isRead ? 0.6 : 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: getPriorityColor(notif.priority), marginTop: 6, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{notif.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{new Date(notif.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && <div style={{ color: 'var(--bo-text-muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>No notifications</div>}
              </div>
            </div>
          </>
        )}

        {/* Departments */}
        {activeTab === 'departments' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text)' }}>Departments</h1>
              <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>View department information and structure</p>
            </div>
            <div className="bo-card" style={{ overflow: 'hidden' }}>
              {departments.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
                  <Building size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                  <div>No departments found</div>
                </div>
              ) : (
                <table className="bo-table">
                  <thead>
                    <tr>
                      <th>Department Name</th>
                      <th>Code</th>
                      <th>Students</th>
                      <th>Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(dept => (
                      <tr key={dept.id}>
                        <td style={{ fontWeight: 500 }}>{dept.name}</td>
                        <td><span style={{ padding: '2px 8px', background: 'var(--bo-primary-light)', color: 'var(--bo-primary)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{dept.code}</span></td>
                        <td>{dept._count?.students ?? '—'}</td>
                        <td>{dept._count?.faculty_assignments ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Faculty */}
        {activeTab === 'faculty' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text)' }}>Faculty Members</h1>
              <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>View faculty assigned to your college</p>
            </div>
            <div className="bo-card" style={{ overflow: 'hidden' }}>
              {faculty.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
                  <Users size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                  <div>No faculty members found</div>
                </div>
              ) : (
                <table className="bo-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faculty.map(f => (
                      <tr key={f.id}>
                        <td style={{ fontWeight: 500 }}>{f.fullName}</td>
                        <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{f.email}</td>
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: f.status === 'ACTIVE' ? 'var(--bo-success-light)' : '#FEF3C7',
                            color: f.status === 'ACTIVE' ? 'var(--bo-success)' : '#D97706',
                          }}>{f.status}</span>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{f.lastLoginAt ? new Date(f.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text)' }}>Notifications</h1>
                <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>View and manage notifications</p>
              </div>
              <button className="bo-btn bo-btn-outline" onClick={loadAll}><RefreshCw size={16} /> Refresh</button>
            </div>
            {notifications.length === 0 ? (
              <div className="bo-card" style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
                <Bell size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                <div style={{ fontSize: 16 }}>No notifications</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {notifications.map(notif => (
                  <div key={notif.id} className="bo-card" style={{
                    padding: 20, cursor: 'pointer', opacity: notif.isRead ? 0.7 : 1,
                    borderLeft: `3px solid ${getPriorityColor(notif.priority)}`,
                  }} onClick={() => markNotificationRead(notif.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text)' }}>{notif.title}</h4>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                          background: `${getPriorityColor(notif.priority)}15`, color: getPriorityColor(notif.priority),
                        }}>{notif.priority}</span>
                        <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
                      {notif.message}
                    </p>
                    {!notif.isRead && (
                      <span style={{ fontSize: 11, color: 'var(--bo-primary)', fontWeight: 500, marginTop: 8, display: 'inline-block' }}>
                        Click to mark as read
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DeanDashboard;
