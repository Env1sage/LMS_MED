import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Determine the appropriate dashboard for the user's role
  const getRoleDashboard = (role?: string) => {
    switch (role) {
      case 'BITFLOW_OWNER': return '/dashboard';
      case 'PUBLISHER_ADMIN': return '/publisher-admin';
      case 'COLLEGE_ADMIN': return '/college-admin';
      case 'FACULTY': return '/faculty';
      case 'STUDENT': return '/student';
      case 'COLLEGE_DEAN': return '/dean';
      default: return '/login';
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && user?.role) {
        navigate(getRoleDashboard(user.role));
      } else {
        navigate('/login');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated, user]);

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
        {isAuthenticated ? (
          <>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⛔</div>
            <h1 style={{ color: '#333', marginBottom: '16px' }}>Access Denied</h1>
            <p style={{ color: '#666', marginBottom: '24px', lineHeight: '1.6' }}>
              You don't have permission to access this page.<br />
              Your role ({user?.role?.replace(/_/g, ' ')}) does not have access to this section.<br />
              Redirecting to your dashboard...
            </p>
            <div style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: '#EF4444',
              color: 'white',
              borderRadius: '6px',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              Redirecting in 3 seconds...
            </div>
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => navigate(getRoleDashboard(user?.role))}
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
                Go to My Dashboard
              </button>
            </div>
          </>
        ) : (
          <>
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
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              Redirecting in 3 seconds...
            </div>
            <div style={{ marginTop: '16px' }}>
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
                Go to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UnauthorizedPage;
