import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Shield, Save, CheckCircle, XCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import '../styles/bitflow-owner.css';

interface SecurityPolicy {
  maxLoginAttempts?: number;
  lockoutDurationMinutes?: number;
  passwordMinLength?: number;
  passwordRequireUppercase?: boolean;
  passwordRequireNumbers?: boolean;
  passwordRequireSpecialChars?: boolean;
  sessionTimeoutMinutes?: number;
  mfaEnabled?: boolean;
  ipWhitelistEnabled?: boolean;
  ipWhitelist?: string[];
}

interface FeatureFlags {
  enablePublisherSelfRegistration?: boolean;
  enableStudentSelfRegistration?: boolean;
  enableContentAutoApproval?: boolean;
  enableAnalyticsDashboard?: boolean;
  enableAuditLogs?: boolean;
  maintenanceMode?: boolean;
}

const Settings: React.FC = () => {
  const [security, setSecurity] = useState<SecurityPolicy>({});
  const [features, setFeatures] = useState<FeatureFlags>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'security' | 'features'>('security');

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [secRes, featRes] = await Promise.allSettled([
        apiService.get('/bitflow-owner/security-policy'),
        apiService.get('/bitflow-owner/feature-flags'),
      ]);
      if (secRes.status === 'fulfilled') setSecurity(secRes.value.data || {});
      if (featRes.status === 'fulfilled') setFeatures(featRes.value.data || {});
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSecurityPolicy = async () => {
    try {
      setSaving(true);
      setError('');
      await apiService.patch('/bitflow-owner/security-policy', security);
      setSuccessMsg('Security policy updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save security policy');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const saveFeatureFlags = async () => {
    try {
      setSaving(true);
      setError('');
      await apiService.patch('/bitflow-owner/feature-flags', features);
      setSuccessMsg('Feature flags updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save feature flags');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void; label: string; description?: string }> = ({ value, onChange, label, description }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--bo-border)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--bo-text)' }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: value ? 'var(--bo-success)' : 'var(--bo-text-muted)', display: 'flex', alignItems: 'center' }}
      >
        {value ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
      </button>
    </div>
  );

  if (loading) {
    return <MainLayout loading={true} loadingMessage="Loading Settings" />;
  }

  return (
    <MainLayout>
      <div className="bo-page">
        <div className="bo-page-header">
          <div>
            <h1 className="bo-page-title">Settings</h1>
            <p className="bo-page-subtitle">Platform security and feature configuration</p>
          </div>
        </div>

        {successMsg && (
          <div style={{ padding: '12px 16px', background: 'var(--bo-success-light)', border: '1px solid #A7F3D0', borderRadius: 8, color: 'var(--bo-success)', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
            <CheckCircle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> {successMsg}
          </div>
        )}
        {error && (
          <div style={{ padding: '12px 16px', background: 'var(--bo-danger-light)', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--bo-danger)', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
            <XCircle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bo-tabs" style={{ marginBottom: 20 }}>
          <button className={`bo-tab ${activeTab === 'security' ? 'bo-tab-active' : ''}`} onClick={() => setActiveTab('security')}>
            <Shield size={16} /> Security Policy
          </button>
          <button className={`bo-tab ${activeTab === 'features' ? 'bo-tab-active' : ''}`} onClick={() => setActiveTab('features')}>
            <SettingsIcon size={16} /> Feature Flags
          </button>
        </div>

        {activeTab === 'security' && (
          <div className="bo-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Security Policy</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="bo-form-row">
                <div className="bo-form-group">
                  <label className="bo-form-label">Max Login Attempts</label>
                  <input className="bo-form-input" type="number" value={security.maxLoginAttempts ?? 5} onChange={e => setSecurity({ ...security, maxLoginAttempts: parseInt(e.target.value) || 5 })} min={1} max={20} />
                </div>
                <div className="bo-form-group">
                  <label className="bo-form-label">Lockout Duration (minutes)</label>
                  <input className="bo-form-input" type="number" value={security.lockoutDurationMinutes ?? 30} onChange={e => setSecurity({ ...security, lockoutDurationMinutes: parseInt(e.target.value) || 30 })} min={5} max={1440} />
                </div>
              </div>
              <div className="bo-form-row">
                <div className="bo-form-group">
                  <label className="bo-form-label">Minimum Password Length</label>
                  <input className="bo-form-input" type="number" value={security.passwordMinLength ?? 8} onChange={e => setSecurity({ ...security, passwordMinLength: parseInt(e.target.value) || 8 })} min={6} max={32} />
                </div>
                <div className="bo-form-group">
                  <label className="bo-form-label">Session Timeout (minutes)</label>
                  <input className="bo-form-input" type="number" value={security.sessionTimeoutMinutes ?? 60} onChange={e => setSecurity({ ...security, sessionTimeoutMinutes: parseInt(e.target.value) || 60 })} min={5} max={1440} />
                </div>
              </div>

              <Toggle
                value={security.passwordRequireUppercase ?? true}
                onChange={v => setSecurity({ ...security, passwordRequireUppercase: v })}
                label="Require Uppercase Letters"
                description="Passwords must contain at least one uppercase letter"
              />
              <Toggle
                value={security.passwordRequireNumbers ?? true}
                onChange={v => setSecurity({ ...security, passwordRequireNumbers: v })}
                label="Require Numbers"
                description="Passwords must contain at least one number"
              />
              <Toggle
                value={security.passwordRequireSpecialChars ?? false}
                onChange={v => setSecurity({ ...security, passwordRequireSpecialChars: v })}
                label="Require Special Characters"
                description="Passwords must contain special characters (!@#$%^&*)"
              />
              <Toggle
                value={security.mfaEnabled ?? false}
                onChange={v => setSecurity({ ...security, mfaEnabled: v })}
                label="Multi-Factor Authentication"
                description="Require MFA for all users"
              />
            </div>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="bo-btn bo-btn-primary" onClick={saveSecurityPolicy} disabled={saving}>
                {saving ? <><div className="bo-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</> : <><Save size={16} /> Save Security Policy</>}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="bo-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Feature Flags</h3>
            <div style={{ display: 'grid', gap: 0 }}>
              <Toggle
                value={features.enablePublisherSelfRegistration ?? false}
                onChange={v => setFeatures({ ...features, enablePublisherSelfRegistration: v })}
                label="Publisher Self-Registration"
                description="Allow publishers to register themselves on the platform"
              />
              <Toggle
                value={features.enableStudentSelfRegistration ?? false}
                onChange={v => setFeatures({ ...features, enableStudentSelfRegistration: v })}
                label="Student Self-Registration"
                description="Allow students to create their own accounts"
              />
              <Toggle
                value={features.enableContentAutoApproval ?? false}
                onChange={v => setFeatures({ ...features, enableContentAutoApproval: v })}
                label="Auto-Approve Content"
                description="Automatically approve content uploaded by publishers"
              />
              <Toggle
                value={features.enableAnalyticsDashboard ?? true}
                onChange={v => setFeatures({ ...features, enableAnalyticsDashboard: v })}
                label="Analytics Dashboard"
                description="Enable the analytics dashboard for all users"
              />
              <Toggle
                value={features.enableAuditLogs ?? true}
                onChange={v => setFeatures({ ...features, enableAuditLogs: v })}
                label="Audit Logging"
                description="Log all system activities for audit purposes"
              />
              <Toggle
                value={features.maintenanceMode ?? false}
                onChange={v => setFeatures({ ...features, maintenanceMode: v })}
                label="Maintenance Mode"
                description="Put the platform in maintenance mode (users cannot access)"
              />
            </div>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="bo-btn bo-btn-primary" onClick={saveFeatureFlags} disabled={saving}>
                {saving ? <><div className="bo-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</> : <><Save size={16} /> Save Feature Flags</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Settings;
