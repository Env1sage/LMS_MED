import React, { useEffect, useState } from 'react';
import { FileText, Search, CheckCircle, XCircle, Package, BookOpen, Video, FileQuestion } from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import '../styles/bitflow-owner.css';

interface ContentItem {
  id: string;
  title: string;
  type: string;
  status: string;
  subject?: string;
  publisher?: { name: string };
  publisherName?: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
}

interface ContentStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  byType?: Record<string, number>;
}

const ContentManagementPage: React.FC = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContent();
    fetchStats();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await apiService.get('/bitflow-owner/content');
      const raw = res.data;
      // API returns {data: [...], meta: {total, page, limit, totalPages}}
      const items = raw?.data || raw?.content || raw?.learningUnits || raw || [];
      setContent(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiService.get('/bitflow-owner/content/stats');
      const raw = res.data;
      // API returns {byType: [...], byStatus: [...], byPublisher: [...]}
      // Compute totals from byStatus array
      const byStatus = raw?.byStatus || [];
      const total = byStatus.reduce((sum: number, s: any) => sum + (s.count || 0), 0);
      const getCount = (status: string) => byStatus.find((s: any) => s.status === status)?.count || 0;
      setStats({
        total,
        approved: getCount('ACTIVE') + getCount('APPROVED'),
        pending: getCount('PENDING') + getCount('DRAFT'),
        rejected: getCount('REJECTED'),
        byType: raw?.byType,
      });
    } catch (err) {
      console.error('Error fetching content stats:', err);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiService.patch(`/bitflow-owner/content/${id}/status`, { status });
      setSuccessMsg(`Content ${status.toLowerCase()} successfully`);
      fetchContent();
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'VIDEO': return <Video size={16} style={{ color: '#8B5CF6' }} />;
      case 'MCQ': case 'ASSESSMENT': return <FileQuestion size={16} style={{ color: '#F59E0B' }} />;
      case 'PACKAGE': case 'SCORM': return <Package size={16} style={{ color: '#10B981' }} />;
      default: return <BookOpen size={16} style={{ color: '#6366F1' }} />;
    }
  };

  const filtered = content.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'ALL' || c.type === typeFilter;
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const types = Array.from(new Set(content.map(c => c.type).filter(Boolean)));

  return (
    <MainLayout loading={loading} loadingMessage="Loading Content">
      <div className="bo-page">
        <div className="bo-page-header">
          <div>
            <h1 className="bo-page-title">Content Management</h1>
            <p className="bo-page-subtitle">Review and manage learning content across the platform</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
            <div className="bo-stat-card">
              <div className="bo-stat-icon" style={{ background: 'var(--bo-accent-light)', color: 'var(--bo-accent)' }}><FileText size={20} /></div>
              <div className="bo-stat-value">{stats.total}</div>
              <div className="bo-stat-label">Total Content</div>
            </div>
            <div className="bo-stat-card">
              <div className="bo-stat-icon" style={{ background: 'var(--bo-success-light)', color: 'var(--bo-success)' }}><CheckCircle size={20} /></div>
              <div className="bo-stat-value">{stats.approved || 0}</div>
              <div className="bo-stat-label">Approved</div>
            </div>
            <div className="bo-stat-card">
              <div className="bo-stat-icon" style={{ background: '#FEF3C7', color: '#F59E0B' }}><FileText size={20} /></div>
              <div className="bo-stat-value">{stats.pending || 0}</div>
              <div className="bo-stat-label">Pending Review</div>
            </div>
            <div className="bo-stat-card">
              <div className="bo-stat-icon" style={{ background: 'var(--bo-danger-light)', color: 'var(--bo-danger)' }}><XCircle size={20} /></div>
              <div className="bo-stat-value">{stats.rejected || 0}</div>
              <div className="bo-stat-label">Rejected</div>
            </div>
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '12px 16px', background: 'var(--bo-success-light)', border: '1px solid #A7F3D0', borderRadius: 8, color: 'var(--bo-success)', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
            <CheckCircle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> {successMsg}
          </div>
        )}
        {error && (
          <div style={{ padding: '12px 16px', background: 'var(--bo-danger-light)', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--bo-danger)', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
            <XCircle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> {error}
          </div>
        )}

        {/* Filters */}
        <div className="bo-filters">
          <div className="bo-search-bar" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={16} className="bo-search-icon" />
            <input placeholder="Search content..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select className="bo-filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="ALL">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="bo-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{filtered.length} items</span>
        </div>

        {/* Table */}
        <div className="bo-card">
          {filtered.length === 0 ? (
            <div className="bo-empty">
              <FileText size={44} className="bo-empty-icon" />
              <h3>No Content Found</h3>
              <p>Content will appear here once publishers upload learning materials</p>
            </div>
          ) : (
            <div className="bo-table-wrap">
              <table className="bo-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Publisher</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {getTypeIcon(item.type)}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                            {item.subject && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{item.subject}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className="bo-badge bo-badge-default">{item.type}</span></td>
                      <td style={{ fontSize: 13 }}>{item.publisher?.name || item.publisherName || '—'}</td>
                      <td>
                        <span className={`bo-badge ${item.status === 'PUBLISHED' || item.status === 'APPROVED' ? 'bo-badge-success' : item.status === 'REJECTED' ? 'bo-badge-danger' : item.status === 'PENDING' ? 'bo-badge-warning' : 'bo-badge-default'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {item.status === 'PENDING' && (
                            <>
                              <button className="bo-btn bo-btn-success bo-btn-sm" onClick={() => handleStatusChange(item.id, 'APPROVED')}>Approve</button>
                              <button className="bo-btn bo-btn-danger bo-btn-sm" onClick={() => handleStatusChange(item.id, 'REJECTED')}>Reject</button>
                            </>
                          )}
                          {item.status === 'APPROVED' && (
                            <button className="bo-btn bo-btn-primary bo-btn-sm" onClick={() => handleStatusChange(item.id, 'PUBLISHED')}>Publish</button>
                          )}
                          {item.status === 'REJECTED' && (
                            <button className="bo-btn bo-btn-ghost bo-btn-sm" onClick={() => handleStatusChange(item.id, 'PENDING')}>Re-review</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ContentManagementPage;
