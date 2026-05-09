import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md';
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ size = 'md', fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9999,
        }}
      >
        <div className={`spinner ${size === 'sm' ? 'spinner-sm' : ''}`} />
      </div>
    );
  }

  return <div className={`spinner ${size === 'sm' ? 'spinner-sm' : ''}`} />;
};
