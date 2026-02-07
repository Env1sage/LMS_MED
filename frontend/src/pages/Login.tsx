import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassInput } from '../components/ui/GlassInput';
import '../styles/Login.css';

const Login: React.FC = () => {
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

      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-branding">
          <div className="brand-logo-container">
            <div className="brand-logo-glass">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="16" fill="url(#logoGradient)"/>
                <path d="M20 32h24M32 20v24M26 26l12 12M26 38l12-12" 
                      stroke="white" 
                      strokeWidth="3" 
                      strokeLinecap="round"/>
                <defs>
                  <linearGradient id="logoGradient" x1="0" y1="0" x2="64" y2="64">
                    <stop offset="0%" stopColor="#667eea"/>
                    <stop offset="100%" stopColor="#764ba2"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          
          <h1 className="brand-title">
            Bitflow<span className="brand-accent">.</span>
          </h1>
          
          <p className="brand-tagline">
            Premium Medical Learning Management System
          </p>
          
          <div className="brand-features">
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Multi-tenant Architecture</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Secure Clinical Education</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Advanced Analytics</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section">
          <GlassCard className="login-card">
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

            <div className="login-footer">
              <div className="status-indicator">
                <div className="status-dot"></div>
                <span>Phase 0–5 • Production Ready</span>
              </div>
            </div>
          </GlassCard>

          {/* Quick Access Credentials */}
          <GlassCard className="credentials-card">
            <div className="credentials-header">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              <h3>Quick Access</h3>
            </div>
            
            <div className="credentials-grid">
              <button className="credential-btn" onClick={() => quickLogin('owner@bitflow.com', 'BitflowAdmin@2026')}>
                <div className="credential-badge badge-owner">Owner</div>
                <code>owner@bitflow.com</code>
              </button>
              
              <button className="credential-btn" onClick={() => quickLogin('admin@elsevier.com', 'Password123!')}>
                <div className="credential-badge badge-publisher">Publisher</div>
                <code>admin@elsevier.com</code>
              </button>
              
              <button className="credential-btn" onClick={() => quickLogin('admin@aiimsnagpur.edu.in', 'Password123!')}>
                <div className="credential-badge badge-admin">Admin</div>
                <code>admin@aiimsnagpur.edu.in</code>
              </button>
              
              <button className="credential-btn" onClick={() => quickLogin('faculty@aiimsnagpur.edu.in', 'Password123!')}>
                <div className="credential-badge badge-faculty">Faculty</div>
                <code>faculty@aiimsnagpur.edu.in</code>
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Login;
