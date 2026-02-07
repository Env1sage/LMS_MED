import React from 'react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ 
  title = 'Error', 
  message,
  onDismiss 
}) => {
  return (
    <div className="error-banner" role="alert">
      <div className="error-banner-icon">⚠️</div>
      <div className="error-banner-content">
        <div className="error-banner-title">{title}</div>
        <div className="error-banner-message">{message}</div>
      </div>
      {onDismiss && (
        <button 
          className="btn btn-sm" 
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
