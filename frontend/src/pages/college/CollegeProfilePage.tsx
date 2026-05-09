import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import governanceService, { CollegeProfile as ICollegeProfile } from '../../services/governance.service';
import CollegeLayout from '../../components/college/CollegeLayout';
import { Building, Edit2, Save, X, MapPin, Mail, Calendar, Users, GraduationCap, Phone, KeyRound, Eye, EyeOff } from 'lucide-react';
import apiService from '../../services/api.service';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';
import { formatDate } from '../../utils/dateUtils';

const CollegeProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ICollegeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ adminContactEmail: '', address: '', city: '', state: '', contactNumber: '', taluka: '', pincode: '' });

  // Change password state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { fetchProfile(); }, []);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); } }, [success]);

  const fetchProfile = async () => {
    setLoading(true); setError(null);
    try {
      const data = await governanceService.getCollegeProfile();
      setProfile(data);
      setForm({ adminContactEmail: data.adminContactEmail || '', address: data.address || '', city: data.city || '', state: data.state || '', contactNumber: data.contactNumber || '', taluka: data.taluka || '', pincode: data.pincode || '' });
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load profile'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const updated = await governanceService.updateCollegeProfile(form);
      setProfile(updated); setSuccess('Profile updated'); setIsEditing(false);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleCancel = () => {
    if (profile) setForm({ adminContactEmail: profile.adminContactEmail || '', address: profile.address || '', city: profile.city || '', state: profile.state || '', contactNumber: profile.contactNumber || '', taluka: profile.taluka || '', pincode: profile.pincode || '' });
    setIsEditing(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null); setPwSuccess(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwLoading(true);
    try {
      await apiService.post('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwSuccess('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setPwError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to change password');
    } finally { setPwLoading(false); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block' };

  if (loading) return (
    <CollegeLayout>
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
    </CollegeLayout>
  );

  if (!profile) return (
    <CollegeLayout>
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>Failed to load profile</div>
    </CollegeLayout>
  );

  return (
    <CollegeLayout>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>College Profile</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>View and manage your institution details</p>
        </div>
        {!isEditing && (
          <button className="bo-btn bo-btn-primary" style={{ background: '#059669' }} onClick={() => setIsEditing(true)}>
            <Edit2 size={14} /> Edit Profile
          </button>
        )}
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* College Info */}
        <div className="bo-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building size={18} color="#059669" /> College Information
          </h3>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>College Name</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{profile.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>College Code</div>
              <div style={{ fontSize: 15, fontWeight: 500, fontFamily: 'monospace' }}>{profile.code}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Status</div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: profile.status === 'ACTIVE' ? '#ECFDF5' : '#FEF3C7', color: profile.status === 'ACTIVE' ? '#059669' : '#D97706' }}>
                {profile.status}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Created</div>
              <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={14} color="var(--bo-text-muted)" /> {formatDate(profile.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bo-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Departments', value: profile._count?.departments || 0, color: '#059669', icon: <Building size={18} /> },
              { label: 'Users', value: profile._count?.users || 0, color: '#3B82F6', icon: <Users size={18} /> },
              { label: 'Students', value: profile._count?.students || 0, color: '#8B5CF6', icon: <GraduationCap size={18} /> },
            ].map((s, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 10, background: 'var(--bo-bg)', border: '1px solid var(--bo-border)', textAlign: 'center' }}>
                <div style={{ color: s.color, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact & Address */}
        <div className="bo-card" style={{ padding: 20, gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color="#059669" /> Contact & Address
          </h3>

          {isEditing ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Admin Contact Email</label>
                  <input type="email" value={form.adminContactEmail} onChange={e => setForm(p => ({ ...p, adminContactEmail: e.target.value }))} placeholder="admin@college.edu" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Contact Phone</label>
                  <input type="text" value={form.contactNumber} onChange={e => setForm(p => ({ ...p, contactNumber: e.target.value }))} placeholder="+91 XXXXX XXXXX" style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Address</label>
                  <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} rows={2} placeholder="Street address" style={{ ...inputStyle, resize: 'vertical' as const }} />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="City" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <input type="text" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="State" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Taluka</label>
                  <input type="text" value={form.taluka} onChange={e => setForm(p => ({ ...p, taluka: e.target.value }))} placeholder="Taluka" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Pincode</label>
                  <input type="text" value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} placeholder="400001" maxLength={6} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="bo-btn bo-btn-outline" onClick={handleCancel} disabled={saving}>
                  <X size={14} /> Cancel
                </button>
                <button className="bo-btn bo-btn-primary" style={{ background: '#059669' }} onClick={handleSave} disabled={saving}>
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Admin Email</div>
                <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={14} color="var(--bo-text-muted)" /> {profile.adminContactEmail || 'Not set'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Contact Phone</div>
                <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={14} color="var(--bo-text-muted)" /> {profile.contactNumber || 'Not set'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Address</div>
                <div style={{ fontSize: 14 }}>{profile.address || 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>City</div>
                <div style={{ fontSize: 14 }}>{profile.city || 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>State</div>
                <div style={{ fontSize: 14 }}>{profile.state || 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Taluka</div>
                <div style={{ fontSize: 14 }}>{profile.taluka || 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Pincode</div>
                <div style={{ fontSize: 14 }}>{profile.pincode || 'Not set'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="bo-card" style={{ padding: 20, marginTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyRound size={18} color="#059669" /> Change Password
        </h3>
        {pwError && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 14, fontSize: 13 }}>{pwError}</div>}
        {pwSuccess && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 14, fontSize: 13 }}>{pwSuccess}</div>}
        <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showCurrent ? 'text' : 'password'} value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required style={{ ...inputStyle, paddingRight: 36 }} />
              <button type="button" onClick={() => setShowCurrent(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex' }}>
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showNew ? 'text' : 'password'} value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required style={{ ...inputStyle, paddingRight: 36 }} />
              <button type="button" onClick={() => setShowNew(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex' }}>
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={pwLoading} className="bo-btn bo-btn-primary" style={{ background: '#059669', padding: '10px 24px', fontSize: 13 }}>
              {pwLoading ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </CollegeLayout>
  );
};

export default CollegeProfilePage;
