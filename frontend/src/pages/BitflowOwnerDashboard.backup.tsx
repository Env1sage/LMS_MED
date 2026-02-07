import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import bitflowOwnerService from '../services/bitflow-owner.service';
import { packagesService } from '../services/packages.service';
import { ratingsService, GlobalRatingAnalytics } from '../services/ratings.service';
import { NotificationBell } from '../components/notifications';
import {
  DashboardIcon,
  BuildingIcon,
  UniversityIcon,
  PackageIcon,
  ShieldIcon,
  ChartIcon,
  FileIcon,
  BookIcon,
  ClipboardIcon,
  UsersIcon,
  CalendarIcon,
  ArrowUpIcon,
  CheckIcon,
} from '../components/Icons';
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
import '../styles/BitflowModernClean.css';

// Package types
interface Package {
  id: string;
  name: string;
  description?: string;
  publisherId: string;
  subjects: string[];
  contentTypes: string[];
  status: string;
  createdAt: string;
  publisher?: { id: string; name: string; code: string };
  _count?: { college_packages: number };
}

interface PackageAssignment {
  id: string;
  collegeId: string;
  packageId: string;
  startDate: string;
  endDate?: string;
  status: string;
  college?: { id: string; name: string; code: string };
  package?: Package;
}

const BitflowOwnerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'publishers' | 'colleges' | 'packages' | 'security' | 'analytics' | 'audit'>('overview');
  
  // State
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [packageAssignments, setPackageAssignments] = useState<PackageAssignment[]>([]);
  const [securityPolicy, setSecurityPolicy] = useState<SecurityPolicy | null>(null);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [globalRatingAnalytics, setGlobalRatingAnalytics] = useState<GlobalRatingAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogsResponse | null>(null);
  const [dashboardOverview, setDashboardOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Filter States for Publishers
  const [publisherStatusFilter, setPublisherStatusFilter] = useState<string>('all');
  const [publisherCreatedDateFilter, setPublisherCreatedDateFilter] = useState<string>('');
  const [publisherRenewalDateFilter, setPublisherRenewalDateFilter] = useState<string>('');
  
  // Filter States for Colleges
  const [collegeStatusFilter, setCollegeStatusFilter] = useState<string>('all');
  const [collegeCreatedDateFilter, setCollegeCreatedDateFilter] = useState<string>('');
  const [collegeRenewalDateFilter, setCollegeRenewalDateFilter] = useState<string>('');
  
  // Filter States for Packages
  const [packageStatusFilter, setPackageStatusFilter] = useState<string>('all');
  const [packagePublisherFilter, setPackagePublisherFilter] = useState<string>('all');
  
  // Filter States for Audit Logs
  const [auditDateFrom, setAuditDateFrom] = useState<string>('');
  const [auditDateTo, setAuditDateTo] = useState<string>('');
  const [auditRoleFilter, setAuditRoleFilter] = useState<string>('all');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  
  // Modals
  const [showPublisherModal, setShowPublisherModal] = useState(false);
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showAssignPackageModal, setShowAssignPackageModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  
  // Edit/Delete/Renew Modals
  const [showEditPublisherModal, setShowEditPublisherModal] = useState(false);
  const [showDeletePublisherModal, setShowDeletePublisherModal] = useState(false);
  const [showRenewPublisherModal, setShowRenewPublisherModal] = useState(false);
  const [showEditCollegeModal, setShowEditCollegeModal] = useState(false);
  const [showDeleteCollegeModal, setShowDeleteCollegeModal] = useState(false);
  const [showRenewCollegeModal, setShowRenewCollegeModal] = useState(false);
  const [showEditPackageModal, setShowEditPackageModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  
  // Selected items for edit/delete
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  
  // Renewal form
  const [renewalEndDate, setRenewalEndDate] = useState<string>('');
  
  // Bulk assignment
  const [bulkAssignColleges, setBulkAssignColleges] = useState<string[]>([]);
  const [bulkAssignStartDate, setBulkAssignStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bulkAssignEndDate, setBulkAssignEndDate] = useState<string>('');
  
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
  const [newPackage, setNewPackage] = useState({
    name: '',
    description: '',
    publisherId: '',
    subjects: [] as string[],
    contentTypes: [] as string[],
  });
  const [newAssignment, setNewAssignment] = useState({
    packageId: '',
    collegeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
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
      if (activeTab === 'packages') {
        const [pkgs, assigns, pubs, cols] = await Promise.all([
          packagesService.getAll(),
          packagesService.getAllAssignments(),
          bitflowOwnerService.getAllPublishers(),
          bitflowOwnerService.getAllColleges(),
        ]);
        setPackages(pkgs);
        setPackageAssignments(assigns);
        setPublishers(pubs);
        setColleges(cols);
      }
      if (activeTab === 'security') {
        const policy = await bitflowOwnerService.getSecurityPolicy();
        setSecurityPolicy(policy);
      }
      if (activeTab === 'analytics') {
        const [analyticsData, ratingsData] = await Promise.all([
          bitflowOwnerService.getPlatformAnalytics(),
          ratingsService.getGlobalRatingAnalytics().catch(() => null),
        ]);
        setAnalytics(analyticsData);
        setGlobalRatingAnalytics(ratingsData);
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

  // Edit Publisher Handler
  const handleEditPublisher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPublisher) return;
    try {
      await bitflowOwnerService.updatePublisher(selectedPublisher.id, {
        name: selectedPublisher.name,
        legalName: selectedPublisher.legalName,
        contactPerson: selectedPublisher.contactPerson,
        contactEmail: selectedPublisher.contactEmail,
        contractStartDate: selectedPublisher.contractStartDate,
        contractEndDate: selectedPublisher.contractEndDate,
      });
      setShowEditPublisherModal(false);
      setSelectedPublisher(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update publisher');
    }
  };

  // Delete Publisher Handler
  const handleDeletePublisher = async () => {
    if (!selectedPublisher) return;
    try {
      await bitflowOwnerService.deletePublisher(selectedPublisher.id);
      setShowDeletePublisherModal(false);
      setSelectedPublisher(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete publisher');
    }
  };

  // Renew Publisher Handler
  const handleRenewPublisher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPublisher || !renewalEndDate) return;
    try {
      await bitflowOwnerService.updatePublisher(selectedPublisher.id, {
        contractEndDate: renewalEndDate,
      });
      setShowRenewPublisherModal(false);
      setSelectedPublisher(null);
      setRenewalEndDate('');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to renew publisher');
    }
  };

  // Edit College Handler
  const handleEditCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollege) return;
    try {
      await bitflowOwnerService.updateCollege(selectedCollege.id, {
        name: selectedCollege.name,
        emailDomain: selectedCollege.emailDomain,
        adminContactEmail: selectedCollege.adminContactEmail,
        address: selectedCollege.address,
        city: selectedCollege.city,
        state: selectedCollege.state,
      });
      setShowEditCollegeModal(false);
      setSelectedCollege(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update college');
    }
  };

  // Delete College Handler
  const handleDeleteCollege = async () => {
    if (!selectedCollege) return;
    try {
      await bitflowOwnerService.deleteCollege(selectedCollege.id);
      setShowDeleteCollegeModal(false);
      setSelectedCollege(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete college');
    }
  };

  // Renew College Handler
  const handleRenewCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollege || !renewalEndDate) return;
    try {
      await bitflowOwnerService.updateCollege(selectedCollege.id, {
        contractEndDate: renewalEndDate,
      });
      setShowRenewCollegeModal(false);
      setSelectedCollege(null);
      setRenewalEndDate('');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to renew college');
    }
  };

  // Edit Package Handler
  const handleEditPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    try {
      await packagesService.update(selectedPackage.id, {
        name: selectedPackage.name,
        description: selectedPackage.description,
        subjects: selectedPackage.subjects,
        contentTypes: selectedPackage.contentTypes,
      });
      setShowEditPackageModal(false);
      setSelectedPackage(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update package');
    }
  };

  // Bulk Assign Package Handler
  const handleBulkAssignPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || bulkAssignColleges.length === 0) return;
    try {
      for (const collegeId of bulkAssignColleges) {
        await packagesService.assignToCollege({
          packageId: selectedPackage.id,
          collegeId,
          startDate: bulkAssignStartDate,
          endDate: bulkAssignEndDate || undefined,
        });
      }
      setShowBulkAssignModal(false);
      setSelectedPackage(null);
      setBulkAssignColleges([]);
      setBulkAssignStartDate(new Date().toISOString().split('T')[0]);
      setBulkAssignEndDate('');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to bulk assign package');
    }
  };

  // Filtered data using useMemo
  const filteredPublishers = useMemo(() => {
    return publishers.filter(pub => {
      // Status filter
      if (publisherStatusFilter !== 'all') {
        if (publisherStatusFilter === 'expired') {
          if (!pub.contractEndDate || new Date(pub.contractEndDate) > new Date()) return false;
        } else if (pub.status !== publisherStatusFilter) {
          return false;
        }
      }
      // Created date filter
      if (publisherCreatedDateFilter) {
        const createdDate = new Date(pub.createdAt).toISOString().split('T')[0];
        if (createdDate < publisherCreatedDateFilter) return false;
      }
      // Renewal date filter
      if (publisherRenewalDateFilter && pub.contractEndDate) {
        const endDate = new Date(pub.contractEndDate).toISOString().split('T')[0];
        if (endDate > publisherRenewalDateFilter) return false;
      }
      return true;
    });
  }, [publishers, publisherStatusFilter, publisherCreatedDateFilter, publisherRenewalDateFilter]);

  const filteredColleges = useMemo(() => {
    return colleges.filter(col => {
      // Status filter
      if (collegeStatusFilter !== 'all') {
        if (collegeStatusFilter === 'expired') {
          if (!(col as any).contractEndDate || new Date((col as any).contractEndDate) > new Date()) return false;
        } else if (col.status !== collegeStatusFilter) {
          return false;
        }
      }
      // Created date filter
      if (collegeCreatedDateFilter) {
        const createdDate = new Date(col.createdAt).toISOString().split('T')[0];
        if (createdDate < collegeCreatedDateFilter) return false;
      }
      // Renewal date filter
      if (collegeRenewalDateFilter && (col as any).contractEndDate) {
        const endDate = new Date((col as any).contractEndDate).toISOString().split('T')[0];
        if (endDate > collegeRenewalDateFilter) return false;
      }
      return true;
    });
  }, [colleges, collegeStatusFilter, collegeCreatedDateFilter, collegeRenewalDateFilter]);

  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      if (packageStatusFilter !== 'all' && pkg.status !== packageStatusFilter) return false;
      if (packagePublisherFilter !== 'all' && pkg.publisherId !== packagePublisherFilter) return false;
      return true;
    });
  }, [packages, packageStatusFilter, packagePublisherFilter]);

  const filteredAuditLogs = useMemo(() => {
    if (!auditLogs?.logs) return [];
    return auditLogs.logs.filter(log => {
      // Date range filter
      if (auditDateFrom) {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        if (logDate < auditDateFrom) return false;
      }
      if (auditDateTo) {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        if (logDate > auditDateTo) return false;
      }
      // Role filter
      if (auditRoleFilter !== 'all' && log.userRole !== auditRoleFilter) return false;
      // Action filter
      if (auditActionFilter !== 'all' && !log.action.toLowerCase().includes(auditActionFilter.toLowerCase())) return false;
      return true;
    });
  }, [auditLogs, auditDateFrom, auditDateTo, auditRoleFilter, auditActionFilter]);

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
          {[
            { id: 'overview' as const, icon: <DashboardIcon />, label: 'Overview' },
            { id: 'publishers' as const, icon: <BuildingIcon />, label: 'Publishers' },
            { id: 'colleges' as const, icon: <UniversityIcon />, label: 'Colleges' },
            { id: 'packages' as const, icon: <PackageIcon />, label: 'Content Packages' },
            { id: 'security' as const, icon: <ShieldIcon />, label: 'Security & Features' },
            { id: 'analytics' as const, icon: <ChartIcon />, label: 'Analytics' },
            { id: 'audit' as const, icon: <FileIcon />, label: 'Audit Logs' },
          ].map(item => (
            <button
              key={item.id}
              className={activeTab === item.id ? 'active' : ''}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <div className="nav-divider" />
          <button onClick={() => navigate('/content')} className="nav-special">
            <BookIcon />
            Content Library
          </button>
          <button onClick={() => navigate('/competencies')} className="nav-special">
            <ClipboardIcon />
            Competency Framework
          </button>
        </nav>

        <div className="sidebar-footer">
          <NotificationBell />
          <div className="user-info">
            <strong>{user?.fullName}</strong>
            <small>{user?.role}</small>
          </div>
          <button onClick={handleLogout} className="logout-btn">Sign Out</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-header">
          <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
          {activeTab === 'publishers' && (
            <button onClick={() => setShowPublisherModal(true)} className="primary-btn">+ Add Publisher</button>
          )}
          {activeTab === 'colleges' && (
            <button onClick={() => setShowCollegeModal(true)} className="primary-btn">+ Add College</button>
          )}
          {activeTab === 'packages' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowPackageModal(true)} className="primary-btn">+ Create Package</button>
              <button onClick={() => setShowAssignPackageModal(true)} className="secondary-btn">Assign to College</button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading...</div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="overview-section">
                <div className="overview-grid">
                  <div className="stat-card" onClick={() => setActiveTab('publishers')}>
                    <div className="stat-card-header">
                      <div className="stat-card-icon"><BuildingIcon /></div>
                      {dashboardOverview?.expiredContractPublishers && dashboardOverview.expiredContractPublishers > 0 ? (
                        <span className="stat-card-badge badge-warning">{dashboardOverview.expiredContractPublishers} Expired</span>
                      ) : (
                        <span className="stat-card-badge badge-success"><CheckIcon /> Active</span>
                      )}
                    </div>
                    <div className="stat-card-body">
                      <div className="stat-card-value">{dashboardOverview?.totalPublishers || publishers.length}</div>
                      <div className="stat-card-label">Publishers</div>
                    </div>
                    <div className="stat-card-footer">
                      <span className="stat-trend trend-up"><ArrowUpIcon /> {dashboardOverview?.activePublishers || publishers.filter(p => p.status === 'ACTIVE').length} active</span>
                    </div>
                  </div>

                  <div className="stat-card" onClick={() => setActiveTab('colleges')}>
                    <div className="stat-card-header">
                      <div className="stat-card-icon"><UniversityIcon /></div>
                      <span className="stat-card-badge badge-success"><CheckIcon /> Active</span>
                    </div>
                    <div className="stat-card-body">
                      <div className="stat-card-value">{dashboardOverview?.totalColleges || colleges.length}</div>
                      <div className="stat-card-label">Colleges</div>
                    </div>
                    <div className="stat-card-footer">
                      <span className="stat-trend trend-up"><ArrowUpIcon /> {dashboardOverview?.activeColleges || colleges.filter(c => c.status === 'ACTIVE').length} active</span>
                    </div>
                  </div>

                  <div className="stat-card" onClick={() => setActiveTab('analytics')}>
                    <div className="stat-card-header">
                      <div className="stat-card-icon"><UsersIcon /></div>
                      <span className="stat-card-badge">Platform</span>
                    </div>
                    <div className="stat-card-body">
                      <div className="stat-card-value">{dashboardOverview?.totalUsers || colleges.reduce((sum, c) => sum + (c.userCount || 0), 0)}</div>
                      <div className="stat-card-label">Total Users</div>
                    </div>
                    <div className="stat-card-footer">
                      <span>{dashboardOverview?.facultyCount || 0} faculty</span>
                      <span style={{ color: 'var(--c-border)' }}>|</span>
                      <span>{dashboardOverview?.studentCount || 0} students</span>
                    </div>
                  </div>

                  <div className="stat-card" onClick={() => setActiveTab('analytics')}>
                    <div className="stat-card-header">
                      <div className="stat-card-icon"><CalendarIcon /></div>
                      <span className="stat-card-badge">Today</span>
                    </div>
                    <div className="stat-card-body">
                      <div className="stat-card-value">{dashboardOverview?.dailyActiveUsers || 0}</div>
                      <div className="stat-card-label">Active Today</div>
                    </div>
                    <div className="stat-card-footer">
                      <span>{dashboardOverview?.monthlyActiveUsers || 0} this month</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Publishers Tab */}
            {activeTab === 'publishers' && (
              <div className="tab-content">
                <div className="filters-bar">
                  <div className="filter-group">
                    <label>Status</label>
                    <select value={publisherStatusFilter} onChange={(e) => setPublisherStatusFilter(e.target.value)}>
                      <option value="all">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="expired">Expired Contract</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Created After</label>
                    <input type="date" value={publisherCreatedDateFilter} onChange={(e) => setPublisherCreatedDateFilter(e.target.value)} />
                  </div>
                  <div className="filter-group">
                    <label>Renewal Before</label>
                    <input type="date" value={publisherRenewalDateFilter} onChange={(e) => setPublisherRenewalDateFilter(e.target.value)} />
                  </div>
                  <button onClick={() => { setPublisherStatusFilter('all'); setPublisherCreatedDateFilter(''); setPublisherRenewalDateFilter(''); }} className="secondary-btn-sm">
                    Clear
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Status</th>
                        <th>Contract End</th>
                        <th>Admins</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPublishers.map(pub => (
                        <tr key={pub.id}>
                          <td><strong>{pub.name}</strong></td>
                          <td><code>{pub.code}</code></td>
                          <td>
                            <span className={`status-badge ${pub.status.toLowerCase()}`}>{pub.status}</span>
                            {pub.contractEndDate && new Date(pub.contractEndDate) < new Date() && (
                              <span className="status-badge expired">EXPIRED</span>
                            )}
                          </td>
                          <td>{pub.contractEndDate ? new Date(pub.contractEndDate).toLocaleDateString() : '-'}</td>
                          <td>{pub.adminCount || 0}</td>
                          <td>{new Date(pub.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="action-btns">
                              <button onClick={() => { setSelectedPublisher(pub); setShowEditPublisherModal(true); }} className="info-btn-sm" title="Edit">Edit</button>
                              <button onClick={() => { setSelectedPublisher(pub); setRenewalEndDate(pub.contractEndDate || ''); setShowRenewPublisherModal(true); }} className="warning-btn-sm" title="Renew">Renew</button>
                              <button onClick={() => handleTogglePublisherStatus(pub.id, pub.status)} className={pub.status === 'ACTIVE' ? 'danger-btn-sm' : 'success-btn-sm'}>
                                {pub.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </button>
                              <button onClick={() => { setSelectedPublisher(pub); setShowDeletePublisherModal(true); }} className="danger-btn-sm" title="Delete">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredPublishers.length === 0 && (
                        <tr><td colSpan={7} className="empty-row">No publishers found matching filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Colleges Tab */}
            {activeTab === 'colleges' && (
              <div className="tab-content">
                <div className="filters-bar">
                  <div className="filter-group">
                    <label>Status</label>
                    <select value={collegeStatusFilter} onChange={(e) => setCollegeStatusFilter(e.target.value)}>
                      <option value="all">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="expired">Expired Contract</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Created After</label>
                    <input type="date" value={collegeCreatedDateFilter} onChange={(e) => setCollegeCreatedDateFilter(e.target.value)} />
                  </div>
                  <div className="filter-group">
                    <label>Renewal Before</label>
                    <input type="date" value={collegeRenewalDateFilter} onChange={(e) => setCollegeRenewalDateFilter(e.target.value)} />
                  </div>
                  <button onClick={() => { setCollegeStatusFilter('all'); setCollegeCreatedDateFilter(''); setCollegeRenewalDateFilter(''); }} className="secondary-btn-sm">
                    Clear
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Status</th>
                        <th>Contract End</th>
                        <th>Users</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredColleges.map(col => (
                        <tr key={col.id}>
                          <td><strong>{col.name}</strong></td>
                          <td><code>{col.code}</code></td>
                          <td>
                            <span className={`status-badge ${col.status.toLowerCase()}`}>{col.status}</span>
                            {(col as any).contractEndDate && new Date((col as any).contractEndDate) < new Date() && (
                              <span className="status-badge expired">EXPIRED</span>
                            )}
                          </td>
                          <td>{(col as any).contractEndDate ? new Date((col as any).contractEndDate).toLocaleDateString() : '-'}</td>
                          <td>{col.userCount || 0}</td>
                          <td>{new Date(col.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="action-btns">
                              <button onClick={() => { setSelectedCollege(col); setShowEditCollegeModal(true); }} className="info-btn-sm" title="Edit">Edit</button>
                              <button onClick={() => { setSelectedCollege(col); setRenewalEndDate((col as any).contractEndDate || ''); setShowRenewCollegeModal(true); }} className="warning-btn-sm" title="Renew">Renew</button>
                              <button onClick={() => handleToggleCollegeStatus(col.id, col.status)} className={col.status === 'ACTIVE' ? 'danger-btn-sm' : 'success-btn-sm'}>
                                {col.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </button>
                              <button onClick={() => { setSelectedCollege(col); setShowDeleteCollegeModal(true); }} className="danger-btn-sm" title="Delete">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredColleges.length === 0 && (
                        <tr><td colSpan={7} className="empty-row">No colleges found matching filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Packages Tab */}
            {activeTab === 'packages' && (
              <div className="tab-content">
                <div className="filters-bar">
                  <div className="filter-group">
                    <label>Status</label>
                    <select value={packageStatusFilter} onChange={(e) => setPackageStatusFilter(e.target.value)}>
                      <option value="all">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Publisher</label>
                    <select value={packagePublisherFilter} onChange={(e) => setPackagePublisherFilter(e.target.value)}>
                      <option value="all">All Publishers</option>
                      {publishers.map(pub => (
                        <option key={pub.id} value={pub.id}>{pub.name}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => { setPackageStatusFilter('all'); setPackagePublisherFilter('all'); }} className="secondary-btn-sm">
                    Clear
                  </button>
                </div>

                <div className="section-title"><h3>All Content Packages</h3></div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Package Name</th>
                        <th>Publisher</th>
                        <th>Subjects</th>
                        <th>Content Types</th>
                        <th>Status</th>
                        <th>Assigned</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPackages.map(pkg => (
                        <tr key={pkg.id}>
                          <td><strong>{pkg.name}</strong></td>
                          <td>{pkg.publisher?.name || 'N/A'}</td>
                          <td>{pkg.subjects?.length || 0} subjects</td>
                          <td>{pkg.contentTypes?.join(', ') || '-'}</td>
                          <td><span className={`status-badge ${pkg.status.toLowerCase()}`}>{pkg.status}</span></td>
                          <td>{pkg._count?.college_packages || 0}</td>
                          <td>{new Date(pkg.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="action-btns">
                              <button onClick={() => { setSelectedPackage(pkg); setShowEditPackageModal(true); }} className="info-btn-sm">Edit</button>
                              <button onClick={() => { setSelectedPackage(pkg); setBulkAssignColleges([]); setShowBulkAssignModal(true); }} className="secondary-btn-sm">Assign</button>
                              <button onClick={() => packagesService.delete(pkg.id).then(() => loadData())} className="danger-btn-sm">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredPackages.length === 0 && (
                        <tr><td colSpan={8} className="empty-row">No packages found matching filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="section-title"><h3>Package Assignments</h3></div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>College</th>
                        <th>Package</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packageAssignments.map(assign => (
                        <tr key={assign.id}>
                          <td>{assign.college?.name || assign.collegeId}</td>
                          <td>{assign.package?.name || assign.packageId}</td>
                          <td>{new Date(assign.startDate).toLocaleDateString()}</td>
                          <td>{assign.endDate ? new Date(assign.endDate).toLocaleDateString() : 'No expiry'}</td>
                          <td><span className={`status-badge ${assign.status.toLowerCase()}`}>{assign.status}</span></td>
                          <td>
                            <button onClick={() => packagesService.removeAssignment(assign.id).then(() => loadData())} className="danger-btn-sm">Remove</button>
                          </td>
                        </tr>
                      ))}
                      {packageAssignments.length === 0 && (
                        <tr><td colSpan={6} className="empty-row">No package assignments yet.</td></tr>
                      )}
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

                {globalRatingAnalytics && (
                  <div className="analytics-ratings-section">
                    <div className="section-title"><h3>Global Rating Analytics</h3></div>
                    <div className="analytics-grid">
                      <div className="analytics-card">
                        <h4>Course Ratings</h4>
                        <div className="analytics-stats">
                          <div><strong>{globalRatingAnalytics.overall.courses.averageRating.toFixed(1)}/5</strong> Average</div>
                          <div><strong>{globalRatingAnalytics.overall.courses.totalRatings}</strong> Total Reviews</div>
                        </div>
                      </div>
                      <div className="analytics-card">
                        <h4>Teacher Ratings</h4>
                        <div className="analytics-stats">
                          <div><strong>{globalRatingAnalytics.overall.teachers.averageRating.toFixed(1)}/5</strong> Average</div>
                          <div><strong>{globalRatingAnalytics.overall.teachers.totalRatings}</strong> Total Reviews</div>
                        </div>
                      </div>
                      <div className="analytics-card">
                        <h4>Content Ratings</h4>
                        <div className="analytics-stats">
                          <div><strong>{globalRatingAnalytics.overall.content.averageRating.toFixed(1)}/5</strong> Average</div>
                          <div><strong>{globalRatingAnalytics.overall.content.totalRatings}</strong> Total Reviews</div>
                        </div>
                      </div>
                    </div>

                    {globalRatingAnalytics.topCourses && globalRatingAnalytics.topCourses.length > 0 && (
                      <div className="top-courses-section">
                        <div className="section-title"><h4>Top Rated Courses</h4></div>
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Course Title</th>
                                <th>Average Rating</th>
                                <th>Total Reviews</th>
                              </tr>
                            </thead>
                            <tbody>
                              {globalRatingAnalytics.topCourses.slice(0, 5).map((course, idx) => (
                                <tr key={idx}>
                                  <td><strong>{course.courseTitle}</strong></td>
                                  <td>
                                    <span className="rating-display">
                                      <span className="rating-bar" style={{ width: `${(course.averageRating / 5) * 100}%` }}></span>
                                    </span>
                                    {course.averageRating.toFixed(1)}
                                  </td>
                                  <td>{course.totalRatings}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Audit Logs Tab */}
            {activeTab === 'audit' && auditLogs && (
              <div className="tab-content">
                <div className="filters-bar">
                  <div className="filter-group">
                    <label>Date From</label>
                    <input type="date" value={auditDateFrom} onChange={(e) => setAuditDateFrom(e.target.value)} />
                  </div>
                  <div className="filter-group">
                    <label>Date To</label>
                    <input type="date" value={auditDateTo} onChange={(e) => setAuditDateTo(e.target.value)} />
                  </div>
                  <div className="filter-group">
                    <label>Role</label>
                    <select value={auditRoleFilter} onChange={(e) => setAuditRoleFilter(e.target.value)}>
                      <option value="all">All Roles</option>
                      <option value="BITFLOW_OWNER">Bitflow Owner</option>
                      <option value="PUBLISHER_ADMIN">Publisher Admin</option>
                      <option value="COLLEGE_IT_ADMIN">College IT Admin</option>
                      <option value="DEAN">Dean</option>
                      <option value="FACULTY">Faculty</option>
                      <option value="STUDENT">Student</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Action Type</label>
                    <select value={auditActionFilter} onChange={(e) => setAuditActionFilter(e.target.value)}>
                      <option value="all">All Actions</option>
                      <option value="create">Create</option>
                      <option value="update">Update</option>
                      <option value="delete">Delete</option>
                      <option value="login">Login</option>
                      <option value="status">Status Change</option>
                    </select>
                  </div>
                  <button onClick={() => { setAuditDateFrom(''); setAuditDateTo(''); setAuditRoleFilter('all'); setAuditActionFilter('all'); }} className="secondary-btn-sm">
                    Clear
                  </button>
                </div>

                <div className="table-meta">
                  Showing {filteredAuditLogs.length} of {auditLogs.logs.length} log entries
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>User</th>
                        <th>Role</th>
                        <th>Description</th>
                        <th>Entity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.map(log => (
                        <tr key={log.id}>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                          <td><code>{log.action}</code></td>
                          <td>{log.userEmail || 'N/A'}</td>
                          <td><span className="status-badge role">{log.userRole || '-'}</span></td>
                          <td>{log.description}</td>
                          <td>{log.entityType || '-'}</td>
                        </tr>
                      ))}
                      {filteredAuditLogs.length === 0 && (
                        <tr><td colSpan={6} className="empty-row">No audit logs found matching filters.</td></tr>
                      )}
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
              <h2>{createdCredentials.type === 'college' ? 'College' : 'Publisher'} Created Successfully</h2>
              <button className="close-btn" onClick={() => { setShowCredentialsModal(false); setCreatedCredentials(null); loadData(); }}>×</button>
            </div>
            
            <div className="credentials-info">
              <h3>{createdCredentials.name}</h3>
              
              <div className="credentials-box credentials-box--success">
                <h4>Login Credentials</h4>
                {createdCredentials.accounts?.map((account, index) => (
                  <div key={index} className="credential-item">
                    <p><strong>Role:</strong> {account.role}</p>
                    <p><strong>Email:</strong> <code>{account.email}</code></p>
                  </div>
                ))}
                <div className="credential-item credential-item--warning">
                  <p><strong>Default Password:</strong> <code className="password-code">{createdCredentials.defaultPassword}</code></p>
                </div>
              </div>
              
              <div className="credentials-warning">
                <p><strong>Important:</strong> Please share these credentials securely with the {createdCredentials.type} administrator. Users should change their password upon first login.</p>
              </div>
              
              <div className="credentials-actions">
                <button onClick={() => { setShowCredentialsModal(false); setCreatedCredentials(null); loadData(); }} className="success-btn">
                  Got it, Close
                </button>
                {createdCredentials.accounts?.map((account, idx) => {
                  const subject = encodeURIComponent(`Your LMS Account Credentials (${createdCredentials.type === 'college' ? 'College' : 'Publisher'})`);
                  const body = encodeURIComponent(`Dear ${account.role},\n\nYour account for the Medical LMS has been created.\nLogin Email: ${account.email}\nTemporary Password: ${createdCredentials.defaultPassword}\n\nPlease login at http://localhost:3000 and change your password immediately.\n\nRegards,\nBitflow Admin`);
                  const mailto = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(account.email)}&su=${subject}&body=${body}`;
                  return (
                    <a key={idx} href={mailto} target="_blank" rel="noopener noreferrer" className="gmail-link">
                      <button type="button" className="gmail-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"><path fill="#4285f4" d="M44 10v28H4V10l20 14Z"/><path fill="#34a853" d="M44 10v28H24V24Z"/><path fill="#fbbc04" d="M4 10v28h20V24Z"/><path fill="#ea4335" d="M44 10H4l20 14Z"/></svg>
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

      {/* Create Package Modal */}
      {showPackageModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Create Content Package</h2>
              <button onClick={() => setShowPackageModal(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await packagesService.create({
                  ...newPackage,
                  status: 'ACTIVE',
                });
                setShowPackageModal(false);
                setNewPackage({ name: '', description: '', publisherId: '', subjects: [], contentTypes: [] });
                loadData();
              } catch (error: any) {
                alert(error.response?.data?.message || 'Failed to create package');
              }
            }}>
              <div className="form-group">
                <label>Package Name *</label>
                <input
                  type="text"
                  value={newPackage.name}
                  onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                  required
                  placeholder="e.g., MBBS Year 1 Complete Package"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newPackage.description}
                  onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                  placeholder="Package description..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Publisher *</label>
                <select
                  value={newPackage.publisherId}
                  onChange={(e) => setNewPackage({ ...newPackage, publisherId: e.target.value })}
                  required
                >
                  <option value="">Select Publisher</option>
                  {publishers.filter(p => p.status === 'ACTIVE').map(pub => (
                    <option key={pub.id} value={pub.id}>{pub.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subjects (comma-separated)</label>
                <input
                  type="text"
                  value={newPackage.subjects.join(', ')}
                  onChange={(e) => setNewPackage({ 
                    ...newPackage, 
                    subjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  placeholder="e.g., Anatomy, Physiology, Biochemistry"
                />
              </div>
              <div className="form-group">
                <label>Content Types</label>
                <div className="checkbox-row">
                  {['BOOK', 'VIDEO', 'MCQ', 'NOTES'].map(type => (
                    <label key={type} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newPackage.contentTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewPackage({ ...newPackage, contentTypes: [...newPackage.contentTypes, type] });
                          } else {
                            setNewPackage({ ...newPackage, contentTypes: newPackage.contentTypes.filter(t => t !== type) });
                          }
                        }}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowPackageModal(false)} className="secondary-btn">Cancel</button>
                <button type="submit" className="primary-btn">Create Package</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Package Modal */}
      {showAssignPackageModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Assign Package to College</h2>
              <button onClick={() => setShowAssignPackageModal(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await packagesService.assignToCollege({
                  packageId: newAssignment.packageId,
                  collegeId: newAssignment.collegeId,
                  startDate: newAssignment.startDate,
                  endDate: newAssignment.endDate || undefined,
                });
                setShowAssignPackageModal(false);
                setNewAssignment({ packageId: '', collegeId: '', startDate: new Date().toISOString().split('T')[0], endDate: '' });
                loadData();
              } catch (error: any) {
                alert(error.response?.data?.message || 'Failed to assign package');
              }
            }}>
              <div className="form-group">
                <label>Select Package *</label>
                <select
                  value={newAssignment.packageId}
                  onChange={(e) => setNewAssignment({ ...newAssignment, packageId: e.target.value })}
                  required
                >
                  <option value="">Select Package</option>
                  {packages.filter(p => p.status === 'ACTIVE').map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name} ({pkg.publisher?.name})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Select College *</label>
                <select
                  value={newAssignment.collegeId}
                  onChange={(e) => setNewAssignment({ ...newAssignment, collegeId: e.target.value })}
                  required
                >
                  <option value="">Select College</option>
                  {colleges.filter(c => c.status === 'ACTIVE').map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={newAssignment.startDate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date (optional)</label>
                <input
                  type="date"
                  value={newAssignment.endDate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, endDate: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowAssignPackageModal(false)} className="secondary-btn">Cancel</button>
                <button type="submit" className="primary-btn">Assign Package</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Publisher Modal */}
      {showEditPublisherModal && selectedPublisher && (
        <div className="modal-overlay" onClick={() => setShowEditPublisherModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h2>Edit Publisher</h2>
            <form onSubmit={handleEditPublisher}>
              <div className="form-row">
                <div className="form-group">
                  <label>Publisher Name *</label>
                  <input 
                    type="text" 
                    value={selectedPublisher.name}
                    onChange={e => setSelectedPublisher({...selectedPublisher, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Code (readonly)</label>
                  <input type="text" value={selectedPublisher.code} disabled className="disabled-input" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Legal Name</label>
                  <input 
                    type="text" 
                    value={selectedPublisher.legalName || ''}
                    onChange={e => setSelectedPublisher({...selectedPublisher, legalName: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input 
                    type="text" 
                    value={selectedPublisher.contactPerson || ''}
                    onChange={e => setSelectedPublisher({...selectedPublisher, contactPerson: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input 
                  type="email" 
                  value={selectedPublisher.contactEmail || ''}
                  onChange={e => setSelectedPublisher({...selectedPublisher, contactEmail: e.target.value})}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contract Start Date</label>
                  <input 
                    type="date" 
                    value={selectedPublisher.contractStartDate ? selectedPublisher.contractStartDate.split('T')[0] : ''}
                    onChange={e => setSelectedPublisher({...selectedPublisher, contractStartDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Contract End Date</label>
                  <input 
                    type="date" 
                    value={selectedPublisher.contractEndDate ? selectedPublisher.contractEndDate.split('T')[0] : ''}
                    onChange={e => setSelectedPublisher({...selectedPublisher, contractEndDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditPublisherModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Publisher Confirmation Modal */}
      {showDeletePublisherModal && selectedPublisher && (
        <div className="modal-overlay" onClick={() => setShowDeletePublisherModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Delete Publisher</h2>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{selectedPublisher.name}</strong>?</p>
              <p className="danger-text">This action cannot be undone. All associated data including courses, MCQs, and content will be permanently removed.</p>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowDeletePublisherModal(false)}>Cancel</button>
              <button type="button" onClick={handleDeletePublisher} className="danger-btn">Delete Publisher</button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Publisher Modal */}
      {showRenewPublisherModal && selectedPublisher && (
        <div className="modal-overlay" onClick={() => setShowRenewPublisherModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Renew Publisher Contract</h2>
            <form onSubmit={handleRenewPublisher}>
              <div className="modal-body">
                <p>Renewing contract for: <strong>{selectedPublisher.name}</strong></p>
                {selectedPublisher.contractEndDate && (
                  <p className="muted-text">Current expiry: {new Date(selectedPublisher.contractEndDate).toLocaleDateString()}</p>
                )}
              </div>
              <div className="form-group">
                <label>New Contract End Date *</label>
                <input 
                  type="date" 
                  value={renewalEndDate}
                  onChange={e => setRenewalEndDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowRenewPublisherModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Renew Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit College Modal */}
      {showEditCollegeModal && selectedCollege && (
        <div className="modal-overlay" onClick={() => setShowEditCollegeModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h2>Edit College</h2>
            <form onSubmit={handleEditCollege}>
              <div className="form-row">
                <div className="form-group">
                  <label>College Name *</label>
                  <input 
                    type="text" 
                    value={selectedCollege.name}
                    onChange={e => setSelectedCollege({...selectedCollege, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Code (readonly)</label>
                  <input type="text" value={selectedCollege.code} disabled className="disabled-input" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email Domain</label>
                  <input 
                    type="text" 
                    value={selectedCollege.emailDomain || ''}
                    onChange={e => setSelectedCollege({...selectedCollege, emailDomain: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Admin Contact Email</label>
                  <input 
                    type="email" 
                    value={selectedCollege.adminContactEmail || ''}
                    onChange={e => setSelectedCollege({...selectedCollege, adminContactEmail: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input 
                  type="text" 
                  value={selectedCollege.address || ''}
                  onChange={e => setSelectedCollege({...selectedCollege, address: e.target.value})}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input 
                    type="text" 
                    value={selectedCollege.city || ''}
                    onChange={e => setSelectedCollege({...selectedCollege, city: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input 
                    type="text" 
                    value={selectedCollege.state || ''}
                    onChange={e => setSelectedCollege({...selectedCollege, state: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditCollegeModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete College Confirmation Modal */}
      {showDeleteCollegeModal && selectedCollege && (
        <div className="modal-overlay" onClick={() => setShowDeleteCollegeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Delete College</h2>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{selectedCollege.name}</strong>?</p>
              <p className="danger-text">This action cannot be undone. All associated data including users, enrollments, and progress will be permanently removed.</p>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowDeleteCollegeModal(false)}>Cancel</button>
              <button type="button" onClick={handleDeleteCollege} className="danger-btn">Delete College</button>
            </div>
          </div>
        </div>
      )}

      {/* Renew College Modal */}
      {showRenewCollegeModal && selectedCollege && (
        <div className="modal-overlay" onClick={() => setShowRenewCollegeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Renew College Contract</h2>
            <form onSubmit={handleRenewCollege}>
              <div className="modal-body">
                <p>Renewing contract for: <strong>{selectedCollege.name}</strong></p>
                {(selectedCollege as any).contractEndDate && (
                  <p className="muted-text">Current expiry: {new Date((selectedCollege as any).contractEndDate).toLocaleDateString()}</p>
                )}
              </div>
              <div className="form-group">
                <label>New Contract End Date *</label>
                <input 
                  type="date" 
                  value={renewalEndDate}
                  onChange={e => setRenewalEndDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowRenewCollegeModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Renew Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {showEditPackageModal && selectedPackage && (
        <div className="modal-overlay" onClick={() => setShowEditPackageModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h2>Edit Package</h2>
            <form onSubmit={handleEditPackage}>
              <div className="form-group">
                <label>Package Name *</label>
                <input
                  type="text"
                  value={selectedPackage.name}
                  onChange={(e) => setSelectedPackage({ ...selectedPackage, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={selectedPackage.description || ''}
                  onChange={(e) => setSelectedPackage({ ...selectedPackage, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Subjects (comma-separated)</label>
                <input
                  type="text"
                  value={selectedPackage.subjects?.join(', ') || ''}
                  onChange={(e) => setSelectedPackage({ 
                    ...selectedPackage, 
                    subjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                />
              </div>
              <div className="form-group">
                <label>Content Types</label>
                <div className="checkbox-row">
                  {['BOOK', 'VIDEO', 'MCQ', 'NOTES'].map(type => (
                    <label key={type} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedPackage.contentTypes?.includes(type) || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPackage({ ...selectedPackage, contentTypes: [...(selectedPackage.contentTypes || []), type] });
                          } else {
                            setSelectedPackage({ ...selectedPackage, contentTypes: (selectedPackage.contentTypes || []).filter(t => t !== type) });
                          }
                        }}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditPackageModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assign Package Modal */}
      {showBulkAssignModal && selectedPackage && (
        <div className="modal-overlay" onClick={() => setShowBulkAssignModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h2>Bulk Assign Package to Colleges</h2>
            <form onSubmit={handleBulkAssignPackage}>
              <div className="package-info-box">
                <p><strong>Package:</strong> {selectedPackage.name}</p>
                <p className="muted-text">{selectedPackage.description}</p>
              </div>
              <div className="form-group">
                <label>Select Colleges to Assign *</label>
                <div className="checkbox-list">
                  {colleges.filter(c => c.status === 'ACTIVE').map(col => (
                    <label key={col.id} className="checkbox-list-item">
                      <input
                        type="checkbox"
                        checked={bulkAssignColleges.includes(col.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkAssignColleges([...bulkAssignColleges, col.id]);
                          } else {
                            setBulkAssignColleges(bulkAssignColleges.filter(id => id !== col.id));
                          }
                        }}
                      />
                      <span>{col.name}</span>
                      <span className="muted-text">({col.code})</span>
                    </label>
                  ))}
                </div>
                <small className="muted-text">{bulkAssignColleges.length} colleges selected</small>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={bulkAssignStartDate}
                    onChange={(e) => setBulkAssignStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date (optional)</label>
                  <input
                    type="date"
                    value={bulkAssignEndDate}
                    onChange={(e) => setBulkAssignEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowBulkAssignModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={bulkAssignColleges.length === 0}>
                  Assign to {bulkAssignColleges.length} College{bulkAssignColleges.length !== 1 ? 's' : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BitflowOwnerDashboard;
