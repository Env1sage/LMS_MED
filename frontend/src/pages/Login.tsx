import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        } else if (userData.role === UserRole.COLLEGE_DEAN) {
          navigate('/college-admin');
        } else if (userData.role === UserRole.COLLEGE_HOD) {
          navigate('/hod');
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card animate-slide-up" style={{ maxWidth: '480px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <img
            src="/bitflow-logo.jpeg"
            alt="Bitflow Logo"
            style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'contain', marginBottom: 'var(--space-md)' }}
          />
          <h1 className="font-size-3xl font-weight-bold text-on-glass" style={{ marginBottom: 'var(--space-xs)' }}>
            Medical LMS
          </h1>
          <p className="font-size-sm text-on-glass-muted">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="glass-alert glass-alert-error animate-slide-up">
            <AlertCircle size={20} />
            <div>
              <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                Authentication Failed
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>
                {error}
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="glass-input-group">
            <label htmlFor="email" className="glass-input-label">
              <Mail size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="glass-input"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="glass-input-group">
            <label htmlFor="password" className="glass-input-label">
              <Lock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="glass-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-on-glass-muted)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="glass-btn glass-btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="glass-spinner glass-spinner-sm" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>


      </div>
    </div>
  );
};

export default Login;
