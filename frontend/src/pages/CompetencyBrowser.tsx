import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, Search, ChevronDown, ChevronRight } from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

interface Competency {
  id: string;
  code: string;
  description: string;
  subject?: string;
  domain?: string;
  level?: string;
  teachingHours?: number;
  mustKnow?: boolean;
  niceToKnow?: boolean;
  canElicit?: boolean;
}

interface CompetencyStats {
  total: number;
  bySubject?: Record<string, number>;
  byDomain?: Record<string, number>;
}

const CompetencyBrowser: React.FC = () => {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [stats, setStats] = useState<CompetencyStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 25;

  useEffect(() => {
    fetchSubjects();
    fetchStats();
  }, []);

  const fetchCompetencies = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (searchTerm) params.search = searchTerm;
      if (selectedSubject) params.subject = selectedSubject;
      if (selectedDomain) params.domain = selectedDomain;
      const res = await apiService.get('/competencies', { params });
      const raw = res.data;
      if (raw?.data && raw?.meta) {
        // API returns {data: [...], meta: {total, page, limit, totalPages}}
        setCompetencies(raw.data);
        setTotalCount(raw.meta.total || raw.data.length);
        setTotalPages(raw.meta.totalPages || Math.ceil((raw.meta.total || raw.data.length) / limit));
      } else if (raw?.competencies) {
        setCompetencies(raw.competencies);
        setTotalCount(raw.total || raw.competencies.length);
        setTotalPages(raw.totalPages || 1);
      } else if (Array.isArray(raw)) {
        setCompetencies(raw);
        setTotalCount(raw.length);
        setTotalPages(1);
      } else {
        setCompetencies([]);
      }
    } catch (err) {
      console.error('Error fetching competencies:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedSubject, selectedDomain]);

  useEffect(() => { fetchCompetencies(); }, [fetchCompetencies]);

  const fetchSubjects = async () => {
    try {
      const res = await apiService.get('/competencies/subjects');
      const raw = res.data?.subjects || res.data || [];
      const subs = Array.isArray(raw)
        ? raw.map((s: any) => (typeof s === 'string' ? s : s?.subject || '')).filter(Boolean)
        : [];
      setSubjects(subs);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiService.get('/competencies/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSearch = () => {
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSubject('');
    setSelectedDomain('');
    setPage(1);
  };

  const domains = Array.from(new Set(competencies.map(c => c.domain).filter(Boolean))) as string[];

  return (
    <MainLayout>
      <div className="bo-page">
        <div className="bo-page-header">
          <div>
            <h1 className="bo-page-title">Competencies</h1>
            <p className="bo-page-subtitle">Browse MCI/NMC medical competencies</p>
          </div>
          {stats && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="bo-stat-card" style={{ minWidth: 120, padding: '12px 16px' }}>
                <div className="bo-stat-value" style={{ fontSize: 22 }}>{stats.total?.toLocaleString()}</div>
                <div className="bo-stat-label">Total Competencies</div>
              </div>
              <div className="bo-stat-card" style={{ minWidth: 120, padding: '12px 16px' }}>
                <div className="bo-stat-value" style={{ fontSize: 22 }}>{subjects.length}</div>
                <div className="bo-stat-label">Subjects</div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bo-filters" style={{ flexWrap: 'wrap' }}>
          <div className="bo-search-bar" style={{ flex: 1, minWidth: 240, maxWidth: 400 }}>
            <Search size={16} className="bo-search-icon" />
            <input
              placeholder="Search by code or description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <select className="bo-filter-select" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setPage(1); }}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {domains.length > 0 && (
            <select className="bo-filter-select" value={selectedDomain} onChange={e => { setSelectedDomain(e.target.value); setPage(1); }}>
              <option value="">All Domains</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          {(searchTerm || selectedSubject || selectedDomain) && (
            <button className="bo-btn bo-btn-ghost bo-btn-sm" onClick={clearFilters}>Clear Filters</button>
          )}
          <span style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginLeft: 'auto' }}>{totalCount} competencies found</span>
        </div>

        {/* Competencies List */}
        <div className="bo-card">
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
              <div className="loading-title">Loading Competencies</div>
              <div className="loading-bar-track">
                <div className="loading-bar-fill"></div>
              </div>
            </div>
          ) : competencies.length === 0 ? (
            <div className="bo-empty">
              <BookOpen size={44} className="bo-empty-icon" />
              <h3>No Competencies Found</h3>
              <p>{searchTerm || selectedSubject ? 'Try different search terms or filters' : 'No competencies loaded in the system'}</p>
            </div>
          ) : (
            <>
              <div className="bo-table-wrap">
                <table className="bo-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th style={{ width: 130 }}>Code</th>
                      <th>Description</th>
                      <th>Subject</th>
                      <th>Domain</th>
                      <th>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competencies.map(comp => (
                      <React.Fragment key={comp.id}>
                        <tr
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                        >
                          <td>
                            {expandedId === comp.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--bo-accent)', fontSize: 13 }}>
                              {comp.code}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>{comp.description}</td>
                          <td>
                            {comp.subject && (
                              <span className="bo-badge bo-badge-info">{comp.subject}</span>
                            )}
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{comp.domain || '—'}</td>
                          <td>
                            {comp.level && (
                              <span className={`bo-badge ${comp.level === 'K' ? 'bo-badge-default' : comp.level === 'KH' ? 'bo-badge-warning' : 'bo-badge-success'}`}>
                                {comp.level}
                              </span>
                            )}
                          </td>
                        </tr>
                        {expandedId === comp.id && (
                          <tr>
                            <td colSpan={6} style={{ padding: 0 }}>
                              <div style={{ padding: '16px 24px', background: 'var(--bo-bg)', borderTop: '1px solid var(--bo-border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                                  <div>
                                    <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Full Description</div>
                                    <div style={{ fontSize: 14 }}>{comp.description}</div>
                                  </div>
                                  {comp.teachingHours != null && (
                                    <div>
                                      <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Teaching Hours</div>
                                      <div style={{ fontSize: 14 }}>{comp.teachingHours} hours</div>
                                    </div>
                                  )}
                                  <div>
                                    <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Classification</div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                      {comp.mustKnow && <span className="bo-badge bo-badge-danger">Must Know</span>}
                                      {comp.niceToKnow && <span className="bo-badge bo-badge-info">Nice to Know</span>}
                                      {comp.canElicit && <span className="bo-badge bo-badge-success">Can Elicit</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid var(--bo-border)' }}>
                  <button className="bo-btn bo-btn-ghost bo-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                  <span style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>Page {page} of {totalPages}</span>
                  <button className="bo-btn bo-btn-ghost bo-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CompetencyBrowser;
