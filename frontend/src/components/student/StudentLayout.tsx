import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api.service';
import {
  LayoutDashboard, BookOpen, ClipboardList, Library, BarChart3,
  Calendar, Target, User, LogOut, Bell
} from 'lucide-react';
import '../../styles/bitflow-owner.css';

interface StudentLayoutProps {
  children: React.ReactNode;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    apiService.get('/student-portal/notifications/unread-count')
      .then(res => setUnreadCount(res.data?.count || 0))
      .catch(() => {});
  }, []);

  const navItems = [
    { path: '/student', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true },
    { path: '/student/courses', label: 'My Courses', icon: <BookOpen size={18} /> },
    { path: '/student/assignments', label: 'Assignments', icon: <ClipboardList size={18} /> },
    { path: '/student/library', label: 'Library', icon: <Library size={18} /> },
    { path: '/student/self-paced', label: 'Self-Paced Learning', icon: <Target size={18} /> },
    { path: '/student/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { path: '/student/schedule', label: 'Schedule', icon: <Calendar size={18} /> },
    { path: '/student/guest-lectures', label: 'Guest Lectures', icon: <Target size={18} /> },
    { path: '/student/profile', label: 'Profile', icon: <User size={18} /> },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bo-bg)' }}>
      {/* Sidebar */}
      <div style={{
        width: 260, background: '#fff', borderRight: '1px solid var(--bo-border)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 50,
      }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--bo-border)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#3B82F6', cursor: 'pointer' }} onClick={() => navigate('/student')}>
            🎓 Student Portal
          </div>
          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>
            {user?.fullName || 'Student'}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                marginBottom: 2, fontSize: 14, fontWeight: isActive(item) ? 600 : 400,
                background: isActive(item) ? '#EFF6FF' : 'transparent',
                color: isActive(item) ? '#3B82F6' : 'var(--bo-text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid var(--bo-border)' }}>
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
      <div style={{ flex: 1, marginLeft: 260, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top bar with bell */}
        <div style={{
          height: 56, background: '#fff', borderBottom: '1px solid var(--bo-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 32px', position: 'sticky', top: 0, zIndex: 40, flexShrink: 0,
        }}>
          <button
            onClick={() => navigate('/student/notifications')}
            style={{
              position: 'relative', background: 'transparent', border: 'none',
              cursor: 'pointer', padding: 8, borderRadius: 8, color: 'var(--bo-text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                minWidth: 16, height: 16, borderRadius: 8,
                background: '#EF4444', color: '#fff',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default StudentLayout;
