import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Calendar,
  Shield,
  AlertCircle,
  Save,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import apiService from '../../services/api.service';
import CollegeLayout from '../college/CollegeLayout';
import '../../styles/bitflow-owner.css';
import { formatDateTime } from '../../utils/dateUtils';

interface InstitutionPolicy {
  id: string;
  collegeId: string;
  offlineDurationDays: number;
  offlineMaxDevices: number;
  allowOfflineDownload: boolean;
  createdAt: string;
  updatedAt: string;
}

export const OfflinePolicySettings: React.FC = () => {
  const [policy, setPolicy] = useState<InstitutionPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [offlineDurationDays, setOfflineDurationDays] = useState(7);
  const [offlineMaxDevices, setOfflineMaxDevices] = useState(2);
  const [allowOfflineDownload, setAllowOfflineDownload] = useState(true);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get<InstitutionPolicy>('/offline/policy');
      setPolicy(response.data);
      setOfflineDurationDays(response.data.offlineDurationDays);
      setOfflineMaxDevices(response.data.offlineMaxDevices);
      setAllowOfflineDownload(response.data.allowOfflineDownload);
    } catch (err: any) {
      console.error('Failed to load policy:', err);
      setError(err.response?.data?.message || 'Failed to load offline policy');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.post<{ success: boolean; policy: InstitutionPolicy }>(
        '/offline/policy',
        {
          offlineDurationDays,
          offlineMaxDevices,
          allowOfflineDownload,
        }
      );

      setPolicy(response.data.policy);
      setSuccess('Offline policy updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to save policy:', err);
      setError(err.response?.data?.message || 'Failed to update offline policy');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: 96, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, outline: 'none',
  };

  const inputDisabledStyle: React.CSSProperties = {
    ...inputStyle, background: '#f3f4f6', cursor: 'not-allowed', opacity: 0.7,
  };

  if (loading) {
    return (
      <CollegeLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <RefreshCw size={24} style={{ color: '#0A84FF', animation: 'spin 1s linear infinite' }} />
          <span style={{ marginLeft: 8, color: '#6b7280' }}>Loading offline policy...</span>
        </div>
      </CollegeLayout>
    );
  }

  return (
    <CollegeLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Offline Access Policy
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            Configure offline download policies for your institution
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div style={{
            marginBottom: 24, padding: 16, background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 8, display: 'flex', alignItems: 'flex-start',
          }}>
            <AlertCircle size={20} style={{ color: '#DC2626', marginRight: 12, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#7F1D1D' }}>Error</p>
              <p style={{ fontSize: 14, color: '#B91C1C' }}>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div style={{
            marginBottom: 24, padding: 16, background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: 8, display: 'flex', alignItems: 'flex-start',
          }}>
            <CheckCircle size={20} style={{ color: '#16A34A', marginRight: 12, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#14532D' }}>Success</p>
              <p style={{ fontSize: 14, color: '#15803D' }}>{success}</p>
            </div>
          </div>
        )}

        {/* Policy Settings Card */}
        <div style={{
          background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb', padding: 24,
        }}>
          {/* Enable/Disable Offline Access */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            <div
              onClick={() => setAllowOfflineDownload(!allowOfflineDownload)}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                background: allowOfflineDownload ? '#0A84FF' : '#d1d5db',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, transition: 'left 0.2s',
                left: allowOfflineDownload ? 22 : 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
            <div style={{ marginLeft: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Download size={18} style={{ color: '#374151', marginRight: 8 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  Allow Offline Downloads
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                Enable students to download EPUB content for offline reading
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />

          {/* Offline Duration */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Calendar size={18} style={{ color: '#374151', marginRight: 8 }} />
                Offline Access Duration
              </div>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number"
                min="1"
                max="365"
                value={offlineDurationDays}
                onChange={(e) => setOfflineDurationDays(parseInt(e.target.value) || 1)}
                disabled={!allowOfflineDownload}
                style={allowOfflineDownload ? inputStyle : inputDisabledStyle}
              />
              <span style={{ fontSize: 14, color: '#6b7280' }}>days</span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
              How long offline content remains accessible (1-365 days)
            </p>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />

          {/* Max Devices */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Smartphone size={18} style={{ color: '#374151', marginRight: 8 }} />
                Maximum Devices per Student
              </div>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number"
                min="1"
                max="10"
                value={offlineMaxDevices}
                onChange={(e) => setOfflineMaxDevices(parseInt(e.target.value) || 1)}
                disabled={!allowOfflineDownload}
                style={allowOfflineDownload ? inputStyle : inputDisabledStyle}
              />
              <span style={{ fontSize: 14, color: '#6b7280' }}>devices</span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
              Maximum number of devices allowed per student (1-10)
            </p>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />

          {/* Security Note */}
          <div style={{
            background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: 16,
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <Shield size={20} style={{ color: '#2563EB', marginRight: 12, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1E3A8A', marginBottom: 6 }}>
                  Security Features
                </p>
                <ul style={{ fontSize: 13, color: '#1D4ED8', margin: 0, padding: 0, listStyle: 'none' }}>
                  <li style={{ marginBottom: 4 }}>• All offline content is encrypted with device-bound keys</li>
                  <li style={{ marginBottom: 4 }}>• Forensic watermarks persist in offline mode</li>
                  <li style={{ marginBottom: 4 }}>• Tamper detection remains active</li>
                  <li>• Access auto-revokes after expiry or policy changes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 16 }}>
            <button
              onClick={loadPolicy}
              disabled={loading || saving}
              style={{
                padding: '8px 16px', color: '#374151', background: '#fff',
                border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer',
                fontSize: 14, display: 'flex', alignItems: 'center', gap: 6,
                opacity: (loading || saving) ? 0.5 : 1,
              }}
            >
              <RefreshCw size={16} /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={loading || saving}
              style={{
                padding: '8px 24px', color: '#fff', background: '#0A84FF',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                opacity: (loading || saving) ? 0.5 : 1,
              }}
            >
              {saving ? (
                <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              ) : (
                <><Save size={16} /> Save Changes</>
              )}
            </button>
          </div>
        </div>

        {/* Current Policy Summary */}
        {policy && (
          <div style={{
            marginTop: 24, background: '#f9fafb', borderRadius: 8, padding: 16,
            border: '1px solid #e5e7eb',
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Current Policy</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 14 }}>
              <div>
                <p style={{ color: '#6b7280', marginBottom: 4 }}>Status</p>
                <p style={{ fontWeight: 600, color: '#111827' }}>
                  {policy.allowOfflineDownload ? '✓ Enabled' : '✗ Disabled'}
                </p>
              </div>
              <div>
                <p style={{ color: '#6b7280', marginBottom: 4 }}>Duration</p>
                <p style={{ fontWeight: 600, color: '#111827' }}>
                  {policy.offlineDurationDays} days
                </p>
              </div>
              <div>
                <p style={{ color: '#6b7280', marginBottom: 4 }}>Max Devices</p>
                <p style={{ fontWeight: 600, color: '#111827' }}>
                  {policy.offlineMaxDevices} devices
                </p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
              Last updated: {formatDateTime(policy.updatedAt)}
            </p>
          </div>
        )}
      </div>
    </CollegeLayout>
  );
};
