import React from 'react';
import { NavLink } from 'react-router-dom';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface AppSidebarProps {
  navItems: NavItem[];
  collapsed?: boolean;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ navItems, collapsed = false }) => {
  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav style={{ padding: 'var(--space-sm) 0' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AppSidebar;
