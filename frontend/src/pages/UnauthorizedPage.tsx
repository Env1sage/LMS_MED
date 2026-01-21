import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto redirect to login after 2 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
        <h1 style={{ color: '#333', marginBottom: '16px' }}>Authentication Required</h1>
        <p style={{ color: '#666', marginBottom: '24px', lineHeight: '1.6' }}>
          You need to log in to access this page.<br />
          Redirecting to login page...
        </p>
        <div style={{
          display: 'inline-block',
          padding: '8px 16px',
          backgroundColor: '#4F46E5',
          color: 'white',
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          Redirecting in 2 seconds...
        </div>
        <div style={{ marginTop: '24px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Go to Login Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
