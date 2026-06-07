import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PublisherLayout from '../components/publisher/PublisherLayout';
import learningUnitService from '../services/learning-unit.service';
import type { PageCompetencyEntry } from '../services/learning-unit.service';
import competencyService from '../services/competency.service';
import CompetencySearch from '../components/common/CompetencySearch';
import { parseMciCompetencyPdf } from '../utils/competencyPdfParser';
import { LearningUnit, LearningUnitType, LearningUnitStatus, DifficultyLevel, Competency } from '../types';
import {
  Search, Filter, BookOpen, Video, FileText, PlusCircle,
  ChevronLeft, ChevronRight, Eye, Edit2, Trash2, ToggleLeft, ToggleRight,
  Download, Upload, ImageIcon, Tags, X, Save, BookMarked, CheckCircle, AlertCircle,
} from 'lucide-react';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';
import { getAuthImageUrl } from '../utils/imageUrl';
import BookCover from '../components/BookCover';

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

  // Competency mapping modal state (book-level)
  const [competencyModalUnit, setCompetencyModalUnit] = useState<LearningUnit | null>(null);
  const [allCompetencies, setAllCompetencies] = useState<Competency[]>([]);
  const [competencyModalIds, setCompetencyModalIds] = useState<string[]>([]);
  const [competencySaving, setCompetencySaving] = useState(false);

  // Page-wise competency mapping modal state
  const [pageCompUnit, setPageCompUnit] = useState<LearningUnit | null>(null);
  const [pageCompParsed, setPageCompParsed] = useState<PageCompetencyEntry[]>([]);
  const [pageCompParsing, setPageCompParsing] = useState(false);
  const [pageCompSaving, setPageCompSaving] = useState(false);
  const [pageCompError, setPageCompError] = useState('');
  const [pageCompSuccess, setPageCompSuccess] = useState('');
  const pageCompFileRef = useRef<HTMLInputElement>(null);

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

  // Load all competencies once for the mapping modal
  useEffect(() => {
    competencyService.getAll({ limit: 5000 }).then(res => {
      const data = (res as any)?.data || (res as any)?.competencies || [];
      setAllCompetencies(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const openCompetencyModal = (unit: LearningUnit, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompetencyModalUnit(unit);
    setCompetencyModalIds(unit.competencyIds || []);
  };

  const saveCompetencyMapping = async () => {
    if (!competencyModalUnit) return;
    try {
      setCompetencySaving(true);
      await learningUnitService.update(competencyModalUnit.id, { competencyIds: competencyModalIds } as any);
      setCompetencyModalUnit(null);
      loadContent();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save competency mapping');
    } finally {
      setCompetencySaving(false);
    }
  };

  const openPageCompModal = (unit: LearningUnit, e: React.MouseEvent) => {
    e.stopPropagation();
    setPageCompUnit(unit);
    setPageCompParsed([]);
    setPageCompError('');
    setPageCompSuccess('');
  };

  const handlePageCompFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPageCompParsing(true);
    setPageCompError('');
    setPageCompParsed([]);
    try {
      const entries = await parseMciCompetencyPdf(file);
      if (entries.length === 0) setPageCompError('No competency rows detected. Check the PDF format.');
      else setPageCompParsed(entries);
    } catch (err: any) {
      setPageCompError('Failed to parse PDF: ' + (err?.message || 'unknown error'));
    } finally {
      setPageCompParsing(false);
      e.target.value = '';
    }
  };

  const savePageCompetencies = async () => {
    if (!pageCompUnit || pageCompParsed.length === 0) return;
    setPageCompSaving(true);
    setPageCompError('');
    try {
      const res = await learningUnitService.bulkUpsertPageCompetencies(pageCompUnit.id, pageCompParsed);
      setPageCompSuccess(`${res.inserted} page-competency mappings saved successfully.`);
      setPageCompParsed([]);
    } catch (err: any) {
      setPageCompError(err?.response?.data?.message || 'Failed to save mappings.');
    } finally {
      setPageCompSaving(false);
    }
  };

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

  // Use shared auth image URL helper
  const getImageUrl = getAuthImageUrl;

  return (
    <>
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
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Year</th>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {(unit as any).thumbnailUrl && getImageUrl((unit as any).thumbnailUrl) ? (
                          <div style={{
                            width: 36, height: 48, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                            border: '1px solid var(--bo-border)', background: '#1a1a2e',
                          }}>
                            <img src={getImageUrl((unit as any).thumbnailUrl)} alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        ) : (
                          <BookCover title={unit.title} type={unit.type} width={36} height={48} />
                        )}
                        <div style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unit.title}</div>
                      </div>
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
                      {(unit as any).academicYear ? (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#EDE9FE', color: '#6D28D9' }}>
                          {(unit as any).academicYear.replace('YEAR_', 'Y').replace('_MINOR', '-Min').replace('_MAJOR', '-Maj')}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#F59E0B' }}>Not set</span>
                      )}
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
                        <button title="Map Competencies (book-level)" className="bo-btn bo-btn-outline" style={{ padding: '4px 8px', fontSize: 12, color: '#6366F1' }}
                          onClick={(e) => openCompetencyModal(unit, e)}>
                          <Tags size={14} />
                        </button>
                        {(unit.type === 'BOOK' || (unit as any).fileFormat === 'pdf') && (
                          <button title="Map Page Competencies (MCI PDF)" className="bo-btn bo-btn-outline" style={{ padding: '4px 8px', fontSize: 12, color: '#0891B2' }}
                            onClick={(e) => openPageCompModal(unit, e)}>
                            <BookMarked size={14} />
                          </button>
                        )}
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

      {/* Competency Mapping Modal */}
      {competencyModalUnit && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={() => setCompetencyModalUnit(null)}>
          <div style={{
            background: 'var(--bo-card-bg, #fff)', borderRadius: 12, width: '100%', maxWidth: 680,
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--bo-border)',
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--bo-text)', margin: 0 }}>
                  Map Competencies
                </h3>
                <p style={{ fontSize: 12, color: 'var(--bo-text-muted)', margin: '2px 0 0' }}>
                  {competencyModalUnit.title}
                </p>
              </div>
              <button onClick={() => setCompetencyModalUnit(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              <CompetencySearch
                competencies={allCompetencies}
                selectedIds={competencyModalIds}
                onChange={setCompetencyModalIds}
                label={`Select Competencies (${competencyModalIds.length} selected)`}
                maxHeight="380px"
              />
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '12px 20px', borderTop: '1px solid var(--bo-border)',
            }}>
              <button className="bo-btn bo-btn-outline" onClick={() => setCompetencyModalUnit(null)}
                disabled={competencySaving}>
                Cancel
              </button>
              <button className="bo-btn bo-btn-primary" onClick={saveCompetencyMapping}
                disabled={competencySaving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} />
                {competencySaving ? 'Saving…' : 'Save Mapping'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page-wise Competency Mapping Modal */}
      {pageCompUnit && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1001,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setPageCompUnit(null)}>
          <div style={{
            background: '#fff', borderRadius: 12, width: '100%', maxWidth: 760,
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--bo-border)' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0891B2' }}>Map Page-wise Competencies</h3>
                <p style={{ fontSize: 12, color: 'var(--bo-text-muted)', margin: '2px 0 0' }}>{pageCompUnit.title}</p>
              </div>
              <button onClick={() => setPageCompUnit(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* Instructions */}
              <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#0369A1' }}>
                Upload the MCI syllabus PDF for this book. The system will extract the competency-to-page mapping table
                (Pages No. | Competency Code | Description) and store it per page. Students will see relevant
                competencies while reading.
              </div>

              {/* File Picker */}
              <input ref={pageCompFileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handlePageCompFile} />
              <button
                onClick={() => pageCompFileRef.current?.click()}
                disabled={pageCompParsing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                  borderRadius: 8, border: '2px dashed #0891B2', background: '#F0F9FF',
                  color: '#0891B2', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  marginBottom: 16, opacity: pageCompParsing ? 0.6 : 1,
                }}>
                <Upload size={16} />
                {pageCompParsing ? 'Parsing PDF…' : 'Choose MCI Syllabus PDF'}
              </button>

              {pageCompError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 12 }}>
                  <AlertCircle size={15} /> {pageCompError}
                </div>
              )}

              {pageCompSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#16A34A', fontSize: 13, marginBottom: 12 }}>
                  <CheckCircle size={15} /> {pageCompSuccess}
                </div>
              )}

              {/* Preview Table */}
              {pageCompParsed.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text)', marginBottom: 8 }}>
                    {pageCompParsed.length} entries detected — preview (first 20):
                  </div>
                  <div style={{ border: '1px solid var(--bo-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--bo-border)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', width: 90 }}>Pages</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', width: 90 }}>Code</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)' }}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageCompParsed.slice(0, 20).map((e, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--bo-border)' }}>
                            <td style={{ padding: '7px 12px', color: '#374151' }}>
                              {e.pageStart === e.pageEnd ? e.pageStart : `${e.pageStart}–${e.pageEnd}`}
                            </td>
                            <td style={{ padding: '7px 12px', fontWeight: 600, color: '#0891B2' }}>{e.competencyCode}</td>
                            <td style={{ padding: '7px 12px', color: '#374151' }}>{e.competencyDescription || '—'}</td>
                          </tr>
                        ))}
                        {pageCompParsed.length > 20 && (
                          <tr>
                            <td colSpan={3} style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--bo-text-muted)', fontSize: 12 }}>
                              … and {pageCompParsed.length - 20} more entries
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 20px', borderTop: '1px solid var(--bo-border)' }}>
              <button className="bo-btn bo-btn-outline" onClick={() => setPageCompUnit(null)} disabled={pageCompSaving}>
                Close
              </button>
              <button className="bo-btn bo-btn-primary"
                style={{ background: '#0891B2', borderColor: '#0891B2' }}
                onClick={savePageCompetencies}
                disabled={pageCompParsed.length === 0 || pageCompSaving}>
                <Save size={14} />
                {pageCompSaving ? 'Saving…' : `Save ${pageCompParsed.length > 0 ? `${pageCompParsed.length} ` : ''}Mappings`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContentListPage;
