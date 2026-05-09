import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import HodLayout from '../../components/hod/HodLayout';
import governanceService, { Notification } from '../../services/governance.service';
import {
  GraduationCap, UserCog, BarChart3, Bell, BookOpen,
  TrendingUp, Target, Users, ChevronRight, Calendar,
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#2563EB';

const HodDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studRes, notifRes] = await Promise.allSettled([
          governanceService.getHodStudents({ page: 1, limit: 1 }),
          governanceService.getNotifications(),
        ]);
        if (studRes.status === 'fulfilled') {
          setStudentCount(studRes.value.meta?.total ?? 0);
        }
        if (notifRes.status === 'fulfilled') {
          setNotifications((notifRes.value as Notification[]).slice(0, 5));
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const quickLinks = [
    { label: 'Students', icon: <GraduationCap size={22} />, path: '/hod/students', color: '#059669', bg: '#ECFDF5', desc: 'View your department students' },
    { label: 'Faculty', icon: <UserCog size={22} />, path: '/hod/faculty', color: '#7C3AED', bg: '#F5F3FF', desc: 'Department faculty members' },
    { label: 'Analytics', icon: <BarChart3 size={22} />, path: '/hod/analytics', color: '#2563EB', bg: '#EFF6FF', desc: 'Course & student analytics' },
    { label: 'Teacher Performance', icon: <TrendingUp size={22} />, path: '/hod/teacher-performance', color: '#D97706', bg: '#FFFBEB', desc: 'Faculty performance reports' },
    { label: 'Student Performance', icon: <Target size={22} />, path: '/hod/student-performance', color: '#DC2626', bg: '#FEF2F2', desc: 'Student progress & scores' },
    { label: 'Course Analysis', icon: <BookOpen size={22} />, path: '/hod/course-analysis', color: '#0891B2', bg: '#F0F9FF', desc: 'Course completion data' },
    { label: 'Online Meetings', icon: <Calendar size={22} />, path: '/hod/online-meetings', color: '#7C3AED', bg: '#F5F3FF', desc: 'Schedule & manage meetings' },
    { label: 'Notifications', icon: <Bell size={22} />, path: '/hod/notifications', color: '#9333EA', bg: '#FAF5FF', desc: 'Department announcements' },
  ];

  if (loading) return (
    <HodLayout>
      <div className="page-loading-screen">
        <div className="loading-rings">
          <div className="loading-ring loading-ring-1" />
          <div className="loading-ring loading-ring-2" />
          <div className="loading-ring loading-ring-3" />
        </div>
        <div className="loading-title">Loading Dashboard</div>
      </div>
    </HodLayout>
  );

  return (
    <HodLayout>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
          Welcome, {user?.fullName?.split(' ')[0] || 'HOD'}
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>
          Head of Department — manage your department from here
        </p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Students', value: studentCount, color: '#059669', icon: <Users size={20} /> },
          { label: 'My Role', value: 'Department HOD', color: ACCENT, icon: <UserCog size={20} /> },
          { label: 'Notifications', value: notifications.length, color: '#9333EA', icon: <Bell size={20} /> },
        ].map((s, i) => (
          <div key={i} className="bo-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Quick Access</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {quickLinks.map(link => (
            <button key={link.path} onClick={() => navigate(link.path)}
              className="bo-card"
              style={{
                padding: 18, textAlign: 'left', cursor: 'pointer', border: 'none',
                background: 'white', display: 'flex', alignItems: 'flex-start', gap: 14,
                transition: 'box-shadow 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: link.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: link.color, flexShrink: 0 }}>
                {link.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 2 }}>{link.label}</div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{link.desc}</div>
              </div>
              <ChevronRight size={16} color="var(--bo-text-muted)" style={{ marginTop: 4, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Notifications</h2>
            <button onClick={() => navigate('/hod/notifications')} className="bo-btn bo-btn-outline" style={{ fontSize: 12, padding: '6px 12px' }}>View All</button>
          </div>
          <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
            {notifications.map((n, i) => (
              <div key={n.id} style={{
                padding: '14px 18px', borderBottom: i < notifications.length - 1 ? '1px solid var(--bo-border)' : 'none',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text-primary)' }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>{n.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </HodLayout>
  );
};

export default HodDashboard;
