import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, GraduationCap, UserCog, BarChart3,
  Bell, BookOpen, TrendingUp, LogOut, Target, User, BookMarked, Calendar,
} from 'lucide-react';
import apiService from '../../services/api.service';
import { getAuthImageUrl } from '../../utils/imageUrl';
import '../../styles/bitflow-owner.css';

interface HodLayoutProps { children: React.ReactNode; }

const HodLayout: React.FC<HodLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [logoUrl, setLogoUrl] = useState('');
  const [collegeName, setCollegeName] = useState('');

  useEffect(() => {
    apiService.get('/college/profile')
      .then((res: any) => { setLogoUrl(res.data?.logoUrl || ''); setCollegeName(res.data?.name || ''); })
      .catch(() => {});
  }, []);

  const navItems = [
    { path: '/hod', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true },
    { path: '/hod/students', label: 'Students', icon: <GraduationCap size={18} /> },
    { path: '/hod/faculty', label: 'Faculty', icon: <UserCog size={18} /> },
    { path: '/hod/courses', label: 'My Courses', icon: <BookMarked size={18} /> },
    { path: '/hod/online-meetings', label: 'Online Meetings', icon: <Calendar size={18} /> },
    { path: '/hod/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { path: '/hod/teacher-performance', label: 'Teacher Performance', icon: <TrendingUp size={18} /> },
    { path: '/hod/student-performance', label: 'Student Performance', icon: <Target size={18} /> },
    { path: '/hod/course-analysis', label: 'Course Analysis', icon: <BookOpen size={18} /> },
    { path: '/hod/notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { path: '/hod/profile', label: 'My Profile', icon: <User size={18} /> },
  ];

  const isActive = (item: typeof navItems[0]) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bo-bg)' }}>
      {/* Sidebar */}
      <div style={{
        width: 260, background: '#fff', borderRight: '1px solid var(--bo-border)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--bo-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/hod')}>
            {logoUrl ? (
              <img src={getAuthImageUrl(logoUrl)} alt="College Logo"
                style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--bo-border)', flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏥</div>
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#2563EB', lineHeight: 1.2 }}>{collegeName || 'HOD Portal'}</div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Head of Department</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 8 }}>
            {user?.fullName || 'HOD'}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {navItems.map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                marginBottom: 2, fontSize: 14, fontWeight: isActive(item) ? 600 : 400,
                background: isActive(item) ? '#EFF6FF' : 'transparent',
                color: isActive(item) ? '#2563EB' : 'var(--bo-text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid var(--bo-border)' }}>
          <button onClick={logout}
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

export default HodLayout;
