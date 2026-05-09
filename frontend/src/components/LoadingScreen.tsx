import React from 'react';
import '../styles/loading-screen.css';

interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading', 
  subtitle = 'Please wait while we prepare your content' 
}) => {
  return (
    <div className="loading-screen">
      <div className="loading-screen-content">
        {/* Orbital Spinner */}
        <div className="loading-logo">
          <div className="loading-logo-ring"></div>
          <div className="loading-logo-ring loading-logo-ring-2"></div>
          <div className="loading-logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z" fill="url(#lsGrad)" opacity="0.12"/>
              <path d="M12 3.5L4.5 7.75V12C4.5 16.78 7.86 21.21 12 22.4C16.14 21.21 19.5 16.78 19.5 12V7.75L12 3.5Z" stroke="url(#lsGrad)" strokeWidth="1.2" fill="none"/>
              <path d="M9 12.5L11 14.5L15.5 10" stroke="url(#lsGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="lsGrad" x1="3" y1="2" x2="21" y2="24">
                  <stop offset="0%" stopColor="#6366F1"/>
                  <stop offset="100%" stopColor="#8B5CF6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="loading-text">
          <h2 className="loading-title">
            {message}
            <span className="loading-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </h2>
          <p className="loading-subtitle">{subtitle}</p>
        </div>

        {/* Progress Bar */}
        <div className="loading-bar">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
