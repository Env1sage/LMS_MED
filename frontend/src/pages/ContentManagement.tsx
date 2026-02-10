import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import bitflowOwnerService, { 
  ContentItem, 
  ContentStats, 
  McqItem,
  ContentListResponse,
  McqListResponse 
} from '../services/bitflow-owner.service';
import { Publisher } from '../types';
import { 
  PageWrapper, 
  GlassSidebar, 
  GlassContentArea, 
  GlassContentHeader,
  GlassStatCard,
  ChartBarIcon,
  BookOpenIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowLeftIcon
} from '../components/ui';
import '../styles/BitflowPremium.css';

type ContentType = 'BOOK' | 'VIDEO' | 'MCQ' | 'all';
type ContentTab = 'overview' | 'books' | 'videos' | 'mcqs';

const ContentManagement: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<ContentTab>('overview');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [contentStats, setContentStats] = useState<ContentStats | null>(null);
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [mcqList, setMcqList] = useState<McqItem[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPublisher, setSelectedPublisher] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // Detail modal
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedMcq, setSelectedMcq] = useState<McqItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadPublishers();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadStats();
    } else if (activeTab === 'mcqs') {
      loadMcqs();
    } else {
      loadContent();
    }
  }, [activeTab, currentPage, selectedPublisher, selectedStatus]);

  const loadPublishers = async () => {
    try {
      const pubs = await bitflowOwnerService.getAllPublishers();
      setPublishers(pubs);
    } catch (error) {
      console.error('Failed to load publishers:', error);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const stats = await bitflowOwnerService.getContentStats();
      setContentStats(stats);
    } catch (error) {
      console.error('Failed to load content stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async () => {
    setLoading(true);
    try {
      const typeMap: Record<ContentTab, string> = {
        books: 'BOOK',
        videos: 'VIDEO',
        mcqs: 'MCQ',
        overview: '',
      };
      
      const response: ContentListResponse = await bitflowOwnerService.getAllContent({
        type: typeMap[activeTab] || undefined,
        publisherId: selectedPublisher || undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
        page: currentPage,
        limit: 20,
      });
      
      setContentList(response.data);
      setTotalItems(response.meta.total);
      setTotalPages(response.meta.totalPages);
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMcqs = async () => {
    setLoading(true);
    try {
      const response: McqListResponse = await bitflowOwnerService.getAllMcqs({
        publisherId: selectedPublisher || undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
        page: currentPage,
        limit: 20,
      });
      
      setMcqList(response.data);
      setTotalItems(response.meta.total);
      setTotalPages(response.meta.totalPages);
    } catch (error) {
      console.error('Failed to load MCQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    if (activeTab === 'mcqs') {
      loadMcqs();
    } else if (activeTab !== 'overview') {
      loadContent();
    }
  };

  const handleViewContent = async (id: string) => {
    try {
      const content = await bitflowOwnerService.getContentById(id);
      setSelectedContent(content);
      setSelectedMcq(null);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load content details:', error);
    }
  };

  const handleViewMcq = async (id: string) => {
    try {
      const mcq = await bitflowOwnerService.getMcqById(id);
      setSelectedMcq(mcq);
      setSelectedContent(null);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load MCQ details:', error);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const reason = newStatus !== 'ACTIVE' ? prompt('Reason for status change (optional):') : undefined;
    try {
      await bitflowOwnerService.updateContentStatus(id, newStatus, reason || undefined);
      if (activeTab === 'mcqs') {
        loadMcqs();
      } else {
        loadContent();
      }
      setShowDetailModal(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BOOK': return <BookOpenIcon size={28} />;
      case 'VIDEO': return <VideoCameraIcon size={28} />;
      case 'MCQ': return <CheckCircleIcon size={28} />;
      default: return <DocumentTextIcon size={28} />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'status-badge active';
      case 'DRAFT': return 'status-badge pending';
      case 'INACTIVE': return 'status-badge suspended';
      case 'ARCHIVED': return 'status-badge suspended';
      default: return 'status-badge';
    }
  };

  const navItems = [
    { id: 'overview', icon: <ChartBarIcon />, label: 'Overview' },
    { id: 'books', icon: <BookOpenIcon />, label: 'E-Books' },
    { id: 'videos', icon: <VideoCameraIcon />, label: 'Videos' },
    { id: 'mcqs', icon: <CheckCircleIcon />, label: 'MCQs' },
  ];

  const getTabTitle = () => {
    const labels: Record<string, string> = { overview: 'Content Overview', books: 'E-Books', videos: 'Videos', mcqs: 'MCQs' };
    return labels[activeTab];
  };

  return (
    <PageWrapper>
      <GlassSidebar
        title="Content Library"
        subtitle="Platform Content"
        navItems={navItems.map(item => ({
          ...item,
          onClick: () => { setActiveTab(item.id as ContentTab); setCurrentPage(1); }
        }))}
        activeTab={activeTab}
        userName={user?.fullName}
        userRole={user?.role}
        onLogout={handleLogout}
      >
        <div className="glass-sidebar-divider">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="glass-nav-item glass-nav-item-small"
          >
            <span className="glass-nav-icon"><ArrowLeftIcon size={16} /></span>
            <span className="glass-nav-label">Back to Dashboard</span>
          </button>
        </div>
      </GlassSidebar>

      <GlassContentArea>
        <GlassContentHeader title={getTabTitle()} />

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && contentStats && (
              <div className="content-overview">
                {/* Stats by Type */}
                <div className="overview-grid">
                  {contentStats.byType.map(item => (
                    <GlassStatCard
                      key={item.type}
                      icon={getTypeIcon(item.type)}
                      value={item.count}
                      label={item.type}
                      badge={{ text: 'View All →', variant: 'success' }}
                      onClick={() => setActiveTab(item.type.toLowerCase() + 's' as ContentTab)}
                    />
                  ))}
                </div>

                {/* Stats by Status */}
                <div className="section-card" style={{ marginTop: '24px' }}>
                  <h3>Content by Status</h3>
                  <div className="stats-row" style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {contentStats.byStatus.map(item => (
                      <div key={item.status} className="mini-stat">
                        <span className={getStatusBadgeClass(item.status)}>{item.status}</span>
                        <strong style={{ marginLeft: '8px' }}>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats by Publisher */}
                <div className="section-card" style={{ marginTop: '24px' }}>
                  <h3>Content by Publisher</h3>
                  <div className="table-container" style={{ marginTop: '16px' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Publisher</th>
                          <th>Content Count</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contentStats.byPublisher.map(item => (
                          <tr key={item.publisherId}>
                            <td>{item.publisherName}</td>
                            <td><strong>{item.count}</strong></td>
                            <td>
                              <button 
                                className="primary-btn-sm"
                                onClick={() => {
                                  setSelectedPublisher(item.publisherId);
                                  setActiveTab('books');
                                }}
                              >
                                View Content
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Content */}
                <div className="section-card" style={{ marginTop: '24px' }}>
                  <h3>Recently Added Content</h3>
                  <div className="table-container" style={{ marginTop: '16px' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Title</th>
                          <th>Subject</th>
                          <th>Publisher</th>
                          <th>Status</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contentStats.recentContent.map(item => (
                          <tr key={item.id}>
                            <td>{getTypeIcon(item.type)}</td>
                            <td>{item.title}</td>
                            <td>{item.subject}</td>
                            <td>{item.publisherName}</td>
                            <td><span className={getStatusBadgeClass(item.status)}>{item.status}</span></td>
                            <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Content List (E-Books, Videos, MCQs) */}
            {(activeTab === 'books' || activeTab === 'videos') && (
              <div className="tab-content">
                {/* Filters */}
                <div className="filters-bar" style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    placeholder="Search by title, subject, topic..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSearch()}
                    style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                  />
                  <select
                    value={selectedPublisher}
                    onChange={e => { setSelectedPublisher(e.target.value); setCurrentPage(1); }}
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                  >
                    <option value="">All Publishers</option>
                    {publishers.map(pub => (
                      <option key={pub.id} value={pub.id}>{pub.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedStatus}
                    onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                  >
                    <option value="">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                  <button onClick={handleSearch} className="primary-btn">Search</button>
                </div>

                {/* Results info */}
                <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
                  Showing {contentList.length} of {totalItems} items
                </p>

                {/* Content Table */}
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Subject</th>
                        <th>Topic</th>
                        <th>Difficulty</th>
                        <th>Publisher</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentList.map(item => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {item.thumbnailUrl && (
                                <img src={item.thumbnailUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                              )}
                              <span>{item.title}</span>
                            </div>
                          </td>
                          <td>{item.subject}</td>
                          <td>{item.topic}</td>
                          <td><span className={`difficulty-badge ${item.difficultyLevel.toLowerCase()}`}>{item.difficultyLevel}</span></td>
                          <td>{item.publisher.name}</td>
                          <td><span className={getStatusBadgeClass(item.status)}>{item.status}</span></td>
                          <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button 
                              onClick={() => handleViewContent(item.id)}
                              className="primary-btn-sm"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {contentList.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                            No content found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      ← Prev
                    </button>
                    <span style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="pagination-btn"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MCQs Tab */}
            {activeTab === 'mcqs' && (
              <div className="tab-content">
                {/* Filters */}
                <div className="filters-bar" style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    placeholder="Search by question, subject, topic..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSearch()}
                    style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                  />
                  <select
                    value={selectedPublisher}
                    onChange={e => { setSelectedPublisher(e.target.value); setCurrentPage(1); }}
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                  >
                    <option value="">All Publishers</option>
                    {publishers.map(pub => (
                      <option key={pub.id} value={pub.id}>{pub.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedStatus}
                    onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                  >
                    <option value="">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                  <button onClick={handleSearch} className="primary-btn">Search</button>
                </div>

                {/* Results info */}
                <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
                  Showing {mcqList.length} of {totalItems} MCQs
                </p>

                {/* MCQ Table */}
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Subject</th>
                        <th>Topic</th>
                        <th>Difficulty</th>
                        <th>Bloom's Level</th>
                        <th>Publisher</th>
                        <th>Status</th>
                        <th>Verified</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mcqList.map(mcq => (
                        <tr key={mcq.id}>
                          <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mcq.questionText}
                          </td>
                          <td>{mcq.subject}</td>
                          <td>{mcq.topic}</td>
                          <td><span className={`difficulty-badge ${mcq.difficultyLevel.toLowerCase()}`}>{mcq.difficultyLevel}</span></td>
                          <td>{mcq.bloomsLevel}</td>
                          <td>{mcq.publisher.name}</td>
                          <td><span className={getStatusBadgeClass(mcq.status)}>{mcq.status}</span></td>
                          <td>{mcq.isVerified ? '✅' : '⏳'}</td>
                          <td>
                            <button 
                              onClick={() => handleViewMcq(mcq.id)}
                              className="primary-btn-sm"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {mcqList.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                            No MCQs found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      ← Prev
                    </button>
                    <span style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="pagination-btn"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Detail Modal */}
        {showDetailModal && (selectedContent || selectedMcq) && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal-content modal-large" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
              <div className="modal-header">
                <h2>
                  {selectedContent && `${getTypeIcon(selectedContent.type)} ${selectedContent.title}`}
                  {selectedMcq && `✅ MCQ Details`}
                </h2>
                <button className="close-btn" onClick={() => setShowDetailModal(false)}>×</button>
              </div>

              <div className="modal-body" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Content Details */}
                {selectedContent && (
                  <div className="content-details">
                    <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="detail-item">
                        <label>Type</label>
                        <p>{getTypeIcon(selectedContent.type)} {selectedContent.type}</p>
                      </div>
                      <div className="detail-item">
                        <label>Status</label>
                        <p><span className={getStatusBadgeClass(selectedContent.status)}>{selectedContent.status}</span></p>
                      </div>
                      <div className="detail-item">
                        <label>Subject</label>
                        <p>{selectedContent.subject}</p>
                      </div>
                      <div className="detail-item">
                        <label>Topic</label>
                        <p>{selectedContent.topic}</p>
                      </div>
                      <div className="detail-item">
                        <label>Difficulty</label>
                        <p><span className={`difficulty-badge ${selectedContent.difficultyLevel.toLowerCase()}`}>{selectedContent.difficultyLevel}</span></p>
                      </div>
                      <div className="detail-item">
                        <label>Duration</label>
                        <p>{selectedContent.estimatedDuration} minutes</p>
                      </div>
                      <div className="detail-item">
                        <label>Publisher</label>
                        <p>{selectedContent.publisher.name} ({selectedContent.publisher.code})</p>
                      </div>
                      <div className="detail-item">
                        <label>Created</label>
                        <p>{new Date(selectedContent.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="detail-item" style={{ marginTop: '16px' }}>
                      <label>Description</label>
                      <p style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px' }}>
                        {selectedContent.description}
                      </p>
                    </div>

                    {selectedContent.tags && selectedContent.tags.length > 0 && (
                      <div className="detail-item" style={{ marginTop: '16px' }}>
                        <label>Tags</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {selectedContent.tags.map((tag, idx) => (
                            <span key={idx} className="tag-badge">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedContent.competencies && selectedContent.competencies.length > 0 && (
                      <div className="detail-item" style={{ marginTop: '16px' }}>
                        <label>Mapped Competencies</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedContent.competencies.map((comp, idx) => (
                            <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '4px' }}>
                              <code style={{ color: 'var(--color-accent)' }}>{comp.code}</code> - {comp.shortTitle}
                              <small style={{ display: 'block', color: 'var(--color-text-tertiary)' }}>{comp.domain}</small>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status Change Actions */}
                    <div className="detail-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                      {selectedContent.status !== 'ACTIVE' && (
                        <button 
                          className="success-btn"
                          onClick={() => handleStatusChange(selectedContent.id, 'ACTIVE')}
                        >
                          ✅ Activate
                        </button>
                      )}
                      {selectedContent.status === 'ACTIVE' && (
                        <button 
                          className="danger-btn"
                          onClick={() => handleStatusChange(selectedContent.id, 'INACTIVE')}
                        >
                          ⏸️ Deactivate
                        </button>
                      )}
                      {selectedContent.status !== 'ARCHIVED' && (
                        <button 
                          className="warning-btn"
                          onClick={() => handleStatusChange(selectedContent.id, 'ARCHIVED')}
                        >
                          🗄️ Archive
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* MCQ Details */}
                {selectedMcq && (
                  <div className="mcq-details">
                    <div className="detail-item">
                      <label>Question</label>
                      <p style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px', fontSize: '1.1em' }}>
                        {selectedMcq.questionText}
                      </p>
                    </div>

                    {selectedMcq.options && (
                      <div className="detail-item" style={{ marginTop: '16px' }}>
                        <label>Options</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedMcq.options.map((opt, idx) => (
                            <div 
                              key={idx} 
                              style={{ 
                                background: idx === selectedMcq.correctOptionIndex ? 'rgba(76, 175, 80, 0.2)' : 'rgba(0,0,0,0.2)', 
                                padding: '8px 12px', 
                                borderRadius: '4px',
                                border: idx === selectedMcq.correctOptionIndex ? '1px solid #4caf50' : 'none'
                              }}
                            >
                              {String.fromCharCode(65 + idx)}. {opt}
                              {idx === selectedMcq.correctOptionIndex && <span style={{ marginLeft: '8px', color: '#4caf50' }}>✓ Correct</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedMcq.explanation && (
                      <div className="detail-item" style={{ marginTop: '16px' }}>
                        <label>Explanation</label>
                        <p style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px' }}>
                          {selectedMcq.explanation}
                        </p>
                      </div>
                    )}

                    <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                      <div className="detail-item">
                        <label>Subject</label>
                        <p>{selectedMcq.subject}</p>
                      </div>
                      <div className="detail-item">
                        <label>Topic</label>
                        <p>{selectedMcq.topic}</p>
                      </div>
                      <div className="detail-item">
                        <label>Difficulty</label>
                        <p><span className={`difficulty-badge ${selectedMcq.difficultyLevel.toLowerCase()}`}>{selectedMcq.difficultyLevel}</span></p>
                      </div>
                      <div className="detail-item">
                        <label>Bloom's Level</label>
                        <p>{selectedMcq.bloomsLevel}</p>
                      </div>
                      <div className="detail-item">
                        <label>Publisher</label>
                        <p>{selectedMcq.publisher.name}</p>
                      </div>
                      <div className="detail-item">
                        <label>Status</label>
                        <p><span className={getStatusBadgeClass(selectedMcq.status)}>{selectedMcq.status}</span></p>
                      </div>
                      <div className="detail-item">
                        <label>Verified</label>
                        <p>{selectedMcq.isVerified ? '✅ Yes' : '⏳ Pending'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Created</label>
                        <p>{new Date(selectedMcq.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {selectedMcq.competencies && selectedMcq.competencies.length > 0 && (
                      <div className="detail-item" style={{ marginTop: '16px' }}>
                        <label>Mapped Competencies</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedMcq.competencies.map((comp, idx) => (
                            <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '4px' }}>
                              <code style={{ color: 'var(--color-accent)' }}>{comp.code}</code> - {comp.shortTitle}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </GlassContentArea>
    </PageWrapper>
  );
};

export default ContentManagement;
