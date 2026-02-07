import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import competencyService, { CreateCompetencyData } from '../services/competency.service';
import { NotificationBell } from '../components/notifications';
import { 
  Competency, 
  CompetencyStats,
  CompetencyDomain, 
  AcademicLevel, 
  CompetencyStatus 
} from '../types';
import '../styles/CompetencyDashboard.css';

const CompetencyDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // State
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [stats, setStats] = useState<CompetencyStats | null>(null);
  const [subjects, setSubjects] = useState<Array<{ subject: string; count: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sorting
  const [sortBy, setSortBy] = useState<string>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompetency, setNewCompetency] = useState<CreateCompetencyData>({
    code: '',
    title: '',
    description: '',
    subject: '',
    domain: CompetencyDomain.COGNITIVE,
    academicLevel: AcademicLevel.UG,
  });

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Reset page when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSubject, filterDomain, filterLevel, filterStatus, debouncedSearch, sortBy, sortOrder]);

  // Load stats for overview tab
  useEffect(() => {
    if (activeTab === 'overview') {
      const loadStats = async () => {
        try {
          setLoading(true);
          const data = await competencyService.getStats();
          setStats(data);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to load statistics');
        } finally {
          setLoading(false);
        }
      };

      const loadSubjects = async () => {
        try {
          const data = await competencyService.getSubjects();
          setSubjects(data);
        } catch (err: any) {
          console.error('Failed to load subjects:', err);
        }
      };

      loadStats();
      loadSubjects();
    }
  }, [activeTab, refreshTrigger]);

  // Load competencies when browse tab is active or filters change
  useEffect(() => {
    if (activeTab !== 'browse') return;

    const loadCompetencies = async () => {
      try {
        setLoading(true);
        const params: any = {
          page: currentPage,
          limit: 20,
          sortBy,
          sortOrder,
        };
        // Only add filters if they have values
        if (filterStatus) params.status = filterStatus;
        if (filterSubject) params.subject = filterSubject;
        if (filterDomain) params.domain = filterDomain;
        if (filterLevel) params.academicLevel = filterLevel;
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

        const response = await competencyService.getAll(params);
        setCompetencies(response.data);
        setTotalPages(response.meta.totalPages);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load competencies');
      } finally {
        setLoading(false);
      }
    };

    loadCompetencies();
  }, [activeTab, filterSubject, filterDomain, filterLevel, filterStatus, debouncedSearch, sortBy, sortOrder, currentPage, refreshTrigger]);

  // Trigger refresh function
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleCreateCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await competencyService.create(newCompetency);
      setShowCreateModal(false);
      setNewCompetency({
        code: '',
        title: '',
        description: '',
        subject: '',
        domain: CompetencyDomain.COGNITIVE,
        academicLevel: AcademicLevel.UG,
      });
      setActiveTab('browse');
      setFilterStatus('DRAFT');
      triggerRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create competency');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    if (!window.confirm('Are you sure you want to activate this competency? It will become immutable.')) {
      return;
    }
    try {
      await competencyService.activate(id);
      triggerRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to activate competency');
    }
  };

  const handleDeprecate = async (id: string) => {
    if (!window.confirm('Are you sure you want to deprecate this competency?')) {
      return;
    }
    try {
      await competencyService.deprecate(id);
      triggerRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deprecate competency');
    }
  };

  const renderOverview = () => (
    <div className="overview-section">
      <h2>Competency Framework Overview</h2>
      
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Competencies</div>
          </div>
          <div className="stat-card active">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card draft">
            <div className="stat-value">{stats.draft}</div>
            <div className="stat-label">Draft</div>
          </div>
          <div className="stat-card deprecated">
            <div className="stat-value">{stats.deprecated}</div>
            <div className="stat-label">Deprecated</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.uniqueSubjects}</div>
            <div className="stat-label">Unique Subjects</div>
          </div>
        </div>
      )}

      <div className="subjects-section">
        <h3>Subjects with Active Competencies</h3>
        <div className="subjects-grid">
          {subjects.map((s) => (
            <div key={s.subject} className="subject-card">
              <div className="subject-name">{s.subject}</div>
              <div className="subject-count">{s.count} competencies</div>
            </div>
          ))}
        </div>
      </div>

      <div className="info-section">
        <h3>Competency Governance</h3>
        <ul>
          <li>✓ Competencies are created by Bitflow Owner only</li>
          <li>✓ All competencies require peer review before activation</li>
          <li>✓ Once activated, competencies become immutable</li>
          <li>✓ Deprecated competencies remain visible for historical analytics</li>
          <li>✓ No AI or automated tagging - all mappings are manual</li>
        </ul>
      </div>
    </div>
  );

  const renderBrowse = () => (
    <div className="browse-section">
      <div className="browse-header">
        <h2>Browse Competencies</h2>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create New Competency
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by code, title, description, or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input-large"
        />
        {searchQuery && (
          <button 
            className="clear-search-btn"
            onClick={() => setSearchQuery('')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="filters-row">
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="DEPRECATED">Deprecated</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Domain</label>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="filter-select"
          >
            <option value="">All Domains</option>
            <option value="COGNITIVE">Cognitive</option>
            <option value="CLINICAL">Clinical</option>
            <option value="PRACTICAL">Practical</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Level</label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="filter-select"
          >
            <option value="">All Levels</option>
            <option value="UG">UG</option>
            <option value="PG">PG</option>
            <option value="SPECIALIZATION">Specialization</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="code">Code</option>
            <option value="title">Title</option>
            <option value="subject">Subject</option>
            <option value="domain">Domain</option>
            <option value="academicLevel">Level</option>
            <option value="status">Status</option>
            <option value="createdAt">Date Created</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Order</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="filter-select"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        <button 
          className="btn-secondary clear-filters-btn"
          onClick={() => {
            setFilterStatus('');
            setFilterDomain('');
            setFilterLevel('');
            setSearchQuery('');
            setSortBy('code');
            setSortOrder('asc');
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Results count */}
      <div className="results-info">
        Showing {competencies.length} of {totalPages * 20} competencies
        {debouncedSearch && <span> matching "<strong>{debouncedSearch}</strong>"</span>}
      </div>

      <div className="competencies-list">
        {competencies.map((comp) => (
          <div key={comp.id} className={`competency-card ${comp.status.toLowerCase()}`}>
            <div className="competency-header">
              <div>
                <span className="competency-code">{comp.code}</span>
                <span className={`status-badge ${comp.status.toLowerCase()}`}>{comp.status}</span>
              </div>
              <div className="competency-actions">
                {comp.status === CompetencyStatus.DRAFT && comp.reviewedBy && (
                  <button
                    className="btn-activate"
                    onClick={() => handleActivate(comp.id)}
                  >
                    Activate
                  </button>
                )}
                {comp.status === CompetencyStatus.ACTIVE && (
                  <button
                    className="btn-deprecate"
                    onClick={() => handleDeprecate(comp.id)}
                  >
                    Deprecate
                  </button>
                )}
              </div>
            </div>
            <h3 className="competency-title">{comp.title}</h3>
            <p className="competency-description">{comp.description}</p>
            <div className="competency-meta">
              <span className="meta-item">Subject: {comp.subject}</span>
              <span className="meta-item">Domain: {comp.domain}</span>
              <span className="meta-item">Level: {comp.academicLevel}</span>
              {comp.reviewedBy && <span className="meta-item">✓ Reviewed</span>}
              {comp.activatedAt && (
                <span className="meta-item">
                  Activated: {new Date(comp.activatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="competency-dashboard">
      <div className="sidebar">
        <div className="logo">
          <h1>Bitflow LMS</h1>
          <p className="subtitle">Competency Framework</p>
        </div>

        <nav className="nav-menu">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={activeTab === 'browse' ? 'active' : ''}
            onClick={() => setActiveTab('browse')}
          >
            📚 Browse Competencies
          </button>
        </nav>

        <div className="user-profile">
          <NotificationBell />
          <div className="user-info">
            <div className="user-name">{user?.fullName}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {loading && <div className="loading-spinner">Loading...</div>}

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'browse' && renderBrowse()}
      </div>

      {/* Create Competency Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Competency</h2>
            <form onSubmit={handleCreateCompetency}>
              <div className="form-group">
                <label>Code *</label>
                <input
                  type="text"
                  value={newCompetency.code}
                  onChange={(e) => setNewCompetency({ ...newCompetency, code: e.target.value })}
                  placeholder="e.g., ANAT-UG-001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newCompetency.title}
                  onChange={(e) => setNewCompetency({ ...newCompetency, title: e.target.value })}
                  placeholder="e.g., Basic Anatomical Terminology"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={newCompetency.description}
                  onChange={(e) => setNewCompetency({ ...newCompetency, description: e.target.value })}
                  placeholder="Detailed description of the competency..."
                  required
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  value={newCompetency.subject}
                  onChange={(e) => setNewCompetency({ ...newCompetency, subject: e.target.value })}
                  placeholder="e.g., Anatomy, Pharmacology"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Domain *</label>
                  <select
                    value={newCompetency.domain}
                    onChange={(e) =>
                      setNewCompetency({ ...newCompetency, domain: e.target.value as CompetencyDomain })
                    }
                  >
                    <option value={CompetencyDomain.COGNITIVE}>Cognitive</option>
                    <option value={CompetencyDomain.CLINICAL}>Clinical</option>
                    <option value={CompetencyDomain.PRACTICAL}>Practical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Academic Level *</label>
                  <select
                    value={newCompetency.academicLevel}
                    onChange={(e) =>
                      setNewCompetency({ ...newCompetency, academicLevel: e.target.value as AcademicLevel })
                    }
                  >
                    <option value={AcademicLevel.UG}>UG</option>
                    <option value={AcademicLevel.PG}>PG</option>
                    <option value={AcademicLevel.SPECIALIZATION}>Specialization</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Competency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetencyDashboard;
