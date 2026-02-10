import React, { useState, useEffect } from 'react';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth.service';
import apiService from '../../services/api.service';
import { Shield, Mail, Calendar, Key, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import '../../styles/bitflow-owner.css';

const ACCENT = '#7C3AED';

const FacultyProfile: React.FC = () => {
  const { user } = useAuth();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await apiService.get('/faculty/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNum = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!hasUpper || !hasLower || !hasNum || !hasSpecial) {
      setPwError('Password must have uppercase, lowercase, number, and special character');
      return;
    }

    setPwLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPwSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, string> = {
      FACULTY: 'Faculty',
      COLLEGE_ADMIN: 'College Admin',
      BITFLOW_OWNER: 'Platform Owner',
      PUBLISHER_ADMIN: 'Publisher Admin',
      STUDENT: 'Student',
    };
    return map[role] || role;
  };

  const ov = stats?.overview;

  return (
    <FacultyLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>My Profile</h1>
        <p style={{ color: 'var(--bo-text-secondary)', margin: '4px 0 0', fontSize: 14 }}>Manage your account and view your teaching summary</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Profile Card */}
        <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header Banner */}
          <div style={{ height: 80, background: `linear-gradient(135deg, ${ACCENT}, #A78BFA)` }} />
          <div style={{ padding: '0 24px 24px', marginTop: -36 }}>
            {/* Avatar */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%', border: '4px solid #fff',
              background: `linear-gradient(135deg, ${ACCENT}, #A78BFA)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: '#fff', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
              {user?.fullName?.charAt(0)?.toUpperCase() || 'F'}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--bo-text-primary)', margin: '12px 0 4px' }}>
              {user?.fullName || 'Faculty Member'}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: '#F5F3FF', color: ACCENT,
              }}>
                <Shield size={12} /> {getRoleBadge(user?.role || '')}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: user?.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2',
                color: user?.status === 'ACTIVE' ? '#059669' : '#DC2626',
              }}>
                {user?.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                {user?.status || 'Active'}
              </span>
            </div>

            {/* Info Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#F8FAFC', borderRadius: 10 }}>
                <Mail size={16} style={{ color: ACCENT }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 500 }}>Email</div>
                  <div style={{ fontSize: 14, color: 'var(--bo-text-primary)', fontWeight: 500 }}>{user?.email || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#F8FAFC', borderRadius: 10 }}>
                <Key size={16} style={{ color: ACCENT }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 500 }}>User ID</div>
                  <div style={{ fontSize: 14, color: 'var(--bo-text-primary)', fontWeight: 500, fontFamily: 'monospace' }}>{user?.id?.slice(0, 12) || '—'}...</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#F8FAFC', borderRadius: 10 }}>
                <Calendar size={16} style={{ color: ACCENT }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 500 }}>Member Since</div>
                  <div style={{ fontSize: 14, color: 'var(--bo-text-primary)', fontWeight: 500 }}>
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' }) : '—'}
                  </div>
                </div>
              </div>
              {user?.lastLoginAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#F8FAFC', borderRadius: 10 }}>
                  <Clock size={16} style={{ color: ACCENT }} />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 500 }}>Last Login</div>
                    <div style={{ fontSize: 14, color: 'var(--bo-text-primary)', fontWeight: 500 }}>
                      {new Date(user.lastLoginAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Teaching Summary */}
          <div className="bo-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--bo-text-primary)' }}>Teaching Summary</h3>
            {statsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <div className="bo-spinner" />
              </div>
            ) : ov ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Total Courses', value: ov.totalCourses || 0, color: ACCENT },
                  { label: 'Published', value: ov.publishedCourses || 0, color: '#10B981' },
                  { label: 'Drafts', value: ov.draftCourses || 0, color: '#F59E0B' },
                  { label: 'Unique Students', value: ov.uniqueStudents || 0, color: '#3B82F6' },
                  { label: 'Completion Rate', value: `${(ov.overallCompletionRate || 0).toFixed(0)}%`, color: '#059669' },
                  { label: 'Active (7d)', value: ov.activeStudentsLast7Days || 0, color: '#8B5CF6' },
                ].map((s, i) => (
                  <div key={i} style={{ padding: 14, background: '#F8FAFC', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--bo-text-muted)', textAlign: 'center' }}>No stats available</p>
            )}
          </div>

          {/* Change Password */}
          <div className="bo-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--bo-text-primary)' }}>Change Password</h3>

            {pwError && (
              <div style={{ padding: 10, background: '#FEE2E2', color: '#DC2626', borderRadius: 8, marginBottom: 14, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {pwError}
              </div>
            )}
            {pwSuccess && (
              <div style={{ padding: 10, background: '#D1FAE5', color: '#059669', borderRadius: 8, marginBottom: 14, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} /> {pwSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 4 }}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid var(--bo-border)',
                    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 4 }}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid var(--bo-border)',
                    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 4 }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid var(--bo-border)',
                    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={pwLoading}
                className="bo-btn bo-btn-primary"
                style={{ width: '100%', background: ACCENT, borderColor: ACCENT, padding: '10px 0' }}
              >
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
            <p style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 10 }}>
              Must contain uppercase, lowercase, number, and special character. Min 8 chars.
            </p>
          </div>
        </div>
      </div>
    </FacultyLayout>
  );
};

export default FacultyProfile;
