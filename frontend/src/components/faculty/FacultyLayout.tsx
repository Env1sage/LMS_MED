import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, BookOpen, PlusCircle, Users, BarChart3,
  Bell, FileText, Settings, LogOut, GraduationCap, TrendingUp, ClipboardList
} from 'lucide-react';
import '../../styles/bitflow-owner.css';

interface FacultyLayoutProps {
  children: React.ReactNode;
}

const FacultyLayout: React.FC<FacultyLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/faculty', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true },
    { path: '/faculty/courses', label: 'My Courses', icon: <BookOpen size={18} /> },
    { path: '/faculty/create-course', label: 'Create Course', icon: <PlusCircle size={18} /> },
    { path: '/faculty/assignments', label: 'Assignments', icon: <ClipboardList size={18} /> },
    { path: '/faculty/students', label: 'My Students', icon: <GraduationCap size={18} /> },
    { path: '/faculty/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { path: '/faculty/self-paced', label: 'Self-Paced Resources', icon: <FileText size={18} /> },
    { path: '/faculty/notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { path: '/faculty/profile', label: 'My Profile', icon: <Settings size={18} /> },
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
      <div style={{ flex: 1, marginLeft: 260, padding: 32, overflowY: 'auto', minHeight: '100vh' }}>
        {children}
      </div>
    </div>
  );
};

export default FacultyLayout;
