import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

interface MainLayoutProps {
  children?: React.ReactNode;
  loading?: boolean;
  loadingMessage?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, loading = false, loadingMessage = 'Loading' }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="bo-layout">
      <Sidebar onLogout={handleLogout} />
      <div className="bo-main">
        {loading ? (
          <div className="page-loading-screen">
            <div className="page-loading-content">
              <div className="ls-orb">
                <div className="ls-orb-ring" />
                <div className="ls-orb-ring-inner" />
                <div className="ls-orb-core">
                  <span className="ls-orb-dot" />
                  <span className="ls-orb-dot" />
                  <span className="ls-orb-dot" />
                </div>
              </div>
              <h3 className="ls-title">{loadingMessage}</h3>
              <div className="ls-bar">
                <div className="ls-bar-fill" />
              </div>
            </div>
          </div>
        ) : children}
      </div>
    </div>
  );
};

export default MainLayout;
