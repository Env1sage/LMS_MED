import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import HodLayout from '../../components/hod/HodLayout';
import apiService from '../../services/api.service';
import { UserCog, Mail, Calendar, Shield, Eye, EyeOff, KeyRound, CheckCircle, AlertCircle } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

const ACCENT = '#2563EB';

const HodProfile: React.FC = () => {
  const { user } = useAuth();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    apiService.get('/auth/me').then((res: any) => setProfile(res.data)).catch(() => {});
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (newPassword !== confirmPassword) { setPwError('New passwords do not match'); return; }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      setPwError('Password must have uppercase, lowercase, number, and special character'); return;
    }
    setPwLoading(true);
    try {
      await apiService.post('/auth/change-password', { currentPassword, newPassword });
      setPwSuccess('Password changed successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setPwError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to change password');
    } finally { setPwLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 40px 10px 14px', border: '1px solid var(--bo-border)',
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 4,
  };

  return (
    <HodLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserCog size={24} color={ACCENT} /> My Profile
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Manage your HOD account details</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Account Information */}
        <div className="bo-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color={ACCENT} /> Account Information
          </h3>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Full Name</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{profile?.fullName || user?.fullName || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} color="var(--bo-text-muted)" /> {profile?.email || user?.email || '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Role</div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#EFF6FF', color: ACCENT }}>
                Head of Department
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Status</div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#ECFDF5', color: '#059669' }}>
                Active
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Last Login</div>
              <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={13} color="var(--bo-text-muted)" />
                {profile?.lastLoginAt ? formatDateTime(profile.lastLoginAt) : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Member Since</div>
              <div style={{ fontSize: 13 }}>{profile?.createdAt ? formatDate(profile.createdAt) : '—'}</div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bo-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={18} color={ACCENT} /> Change Password
          </h3>

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
              <label style={labelStyle}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required style={inputStyle} />
                <button type="button" onClick={() => setShowCurrentPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex' }}>
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={inputStyle} />
                <button type="button" onClick={() => setShowNewPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex' }}>
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ ...inputStyle, paddingRight: 40 }} />
                <button type="button" onClick={() => setShowConfirmPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex' }}>
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={pwLoading} className="bo-btn bo-btn-primary" style={{ width: '100%', background: ACCENT, borderColor: ACCENT, padding: '10px 0' }}>
              {pwLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
          <p style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 10 }}>
            Must contain uppercase, lowercase, number, and special character. Min 8 chars.
          </p>
        </div>
      </div>
    </HodLayout>
  );
};

export default HodProfile;
