import React, { useState, useEffect } from 'react';
import publisherProfileService, { PublisherProfile, UpdatePublisherProfileDto } from '../services/publisher-profile.service';

const PublisherProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Editable form state
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<UpdatePublisherProfileDto>({
    companyName: '',
    contactPerson: '',
    contactEmail: '',
    physicalAddress: '',
  });

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await publisherProfileService.getProfile();
      setProfile(data);
      setFormData({
        companyName: data.companyName,
        contactPerson: data.contactPerson || '',
        contactEmail: data.contactEmail || '',
        physicalAddress: data.physicalAddress || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const updated = await publisherProfileService.updateProfile(formData);
      setProfile(updated);
      setEditMode(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);
      setPasswordError('');
      await publisherProfileService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#10b981';
      case 'SUSPENDED': return '#ef4444';
      case 'EXPIRED': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Failed to load profile</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📋 Publisher Profile</h1>
        <p style={styles.subtitle}>Manage your publisher account information</p>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}
      {success && <div style={styles.successAlert}>{success}</div>}

      <div style={styles.content}>
        {/* Editable Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>✏️ Editable Information</h2>
            {!editMode ? (
              <button style={styles.editButton} onClick={() => setEditMode(true)}>
                Edit Profile
              </button>
            ) : (
              <div style={styles.buttonGroup}>
                <button style={styles.cancelButton} onClick={() => setEditMode(false)}>
                  Cancel
                </button>
                <button style={styles.saveButton} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Company Name</label>
              {editMode ? (
                <input
                  style={styles.input}
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              ) : (
                <div style={styles.value}>{profile.companyName}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Person</label>
              {editMode ? (
                <input
                  style={styles.input}
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Enter contact person name"
                />
              ) : (
                <div style={styles.value}>{profile.contactPerson || 'Not set'}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Email</label>
              {editMode ? (
                <input
                  style={styles.input}
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="Enter contact email"
                />
              ) : (
                <div style={styles.value}>{profile.contactEmail || 'Not set'}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Physical Address</label>
              {editMode ? (
                <textarea
                  style={{ ...styles.input, minHeight: '80px' }}
                  value={formData.physicalAddress}
                  onChange={(e) => setFormData({ ...formData, physicalAddress: e.target.value })}
                  placeholder="Enter physical address"
                />
              ) : (
                <div style={styles.value}>{profile.physicalAddress || 'Not set'}</div>
              )}
            </div>
          </div>

          <div style={styles.passwordSection}>
            <button style={styles.passwordButton} onClick={() => setShowPasswordModal(true)}>
              🔒 Change Password
            </button>
          </div>
        </div>

        {/* Read-Only Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🔒 Contract Information (Read-Only)</h2>
          <p style={styles.sectionSubtitle}>
            These fields are managed by Bitflow and cannot be modified.
          </p>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Publisher Code</label>
              <div style={styles.readOnlyValue}>{profile.publisherCode}</div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Legal Name</label>
              <div style={styles.readOnlyValue}>{profile.legalName || 'Not set'}</div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contract Start Date</label>
              <div style={styles.readOnlyValue}>{formatDate(profile.contractStartDate)}</div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contract End Date</label>
              <div style={styles.readOnlyValue}>{formatDate(profile.contractEndDate)}</div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Account Status</label>
              <div style={{ ...styles.statusBadge, backgroundColor: getStatusColor(profile.status) }}>
                {profile.status}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Member Since</label>
              <div style={styles.readOnlyValue}>{formatDate(profile.createdAt)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Change Password</h3>
            
            {passwordError && <div style={styles.errorAlert}>{passwordError}</div>}

            <div style={styles.formGroup}>
              <label style={styles.label}>Current Password</label>
              <input
                style={styles.input}
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>New Password</label>
              <input
                style={styles.input}
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                style={styles.input}
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>

            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={() => setShowPasswordModal(false)}>
                Cancel
              </button>
              <button style={styles.saveButton} onClick={handlePasswordChange} disabled={saving}>
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    padding: '24px',
    color: '#e2e8f0',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#f8fafc',
    margin: 0,
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: '8px',
  },
  content: {
    maxWidth: '900px',
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f8fafc',
    margin: 0,
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    marginTop: '-12px',
    marginBottom: '20px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#94a3b8',
  },
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px',
    color: '#f8fafc',
    fontSize: '14px',
  },
  value: {
    color: '#f8fafc',
    fontSize: '15px',
    padding: '12px 0',
  },
  readOnlyValue: {
    color: '#94a3b8',
    fontSize: '15px',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    width: 'fit-content',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },
  editButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#475569',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  passwordSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #334155',
  },
  passwordButton: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#ef4444',
  },
  errorAlert: {
    backgroundColor: '#7f1d1d',
    color: '#fecaca',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  successAlert: {
    backgroundColor: '#065f46',
    color: '#a7f3d0',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    width: '400px',
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f8fafc',
    marginTop: 0,
    marginBottom: '20px',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
};

export default PublisherProfilePage;
