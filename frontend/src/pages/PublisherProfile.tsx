import React, { useState, useEffect } from 'react';
import PublisherLayout from '../components/publisher/PublisherLayout';
import publisherProfileService, {
  PublisherProfile as ProfileType,
  UpdatePublisherProfileDto,
  ChangePasswordDto
} from '../services/publisher-profile.service';
import { Save, User, Shield, Calendar, Building2, Mail, MapPin } from 'lucide-react';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

const PublisherProfile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Profile edit
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<UpdatePublisherProfileDto>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwData, setPwData] = useState<ChangePasswordDto>({ currentPassword: '', newPassword: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const p = await publisherProfileService.getProfile();
      setProfile(p);
      setEditData({
        companyName: p.companyName,
        contactPerson: p.contactPerson || '',
        contactEmail: p.contactEmail || '',
        physicalAddress: p.physicalAddress || '',
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    try {
      setEditSaving(true);
      const updated = await publisherProfileService.updateProfile(editData);
      setProfile(updated);
      setEditing(false);
      setEditSuccess('Profile updated successfully!');
      setTimeout(() => setEditSuccess(''), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setEditError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (pwData.newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    if (pwData.newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }

    try {
      setPwSaving(true);
      await publisherProfileService.changePassword(pwData);
      setPwSuccess('Password changed successfully!');
      setPwData({ currentPassword: '', newPassword: '' });
      setConfirmPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setPwError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'ACTIVE') return '#10B981';
    if (status === 'SUSPENDED') return '#EF4444';
    return '#6B7280';
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--bo-border)', fontSize: 14,
    background: 'var(--bo-bg)', color: 'var(--bo-text)',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: 'var(--bo-text-secondary)', marginBottom: 6,
  };

  if (loading) return (
    <PublisherLayout>
      <div className="page-loading-screen">
        <div className="loading-rings">
          <div className="loading-ring loading-ring-1"></div>
          <div className="loading-ring loading-ring-2"></div>
          <div className="loading-ring loading-ring-3"></div>
        </div>
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
        <div className="loading-title">Loading Profile</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </PublisherLayout>
  );

  if (error || !profile) return (
    <PublisherLayout>
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--bo-danger)' }}>
        {error || 'Failed to load profile'}
      </div>
    </PublisherLayout>
  );

  const infoRow = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--bo-border)' }}>
      <div style={{ color: 'var(--bo-text-muted)', flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: 'var(--bo-text)', fontWeight: 500 }}>{value || '—'}</div>
      </div>
    </div>
  );

  return (
    <PublisherLayout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text)' }}>Publisher Profile</h1>
          <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginTop: 4 }}>
            Manage your publisher account information
          </p>
        </div>

        {editSuccess && (
          <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#16A34A', fontSize: 14, marginBottom: 16 }}>{editSuccess}</div>
        )}
        {pwSuccess && (
          <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#16A34A', fontSize: 14, marginBottom: 16 }}>{pwSuccess}</div>
        )}

        {/* Profile Info */}
        <div className="bo-card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Account Information</h3>
            {!editing && (
              <button className="bo-btn bo-btn-outline" onClick={() => setEditing(true)}>
                Edit Profile
              </button>
            )}
          </div>

          {!editing ? (
            <>
              {infoRow(<Building2 size={16} />, 'Company Name', profile.companyName)}
              {infoRow(<User size={16} />, 'Contact Person', profile.contactPerson)}
              {infoRow(<Mail size={16} />, 'Contact Email', profile.contactEmail)}
              {infoRow(<MapPin size={16} />, 'Physical Address', profile.physicalAddress)}
              {infoRow(<Shield size={16} />, 'Publisher Code', <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{profile.publisherCode}</span>)}
              {infoRow(<Shield size={16} />, 'Legal Name', profile.legalName)}
              {infoRow(<Shield size={16} />, 'Status', (
                <span style={{
                  padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  background: `${statusColor(profile.status)}15`, color: statusColor(profile.status),
                }}>
                  {profile.status}
                </span>
              ))}
              {infoRow(<Calendar size={16} />, 'Contract Start', profile.contractStartDate ? new Date(profile.contractStartDate).toLocaleDateString() : '—')}
              {infoRow(<Calendar size={16} />, 'Contract End', profile.contractEndDate ? new Date(profile.contractEndDate).toLocaleDateString() : '—')}
              {infoRow(<Calendar size={16} />, 'Account Created', new Date(profile.createdAt).toLocaleDateString())}
            </>
          ) : (
            <form onSubmit={handleSaveProfile}>
              {editError && (
                <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{editError}</div>
              )}
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Company Name *</label>
                  <input style={inputStyle} value={editData.companyName || ''} required
                    onChange={e => setEditData(d => ({ ...d, companyName: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Contact Person</label>
                  <input style={inputStyle} value={editData.contactPerson || ''}
                    onChange={e => setEditData(d => ({ ...d, contactPerson: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Contact Email</label>
                  <input type="email" style={inputStyle} value={editData.contactEmail || ''}
                    onChange={e => setEditData(d => ({ ...d, contactEmail: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Physical Address</label>
                  <textarea style={{ ...inputStyle, minHeight: 60 }} value={editData.physicalAddress || ''}
                    onChange={e => setEditData(d => ({ ...d, physicalAddress: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="bo-btn bo-btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="bo-btn bo-btn-primary" disabled={editSaving}>
                  <Save size={14} /> {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Password Change */}
        <div className="bo-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Security</h3>
            {!showPasswordForm && (
              <button className="bo-btn bo-btn-outline" onClick={() => setShowPasswordForm(true)}>
                Change Password
              </button>
            )}
          </div>

          {showPasswordForm ? (
            <form onSubmit={handleChangePassword}>
              {pwError && (
                <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{pwError}</div>
              )}
              <div style={{ display: 'grid', gap: 16, maxWidth: 400 }}>
                <div>
                  <label style={labelStyle}>Current Password *</label>
                  <input type="password" style={inputStyle} value={pwData.currentPassword} required
                    onChange={e => setPwData(d => ({ ...d, currentPassword: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>New Password *</label>
                  <input type="password" style={inputStyle} value={pwData.newPassword} required minLength={8}
                    onChange={e => setPwData(d => ({ ...d, newPassword: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Confirm New Password *</label>
                  <input type="password" style={inputStyle} value={confirmPassword} required
                    onChange={e => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" className="bo-btn bo-btn-outline"
                  onClick={() => { setShowPasswordForm(false); setPwError(''); setPwData({ currentPassword: '', newPassword: '' }); setConfirmPassword(''); }}>
                  Cancel
                </button>
                <button type="submit" className="bo-btn bo-btn-primary" disabled={pwSaving}>
                  {pwSaving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
              Use a strong password with at least 8 characters including uppercase, lowercase, numbers and special characters.
            </p>
          )}
        </div>
      </div>
    </PublisherLayout>
  );
};

export default PublisherProfile;
