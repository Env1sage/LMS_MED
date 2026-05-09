import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, BookOpen, ClipboardList, User, LogOut,
  PlusCircle, Upload, HardDrive
} from 'lucide-react';
import apiService from '../../services/api.service';
import { getAuthImageUrl } from '../../utils/imageUrl';
import '../../styles/bitflow-owner.css';

interface PublisherLayoutProps {
  children: React.ReactNode;
}

const PublisherLayout: React.FC<PublisherLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [publisherName, setPublisherName] = useState<string>('');

  useEffect(() => {
    apiService.get('/publisher/profile')
      .then((res: any) => {
        setLogoUrl(res.data?.logoUrl || '');
        setPublisherName(res.data?.companyName || '');
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { path: '/publisher-admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true },
    { path: '/publisher-admin/content', label: 'Learning Units', icon: <BookOpen size={18} /> },
    { path: '/publisher-admin/create', label: 'Create Content', icon: <PlusCircle size={18} /> },
    { path: '/publisher-admin/bulk-upload', label: 'Bulk Upload', icon: <Upload size={18} /> },
    { path: '/publisher-admin/upload-hub', label: 'File Upload Hub', icon: <HardDrive size={18} /> },
    { path: '/publisher-admin/mcqs', label: 'MCQ Management', icon: <ClipboardList size={18} /> },
    { path: '/publisher-admin/profile', label: 'Profile', icon: <User size={18} /> },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/publisher-admin')}>
            {logoUrl ? (
              <img
                src={getAuthImageUrl(logoUrl)}
                alt="Publisher Logo"
                style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--bo-border)', flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bo-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📚</div>
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--bo-primary)', lineHeight: 1.2 }}>
                {publisherName || 'Publisher Studio'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Publisher Portal</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 8 }}>
            {user?.fullName || 'Publisher Admin'}
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
                background: isActive(item) ? 'var(--bo-primary-light)' : 'transparent',
                color: isActive(item) ? 'var(--bo-primary)' : 'var(--bo-text-secondary)',
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

export default PublisherLayout;
