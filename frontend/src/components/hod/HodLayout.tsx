import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, GraduationCap, UserCog, BarChart3,
  Bell, BookOpen, TrendingUp, LogOut, Target, User, BookMarked, Calendar, ClipboardList, ChevronRight, ShieldCheck,
} from 'lucide-react';
import apiService from '../../services/api.service';
import governanceService from '../../services/governance.service';
import { courseService } from '../../services/course.service';
import facultyAssignmentService from '../../services/faculty-assignment.service';
import { getAuthImageUrl } from '../../utils/imageUrl';
import '../../styles/bitflow-owner.css';

interface HodLayoutProps { children: React.ReactNode; }

const HodLayout: React.FC<HodLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [logoUrl, setLogoUrl] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [pendingCourseCount, setPendingCourseCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    apiService.get('/college/profile')
      .then((res: any) => { setLogoUrl(res.data?.logoUrl || ''); setCollegeName(res.data?.name || ''); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadReviewCount = async () => {
      try {
        const tasks = await governanceService.getAssignedTasks();
        const count = (Array.isArray(tasks) ? tasks : []).filter((t: any) => t.status === 'SUBMITTED').length;
        setPendingReviewCount(count);
      } catch { /* silent */ }
    };
    loadReviewCount();
    const iv = setInterval(loadReviewCount, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const loadPendingApprovals = async () => {
      try {
        const [tests, notifs, lectures] = await Promise.allSettled([
          facultyAssignmentService.getPendingTests(),
          facultyAssignmentService.getPendingNotifications(),
          facultyAssignmentService.getPendingLectures(),
        ]);
        const count =
          (tests.status === 'fulfilled' ? tests.value.length : 0) +
          (notifs.status === 'fulfilled' ? notifs.value.length : 0) +
          (lectures.status === 'fulfilled' ? lectures.value.length : 0);
        setPendingApprovalsCount(count);
      } catch { /* silent */ }
    };
    loadPendingApprovals();
    const iv = setInterval(loadPendingApprovals, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const loadPendingCourses = async () => {
      try {
        const courses = await courseService.getPendingReview();
        setPendingCourseCount(Array.isArray(courses) ? courses.length : 0);
      } catch { /* silent */ }
    };
    loadPendingCourses();
    const iv = setInterval(loadPendingCourses, 60000);
    return () => clearInterval(iv);
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

  const navItems = [
    { path: '/hod', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true },
    { path: '/hod/students', label: 'Students', icon: <GraduationCap size={18} /> },
    { path: '/hod/faculty', label: 'Faculty & Tasks', icon: <UserCog size={18} /> },
    { path: '/hod/pending-approvals', label: 'Pending Approvals', icon: <ShieldCheck size={18} />, badge: pendingApprovalsCount },
    { path: '/hod/assigned-tasks', label: 'Assigned Tasks', icon: <ClipboardList size={18} />, badge: pendingReviewCount },
    { path: '/hod/courses', label: 'My Courses', icon: <BookMarked size={18} />, badge: pendingCourseCount },
    { path: '/hod/online-meetings', label: 'Online Meetings', icon: <Calendar size={18} /> },
    { path: '/hod/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { path: '/hod/teacher-performance', label: 'Teacher Performance', icon: <TrendingUp size={18} /> },
    { path: '/hod/student-performance', label: 'Student Performance', icon: <Target size={18} /> },
    { path: '/hod/course-analysis', label: 'Course Analysis', icon: <BookOpen size={18} /> },
    { path: '/hod/notifications', label: 'Notifications', icon: <Bell size={18} />, badge: unreadCount },
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
                transition: 'all 0.15s', position: 'relative',
              }}
            >
              {item.icon} {item.label}
              {'badge' in item && item.badge != null && item.badge > 0 && (
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
            {navItems.find(n => isActive(n))?.label || 'HOD Portal'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/hod/notifications')}
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
              onClick={() => navigate('/hod/profile')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 10px', borderRadius: 10 }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563EB, #60A5FA)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {user?.fullName?.charAt(0)?.toUpperCase() || 'H'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text-primary)', lineHeight: 1.2 }}>
                  {user?.fullName?.split(' ')[0] || 'HOD'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--bo-text-muted)', lineHeight: 1.2 }}>Head of Dept.</span>
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

export default HodLayout;
