import React, { useEffect, useState } from 'react';
import { FileText, Search, CheckCircle, XCircle, Package, BookOpen, Video, FileQuestion } from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import { getAuthImageUrl } from '../utils/imageUrl';
import BookCover from '../components/BookCover';
import '../styles/bitflow-owner.css';
import { formatDate } from '../utils/dateUtils';

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
  thumbnailUrl?: string;
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetchContent();
    fetchStats();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await apiService.get('/bitflow-owner/content', { params: { page, limit: PAGE_SIZE } });
      const raw = res.data;
      // API returns {data: [...], meta: {total, page, limit, totalPages}}
      const items = raw?.data || raw?.content || raw?.learningUnits || raw || [];
      setContent(Array.isArray(items) ? items : []);
      if (raw?.meta) {
        setTotalPages(raw.meta.totalPages || 1);
        setTotalCount(raw.meta.total || 0);
      }
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
        approved: getCount('ACTIVE'),
        pending: getCount('INACTIVE'),
        rejected: getCount('ARCHIVED'),
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
              <div className="bo-stat-label">Active</div>
            </div>
            <div className="bo-stat-card">
              <div className="bo-stat-icon" style={{ background: '#FEF3C7', color: '#F59E0B' }}><FileText size={20} /></div>
              <div className="bo-stat-value">{stats.pending || 0}</div>
              <div className="bo-stat-label">Inactive</div>
            </div>
            <div className="bo-stat-card">
              <div className="bo-stat-icon" style={{ background: 'var(--bo-danger-light)', color: 'var(--bo-danger)' }}><XCircle size={20} /></div>
              <div className="bo-stat-value">{stats.rejected || 0}</div>
              <div className="bo-stat-label">Archived</div>
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
          <select className="bo-filter-select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="ALL">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="bo-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
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
                          {item.thumbnailUrl && getAuthImageUrl(item.thumbnailUrl) ? (
                            <div style={{ width: 32, height: 42, borderRadius: 4, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--bo-border)', background: '#1a1a2e' }}>
                              <img src={getAuthImageUrl(item.thumbnailUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                          ) : (
                            <BookCover title={item.title} type={item.type} width={32} height={42} />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                            {item.subject && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{item.subject}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className="bo-badge bo-badge-default">{item.type}</span></td>
                      <td style={{ fontSize: 13 }}>{item.publisher?.name || item.publisherName || '—'}</td>
                      <td>
                        <span className={`bo-badge ${item.status === 'ACTIVE' ? 'bo-badge-success' : item.status === 'INACTIVE' ? 'bo-badge-warning' : item.status === 'ARCHIVED' ? 'bo-badge-danger' : 'bo-badge-default'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{formatDate(item.createdAt)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {item.status === 'ACTIVE' && (
                            <button className="bo-btn bo-btn-danger" style={{ padding: '5px 12px', fontSize: 12, lineHeight: 1 }} onClick={() => handleStatusChange(item.id, 'INACTIVE')}>Deactivate</button>
                          )}
                          {(item.status === 'INACTIVE' || item.status === 'DRAFT') && (
                            <button className="bo-btn bo-btn-success" style={{ padding: '5px 12px', fontSize: 12, lineHeight: 1 }} onClick={() => handleStatusChange(item.id, 'ACTIVE')}>Activate</button>
                          )}
                          {item.status !== 'ARCHIVED' && (
                            <button className="bo-btn bo-btn-ghost" style={{ padding: '5px 12px', fontSize: 12, lineHeight: 1 }} onClick={() => handleStatusChange(item.id, 'ARCHIVED')}>Archive</button>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} items
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="bo-btn bo-btn-ghost bo-btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 3, totalPages - 6));
                const p = start + i;
                return (
                  <button
                    key={p}
                    className={`bo-btn bo-btn-sm ${p === page ? 'bo-btn-primary' : 'bo-btn-ghost'}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="bo-btn bo-btn-ghost bo-btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ContentManagementPage;
