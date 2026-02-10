import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Globe2, BookOpen, Award,
  BarChart3, Shield, Settings, LogOut, Sparkles, Package
} from 'lucide-react';
import '../styles/bitflow-owner.css';

interface SidebarProps {
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Building2, label: 'Publishers', path: '/publishers' },
    { icon: Globe2, label: 'Colleges', path: '/colleges' },
    { icon: Award, label: 'Competencies', path: '/competencies' },
    { icon: BookOpen, label: 'Content', path: '/content' },
    { icon: Package, label: 'Packages', path: '/packages' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Shield, label: 'Activity Logs', path: '/activity-logs' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="bo-sidebar">
      <div className="bo-sidebar-logo">
        <div className="bo-sidebar-logo-icon">
          <Sparkles size={20} />
        </div>
        <div className="bo-sidebar-logo-text">
          <h2>Bitflow LMS</h2>
          <span>Owner Portal</span>
        </div>
      </div>

      <div className="bo-sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`bo-nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon size={19} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="bo-sidebar-user">
        <div className="bo-sidebar-user-info">
          <div className="bo-sidebar-avatar">BO</div>
          <div>
            <div className="bo-sidebar-user-name">Bitflow Owner</div>
            <div className="bo-sidebar-user-email">owner@bitflow.com</div>
          </div>
        </div>
        <button className="bo-logout-btn" onClick={onLogout}>
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </div>
  );
};
