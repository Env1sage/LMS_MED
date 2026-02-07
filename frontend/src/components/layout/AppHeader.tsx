import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../notifications';

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        {onMenuToggle && (
          <button 
            className="btn btn-outline btn-sm"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
            style={{ minHeight: '36px' }}
          >
            ☰
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            background: 'var(--primary-blue)', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 600
          }}>
            B
          </div>
          <h1 style={{ 
            fontSize: 'var(--font-size-section-title)', 
            fontWeight: 600,
            margin: 0 
          }}>
            BITFLOW Medical LMS
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Global Search */}
        <div style={{ position: 'relative', width: '300px' }}>
          <input 
            type="search"
            placeholder="Search..."
            className="input"
            style={{ 
              height: '36px',
              paddingLeft: '36px',
              fontSize: '13px'
            }}
          />
          <span style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }}>
            🔍
          </span>
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Profile Menu */}
        <div style={{ position: 'relative' }}>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{ 
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--primary-blue)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600
            }}>
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span>{user?.fullName || 'User'}</span>
            <span style={{ fontSize: '10px' }}>▼</span>
          </button>

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              background: 'var(--bg-card)',
              border: 'var(--border-subtle)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-floating)',
              minWidth: '200px',
              zIndex: 1000
            }}>
              <div style={{ 
                padding: 'var(--space-md)',
                borderBottom: 'var(--border-subtle)'
              }}>
                <div style={{ fontWeight: 600 }}>{user?.fullName}</div>
                <div style={{ 
                  fontSize: 'var(--font-size-meta)',
                  color: 'var(--text-secondary)'
                }}>
                  {user?.role}
                </div>
              </div>
              <div style={{ padding: 'var(--space-sm)' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleLogout}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
