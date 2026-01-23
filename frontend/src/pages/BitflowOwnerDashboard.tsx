import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import bitflowOwnerService from '../services/bitflow-owner.service';
import {
  Publisher,
  College,
  SecurityPolicy,
  PlatformAnalytics,
  AuditLogsResponse,
  PublisherStatus,
  CollegeStatus,
  DashboardOverview,
} from '../types';
import '../styles/Dashboard.css';

const BitflowOwnerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'publishers' | 'colleges' | 'security' | 'analytics' | 'audit'>('overview');
  
  // State
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [securityPolicy, setSecurityPolicy] = useState<SecurityPolicy | null>(null);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogsResponse | null>(null);
  const [dashboardOverview, setDashboardOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showPublisherModal, setShowPublisherModal] = useState(false);
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    type: 'publisher' | 'college';
    name: string;
    accounts?: { email: string; role: string }[];
    defaultPassword?: string;
  } | null>(null);
  const [newPublisher, setNewPublisher] = useState({
    name: '',
    code: '',
    legalName: '',
    contactPerson: '',
    contactEmail: '',
    contractStartDate: '',
    contractEndDate: '',
  });
  const [newCollege, setNewCollege] = useState({
    name: '',
    code: '',
    emailDomain: '',
    adminContactEmail: '',
    address: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const [pubs, cols, overview] = await Promise.all([
          bitflowOwnerService.getAllPublishers(),
          bitflowOwnerService.getAllColleges(),
          bitflowOwnerService.getDashboardOverview(),
        ]);
        setPublishers(pubs);
        setColleges(cols);
        setDashboardOverview(overview);
      }
      if (activeTab === 'publishers') {
        const pubs = await bitflowOwnerService.getAllPublishers();
        setPublishers(pubs);
      }
      if (activeTab === 'colleges') {
        const cols = await bitflowOwnerService.getAllColleges();
        setColleges(cols);
      }
      if (activeTab === 'security') {
        const policy = await bitflowOwnerService.getSecurityPolicy();
        setSecurityPolicy(policy);
      }
      if (activeTab === 'analytics') {
        const analyticsData = await bitflowOwnerService.getPlatformAnalytics();
        setAnalytics(analyticsData);
      }
      if (activeTab === 'audit') {
        const logs = await bitflowOwnerService.getAuditLogs({ limit: 50 });
        setAuditLogs(logs);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePublisher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await bitflowOwnerService.createPublisher(newPublisher);
      setShowPublisherModal(false);
      
      // Show credentials modal
      const adminEmail = newPublisher.contactEmail || `admin@${newPublisher.code.toLowerCase()}.publisher.com`;
      setCreatedCredentials({
        type: 'publisher',
        name: result.name,
        accounts: [
          { email: adminEmail, role: 'Publisher Admin' },
        ],
        defaultPassword: 'Contact Bitflow Admin for initial password',
      });
      setShowCredentialsModal(true);
      
      setNewPublisher({
        name: '',
        code: '',
        legalName: '',
        contactPerson: '',
        contactEmail: '',
        contractStartDate: '',
        contractEndDate: '',
      });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create publisher');
    }
  };

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result: any = await bitflowOwnerService.createCollege(newCollege);
      setShowCollegeModal(false);
      
      // Show credentials modal with auto-created accounts
      if (result.createdAccounts) {
        setCreatedCredentials({
          type: 'college',
          name: result.name,
          accounts: [
            { email: result.createdAccounts.itAdmin.email, role: 'IT Admin (College Admin)' },
            { email: result.createdAccounts.dean.email, role: 'Dean' },
          ],
          defaultPassword: result.createdAccounts.defaultPassword,
        });
        setShowCredentialsModal(true);
      }
      
      setNewCollege({
        name: '',
        code: '',
        emailDomain: '',
        adminContactEmail: '',
        address: '',
        city: '',
        state: '',
      });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create college');
    }
  };

  const handleTogglePublisherStatus = async (id: string, currentStatus: PublisherStatus) => {
    const newStatus = currentStatus === PublisherStatus.ACTIVE ? PublisherStatus.SUSPENDED : PublisherStatus.ACTIVE;
    try {
      await bitflowOwnerService.updatePublisherStatus(id, newStatus);
      loadData();
    } catch (error) {
      alert('Failed to update publisher status');
    }
  };

  const handleToggleCollegeStatus = async (id: string, currentStatus: CollegeStatus) => {
    const newStatus = currentStatus === CollegeStatus.ACTIVE ? CollegeStatus.SUSPENDED : CollegeStatus.ACTIVE;
    try {
      await bitflowOwnerService.updateCollegeStatus(id, newStatus);
      loadData();
    } catch (error) {
      alert('Failed to update college status');
    }
  };

  const handleToggleFeatureFlag = async (flag: string, value: boolean) => {
    try {
      await bitflowOwnerService.updateFeatureFlags({ [flag]: value });
      loadData();
    } catch (error) {
      alert('Failed to update feature flag');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Bitflow LMS</h2>
          <p>Platform Control</p>
        </div>
        
        <nav className="sidebar-nav">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
            📊 Overview
          </button>
          <button className={activeTab === 'publishers' ? 'active' : ''} onClick={() => setActiveTab('publishers')}>
            🏢 Publishers
          </button>
          <button className={activeTab === 'colleges' ? 'active' : ''} onClick={() => setActiveTab('colleges')}>
            🏫 Colleges
          </button>
          <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')}>
            🔒 Security &amp; Features
          </button>
          <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>
            📈 Analytics
          </button>
          <button className={activeTab === 'audit' ? 'active' : ''} onClick={() => setActiveTab('audit')}>
            📜 Audit Logs
          </button>
          <div className="nav-divider" />
          <button onClick={() => navigate('/content')} className="nav-special">
            📚 Content Library
          </button>
          <button onClick={() => navigate('/competencies')} className="nav-special">
            📋 Competency Framework
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{user?.fullName}</strong>
            <small>{user?.role}</small>
          </div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-header">
          <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="overview-grid">
                <div 
                  className="stat-card stat-card--clickable"
                  onClick={() => setActiveTab('publishers')}
                  title="Click to view all publishers"
                >
                  <h3>Publishers</h3>
                  <div className="stat-value">{dashboardOverview?.totalPublishers || publishers.length}</div>
                  <small>{dashboardOverview?.activePublishers || publishers.filter(p => p.status === 'ACTIVE').length} active</small>
                  {dashboardOverview?.expiredContractPublishers ? (
                    <small className="text-danger">{dashboardOverview.expiredContractPublishers} expired contracts</small>
                  ) : null}
                  <span className="card-link">View All →</span>
                </div>
                <div 
                  className="stat-card stat-card--clickable"
                  onClick={() => setActiveTab('colleges')}
                  title="Click to view all colleges"
                >
                  <h3>Colleges</h3>
                  <div className="stat-value">{dashboardOverview?.totalColleges || colleges.length}</div>
                  <small>{dashboardOverview?.activeColleges || colleges.filter(c => c.status === 'ACTIVE').length} active</small>
                  <span className="card-link">View All →</span>
                </div>
                <div 
                  className="stat-card stat-card--clickable"
                  onClick={() => setActiveTab('analytics')}
                  title="Click to view analytics"
                >
                  <h3>Total Users</h3>
                  <div className="stat-value">{dashboardOverview?.totalUsers || colleges.reduce((sum, c) => sum + (c.userCount || 0), 0)}</div>
                  <small>{dashboardOverview?.facultyCount || 0} faculty, {dashboardOverview?.studentCount || 0} students</small>
                  <span className="card-link">View Analytics →</span>
                </div>
                <div 
                  className="stat-card stat-card--clickable"
                  onClick={() => setActiveTab('analytics')}
                  title="Click to view analytics"
                >
                  <h3>Active Users</h3>
                  <div className="stat-value">{dashboardOverview?.dailyActiveUsers || 0}</div>
                  <small>Today ({dashboardOverview?.monthlyActiveUsers || 0} this month)</small>
                  <span className="card-link">View Analytics →</span>
                </div>
                
                {dashboardOverview?.contentByType && (
                  <>
                    <div 
                      className="stat-card stat-card--books stat-card--clickable"
                      onClick={() => setActiveTab('publishers')}
                      title="Click to view publishers (content source)"
                    >
                      <h3>📚 Books</h3>
                      <div className="stat-value">{dashboardOverview.contentByType.books}</div>
                      <span className="card-link">View Publishers →</span>
                    </div>
                    <div 
                      className="stat-card stat-card--videos stat-card--clickable"
                      onClick={() => setActiveTab('publishers')}
                      title="Click to view publishers (content source)"
                    >
                      <h3>🎥 Videos</h3>
                      <div className="stat-value">{dashboardOverview.contentByType.videos}</div>
                      <span className="card-link">View Publishers →</span>
                    </div>
                    <div 
                      className="stat-card stat-card--notes stat-card--clickable"
                      onClick={() => setActiveTab('publishers')}
                      title="Click to view publishers (content source)"
                    >
                      <h3>📝 Notes</h3>
                      <div className="stat-value">{dashboardOverview.contentByType.notes}</div>
                      <span className="card-link">View Publishers →</span>
                    </div>
                    <div 
                      className="stat-card stat-card--mcqs stat-card--clickable"
                      onClick={() => setActiveTab('publishers')}
                      title="Click to view publishers (content source)"
                    >
                      <h3>✅ MCQs</h3>
                      <div className="stat-value">{dashboardOverview.contentByType.mcqs}</div>
                      <span className="card-link">View Publishers →</span>
                    </div>
                  </>
                )}

                {dashboardOverview?.peakUsageHours && dashboardOverview.peakUsageHours.length > 0 && (
                  <div 
                    className="stat-card stat-card--wide stat-card--clickable"
                    onClick={() => setActiveTab('analytics')}
                    title="Click to view full analytics"
                  >
                    <h3>⏰ Peak Usage Hours</h3>
                    <div className="peak-hours-list">
                      {dashboardOverview.peakUsageHours.slice(0, 5).map((peak, idx) => (
                        <span key={idx} className={`peak-badge ${idx === 0 ? 'peak-badge--top' : ''}`}>
                          {peak.hour}:00 <span className="peak-count">{peak.loginCount}</span>
                        </span>
                      ))}
                    </div>
                    <span className="card-link">View Full Analytics →</span>
                  </div>
                )}

                {/* Quick Actions Section */}
                <div className="stat-card stat-card--wide stat-card--actions">
                  <h3>🚀 Quick Actions</h3>
                  <div className="quick-actions-grid">
                    <button className="quick-action-btn" onClick={() => { setActiveTab('publishers'); setShowPublisherModal(true); }}>
                      ➕ Add Publisher
                    </button>
                    <button className="quick-action-btn" onClick={() => { setActiveTab('colleges'); setShowCollegeModal(true); }}>
                      🏫 Add College
                    </button>
                    <button className="quick-action-btn" onClick={() => navigate('/content')}>
                      📚 Content Library
                    </button>
                    <button className="quick-action-btn" onClick={() => navigate('/competencies')}>
                      📋 Competency Framework
                    </button>
                    <button className="quick-action-btn" onClick={() => setActiveTab('security')}>
                      🔒 Security Settings
                    </button>
                    <button className="quick-action-btn" onClick={() => setActiveTab('audit')}>
                      📜 View Audit Logs
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Publishers Tab */}
            {activeTab === 'publishers' && (
              <div className="tab-content">
                <div className="tab-header">
                  <h2>Publisher Management</h2>
                  <button onClick={() => setShowPublisherModal(true)} className="primary-btn">+ Add Publisher</button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Status</th>
                        <th>Admins</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {publishers.map(pub => (
                        <tr key={pub.id}>
                          <td>{pub.name}</td>
                          <td><code>{pub.code}</code></td>
                          <td><span className={`status-badge ${pub.status.toLowerCase()}`}>{pub.status}</span></td>
                          <td>{pub.adminCount || 0}</td>
                          <td>{new Date(pub.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button 
                              onClick={() => handleTogglePublisherStatus(pub.id, pub.status)}
                              className={pub.status === 'ACTIVE' ? 'danger-btn-sm' : 'success-btn-sm'}
                            >
                              {pub.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Colleges Tab */}
            {activeTab === 'colleges' && (
              <div className="tab-content">
                <div className="tab-header">
                  <h2>College Management</h2>
                  <button onClick={() => setShowCollegeModal(true)} className="primary-btn">+ Add College</button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Status</th>
                        <th>Users</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colleges.map(col => (
                        <tr key={col.id}>
                          <td>{col.name}</td>
                          <td><code>{col.code}</code></td>
                          <td><span className={`status-badge ${col.status.toLowerCase()}`}>{col.status}</span></td>
                          <td>{col.userCount || 0}</td>
                          <td>{new Date(col.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button 
                              onClick={() => handleToggleCollegeStatus(col.id, col.status)}
                              className={col.status === 'ACTIVE' ? 'danger-btn-sm' : 'success-btn-sm'}
                            >
                              {col.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && securityPolicy && (
              <div className="tab-content">
                <h2>Security Policy & Feature Flags</h2>
                <div className="settings-grid">
                  <div className="setting-card">
                    <h3>Feature Flags</h3>
                    <div className="toggle-list">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={securityPolicy.publisherPortalEnabled}
                          onChange={(e) => handleToggleFeatureFlag('publisherPortalEnabled', e.target.checked)}
                        />
                        <span>Publisher Portal</span>
                      </label>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={securityPolicy.facultyPortalEnabled}
                          onChange={(e) => handleToggleFeatureFlag('facultyPortalEnabled', e.target.checked)}
                        />
                        <span>Faculty Portal</span>
                      </label>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={securityPolicy.studentPortalEnabled}
                          onChange={(e) => handleToggleFeatureFlag('studentPortalEnabled', e.target.checked)}
                        />
                        <span>Student Portal</span>
                      </label>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={securityPolicy.mobileAppEnabled}
                          onChange={(e) => handleToggleFeatureFlag('mobileAppEnabled', e.target.checked)}
                        />
                        <span>Mobile App</span>
                      </label>
                    </div>
                  </div>
                  <div className="setting-card">
                    <h3>Security Settings</h3>
                    <div className="info-list">
                      <div><strong>Session Timeout:</strong> {securityPolicy.sessionTimeoutMinutes} min</div>
                      <div><strong>Token Expiry:</strong> {securityPolicy.tokenExpiryMinutes} min</div>
                      <div><strong>Max Sessions:</strong> {securityPolicy.maxConcurrentSessions}</div>
                      <div><strong>Watermark:</strong> {securityPolicy.watermarkEnabled ? '✓ Enabled' : '✗ Disabled'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
              <div className="tab-content">
                <h2>Platform Analytics</h2>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <h4>Colleges</h4>
                    <div className="analytics-stats">
                      <div><strong>{analytics.activeColleges}</strong> Active</div>
                      <div><strong>{analytics.suspendedColleges}</strong> Suspended</div>
                    </div>
                  </div>
                  <div className="analytics-card">
                    <h4>Publishers</h4>
                    <div className="analytics-stats">
                      <div><strong>{analytics.activePublishers}</strong> Active</div>
                      <div><strong>{analytics.suspendedPublishers}</strong> Suspended</div>
                    </div>
                  </div>
                  <div className="analytics-card">
                    <h4>Users</h4>
                    <div className="analytics-stats">
                      <div><strong>{analytics.totalUsers}</strong> Total</div>
                      <div><strong>{analytics.activeUsers}</strong> Active (7d)</div>
                    </div>
                  </div>
                  <div className="analytics-card">
                    <h4>Login Activity</h4>
                    <div className="analytics-stats">
                      <div><strong>{analytics.totalLogins}</strong> Successful</div>
                      <div><strong>{analytics.failedLoginAttempts}</strong> Failed</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs Tab */}
            {activeTab === 'audit' && auditLogs && (
              <div className="tab-content">
                <h2>Audit Logs</h2>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>User</th>
                        <th>Description</th>
                        <th>Entity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.logs.map(log => (
                        <tr key={log.id}>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                          <td><code>{log.action}</code></td>
                          <td>{log.userEmail || 'N/A'}</td>
                          <td>{log.description}</td>
                          <td>{log.entityType || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Publisher Modal */}
      {showPublisherModal && (
        <div className="modal-overlay" onClick={() => setShowPublisherModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h2>Add New Publisher</h2>
            <form onSubmit={handleCreatePublisher}>
              <div className="form-row">
                <div className="form-group">
                  <label>Publisher Name *</label>
                  <input 
                    type="text" 
                    value={newPublisher.name}
                    onChange={e => setNewPublisher({...newPublisher, name: e.target.value})}
                    placeholder="e.g., Elsevier"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Code (uppercase) *</label>
                  <input 
                    type="text" 
                    value={newPublisher.code}
                    onChange={e => setNewPublisher({...newPublisher, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., ELSEVIER"
                    pattern="[A-Z0-9_]+"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Legal Name</label>
                  <input 
                    type="text" 
                    value={newPublisher.legalName}
                    onChange={e => setNewPublisher({...newPublisher, legalName: e.target.value})}
                    placeholder="e.g., Elsevier B.V."
                  />
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input 
                    type="text" 
                    value={newPublisher.contactPerson}
                    onChange={e => setNewPublisher({...newPublisher, contactPerson: e.target.value})}
                    placeholder="e.g., John Doe"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input 
                  type="email" 
                  value={newPublisher.contactEmail}
                  onChange={e => setNewPublisher({...newPublisher, contactEmail: e.target.value})}
                  placeholder="e.g., contact@elsevier.com"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contract Start Date</label>
                  <input 
                    type="date" 
                    value={newPublisher.contractStartDate}
                    onChange={e => setNewPublisher({...newPublisher, contractStartDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Contract End Date</label>
                  <input 
                    type="date" 
                    value={newPublisher.contractEndDate}
                    onChange={e => setNewPublisher({...newPublisher, contractEndDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowPublisherModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">+ Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* College Modal */}
      {showCollegeModal && (
        <div className="modal-overlay" onClick={() => setShowCollegeModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h2>Add New College</h2>
            <form onSubmit={handleCreateCollege}>
              <div className="form-row">
                <div className="form-group">
                  <label>College Name *</label>
                  <input 
                    type="text" 
                    value={newCollege.name}
                    onChange={e => setNewCollege({...newCollege, name: e.target.value})}
                    placeholder="e.g., GMC Mumbai"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Code (uppercase) *</label>
                  <input 
                    type="text" 
                    value={newCollege.code}
                    onChange={e => setNewCollege({...newCollege, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., GMC_MUMBAI"
                    pattern="[A-Z0-9_]+"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email Domain</label>
                  <input 
                    type="text" 
                    value={newCollege.emailDomain}
                    onChange={e => setNewCollege({...newCollege, emailDomain: e.target.value})}
                    placeholder="e.g., gmc.edu.in"
                  />
                </div>
                <div className="form-group">
                  <label>Admin Contact Email</label>
                  <input 
                    type="email" 
                    value={newCollege.adminContactEmail}
                    onChange={e => setNewCollege({...newCollege, adminContactEmail: e.target.value})}
                    placeholder="e.g., admin@gmc.edu.in"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input 
                  type="text" 
                  value={newCollege.address}
                  onChange={e => setNewCollege({...newCollege, address: e.target.value})}
                  placeholder="e.g., 123 Medical College Road"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input 
                    type="text" 
                    value={newCollege.city}
                    onChange={e => setNewCollege({...newCollege, city: e.target.value})}
                    placeholder="e.g., Mumbai"
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input 
                    type="text" 
                    value={newCollege.state}
                    onChange={e => setNewCollege({...newCollege, state: e.target.value})}
                    placeholder="e.g., Maharashtra"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCollegeModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">+ Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal - Shows after creating publisher/college */}
      {showCredentialsModal && createdCredentials && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>✅ {createdCredentials.type === 'college' ? 'College' : 'Publisher'} Created Successfully!</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowCredentialsModal(false);
                  setCreatedCredentials(null);
                  loadData();
                }}
              >
                ×
              </button>
            </div>
            
            <div className="credentials-info" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>
                {createdCredentials.name}
              </h3>
              
              <div style={{ 
                background: '#e8f5e9', 
                border: '1px solid #4caf50', 
                borderRadius: '8px', 
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#2e7d32', marginBottom: '15px' }}>
                  🔐 Login Credentials
                </h4>
                
                {createdCredentials.accounts?.map((account, index) => (
                  <div key={index} style={{ 
                    marginBottom: '15px', 
                    padding: '10px', 
                    background: '#fff', 
                    borderRadius: '4px',
                    border: '1px solid #c8e6c9'
                  }}>
                    <p style={{ margin: '5px 0' }}>
                      <strong>Role:</strong> {account.role}
                    </p>
                    <p style={{ margin: '5px 0' }}>
                      <strong>Email:</strong>{' '}
                      <code style={{ 
                        background: '#f5f5f5', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}>
                        {account.email}
                      </code>
                    </p>
                  </div>
                ))}
                
                <div style={{ 
                  marginTop: '15px', 
                  padding: '10px', 
                  background: '#fff3e0', 
                  borderRadius: '4px',
                  border: '1px solid #ffb74d'
                }}>
                  <p style={{ margin: '5px 0', color: '#e65100' }}>
                    <strong>Default Password:</strong>{' '}
                    <code style={{ 
                      background: '#fff8e1', 
                      padding: '2px 8px', 
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold'
                    }}>
                      {createdCredentials.defaultPassword}
                    </code>
                  </p>
                </div>
              </div>
              
              <div style={{ 
                background: '#fff3e0', 
                padding: '15px', 
                borderRadius: '8px',
                border: '1px solid #ffb74d'
              }}>
                <p style={{ margin: 0, color: '#e65100' }}>
                  <strong>⚠️ Important:</strong> Please share these credentials securely with the {createdCredentials.type} administrator. 
                  Users should change their password upon first login.
                </p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => {
                    setShowCredentialsModal(false);
                    setCreatedCredentials(null);
                    loadData();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  Got it, Close
                </button>
                {createdCredentials.accounts?.map((account, idx) => {
                  // Compose Gmail URL
                  const subject = encodeURIComponent(
                    `Your LMS Account Credentials (${createdCredentials.type === 'college' ? 'College' : 'Publisher'})`
                  );
                  const body = encodeURIComponent(
                    `Dear ${account.role},\n\n` +
                    `Your account for the Medical LMS has been created.\n` +
                    `Login Email: ${account.email}\n` +
                    `Temporary Password: ${createdCredentials.defaultPassword}\n\n` +
                    `Please login at http://localhost:3000 and change your password immediately.\n\n` +
                    `Regards,\nBitflow Admin`
                  );
                  const mailto = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(account.email)}&su=${subject}&body=${body}`;
                  return (
                    <a
                      key={idx}
                      href={mailto}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '100%',
                        display: 'block',
                        textDecoration: 'none',
                        marginTop: idx === 0 ? 0 : 8
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: '#4285f4',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 6 }}><path fill="#4285f4" d="M44 10v28H4V10l20 14Z"/><path fill="#34a853" d="M44 10v28H24V24Z"/><path fill="#fbbc04" d="M4 10v28h20V24Z"/><path fill="#ea4335" d="M44 10H4l20 14Z"/></svg>
                        Send Credentials via Gmail ({account.role})
                      </button>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BitflowOwnerDashboard;
