import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
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
      setError(err.response?.data?.message || 'Authentication failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Decorative molecular grid background */}
      <div className="login-grid-overlay" aria-hidden="true">
        <svg className="molecular-grid" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="hexPattern" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <polygon 
                points="30,0 60,15 60,45 30,60 0,45 0,15" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="0.5"
                opacity="0.15"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexPattern)" />
        </svg>
      </div>

      <main className="login-main">
        {/* Branding Section */}
        <header className="login-brand animate-slideInLeft">
          <div className="brand-mark">
            <svg className="brand-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="40" height="40" rx="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M24 12V36M12 24H36" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h1 className="brand-title">Bitflow</h1>
          <span className="brand-subtitle">Medical Learning System</span>
          <div className="brand-tagline">
            <span className="tagline-accent">◆</span>
            Secure Clinical Education Platform
          </div>
        </header>

        {/* Login Form Card */}
        <section className="login-card animate-fadeInUp">
          <div className="card-header">
            <h2>System Access</h2>
            <p className="card-subtitle">Enter credentials to authenticate</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-alert" role="alert">
                <span className="error-icon">⚠</span>
                <span className="error-text">{error}</span>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email" className="input-label">
                <span className="label-text">Email Address</span>
                <span className="label-indicator" />
              </label>
              <input
                type="email"
                id="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@institution.edu"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">
                <span className="label-text">Password</span>
                <span className="label-indicator" />
              </label>
              <input
                type="password"
                id="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button 
              type="submit" 
              className={`submit-btn ${loading ? 'is-loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Authenticate</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <footer className="card-footer">
            <div className="version-badge">
              <span className="version-dot" />
              Phase 0–5 • Multi-Tenant Architecture
            </div>
          </footer>
        </section>

        {/* Test Credentials Panel */}
        <aside className="credentials-panel animate-fadeInUp stagger-3">
          <div className="panel-header">
            <span className="panel-icon">◇</span>
            <h3>Development Credentials</h3>
          </div>
          <ul className="credentials-list">
            <li className="credential-row">
              <span className="role-badge role-owner">Owner</span>
              <code className="credential-value">owner@bitflow.com</code>
              <code className="credential-pass">BitflowAdmin@2026</code>
            </li>
            <li className="credential-row">
              <span className="role-badge role-publisher">Publisher</span>
              <code className="credential-value">admin@elsevier.com</code>
              <code className="credential-pass">Password123!</code>
            </li>
            <li className="credential-row">
              <span className="role-badge role-admin">Admin</span>
              <code className="credential-value">admin@aiimsnagpur.edu.in</code>
              <code className="credential-pass">Password123!</code>
            </li>
            <li className="credential-row">
              <span className="role-badge role-faculty">Faculty</span>
              <code className="credential-value">faculty@aiimsnagpur.edu.in</code>
              <code className="credential-pass">Password123!</code>
            </li>
            <li className="credential-row">
              <span className="role-badge role-student">Student</span>
              <code className="credential-value">priya.sharma@student...</code>
              <code className="credential-pass">Password123!</code>
            </li>
          </ul>
        </aside>
      </main>
    </div>
  );
};

export default Login;
