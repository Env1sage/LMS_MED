import React from 'react';

// ── Layout Components ──

export const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="page-wrapper" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bo-bg, #f8f9fa)' }}>
    {children}
  </div>
);

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

interface GlassSidebarProps {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  activeTab: string;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  children?: React.ReactNode;
}

export const GlassSidebar: React.FC<GlassSidebarProps> = ({
  title, subtitle, navItems, activeTab, userName, userRole, onLogout, children
}) => (
  <aside className="glass-sidebar" style={{
    width: 260, minHeight: '100vh', background: 'var(--bo-card-bg, #fff)',
    borderRight: '1px solid var(--bo-border, #e5e7eb)', padding: '24px 0',
    display: 'flex', flexDirection: 'column', flexShrink: 0
  }}>
    <div style={{ padding: '0 20px', marginBottom: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--bo-text-primary, #111)', margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--bo-text-muted, #9ca3af)', margin: '4px 0 0' }}>{subtitle}</p>}
    </div>
    <nav style={{ flex: 1 }}>
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={item.onClick}
          className={`glass-nav-item ${activeTab === item.id ? 'glass-nav-item-active' : ''}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '10px 20px', border: 'none', background: activeTab === item.id ? 'var(--bo-accent, #6366f1)10' : 'transparent',
            color: activeTab === item.id ? 'var(--bo-accent, #6366f1)' : 'var(--bo-text-secondary, #6b7280)',
            fontSize: 14, fontWeight: activeTab === item.id ? 600 : 400,
            cursor: 'pointer', textAlign: 'left', borderLeft: activeTab === item.id ? '3px solid var(--bo-accent, #6366f1)' : '3px solid transparent',
            transition: 'all 0.15s'
          }}
        >
          <span className="glass-nav-icon" style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
          <span className="glass-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
    {children}
    {userName && (
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--bo-border, #e5e7eb)', marginTop: 'auto' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text-primary, #111)' }}>{userName}</div>
        {userRole && <div style={{ fontSize: 11, color: 'var(--bo-text-muted, #9ca3af)', marginTop: 2 }}>{userRole}</div>}
        {onLogout && (
          <button onClick={onLogout} style={{
            marginTop: 10, padding: '6px 12px', fontSize: 12, border: '1px solid var(--bo-border, #e5e7eb)',
            borderRadius: 6, background: '#fff', cursor: 'pointer', color: 'var(--bo-text-secondary, #6b7280)'
          }}>Logout</button>
        )}
      </div>
    )}
  </aside>
);

export const GlassContentArea: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="glass-content-area" style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
    {children}
  </main>
);

export const GlassContentHeader: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="glass-content-header" style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24
  }}>
    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary, #111)', margin: 0 }}>{title}</h1>
    {children}
  </div>
);

interface GlassStatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  badge?: { text: string; variant?: string };
  onClick?: () => void;
}

export const GlassStatCard: React.FC<GlassStatCardProps> = ({ icon, value, label, badge, onClick }) => (
  <div className="glass-stat-card bo-card" onClick={onClick} style={{
    padding: 20, cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.15s', borderRadius: 12
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      {badge && (
        <span style={{
          padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
          background: badge.variant === 'success' ? '#D1FAE5' : '#E5E7EB',
          color: badge.variant === 'success' ? '#065F46' : '#374151',
          cursor: 'pointer'
        }}>{badge.text}</span>
      )}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--bo-text-primary, #111)' }}>{value}</div>
    <div style={{ fontSize: 13, color: 'var(--bo-text-muted, #9ca3af)', marginTop: 4 }}>{label}</div>
  </div>
);

// ── Icon Components ──

interface IconProps {
  size?: number;
  color?: string;
}

export const ChartBarIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" />
  </svg>
);

export const BookOpenIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export const VideoCameraIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

export const DocumentTextIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const ArrowLeftIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
