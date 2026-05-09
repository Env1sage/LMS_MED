import React, { useEffect, useState } from 'react';
import StudentLayout from '../../components/student/StudentLayout';
import { User, Mail, BookOpen, Calendar, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api.service';
import '../../styles/bitflow-owner.css';
import { formatDate } from '../../utils/dateUtils';

interface StudentMe {
  id: string;
  fullName: string;
  yearOfAdmission: number;
  expectedPassingYear: number;
  currentAcademicYear: number;
  status: string;
  createdAt: string;
  user: { email: string; status: string };
  college: { id: string; name: string; code: string };
}

const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentMe | null>(null);
  const [loading, setLoading] = useState(true);
  // Change password state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    apiService.get<StudentMe>('/student-portal/profile')
      .then(res => setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const labelStyle: React.CSSProperties = { fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 };
  const valueStyle: React.CSSProperties = { fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500 };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('New passwords do not match'); return; }
    if (pwForm.newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwLoading(true);
    try {
      await apiService.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <StudentLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>My Profile</h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>Your account information</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--bo-text-muted)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div>
            {/* Personal Information */}
            <div className="bo-card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={20} /> Personal Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <div style={valueStyle}>{profile?.fullName || user?.fullName || 'N/A'}</div>
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <div style={{ ...valueStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={15} /> {profile?.user?.email || user?.email || 'N/A'}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Account Status</label>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: profile?.status === 'ACTIVE' ? '#ECFDF5' : '#FEF3C7', color: profile?.status === 'ACTIVE' ? '#059669' : '#D97706' }}>
                    {profile?.status || 'N/A'}
                  </span>
                </div>
                <div>
                  <label style={labelStyle}>Member Since</label>
                  <div style={{ ...valueStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={15} /> {profile?.createdAt ? formatDate(profile.createdAt) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bo-card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={20} /> Academic Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                <div>
                  <label style={labelStyle}>College</label>
                  <div style={valueStyle}>{profile?.college?.name || 'N/A'}</div>
                </div>
                <div>
                  <label style={labelStyle}>College Code</label>
                  <div style={{ ...valueStyle, fontFamily: 'monospace' }}>{profile?.college?.code || 'N/A'}</div>
                </div>
                <div>
                  <label style={labelStyle}>Year of Admission</label>
                  <div style={valueStyle}>{profile?.yearOfAdmission ?? 'N/A'}</div>
                </div>
                <div>
                  <label style={labelStyle}>Expected Passing Year</label>
                  <div style={valueStyle}>{profile?.expectedPassingYear ?? 'N/A'}</div>
                </div>
                <div>
                  <label style={labelStyle}>Current Academic Year</label>
                  <div style={valueStyle}>{profile?.currentAcademicYear ?? 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bo-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={20} /> Change Password
              </h3>
              {pwError && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 14, fontSize: 13 }}>{pwError}</div>}
              {pwSuccess && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 14, fontSize: 13 }}>{pwSuccess}</div>}
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={pwForm.currentPassword}
                      onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '10px 36px 10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <button type="button" onClick={() => setShowCurrent(v => !v)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0 }}>
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={pwForm.newPassword}
                      onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '10px 36px 10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0 }}>
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button type="submit" disabled={pwLoading} className="bo-btn bo-btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 24px', fontSize: 13 }}>
                  {pwLoading ? 'Saving...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bo-card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--bo-accent), var(--bo-info))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 40,
                fontWeight: 700,
                color: '#fff'
              }}>
                {(profile?.fullName || user?.fullName || 'S').charAt(0).toUpperCase()}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>
                {profile?.fullName || user?.fullName || 'Student'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
                {profile?.college?.name || 'Student'}
              </p>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentProfile;
