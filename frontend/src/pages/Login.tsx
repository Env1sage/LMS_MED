import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LogIn, Mail, Lock, AlertCircle, Sparkles } from 'lucide-react';

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
        } else if (userData.role === UserRole.COLLEGE_DEAN) {
          navigate('/dean');
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
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            marginBottom: 'var(--space-md)',
            boxShadow: 'var(--glass-shadow-glow)'
          }}>
            <Sparkles size={32} color="white" />
          </div>
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
            <input
              id="password"
              type="password"
              className="glass-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
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

        {/* Demo Credentials */}
        <div style={{ 
          background: 'var(--glass-white)', 
          borderRadius: 'var(--radius-md)', 
          padding: 'var(--space-md)',
          border: '1px solid var(--glass-border)'
        }}>
          <div style={{ 
            fontSize: 'var(--font-size-xs)', 
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-on-glass)',
            marginBottom: 'var(--space-sm)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Sparkles size={12} />
            Demo Credentials (All Portals)
          </div>
          
          <div style={{ 
            fontSize: 'var(--font-size-xs)', 
            color: 'var(--text-on-glass-muted)', 
            lineHeight: '1.8'
          }}>
            {/* Bitflow Owner Portal */}
            <div style={{ 
              marginBottom: 'var(--space-sm)', 
              paddingBottom: 'var(--space-sm)',
              borderBottom: '1px solid var(--glass-border)'
            }}>
              <div style={{ 
                color: 'var(--accent-primary)', 
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: '6px',
                fontSize: '11px'
              }}>
                🏢 BITFLOW OWNER
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6' }}>
                <div>📧 owner@bitflow.com</div>
                <div style={{ color: 'var(--accent-secondary)' }}>🔑 Demo@2026</div>
              </div>
            </div>

            {/* Publisher Portal */}
            <div style={{ 
              marginBottom: 'var(--space-sm)', 
              paddingBottom: 'var(--space-sm)',
              borderBottom: '1px solid var(--glass-border)'
            }}>
              <div style={{ 
                color: 'var(--accent-primary)', 
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: '6px',
                fontSize: '11px'
              }}>
                📚 PUBLISHER ADMIN
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6' }}>
                <div>📧 admin@oxford-demo.com</div>
                <div style={{ color: 'var(--accent-secondary)' }}>🔑 Demo@2026</div>
              </div>
            </div>

            {/* College Admin Portal */}
            <div style={{ 
              marginBottom: 'var(--space-sm)', 
              paddingBottom: 'var(--space-sm)',
              borderBottom: '1px solid var(--glass-border)'
            }}>
              <div style={{ 
                color: 'var(--accent-primary)', 
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: '6px',
                fontSize: '11px'
              }}>
                🎓 COLLEGE ADMIN (with courses)
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6' }}>
                <div>📧 admin@aiims.edu</div>
                <div style={{ color: 'var(--accent-secondary)' }}>🔑 Demo@2026</div>
              </div>
            </div>

            {/* Faculty Portal */}
            <div style={{ 
              marginBottom: 'var(--space-sm)', 
              paddingBottom: 'var(--space-sm)',
              borderBottom: '1px solid var(--glass-border)'
            }}>
              <div style={{ 
                color: 'var(--accent-primary)', 
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: '6px',
                fontSize: '11px'
              }}>
                👨‍🏫 FACULTY (with courses)
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6' }}>
                <div>📧 faculty5@aiims.edu</div>
                <div style={{ color: 'var(--accent-secondary)' }}>🔑 Demo@2026</div>
              </div>
            </div>

            {/* Student Portal */}
            <div style={{ marginBottom: 0 }}>
              <div style={{ 
                color: 'var(--accent-primary)', 
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: '6px',
                fontSize: '11px'
              }}>
                🎒 STUDENT (with courses)
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6' }}>
                <div>📧 aiim001@aiims.edu</div>
                <div style={{ color: 'var(--accent-secondary)' }}>🔑 Demo@2026</div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 'var(--space-sm)',
            paddingTop: 'var(--space-sm)',
            borderTop: '1px solid var(--glass-border)',
            fontSize: '10px',
            color: 'var(--text-on-glass-muted)',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            💡 All accounts use password: Demo@2026
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
