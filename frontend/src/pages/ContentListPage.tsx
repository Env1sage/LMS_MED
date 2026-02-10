import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PublisherLayout from '../components/publisher/PublisherLayout';
import learningUnitService from '../services/learning-unit.service';
import { LearningUnit, LearningUnitType, LearningUnitStatus, DifficultyLevel } from '../types';
import {
  Search, Filter, BookOpen, Video, FileText, PlusCircle,
  ChevronLeft, ChevronRight, Eye, Edit2, Trash2, ToggleLeft, ToggleRight,
  Download, Upload
} from 'lucide-react';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

const ContentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [units, setUnits] = useState<LearningUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterDifficulty) params.difficultyLevel = filterDifficulty;

      const res = await learningUnitService.getAll(params);
      const data = (res as any)?.data || res || [];
      const meta = (res as any)?.meta || {};
      setUnits(Array.isArray(data) ? data : []);
      setTotal(meta.total || 0);
      setTotalPages(meta.totalPages || 0);
    } catch (err) {
      console.error('Failed to load content:', err);
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterType, filterStatus, filterDifficulty]);

  useEffect(() => { loadContent(); }, [loadContent]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadContent();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This action cannot be undone.`)) return;
    try {
      setActionLoading(id);
      await learningUnitService.delete(id);
      loadContent();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (unit: LearningUnit) => {
    try {
      setActionLoading(unit.id);
      if (unit.status === 'ACTIVE') {
        await learningUnitService.deactivateContent(unit.id, 'Deactivated by publisher');
      } else {
        await learningUnitService.activateContent(unit.id);
      }
      loadContent();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const typeIcon = (type: string) => {
    if (type === 'VIDEO') return <Video size={15} style={{ color: '#8B5CF6' }} />;
    return <BookOpen size={15} style={{ color: '#3B82F6' }} />;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: '#10B981', DRAFT: '#F59E0B', PENDING_MAPPING: '#6366F1',
      INACTIVE: '#6B7280', SUSPENDED: '#EF4444',
    };
    const c = colors[status] || '#6B7280';
    return (
      <span style={{
        padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
        background: `${c}15`, color: c, whiteSpace: 'nowrap'
      }}>
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  const diffLabel: Record<string, string> = { K: 'Knows', KH: 'Knows How', S: 'Shows', SH: 'Shows How', P: 'Performs' };

  return (
    <PublisherLayout>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text)' }}>Learning Units</h1>
            <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginTop: 4 }}>
              {total} total learning unit{total !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="bo-btn bo-btn-primary" onClick={() => navigate('/publisher-admin/create')}>
            <PlusCircle size={16} /> Create New
          </button>
        </div>

        {/* Filters Row */}
        <div className="bo-card" style={{ padding: 16, marginBottom: 16 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, subject, topic..."
                style={{
                  width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8,
                  border: '1px solid var(--bo-border)', fontSize: 13, background: 'var(--bo-bg)',
                  color: 'var(--bo-text)'
                }}
              />
            </div>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, background: 'var(--bo-bg)', color: 'var(--bo-text)' }}>
              <option value="">All Types</option>
              <option value="BOOK">E-Books</option>
              <option value="VIDEO">Videos</option>
            </select>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, background: 'var(--bo-bg)', color: 'var(--bo-text)' }}>
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_MAPPING">Pending Mapping</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select value={filterDifficulty} onChange={e => { setFilterDifficulty(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, background: 'var(--bo-bg)', color: 'var(--bo-text)' }}>
              <option value="">All Difficulty</option>
              {Object.entries(diffLabel).map(([k, v]) => (
                <option key={k} value={k}>{k} - {v}</option>
              ))}
            </select>
            <button type="submit" className="bo-btn bo-btn-outline" style={{ padding: '8px 16px' }}>
              <Filter size={14} /> Filter
            </button>
          </form>
        </div>
      </div>

      {/* Content Table */}
      <div className="bo-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="page-loading-screen">
            <div className="loading-rings">
              <div className="loading-ring loading-ring-1"></div>
              <div className="loading-ring loading-ring-2"></div>
              <div className="loading-ring loading-ring-3"></div>
            </div>
            <div className="loading-dots">
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
            <div className="loading-title">Loading Content</div>
            <div className="loading-bar-track">
              <div className="loading-bar-fill"></div>
            </div>
          </div>
        ) : units.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
            <BookOpen size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 16, marginBottom: 8 }}>No content found</div>
            <p style={{ fontSize: 13, marginBottom: 16 }}>Try adjusting filters or create new content.</p>
            <button className="bo-btn bo-btn-primary" onClick={() => navigate('/publisher-admin/create')}>
              <PlusCircle size={16} /> Create Learning Unit
            </button>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bo-bg)', borderBottom: '1px solid var(--bo-border)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Subject / Topic</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Level</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Competencies</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.map(unit => (
                  <tr key={unit.id} style={{ borderBottom: '1px solid var(--bo-border)', cursor: 'pointer' }}
                    onClick={() => navigate(`/publisher-admin/view/${unit.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bo-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unit.title}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {typeIcon(unit.type)} {unit.type}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13 }}>{unit.subject}</div>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{unit.topic}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 12 }}>{unit.difficultyLevel} - {diffLabel[unit.difficultyLevel] || unit.difficultyLevel}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>{statusBadge(unit.status)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 12, color: unit.competencyIds?.length ? 'var(--bo-success)' : 'var(--bo-text-muted)' }}>
                        {unit.competencyIds?.length || 0} mapped
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                        <button title="View" className="bo-btn bo-btn-outline" style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => navigate(`/publisher-admin/view/${unit.id}`)}>
                          <Eye size={14} />
                        </button>
                        <button title="Edit" className="bo-btn bo-btn-outline" style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => navigate(`/publisher-admin/edit/${unit.id}`)}>
                          <Edit2 size={14} />
                        </button>
                        <button title={unit.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          className="bo-btn bo-btn-outline" style={{ padding: '4px 8px', fontSize: 12 }}
                          disabled={actionLoading === unit.id}
                          onClick={() => handleToggleStatus(unit)}>
                          {unit.status === 'ACTIVE' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                        <button title="Delete" className="bo-btn bo-btn-outline" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--bo-danger)' }}
                          disabled={actionLoading === unit.id}
                          onClick={() => handleDelete(unit.id, unit.title)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--bo-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}
                    disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const p = start + i;
                    if (p > totalPages) return null;
                    return (
                      <button key={p} className={`bo-btn ${p === page ? 'bo-btn-primary' : 'bo-btn-outline'}`}
                        style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setPage(p)}>
                        {p}
                      </button>
                    );
                  })}
                  <button className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}
                    disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PublisherLayout>
  );
};

export default ContentListPage;
