import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import learningUnitService from '../services/learning-unit.service';
import { ratingsService, CollegeRatingItem } from '../services/ratings.service';
import BulkLearningUnitUpload from '../components/publisher/BulkLearningUnitUpload';
import { useAuth } from '../context/AuthContext';
import { AppShell, NavItem } from '../components/layout';
import { DashboardLayout, StatGrid, StatCard, PageSection } from '../components/dashboard';
import { NotificationBell } from '../components/notifications';
import {
  LearningUnit,
  LearningUnitType,
  LearningUnitStatus,
  LearningUnitStats,
  LearningUnitAnalytics,
} from '../types';
import './PublisherAdminDashboard.css';

const PublisherAdminDashboard: React.FC = () => {
  console.log('🎨 Publisher Studio v2.0 - Modern Design Loaded');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [learningUnits, setLearningUnits] = useState<LearningUnit[]>([]);
  const [stats, setStats] = useState<LearningUnitStats | null>(null);
  const [analytics, setAnalytics] = useState<LearningUnitAnalytics | null>(null);
  const [contentRatings, setContentRatings] = useState<CollegeRatingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [unitsRes, statsRes, analyticsRes] = await Promise.all([
        learningUnitService.getAll(),
        learningUnitService.getStats(),
        learningUnitService.getAnalytics(),
      ]);
      
      setLearningUnits(unitsRes?.data || []);
      setStats(statsRes || null);
      setAnalytics(analyticsRes || null);

      // Load content ratings if publisher ID is available
      if (user?.publisherId) {
        try {
          const ratingsData = await ratingsService.getPublisherContentRatings(user.publisherId);
          setContentRatings(ratingsData || []);
        } catch (ratingsError) {
          console.error('Failed to load content ratings:', ratingsError);
          // Don't fail the whole dashboard if ratings fail
        }
      }
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: LearningUnitType) => {
    const icons: Record<string, string> = {
      BOOK: '📚',
      VIDEO: '🎥',
      MCQ: '✅',
      NOTES: '📝',
    };
    return icons[type] || '📄';
  };

  const getStatusColor = (status: LearningUnitStatus) => {
    const colors: Record<string, string> = {
      ACTIVE: 'active',
      DRAFT: 'draft',
      INACTIVE: 'inactive',
      PENDING_MAPPING: 'pending',
      SUSPENDED: 'suspended',
    };
    return colors[status] || 'inactive';
  };

  if (loading) {
    return (
      <div className="publisher-dashboard">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading Your Content Studio...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="publisher-dashboard" data-version="v2.0-modern">
      {/* Top Navigation Bar */}
      <nav className="publisher-navbar">
        <div className="navbar-brand">
          <div className="brand-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="url(#brandGradient)"/>
              <path d="M10 12h12M10 16h12M10 20h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="brandGradient" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#1E40AF"/>
                  <stop offset="100%" stopColor="#3B82F6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-title">Publisher Studio</div>
            <div className="brand-subtitle">Content Management</div>
          </div>
        </div>
        
        <div className="navbar-actions">
          <NotificationBell />
          <div className="user-menu">
            <div className="user-avatar">{(user?.fullName || 'P')[0].toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user?.fullName || user?.email || 'Publisher'}</div>
              <div className="user-role">Publisher Admin</div>
            </div>
          </div>
          <button className="btn-icon" onClick={() => navigate('/publisher-admin/profile')} title="Profile Settings">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a4 4 0 100 8 4 4 0 000-8zM4 14a6 6 0 0112 0v2H4v-2z"/>
            </svg>
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2h6v2H3v8h6v2H3a2 2 0 01-2-2V4a2 2 0 012-2zm10.293 3.293L16 8l-2.707 2.707-1.414-1.414L13.172 8 11.88 6.707l1.414-1.414z"/>
            </svg>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="publisher-main-content">
        {error && (
          <div className="alert-error">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Hero Section with Quick Actions */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Welcome back, {user?.fullName?.split(' ')[0] || 'Publisher'}! 👋</h1>
            <p className="hero-subtitle">Manage your educational content and track performance across all learning units</p>
          </div>
          
          <div className="quick-action-grid">
            <button className="action-card primary" onClick={() => navigate('/publisher-admin/create')}>
              <div className="action-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M26 4H6a2 2 0 00-2 2v20a2 2 0 002 2h20a2 2 0 002-2V6a2 2 0 00-2-2zM16 22l-6-6h4v-6h4v6h4l-6 6z"/>
                </svg>
              </div>
              <div className="action-content">
                <h3 className="action-title">Create Content</h3>
                <p className="action-description">Add new learning material</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button className="action-card success" onClick={() => navigate('/publisher-admin/mcqs')}>
              <div className="action-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M28 8l-14 14-6-6-4 4 10 10L32 12l-4-4z"/>
                </svg>
              </div>
              <div className="action-content">
                <h3 className="action-title">Manage MCQs</h3>
                <p className="action-description">Create & edit questions</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button className="action-card warning" onClick={() => setShowBulkUpload(!showBulkUpload)}>
              <div className="action-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M16 4l-8 8h6v8h4v-8h6l-8-8zM8 24h16v2H8v-2z"/>
                </svg>
              </div>
              <div className="action-content">
                <h3 className="action-title">Bulk Upload</h3>
                <p className="action-description">Import from CSV file</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button className="action-card refresh" onClick={() => loadData()}>
              <div className="action-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M16 4v8l6-6-6-6v8zm0 24v-8l-6 6 6 6v-8zM8 16H0l6 6 6-6H8zm16 0h8l-6-6-6 6h8z"/>
                </svg>
              </div>
              <div className="action-content">
                <h3 className="action-title">Refresh Data</h3>
                <p className="action-description">Reload all statistics</p>
              </div>
              <div className="action-arrow">→</div>
            </button>
          </div>
        </section>

        {/* Bulk Upload Modal */}
        {showBulkUpload && (
          <div className="modal-overlay" onClick={() => setShowBulkUpload(false)}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📤 Bulk Upload Learning Units</h2>
                <button className="modal-close" onClick={() => setShowBulkUpload(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <BulkLearningUnitUpload onSuccess={() => { loadData(); setShowBulkUpload(false); }} />
              </div>
            </div>
          </div>
        )}

        {/* Statistics Dashboard */}
        <section className="stats-section">
          <h2 className="section-heading">📊 Content Overview</h2>
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <path d="M8 8h24v24H8V8zm4 4v16h16V12H12z"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats?.total || 0}</div>
                <div className="stat-label">Total Units</div>
                <div className="stat-trend">All content items</div>
              </div>
            </div>

            <div className="stat-card success">
              <div className="stat-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <path d="M20 4l8 16h8l-6 12-8-4-8 4-6-12h8l8-16z"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats?.byStatus?.ACTIVE || 0}</div>
                <div className="stat-label">Active</div>
                <div className="stat-trend positive">Live content</div>
              </div>
            </div>

            <div className="stat-card info">
              <div className="stat-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <circle cx="20" cy="20" r="16" fill="currentColor" opacity="0.2"/>
                  <circle cx="20" cy="20" r="8"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats?.byStatus?.PENDING_MAPPING || 0}</div>
                <div className="stat-label">Pending</div>
                <div className="stat-trend">Awaiting mapping</div>
              </div>
            </div>

            <div className="stat-card warning">
              <div className="stat-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <path d="M20 4L4 36h32L20 4zm0 8l8 16H12l8-16z"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats?.byStatus?.DRAFT || 0}</div>
                <div className="stat-label">Draft</div>
                <div className="stat-trend">Work in progress</div>
              </div>
            </div>

            <div className="stat-card accent">
              <div className="stat-icon">📚</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.byType?.BOOK || 0}</div>
                <div className="stat-label">Books</div>
                <div className="stat-trend">Text content</div>
              </div>
            </div>

            <div className="stat-card accent">
              <div className="stat-icon">🎥</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.byType?.VIDEO || 0}</div>
                <div className="stat-label">Videos</div>
                <div className="stat-trend">Video lectures</div>
              </div>
            </div>

            <div className="stat-card accent">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{(stats?.byType as any)?.MCQ || 0}</div>
                <div className="stat-label">MCQs</div>
                <div className="stat-trend">Question bank</div>
              </div>
            </div>

            <div className="stat-card accent">
              <div className="stat-icon">👁️</div>
              <div className="stat-content">
                <div className="stat-value">{analytics?.totalAccesses || 0}</div>
                <div className="stat-label">Total Views</div>
                <div className="stat-trend">All-time engagement</div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Ratings */}
        {contentRatings.length > 0 && (
          <section className="ratings-section">
            <h2 className="section-heading">⭐ Content Performance & Ratings</h2>
            <div className="ratings-overview">
              <div className="rating-summary-card">
                <div className="rating-score">
                  {(contentRatings.reduce((sum, r) => sum + r.averageRating, 0) / contentRatings.length).toFixed(1)}
                </div>
                <div className="rating-stars">{'★'.repeat(Math.round(contentRatings.reduce((sum, r) => sum + r.averageRating, 0) / contentRatings.length))}</div>
                <div className="rating-label">Average Rating</div>
              </div>
              <div className="rating-summary-card">
                <div className="rating-score">
                  {contentRatings.reduce((sum, r) => sum + r.totalRatings, 0)}
                </div>
                <div className="rating-label">Total Reviews</div>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Content Item</th>
                    <th>Rating</th>
                    <th>Reviews</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {contentRatings.slice(0, 10).map((rating, idx) => (
                    <tr key={idx}>
                      <td className="col-primary">{rating.courseTitle || 'Content Item'}</td>
                      <td>
                        <div className="rating-display">
                          <span className="stars">{'★'.repeat(Math.round(rating.averageRating))}</span>
                          <span className="score">{rating.averageRating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td>{rating.totalRatings} reviews</td>
                      <td>
                        <span className={`badge ${
                          rating.averageRating >= 4.5 ? 'badge-success' : 
                          rating.averageRating >= 4 ? 'badge-good' : 
                          rating.averageRating >= 3 ? 'badge-average' : 'badge-poor'
                        }`}>
                          {rating.averageRating >= 4.5 ? 'Excellent' : 
                           rating.averageRating >= 4 ? 'Very Good' : 
                           rating.averageRating >= 3 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Learning Units Table */}
        <section className="content-section">
          <div className="section-header">
            <h2 className="section-heading">📚 Your Learning Units ({learningUnits.length})</h2>
            <button className="btn-primary" onClick={() => navigate('/publisher-admin/create')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Create New Unit
            </button>
          </div>
          
          {learningUnits.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Content</th>
                    <th>Subject</th>
                    <th>Difficulty</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {learningUnits.map((unit) => (
                    <tr key={unit.id}>
                      <td className="col-primary">
                        <div className="content-cell">
                          <span className="content-icon">{getTypeIcon(unit.type)}</span>
                          <div className="content-details">
                            <div className="content-title">{unit.title}</div>
                            <div className="content-topic">{unit.topic}</div>
                          </div>
                        </div>
                      </td>
                      <td>{unit.subject}</td>
                      <td>
                        <span className="difficulty-badge">{unit.difficultyLevel}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${getStatusColor(unit.status)}`}>
                          {unit.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-action"
                          onClick={() => navigate(`/publisher-admin/view/${unit.id}`)}
                        >
                          View Details
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="50" fill="#F3F4F6"/>
                  <path d="M40 60h40M60 40v40" stroke="#9CA3AF" strokeWidth="4" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="empty-title">No Learning Units Yet</h3>
              <p className="empty-description">Start creating educational content to populate your dashboard</p>
              <button className="btn-primary" onClick={() => navigate('/publisher-admin/create')}>
                Create Your First Unit
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PublisherAdminDashboard;
