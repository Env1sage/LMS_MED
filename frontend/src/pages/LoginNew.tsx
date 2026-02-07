import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassInput } from '../components/ui/GlassInput';
import '../styles/LoginPremium.css';

const LoginNew: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        if (userData.role === UserRole.BITFLOW_OWNER) {
          navigate('/dashboard');
        } else if (userData.role === UserRole.PUBLISHER_ADMIN) {
          navigate('/publisher-admin');
        } else if (userData.role === UserRole.COLLEGE_ADMIN) {
          navigate('/college-admin');
        } else if (userData.role === UserRole.COLLEGE_DEAN) {
          navigate('/dean');
        } else if (userData.role === UserRole.FACULTY) {
          navigate('/faculty');
        } else if (userData.role === UserRole.STUDENT) {
          navigate('/student');
        } else {
          navigate('/unauthorized');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (emailVal: string, passwordVal: string) => {
    setEmail(emailVal);
    setPassword(passwordVal);
  };

  return (
    <div className="premium-login-page">
      {/* Animated Gradient Background */}
      <div className="gradient-bg">
        <div className="gradient-orb gradient-orb-1"></div>
        <div className="gradient-orb gradient-orb-2"></div>
        <div className="gradient-orb gradient-orb-3"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="grid-pattern"></div>

      {/* Demo Credentials Notice */}
      <div className="demo-notice">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
        </svg>
        <span>Demo System - Temporary Credentials Available Below</span>
      </div>

      <div className="login-container-diagonal">
        {/* Login Card with Diagonal Layout */}
        <GlassCard className="login-card-diagonal">
          {/* Left Diagonal Section - Branding */}
          <div className="diagonal-branding">
            <div className="brand-logo-glass">
              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="16" fill="url(#logoGradient)"/>
                <path d="M20 32h24M32 20v24M26 26l12 12M26 38l12-12" 
                      stroke="white" 
                      strokeWidth="3" 
                      strokeLinecap="round"/>
                <defs>
                  <linearGradient id="logoGradient" x1="0" y1="0" x2="64" y2="64">
                    <stop offset="0%" stopColor="#00A896"/>
                    <stop offset="100%" stopColor="#006B5C"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            <h1 className="brand-title-diagonal">Bitflow<span className="brand-accent">.</span></h1>
            <p className="brand-tagline-diagonal">Premium Medical LMS</p>
            
            <div className="feature-badges">
              <span className="feature-badge">Multi-tenant</span>
              <span className="feature-badge">Secure</span>
              <span className="feature-badge">Analytics</span>
            </div>
          </div>

          {/* Right Section - Login Form */}
          <div className="diagonal-form">
            <div className="login-header">
              <h2 className="login-title">Welcome Back</h2>
              <p className="login-subtitle">Enter your credentials to access your account</p>
            </div>

            {error && (
              <div className="error-banner">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <GlassInput
                type="email"
                label="Email Address"
                value={email}
                onChange={setEmail}
                placeholder="your@email.com"
                required
                disabled={loading}
                icon={
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                  </svg>
                }
              />

              <GlassInput
                type="password"
                label="Password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                required
                disabled={loading}
                icon={
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                }
              />

              <GlassButton
                type="submit"
                variant="primary"
                loading={loading}
                fullWidth
              >
                {!loading && (
                  <>
                    <span>Sign In</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </>
                )}
              </GlassButton>
            </form>
          </div>
        </GlassCard>

        {/* All Credentials Panel - Expanded */}
        <GlassCard className="all-credentials-card">
          <div className="credentials-header-main">
            <div className="credentials-title-group">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
              </svg>
              <div>
                <h3>Test Credentials</h3>
                <p className="credentials-subtitle">Click any credential to auto-fill login form</p>
              </div>
            </div>
          </div>
          
          <div className="all-credentials-grid">
            <button className="credential-item" onClick={() => quickLogin('owner@bitflow.com', 'BitflowAdmin@2026')}>
              <div className="credential-badge badge-owner">Owner</div>
              <div className="credential-details">
                <code className="credential-email">owner@bitflow.com</code>
                <span className="credential-pass">BitflowAdmin@2026</span>
              </div>
            </button>
            
            <button className="credential-item" onClick={() => quickLogin('admin@elsevier.com', 'Password123!')}>
              <div className="credential-badge badge-publisher">Publisher</div>
              <div className="credential-details">
                <code className="credential-email">admin@elsevier.com</code>
                <span className="credential-pass">Password123!</span>
              </div>
            </button>
            
            <button className="credential-item" onClick={() => quickLogin('admin@aiimsnagpur.edu.in', 'Password123!')}>
              <div className="credential-badge badge-admin">College Admin</div>
              <div className="credential-details">
                <code className="credential-email">admin@aiimsnagpur.edu.in</code>
                <span className="credential-pass">Password123!</span>
              </div>
            </button>
            
            <button className="credential-item" onClick={() => quickLogin('dean@aiimsnagpur.edu.in', 'Password123!')}>
              <div className="credential-badge badge-dean">Dean</div>
              <div className="credential-details">
                <code className="credential-email">dean@aiimsnagpur.edu.in</code>
                <span className="credential-pass">Password123!</span>
              </div>
            </button>
            
            <button className="credential-item" onClick={() => quickLogin('faculty@aiimsnagpur.edu.in', 'Password123!')}>
              <div className="credential-badge badge-faculty">Faculty</div>
              <div className="credential-details">
                <code className="credential-email">faculty@aiimsnagpur.edu.in</code>
                <span className="credential-pass">Password123!</span>
              </div>
            </button>
            
            <button className="credential-item" onClick={() => quickLogin('student@aiimsnagpur.edu.in', 'Password123!')}>
              <div className="credential-badge badge-student">Student</div>
              <div className="credential-details">
                <code className="credential-email">student@aiimsnagpur.edu.in</code>
                <span className="credential-pass">Password123!</span>
              </div>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default LoginNew;
