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
  const [newPublisher, setNewPublisher] = useState({ name: '', code: '' });
  const [newCollege, setNewCollege] = useState({ name: '', code: '' });

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
      await bitflowOwnerService.createPublisher(newPublisher.name, newPublisher.code);
      setShowPublisherModal(false);
      setNewPublisher({ name: '', code: '' });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create publisher');
    }
  };

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bitflowOwnerService.createCollege(newCollege.name, newCollege.code);
      setShowCollegeModal(false);
      setNewCollege({ name: '', code: '' });
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
            Overview
          </button>
          <button className={activeTab === 'publishers' ? 'active' : ''} onClick={() => setActiveTab('publishers')}>
            Publishers
          </button>
          <button className={activeTab === 'colleges' ? 'active' : ''} onClick={() => setActiveTab('colleges')}>
            Colleges
          </button>
          <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')}>
            Security &amp; Features
          </button>
          <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>
            Analytics
          </button>
          <button className={activeTab === 'audit' ? 'active' : ''} onClick={() => setActiveTab('audit')}>
            Audit Logs
          </button>
          <div className="nav-divider" />
          <button onClick={() => navigate('/competencies')} className="nav-special">
            Competency Framework
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
                <div className="stat-card">
                  <h3>Publishers</h3>
                  <div className="stat-value">{dashboardOverview?.totalPublishers || publishers.length}</div>
                  <small>{dashboardOverview?.activePublishers || publishers.filter(p => p.status === 'ACTIVE').length} active</small>
                  {dashboardOverview?.expiredContractPublishers ? (
                    <small className="text-danger">{dashboardOverview.expiredContractPublishers} expired contracts</small>
                  ) : null}
                </div>
                <div className="stat-card">
                  <h3>Colleges</h3>
                  <div className="stat-value">{dashboardOverview?.totalColleges || colleges.length}</div>
                  <small>{dashboardOverview?.activeColleges || colleges.filter(c => c.status === 'ACTIVE').length} active</small>
                </div>
                <div className="stat-card">
                  <h3>Total Users</h3>
                  <div className="stat-value">{dashboardOverview?.totalUsers || colleges.reduce((sum, c) => sum + (c.userCount || 0), 0)}</div>
                  <small>{dashboardOverview?.facultyCount || 0} faculty, {dashboardOverview?.studentCount || 0} students</small>
                </div>
                <div className="stat-card">
                  <h3>Active Users</h3>
                  <div className="stat-value">{dashboardOverview?.dailyActiveUsers || 0}</div>
                  <small>Today ({dashboardOverview?.monthlyActiveUsers || 0} this month)</small>
                </div>
                
                {dashboardOverview?.contentByType && (
                  <>
                    <div className="stat-card stat-card--books">
                      <h3>Books</h3>
                      <div className="stat-value">{dashboardOverview.contentByType.books}</div>
                    </div>
                    <div className="stat-card stat-card--videos">
                      <h3>Videos</h3>
                      <div className="stat-value">{dashboardOverview.contentByType.videos}</div>
                    </div>
                    <div className="stat-card stat-card--notes">
                      <h3>Notes</h3>
                      <div className="stat-value">{dashboardOverview.contentByType.notes}</div>
                    </div>
                    <div className="stat-card stat-card--mcqs">
                      <h3>MCQs</h3>
                      <div className="stat-value">{dashboardOverview.contentByType.mcqs}</div>
                    </div>
                  </>
                )}

                {dashboardOverview?.peakUsageHours && dashboardOverview.peakUsageHours.length > 0 && (
                  <div className="stat-card stat-card--wide">
                    <h3>Peak Usage Hours</h3>
                    <div className="peak-hours-list">
                      {dashboardOverview.peakUsageHours.slice(0, 5).map((peak, idx) => (
                        <span key={idx} className={`peak-badge ${idx === 0 ? 'peak-badge--top' : ''}`}>
                          {peak.hour}:00 <span className="peak-count">{peak.loginCount}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
                      <div><span>Session Timeout</span> <strong>{securityPolicy.sessionTimeoutMinutes} min</strong></div>
                      <div><span>Token Expiry</span> <strong>{securityPolicy.tokenExpiryMinutes} min</strong></div>
                      <div><span>Max Sessions</span> <strong>{securityPolicy.maxConcurrentSessions}</strong></div>
                      <div><span>Watermark</span> <strong className={securityPolicy.watermarkEnabled ? 'text-success' : 'text-danger'}>{securityPolicy.watermarkEnabled ? 'Enabled' : 'Disabled'}</strong></div>
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
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add New Publisher</h2>
            <form onSubmit={handleCreatePublisher}>
              <div className="form-group">
                <label>Publisher Name</label>
                <input 
                  type="text" 
                  value={newPublisher.name}
                  onChange={e => setNewPublisher({...newPublisher, name: e.target.value})}
                  placeholder="e.g., Elsevier"
                  required
                />
              </div>
              <div className="form-group">
                <label>Code (uppercase, underscores)</label>
                <input 
                  type="text" 
                  value={newPublisher.code}
                  onChange={e => setNewPublisher({...newPublisher, code: e.target.value.toUpperCase()})}
                  placeholder="e.g., ELSEVIER"
                  pattern="[A-Z0-9_]+"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowPublisherModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* College Modal */}
      {showCollegeModal && (
        <div className="modal-overlay" onClick={() => setShowCollegeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add New College</h2>
            <form onSubmit={handleCreateCollege}>
              <div className="form-group">
                <label>College Name</label>
                <input 
                  type="text" 
                  value={newCollege.name}
                  onChange={e => setNewCollege({...newCollege, name: e.target.value})}
                  placeholder="e.g., GMC Mumbai"
                  required
                />
              </div>
              <div className="form-group">
                <label>Code (uppercase, underscores)</label>
                <input 
                  type="text" 
                  value={newCollege.code}
                  onChange={e => setNewCollege({...newCollege, code: e.target.value.toUpperCase()})}
                  placeholder="e.g., GMC_MUMBAI"
                  pattern="[A-Z0-9_]+"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCollegeModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BitflowOwnerDashboard;
