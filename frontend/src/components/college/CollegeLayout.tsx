import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, GraduationCap, Building2, UserCog,
  Bell, BarChart3, Package, Settings, LogOut, Upload, TrendingUp, BookOpen, Target, ChevronRight, ClipboardList,
} from 'lucide-react';
import apiService from '../../services/api.service';
import governanceService from '../../services/governance.service';
import { getAuthImageUrl } from '../../utils/imageUrl';
import '../../styles/bitflow-owner.css';

interface CollegeLayoutProps {
  children: React.ReactNode;
}

const CollegeLayout: React.FC<CollegeLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [collegeName, setCollegeName] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    apiService.get('/college/profile')
      .then((res: any) => {
        setLogoUrl(res.data?.logoUrl || '');
        setCollegeName(res.data?.name || '');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await governanceService.getUnreadNotificationCount();
        setUnreadCount(res?.count || 0);
      } catch { /* silent */ }
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const isDean = user?.role === 'COLLEGE_DEAN';

  const navItems = [
    { path: '/college-admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true },
    { path: '/college-admin/students', label: 'Students', icon: <GraduationCap size={18} /> },
    { path: '/college-admin/faculty', label: 'Faculty', icon: <UserCog size={18} /> },
    { path: '/college-admin/departments', label: 'Departments', icon: <Building2 size={18} /> },
    { path: '/college-admin/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { path: '/college-admin/teacher-performance', label: 'Teacher Performance', icon: <TrendingUp size={18} /> },
    { path: '/college-admin/student-performance', label: 'Student Performance', icon: <Target size={18} /> },
    { path: '/college-admin/course-analysis', label: 'Course Analysis', icon: <BookOpen size={18} /> },
    ...(isDean ? [{ path: '/college-admin/maker-checker-logs', label: 'Approval Audit Log', icon: <ClipboardList size={18} /> }] : []),
    { path: '/college-admin/packages', label: 'Content Packages', icon: <Package size={18} /> },
    { path: '/college-admin/teacher-content', label: 'Teacher Content', icon: <BookOpen size={18} /> },
    { path: '/college-admin/notifications', label: 'Notifications', icon: <Bell size={18} />, badge: unreadCount },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/college-admin')}>
            {logoUrl ? (
              <img
                src={getAuthImageUrl(logoUrl)}
                alt="College Logo"
                style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--bo-border)', flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏥</div>
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#059669', lineHeight: 1.2 }}>
                {collegeName || 'College Admin'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>College Portal</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 8 }}>
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
                transition: 'all 0.15s', position: 'relative',
              }}
            >
              {item.icon} {item.label}
              {'badge' in item && (item as any).badge > 0 && (
                <span style={{
                  marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9,
                  background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                }}>
                  {(item as any).badge > 99 ? '99+' : (item as any).badge}
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

      {/* Main Content */}
      <div style={{ flex: 1, marginLeft: 260, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top Bar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40, height: 56,
          background: '#fff', borderBottom: '1px solid var(--bo-border)',
          display: 'flex', alignItems: 'center', padding: '0 32px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <ChevronRight size={14} style={{ color: 'var(--bo-text-muted)' }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)', marginLeft: 4 }}>
            {navItems.find(n => isActive(n))?.label || 'College Admin'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/college-admin/notifications')}
              style={{
                position: 'relative', border: 'none', cursor: 'pointer',
                width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: unreadCount > 0 ? '#FEF2F2' : 'var(--bo-bg)',
                transition: 'background 0.15s',
              }}
              title="Notifications"
            >
              <Bell size={20} style={{ color: unreadCount > 0 ? '#EF4444' : 'var(--bo-text-secondary)' }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16,
                  borderRadius: 8, background: '#EF4444', color: '#fff',
                  fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: '0 4px', border: '2px solid #fff', lineHeight: 1,
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <div
              onClick={() => navigate('/college-admin/profile')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 10px', borderRadius: 10 }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #059669, #34D399)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {user?.fullName?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text-primary)', lineHeight: 1.2 }}>
                  {user?.fullName?.split(' ')[0] || 'Admin'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--bo-text-muted)', lineHeight: 1.2 }}>College Admin</span>
              </div>
            </div>
          </div>
        </header>
        <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollegeLayout;
