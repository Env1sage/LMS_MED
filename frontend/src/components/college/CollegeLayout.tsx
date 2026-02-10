import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, GraduationCap, Building2, UserCog,
  Bell, BarChart3, Package, Settings, LogOut, Upload, TrendingUp, BookOpen, Target
} from 'lucide-react';
import '../../styles/bitflow-owner.css';

interface CollegeLayoutProps {
  children: React.ReactNode;
}

const CollegeLayout: React.FC<CollegeLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/college-admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true },
    { path: '/college-admin/students', label: 'Students', icon: <GraduationCap size={18} /> },
    { path: '/college-admin/faculty', label: 'Faculty', icon: <UserCog size={18} /> },
    { path: '/college-admin/departments', label: 'Departments', icon: <Building2 size={18} /> },
    { path: '/college-admin/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { path: '/college-admin/teacher-performance', label: 'Teacher Performance', icon: <TrendingUp size={18} /> },
    { path: '/college-admin/student-performance', label: 'Student Performance', icon: <Target size={18} /> },
    { path: '/college-admin/course-analysis', label: 'Course Analysis', icon: <BookOpen size={18} /> },
    { path: '/college-admin/packages', label: 'Content Packages', icon: <Package size={18} /> },
    { path: '/college-admin/notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { path: '/college-admin/bulk-upload', label: 'Bulk Upload', icon: <Upload size={18} /> },
    { path: '/college-admin/profile', label: 'College Profile', icon: <Settings size={18} /> },
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
          <div style={{ fontSize: 18, fontWeight: 700, color: '#059669', cursor: 'pointer' }} onClick={() => navigate('/college-admin')}>
            🏥 College Admin
          </div>
          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>
            {user?.fullName || 'College Administrator'}
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
                background: isActive(item) ? '#ECFDF5' : 'transparent',
                color: isActive(item) ? '#059669' : 'var(--bo-text-secondary)',
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

export default CollegeLayout;
