import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="loading-container">
      <div className="loading-spinner" role="status" aria-label="Loading"></div>
      {message && <p className="text-muted">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
