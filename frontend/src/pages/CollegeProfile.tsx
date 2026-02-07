import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import governanceService, { CollegeProfile as ICollegeProfile } from '../services/governance.service';
import '../styles/CollegeAdminNew.css';

const CollegeProfile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ICollegeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [formData, setFormData] = useState({
    adminContactEmail: '',
    address: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await governanceService.getCollegeProfile();
      setProfile(data);
      setFormData({
        adminContactEmail: data.adminContactEmail || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || ''
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch college profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const updated = await governanceService.updateCollegeProfile(formData);
      setProfile(updated);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        adminContactEmail: profile.adminContactEmail || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || ''
      });
    }
    setIsEditing(false);
  };

  // Clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading college profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Failed to load college profile</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button style={styles.backButton} onClick={() => navigate('/college-admin')}>
            ← Back to Dashboard
          </button>
          <h1 style={styles.title}>College Profile</h1>
        </div>
        {!isEditing && (
          <button style={styles.editButton} onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>

      {/* Messages */}
      {error && <div style={styles.errorMessage}>{error}</div>}
      {success && <div style={styles.successMessage}>{success}</div>}

      <div style={styles.profileContainer}>
        {/* Main Info Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>College Information</h2>
          
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <label style={styles.infoLabel}>College Name</label>
              <p style={styles.infoValue}>{profile.name}</p>
            </div>
            
            <div style={styles.infoItem}>
              <label style={styles.infoLabel}>College Code</label>
              <p style={styles.infoValue}>{profile.code}</p>
            </div>
            
            <div style={styles.infoItem}>
              <label style={styles.infoLabel}>Email Domain</label>
              <p style={styles.infoValue}>{profile.emailDomain || 'Not set'}</p>
            </div>
            
            <div style={styles.infoItem}>
              <label style={styles.infoLabel}>Status</label>
              <span style={profile.status === 'ACTIVE' ? styles.activeBadge : styles.inactiveBadge}>
                {profile.status}
              </span>
            </div>
            
            <div style={styles.infoItem}>
              <label style={styles.infoLabel}>Created</label>
              <p style={styles.infoValue}>
                {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Statistics</h2>
          
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{profile._count?.departments || 0}</span>
              <span style={styles.statLabel}>Departments</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{profile._count?.users || 0}</span>
              <span style={styles.statLabel}>Total Users</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{profile._count?.students || 0}</span>
              <span style={styles.statLabel}>Students</span>
            </div>
          </div>
        </div>

        {/* Contact & Address Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Contact & Address</h2>
          
          {isEditing ? (
            <div style={styles.editForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Admin Contact Email</label>
                <input
                  type="email"
                  name="adminContactEmail"
                  value={formData.adminContactEmail}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="admin@college.edu"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  style={styles.textarea}
                  placeholder="123 College Street"
                  rows={2}
                />
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="City"
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="State"
                  />
                </div>
              </div>
              
              <div style={styles.formActions}>
                <button
                  style={styles.cancelButton}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  style={styles.saveButton}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <label style={styles.infoLabel}>Admin Contact Email</label>
                <p style={styles.infoValue}>
                  {profile.adminContactEmail || 'Not set'}
                </p>
              </div>
              
              <div style={styles.infoItem}>
                <label style={styles.infoLabel}>Address</label>
                <p style={styles.infoValue}>
                  {profile.address || 'Not set'}
                </p>
              </div>
              
              <div style={styles.infoItem}>
                <label style={styles.infoLabel}>City</label>
                <p style={styles.infoValue}>
                  {profile.city || 'Not set'}
                </p>
              </div>
              
              <div style={styles.infoItem}>
                <label style={styles.infoLabel}>State</label>
                <p style={styles.infoValue}>
                  {profile.state || 'Not set'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Links Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Quick Actions</h2>
          
          <div style={styles.quickLinks}>
            <button 
              style={styles.quickLink}
              onClick={() => navigate('/college-admin/departments')}
            >
              <span style={styles.quickLinkIcon}>🏛️</span>
              <span>Manage Departments</span>
            </button>
            
            <button 
              style={styles.quickLink}
              onClick={() => navigate('/college-admin/faculty')}
            >
              <span style={styles.quickLinkIcon}>👨‍🏫</span>
              <span>Manage Faculty</span>
            </button>
            
            <button 
              style={styles.quickLink}
              onClick={() => navigate('/college-admin')}
            >
              <span style={styles.quickLinkIcon}>👨‍🎓</span>
              <span>Manage Students</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#0066cc',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0',
    marginBottom: '10px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    color: '#333',
  },
  editButton: {
    padding: '10px 20px',
    backgroundColor: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666',
  },
  error: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#c00',
  },
  errorMessage: {
    padding: '12px',
    backgroundColor: '#fee',
    color: '#c00',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  successMessage: {
    padding: '12px',
    backgroundColor: '#efe',
    color: '#060',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  profileContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    color: '#333',
    borderBottom: '1px solid #eee',
    paddingBottom: '12px',
  },
  infoGrid: {
    display: 'grid',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  infoValue: {
    margin: 0,
    fontSize: '16px',
    color: '#333',
  },
  activeBadge: {
    display: 'inline-block',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    width: 'fit-content',
  },
  inactiveBadge: {
    display: 'inline-block',
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    width: 'fit-content',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#0066cc',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    flex: 1,
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '16px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f5f5f5',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  quickLinks: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  quickLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #eee',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#333',
    transition: 'background-color 0.2s',
  },
  quickLinkIcon: {
    fontSize: '24px',
  },
};

export default CollegeProfile;
