import React, { useState } from 'react';
import AppHeader from './AppHeader';
import AppSidebar, { NavItem } from './AppSidebar';

interface AppShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
}

const AppShell: React.FC<AppShellProps> = ({ children, navItems }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="app-shell">
      <AppHeader onMenuToggle={toggleSidebar} />
      <AppSidebar 
        navItems={navItems} 
        collapsed={sidebarCollapsed}
      />
      <main className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default AppShell;
