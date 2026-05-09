import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { packagesService, PackageAssignment } from '../../services/packages.service';
import { useAuth } from '../../context/AuthContext';
import CollegeLayout from '../../components/college/CollegeLayout';
import { ArrowLeft, Package, Calendar, BookOpen, RefreshCw, Building, Eye, Search, X } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';
import { formatDate } from '../../utils/dateUtils';

const CollegePackages: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PackageAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [viewingPkg, setViewingPkg] = useState<PackageAssignment | null>(null);
  const [pkgContents, setPkgContents] = useState<any>(null);
  const [pkgContentsLoading, setPkgContentsLoading] = useState(false);
  const [contentSearch, setContentSearch] = useState('');

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    setLoading(true); setError(null);
    try {
      if (user?.collegeId) {
        const data = await packagesService.getCollegePackages(user.collegeId);
        setPackages(Array.isArray(data) ? data : []);
      }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load packages'); }
    finally { setLoading(false); }
  };

  const allSubjects = useMemo(() =>
    Array.from(new Set(packages.flatMap(p => p.package?.subjects || []))).sort()
  , [packages]);

  const filtered = useMemo(() => packages.filter(pa => {
    const matchSearch = !search || (pa.package?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || pa.status === statusFilter;
    const matchSubject = subjectFilter === 'ALL' || (pa.package?.subjects || []).includes(subjectFilter);
    return matchSearch && matchStatus && matchSubject;
  }), [packages, search, statusFilter, subjectFilter]);

  const openViewPkgModal = async (pa: PackageAssignment) => {
    setViewingPkg(pa);
    setPkgContents(null);
    setContentSearch('');
    if (!pa.packageId) return;
    setPkgContentsLoading(true);
    try {
      const data = await packagesService.getPackageContent(pa.packageId);
      setPkgContents(data);
    } catch {
      setPkgContents(null);
    } finally {
      setPkgContentsLoading(false);
    }
  };

  const closeViewPkgModal = () => { setViewingPkg(null); setPkgContents(null); setContentSearch(''); };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      ACTIVE: { bg: '#ECFDF5', color: '#059669' },
      INACTIVE: { bg: '#FEF3C7', color: '#D97706' },
      EXPIRED: { bg: '#FEF2F2', color: '#DC2626' },
      CANCELLED: { bg: '#F3F4F6', color: '#6B7280' },
    };
    const c = colors[status] || { bg: '#F3F4F6', color: '#6B7280' };
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>{status}</span>;
  };

  return (
    <CollegeLayout>
      <button
        onClick={() => navigate('/college-admin')}
        className="bo-btn bo-btn-outline"
        style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Content Packages</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>View assigned content packages from publishers</p>
        </div>
        <button className="bo-btn bo-btn-outline" onClick={fetchPackages}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {!loading && packages.length > 0 && (
        <div className="bo-filters" style={{ marginBottom: 16 }}>
          <div className="bo-search-bar" style={{ flex: 1, maxWidth: 320 }}>
            <Search size={15} className="bo-search-icon" />
            <input placeholder="Search packages…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="bo-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {allSubjects.length > 0 && (
            <select className="bo-filter-select" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
              <option value="ALL">All Subjects</option>
              {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{filtered.length} package{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {loading ? (
        <div className="page-loading-screen" style={{ padding: 60 }}>
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
          <div className="loading-title">Loading Packages</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      ) : packages.length === 0 ? (
        <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No Packages Assigned</div>
          <div style={{ color: 'var(--bo-text-muted)', fontSize: 13 }}>Contact your Bitflow administrator to get content packages</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bo-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--bo-text-muted)' }}>No packages match the current filters.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(pa => (
            <div key={pa.id} className="bo-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{pa.package?.name || 'Unnamed Package'}</div>
                  {pa.package?.publisher && (
                    <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building size={12} /> {pa.package.publisher.name}
                    </div>
                  )}
                </div>
                {statusBadge(pa.status)}
              </div>

              {pa.package?.description && (
                <p style={{ fontSize: 12, color: 'var(--bo-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>{pa.package.description}</p>
              )}

              {/* Subjects */}
              {pa.package?.subjects && pa.package.subjects.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Subjects</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {pa.package.subjects.map((s, i) => (
                      <span key={i} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: '#ECFDF5', color: '#059669' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Types */}
              {pa.package?.contentTypes && pa.package.contentTypes.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Content Types</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {pa.package.contentTypes.map((ct, i) => (
                      <span key={i} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: '#EFF6FF', color: '#2563EB' }}>
                        {ct}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 10, borderRadius: 8, background: 'var(--bo-bg)', border: '1px solid var(--bo-border)' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>Start Date</div>
                  <div style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Calendar size={12} /> {formatDate(pa.startDate)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>End Date</div>
                  <div style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Calendar size={12} /> {pa.endDate ? formatDate(pa.endDate) : 'No end date'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="bo-btn bo-btn-outline" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => openViewPkgModal(pa)}>
                  <Eye size={13} /> View Contents
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contents Modal */}
      {viewingPkg && (
        <div className="bo-modal-overlay" onClick={closeViewPkgModal}>
          <div className="bo-modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
            <div className="bo-modal-header">
              <h3 className="bo-modal-title">{viewingPkg.package?.name || 'Package'} — Contents</h3>
              <button className="bo-modal-close" onClick={closeViewPkgModal}><X size={20} /></button>
            </div>
            <div className="bo-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Package meta strip */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--bo-bg)', border: '1px solid var(--bo-border)', fontSize: 12 }}>
                {viewingPkg.package?.publisher && <span><Building size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{viewingPkg.package.publisher.name}</span>}
                {statusBadge(viewingPkg.status)}
                {pkgContents && <span style={{ color: 'var(--bo-text-muted)' }}>{pkgContents.total} item{pkgContents.total !== 1 ? 's' : ''}</span>}
              </div>

              {pkgContentsLoading && (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--bo-text-muted)', fontSize: 13 }}>Loading contents…</div>
              )}

              {!pkgContentsLoading && pkgContents && (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <div className="bo-search-bar">
                      <Search size={14} className="bo-search-icon" />
                      <input placeholder="Search by title or subject…" value={contentSearch} onChange={e => setContentSearch(e.target.value)} />
                    </div>
                  </div>
                  {(() => {
                    const units = pkgContents.learningUnits.filter((u: any) => {
                      const q = contentSearch.toLowerCase();
                      return !q || u.title.toLowerCase().includes(q) || (u.subject || '').toLowerCase().includes(q);
                    });
                    if (units.length === 0) return <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--bo-text-muted)' }}>No matching content found.</div>;
                    return (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="bo-table" style={{ width: '100%', fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th>Title</th>
                              <th>Subject</th>
                              <th>Topic</th>
                              <th>Duration</th>
                              <th>Difficulty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {units.map((u: any) => (
                              <tr key={u.id}>
                                <td><span className="bo-badge bo-badge-default" style={{ fontSize: 11 }}>{u.type}</span></td>
                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.title}>{u.title}</td>
                                <td>{u.subject || '—'}</td>
                                <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.topic || ''}>{u.topic || '—'}</td>
                                <td>{u.estimatedDuration ? `${u.estimatedDuration} min` : '—'}</td>
                                <td>{u.difficultyLevel || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </>
              )}

              {!pkgContentsLoading && !pkgContents && (
                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--bo-text-muted)' }}>Unable to load contents.</div>
              )}
            </div>
            <div className="bo-modal-footer">
              <button className="bo-btn bo-btn-secondary" onClick={closeViewPkgModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </CollegeLayout>
  );
};

export default CollegePackages;
