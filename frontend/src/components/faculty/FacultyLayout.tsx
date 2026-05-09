import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, BookOpen, PlusCircle, Users, BarChart3,
  Bell, FileText, Settings, LogOut, GraduationCap, ClipboardList,
  ChevronRight,
} from 'lucide-react';
import governanceService from '../../services/governance.service';
import '../../styles/bitflow-owner.css';

interface FacultyLayoutProps {
  children: React.ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  '/faculty': 'Dashboard',
  '/faculty/courses': 'My Courses',
  '/faculty/create-course': 'Create Course',
  '/faculty/assignments': 'Assignments',
  '/faculty/mcq-tests': 'MCQs & Tests',
  '/faculty/guest-lectures': 'Guest Lectures',
  '/faculty/students': 'My Students',
  '/faculty/analytics': 'Analytics',
  '/faculty/notifications': 'Notifications',
  '/faculty/profile': 'My Profile',
  '/faculty/self-paced': 'Self-Paced Resources',
};

const FacultyLayout: React.FC<FacultyLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const res = await governanceService.getUnreadNotificationCount();
        setUnreadCount(res?.count || 0);
      } catch { /* silent — badge just won't show if offline */ }
    };
    loadUnreadCount();
    const iv = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(iv);
  }, []);

  const navItems = [
    { path: '/faculty', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true },
    { path: '/faculty/courses', label: 'My Courses', icon: <BookOpen size={18} /> },
    { path: '/faculty/create-course', label: 'Create Course', icon: <PlusCircle size={18} /> },
    { path: '/faculty/assignments', label: 'Assignments', icon: <ClipboardList size={18} /> },
    { path: '/faculty/mcq-tests', label: 'MCQs & Tests', icon: <FileText size={18} /> },
    { path: '/faculty/guest-lectures', label: 'Guest Lectures', icon: <Users size={18} /> },
    { path: '/faculty/students', label: 'My Students', icon: <GraduationCap size={18} /> },
    { path: '/faculty/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { path: '/faculty/notifications', label: 'Notifications', icon: <Bell size={18} />, badge: unreadCount },
    { path: '/faculty/profile', label: 'My Profile', icon: <Settings size={18} /> },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  // Resolve page title from current path
  const pageTitle = (() => {
    const exact = PAGE_TITLES[location.pathname];
    if (exact) return exact;
    // Dynamic routes
    if (location.pathname.startsWith('/faculty/courses/') && location.pathname.includes('/analytics')) return 'Course Analytics';
    if (location.pathname.startsWith('/faculty/courses/') && location.pathname.includes('/tracking')) return 'Student Tracking';
    if (location.pathname.startsWith('/faculty/courses/') && location.pathname.includes('/students/')) return 'Student Progress';
    if (location.pathname.startsWith('/faculty/courses/')) return 'Course Details';
    if (location.pathname.startsWith('/faculty/assign-course/')) return 'Assign Course';
    if (location.pathname.startsWith('/faculty/edit-course/')) return 'Edit Course';
    return 'Faculty Portal';
  })();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bo-bg)' }}>
      {/* Sidebar */}
      <div style={{
        width: 260, background: '#fff', borderRight: '1px solid var(--bo-border)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 50,
      }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--bo-border)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#7C3AED', cursor: 'pointer' }} onClick={() => navigate('/faculty')}>
            👨‍🏫 Faculty Portal
          </div>
          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>
            {user?.fullName || 'Faculty Member'}
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
                background: isActive(item) ? '#F5F3FF' : 'transparent',
                color: isActive(item) ? '#7C3AED' : 'var(--bo-text-secondary)',
                transition: 'all 0.15s', position: 'relative',
              }}
            >
              {item.icon} {item.label}
              {item.badge != null && item.badge > 0 && (
                <span style={{
                  marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9,
                  background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
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

      {/* Main Column */}
      <div style={{ flex: 1, marginLeft: 260, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top Bar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40, height: 56,
          background: '#fff', borderBottom: '1px solid var(--bo-border)',
          display: 'flex', alignItems: 'center', padding: '0 32px', gap: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          {/* Breadcrumb */}
          <ChevronRight size={14} style={{ color: 'var(--bo-text-muted)' }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)' }}>{pageTitle}</span>

          {/* Right side */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Bell */}
            <button
              onClick={() => navigate('/faculty/notifications')}
              style={{
                position: 'relative', border: 'none', cursor: 'pointer',
                width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--bo-text-secondary)',
                background: unreadCount > 0 ? '#F5F3FF' : 'var(--bo-bg)',
                transition: 'background 0.15s',
              } as React.CSSProperties}
              title="Notifications"
            >
              <Bell size={20} style={{ color: unreadCount > 0 ? '#7C3AED' : undefined }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16,
                  borderRadius: 8, background: '#EF4444', color: '#fff',
                  fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: '0 4px', border: '2px solid #fff',
                  lineHeight: 1,
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* User avatar */}
            <div
              onClick={() => navigate('/faculty/profile')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '6px 10px', borderRadius: 10, transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bo-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {user?.fullName?.charAt(0)?.toUpperCase() || 'F'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text-primary)', lineHeight: 1.2 }}>
                  {user?.fullName?.split(' ')[0] || 'Faculty'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--bo-text-muted)', lineHeight: 1.2 }}>Faculty</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default FacultyLayout;
