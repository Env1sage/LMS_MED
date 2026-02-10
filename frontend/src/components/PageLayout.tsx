import React from 'react';
import { Sidebar } from './Sidebar';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface PageLayoutProps {
  children: React.ReactNode;
  navSections: NavSection[];
  accentColor?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  navSections,
  accentColor,
}) => {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="page-wrapper">
      <Sidebar onLogout={handleLogout} />
      <main className="main-content">{children}</main>
    </div>
  );
};
