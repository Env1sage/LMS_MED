import React, { useState } from 'react';
import authService from '../../services/auth.service';
import { User } from '../../types';

interface ProfileModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      setError('Password must contain uppercase, lowercase, number, and special character');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
    setActiveTab('profile');
    onClose();
  };

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      'BITFLOW_OWNER': 'Platform Owner',
      'PUBLISHER_ADMIN': 'Publisher Admin',
      'COLLEGE_ADMIN': 'College Admin',
      'FACULTY': 'Faculty',
      'STUDENT': 'Student',
    };
    return roleMap[role] || role;
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>My Profile</h2>
          <button style={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'profile' ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab('profile')}
          >
            Profile Info
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'password' ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab('password')}
          >
            Change Password
          </button>
        </div>

        <div style={styles.content}>
          {activeTab === 'profile' && (
            <div style={styles.profileInfo}>
              <div style={styles.avatar}>
                {user?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <label style={styles.label}>Full Name</label>
                  <div style={styles.value}>{user?.fullName || 'N/A'}</div>
                </div>
                <div style={styles.infoItem}>
                  <label style={styles.label}>Email</label>
                  <div style={styles.value}>{user?.email || 'N/A'}</div>
                </div>
                <div style={styles.infoItem}>
                  <label style={styles.label}>Role</label>
                  <div style={styles.value}>{getRoleName(user?.role || '')}</div>
                </div>
                <div style={styles.infoItem}>
                  <label style={styles.label}>Status</label>
                  <div style={{
                    ...styles.value,
                    ...styles.statusBadge,
                    backgroundColor: user?.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7',
                    color: user?.status === 'ACTIVE' ? '#166534' : '#92400e',
                  }}>
                    {user?.status || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} style={styles.form}>
              {error && <div style={styles.error}>{error}</div>}
              {success && <div style={styles.success}>{success}</div>}
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={styles.input}
                  required
                  placeholder="Enter current password"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                  required
                  placeholder="Enter new password"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                  required
                  placeholder="Confirm new password"
                />
              </div>

              <div style={styles.passwordRequirements}>
                <p style={styles.requirementsTitle}>Password Requirements:</p>
                <ul style={styles.requirementsList}>
                  <li style={{ color: newPassword.length >= 8 ? '#16a34a' : '#6b7280' }}>
                    ✓ At least 8 characters
                  </li>
                  <li style={{ color: /[A-Z]/.test(newPassword) ? '#16a34a' : '#6b7280' }}>
                    ✓ One uppercase letter
                  </li>
                  <li style={{ color: /[a-z]/.test(newPassword) ? '#16a34a' : '#6b7280' }}>
                    ✓ One lowercase letter
                  </li>
                  <li style={{ color: /[0-9]/.test(newPassword) ? '#16a34a' : '#6b7280' }}>
                    ✓ One number
                  </li>
                  <li style={{ color: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '#16a34a' : '#6b7280' }}>
                    ✓ One special character
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                style={{
                  ...styles.submitBtn,
                  opacity: loading ? 0.7 : 1,
                }}
                disabled={loading}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0',
    lineHeight: '1',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 24px',
  },
  tab: {
    padding: '12px 20px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
  },
  content: {
    padding: '24px',
  },
  profileInfo: {
    textAlign: 'center' as const,
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: '600',
    margin: '0 auto 24px',
  },
  infoGrid: {
    display: 'grid',
    gap: '16px',
    textAlign: 'left' as const,
  },
  infoItem: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: '15px',
    color: '#111827',
    fontWeight: '500',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '13px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  formLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
  },
  success: {
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    color: '#16a34a',
    fontSize: '14px',
  },
  passwordRequirements: {
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    borderRadius: '8px',
    marginTop: '8px',
  },
  requirementsTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
  },
  requirementsList: {
    margin: 0,
    paddingLeft: '16px',
    fontSize: '13px',
    listStyle: 'none',
  },
  submitBtn: {
    padding: '12px 20px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.2s',
  },
};

export default ProfileModal;
