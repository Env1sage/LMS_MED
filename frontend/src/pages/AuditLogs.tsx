import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Search, Clock, Filter, X, Users, Building2, GraduationCap, BookOpen, ChevronDown, RefreshCw } from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import '../styles/bitflow-owner.css';

interface AuditLog {
  id: string;
  action: string;
  entity?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  collegeName?: string;
  publisherName?: string;
  details?: string;
  description?: string;
  ipAddress?: string;
  createdAt?: string;
  timestamp?: string;
  type?: string;
}

// ── Action categories for filter dropdown ──
const ACTION_CATEGORIES: Record<string, { label: string; color: string; actions: string[] }> = {
  AUTH: {
    label: 'Authentication',
    color: '#6366F1',
    actions: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_EXPIRED', 'TOKEN_REFRESHED', 'PASSWORD_CHANGED'],
  },
  USER: {
    label: 'User Management',
    color: '#3B82F6',
    actions: ['USER_CREATED', 'USER_UPDATED', 'USER_SUSPENDED', 'USER_ACTIVATED'],
  },
  COLLEGE: {
    label: 'College Activity',
    color: '#10B981',
    actions: ['COLLEGE_CREATED', 'COLLEGE_UPDATED', 'COLLEGE_SUSPENDED', 'COLLEGE_ACTIVATED'],
  },
  PUBLISHER: {
    label: 'Publisher Activity',
    color: '#F59E0B',
    actions: ['PUBLISHER_CREATED', 'PUBLISHER_UPDATED', 'PUBLISHER_SUSPENDED', 'PUBLISHER_ACTIVATED'],
  },
  STUDENT: {
    label: 'Student Activity',
    color: '#EC4899',
    actions: ['STUDENT_CREATED', 'STUDENT_UPDATED', 'STUDENT_ACTIVATED', 'STUDENT_DEACTIVATED', 'STUDENT_PROMOTED', 'STUDENT_BULK_PROMOTED', 'STUDENT_BULK_CREATED', 'STUDENT_CREDENTIALS_RESET'],
  },
  CONTENT: {
    label: 'Content & Learning',
    color: '#8B5CF6',
    actions: ['CONTENT_ACCESSED', 'CONTENT_COMPLETED', 'CONTENT_ACTIVATED', 'CONTENT_DEACTIVATED', 'CONTENT_SUSPENDED', 'LEARNING_UNIT_CREATED', 'LEARNING_UNIT_UPDATED', 'LEARNING_UNIT_ACTIVATED', 'LEARNING_UNIT_SUSPENDED', 'LEARNING_UNIT_ACCESSED'],
  },
  COURSE: {
    label: 'Course Activity',
    color: '#14B8A6',
    actions: ['COURSE_CREATED', 'COURSE_UPDATED', 'COURSE_PUBLISHED', 'COURSE_ASSIGNED'],
  },
  PACKAGE: {
    label: 'Package Activity',
    color: '#F97316',
    actions: ['PACKAGE_CREATED', 'PACKAGE_UPDATED', 'PACKAGE_DEACTIVATED', 'PACKAGE_ASSIGNED', 'PACKAGE_ASSIGNMENT_UPDATED', 'PACKAGE_ASSIGNMENT_CANCELLED'],
  },
  SECURITY: {
    label: 'Security Events',
    color: '#EF4444',
    actions: ['UNAUTHORIZED_ACCESS', 'INVALID_TOKEN', 'SECURITY_VIOLATION', 'SECURITY_VIOLATION_DETECTED', 'CONCURRENT_SESSION_LIMIT', 'ROLE_BOUNDARY_VIOLATION', 'CROSS_TENANT_ACCESS_ATTEMPT', 'PERMISSION_DENIED', 'DATA_ISOLATION_BREACH_ATTEMPT', 'BLOCKED_ACCESS', 'BLOCKED_ACCESS_ATTEMPT'],
  },
  DEPARTMENT: {
    label: 'Department & Faculty',
    color: '#0EA5E9',
    actions: ['DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'DEPARTMENT_DEACTIVATED', 'HOD_ASSIGNED', 'HOD_REMOVED', 'FACULTY_PERMISSION_CREATED', 'FACULTY_PERMISSION_UPDATED', 'FACULTY_ASSIGNED_TO_DEPARTMENT', 'FACULTY_REMOVED_FROM_DEPARTMENT', 'FACULTY_PERMISSIONS_CHANGED'],
  },
  COMPETENCY: {
    label: 'Competency & Topics',
    color: '#A855F7',
    actions: ['COMPETENCY_CREATED', 'COMPETENCY_REVIEWED', 'COMPETENCY_ACTIVATED', 'COMPETENCY_DEPRECATED', 'TOPIC_CREATED', 'TOPIC_UPDATED', 'TOPIC_DEACTIVATED', 'TOPICS_BULK_IMPORTED'],
  },
};

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'BITFLOW_OWNER', label: 'Admin (Owner)' },
  { value: 'PUBLISHER_ADMIN', label: 'Publisher' },
  { value: 'COLLEGE_ADMIN', label: 'College Admin' },
  { value: 'COLLEGE_DEAN', label: 'Dean' },
  { value: 'COLLEGE_HOD', label: 'HOD' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'STUDENT', label: 'Student' },
];

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionCategory, setActionCategory] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [actionCategory !== 'ALL', roleFilter, dateFrom, dateTo].filter(Boolean).length;

  useEffect(() => { fetchLogs(); }, [page, actionCategory, roleFilter, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 30 };

      // If a category is selected, send the first matching action, or send all actions for server-side filtering
      if (actionCategory !== 'ALL') {
        const cat = ACTION_CATEGORIES[actionCategory];
        if (cat) {
          // Send the first action as the filter — the backend accepts a single AuditAction
          // We'll filter client-side for the full category
          params.action = cat.actions[0];
        }
      }

      if (roleFilter) params.userRole = roleFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      if (searchTerm) params.search = searchTerm;

      const res = await apiService.get('/bitflow-owner/audit-logs', { params });
      const data = res.data;
      if (data?.logs) {
        setLogs(data.logs);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || data.logs.length);
      } else if (Array.isArray(data)) {
        setLogs(data);
        setTotalPages(1);
        setTotalCount(data.length);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, actionCategory, roleFilter, dateFrom, dateTo, searchTerm]);

  const getActionColor = (action: string) => {
    const a = action?.toUpperCase() || '';
    for (const [, cat] of Object.entries(ACTION_CATEGORIES)) {
      if (cat.actions.includes(a)) return cat.color;
    }
    return '#6B7280';
  };

  const formatAction = (action: string) => {
    return (action || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).toLowerCase().replace(/^\w/, c => c.toUpperCase());
  };

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    const map: Record<string, { label: string; bg: string; color: string }> = {
      BITFLOW_OWNER: { label: 'Admin', bg: '#EEF2FF', color: '#4F46E5' },
      PUBLISHER_ADMIN: { label: 'Publisher', bg: '#FEF3C7', color: '#D97706' },
      COLLEGE_ADMIN: { label: 'College', bg: '#D1FAE5', color: '#059669' },
      COLLEGE_DEAN: { label: 'Dean', bg: '#DBEAFE', color: '#2563EB' },
      COLLEGE_HOD: { label: 'HOD', bg: '#E0E7FF', color: '#4338CA' },
      FACULTY: { label: 'Faculty', bg: '#FCE7F3', color: '#DB2777' },
      STUDENT: { label: 'Student', bg: '#FEE2E2', color: '#DC2626' },
    };
    const r = map[role] || { label: role, bg: '#F3F4F6', color: '#6B7280' };
    return (
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: r.bg, color: r.color, letterSpacing: 0.3 }}>
        {r.label}
      </span>
    );
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'Invalid Date';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return 'Invalid Date';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let relative = '';
      if (diffMins < 1) relative = 'Just now';
      else if (diffMins < 60) relative = `${diffMins}m ago`;
      else if (diffHours < 24) relative = `${diffHours}h ago`;
      else if (diffDays < 7) relative = `${diffDays}d ago`;
      else relative = d.toLocaleDateString();

      return relative;
    } catch { return 'Invalid Date'; }
  };

  const formatFullTimestamp = (ts?: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return ''; }
  };

  const filtered = logs.filter(log => {
    // Client-side category filter for full category matching
    if (actionCategory !== 'ALL') {
      const cat = ACTION_CATEGORIES[actionCategory];
      if (cat && !cat.actions.includes(log.action?.toUpperCase())) return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (log.action?.toLowerCase().includes(term)) ||
      (log.userEmail?.toLowerCase().includes(term)) ||
      (log.userName?.toLowerCase().includes(term)) ||
      (log.entity?.toLowerCase().includes(term)) ||
      (log.entityType?.toLowerCase().includes(term)) ||
      (log.description?.toLowerCase().includes(term)) ||
      (log.details?.toLowerCase().includes(term)) ||
      (log.collegeName?.toLowerCase().includes(term)) ||
      (log.publisherName?.toLowerCase().includes(term));
  });

  const clearFilters = () => {
    setActionCategory('ALL');
    setRoleFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setPage(1);
  };

  return (
    <MainLayout loading={loading} loadingMessage="Loading Activity Logs">
      <div className="bo-page">
        {/* Header */}
        <div className="bo-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="bo-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={24} style={{ color: 'var(--bo-primary)' }} />
              Activity Logs
            </h1>
            <p className="bo-page-subtitle">Track all system activities, user actions, and security events</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="bo-btn bo-btn-ghost bo-btn-sm" onClick={() => { setPage(1); fetchLogs(); }} title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Search + Filter Toggle */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="bo-search-bar" style={{ flex: 1, minWidth: 220, maxWidth: 400 }}>
            <Search size={16} className="bo-search-icon" />
            <input
              placeholder="Search by user, action, description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchLogs()}
            />
          </div>

          <button
            className="bo-btn bo-btn-ghost bo-btn-sm"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              border: activeFilterCount > 0 ? '1.5px solid var(--bo-primary)' : '1px solid var(--bo-border)',
              background: activeFilterCount > 0 ? 'var(--bo-primary-light)' : 'transparent',
              color: activeFilterCount > 0 ? 'var(--bo-primary)' : 'var(--bo-text-secondary)',
              borderRadius: 8, fontWeight: 500, fontSize: 13,
            }}
          >
            <Filter size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span style={{ background: 'var(--bo-primary)', color: '#fff', borderRadius: 99, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={13} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>

          {activeFilterCount > 0 && (
            <button className="bo-btn bo-btn-ghost bo-btn-sm" onClick={clearFilters} style={{ color: 'var(--bo-danger)', fontSize: 12, gap: 4, display: 'flex', alignItems: 'center' }}>
              <X size={13} /> Clear all
            </button>
          )}

          <span style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginLeft: 'auto' }}>
            {totalCount.toLocaleString()} total records
          </span>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <div style={{
            background: 'var(--bo-card-bg)', border: '1px solid var(--bo-border)', borderRadius: 12,
            padding: 20, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16,
            animation: 'lsFadeIn 0.2s ease',
          }}>
            {/* Activity Category */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Activity Category</label>
              <select
                className="bo-filter-select"
                value={actionCategory}
                onChange={e => { setActionCategory(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8 }}
              >
                <option value="ALL">All Activities</option>
                {Object.entries(ACTION_CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>User Role</label>
              <select
                className="bo-filter-select"
                value={roleFilter}
                onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8 }}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>From Date</label>
              <input
                className="bo-form-input"
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8 }}
              />
            </div>

            {/* Date To */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>To Date</label>
              <input
                className="bo-form-input"
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8 }}
              />
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {actionCategory !== 'ALL' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px 4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: '#EEF2FF', color: '#4338CA' }}>
                {ACTION_CATEGORIES[actionCategory]?.label}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setActionCategory('ALL'); setPage(1); }} />
              </span>
            )}
            {roleFilter && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px 4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: '#FEF3C7', color: '#92400E' }}>
                {ROLE_OPTIONS.find(r => r.value === roleFilter)?.label}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setRoleFilter(''); setPage(1); }} />
              </span>
            )}
            {dateFrom && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px 4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: '#ECFDF5', color: '#065F46' }}>
                From: {dateFrom}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setDateFrom(''); setPage(1); }} />
              </span>
            )}
            {dateTo && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px 4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: '#ECFDF5', color: '#065F46' }}>
                To: {dateTo}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setDateTo(''); setPage(1); }} />
              </span>
            )}
          </div>
        )}

        {/* Logs Table */}
        <div className="bo-card" style={{ overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div className="bo-empty" style={{ padding: '60px 20px' }}>
              <Activity size={44} className="bo-empty-icon" style={{ color: 'var(--bo-primary)', opacity: 0.4 }} />
              <h3 style={{ marginTop: 14 }}>No Activity Found</h3>
              <p style={{ color: 'var(--bo-text-muted)' }}>{searchTerm || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'System activity will appear here'}</p>
            </div>
          ) : (
            <>
              <div className="bo-table-wrap">
                <table className="bo-table">
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>When</th>
                      <th style={{ width: 200 }}>Activity</th>
                      <th>User</th>
                      <th style={{ width: 120 }}>Role</th>
                      <th>Scope</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(log => {
                      const ts = log.timestamp || log.createdAt;
                      const actionColor = getActionColor(log.action);
                      return (
                        <tr key={log.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--bo-text-primary)' }}>
                                {formatTimestamp(ts)}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>
                                {formatFullTimestamp(ts)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: actionColor, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bo-text-primary)', letterSpacing: 0.2 }}>
                                {formatAction(log.action)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13 }}>{log.userName || log.userEmail || '—'}</div>
                            {log.userName && log.userEmail && (
                              <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{log.userEmail}</div>
                            )}
                          </td>
                          <td>
                            {getRoleBadge(log.userRole)}
                          </td>
                          <td>
                            <div style={{ fontSize: 12, color: 'var(--bo-text-secondary)' }}>
                              {log.collegeName && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={11} /> {log.collegeName}</div>}
                              {log.publisherName && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BookOpen size={11} /> {log.publisherName}</div>}
                              {!log.collegeName && !log.publisherName && (
                                <span style={{ color: 'var(--bo-text-muted)' }}>{log.entityType || log.entity || '—'}</span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--bo-text-secondary)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={log.description || log.details || ''}
                          >
                            {log.description || log.details || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 16px', borderTop: '1px solid var(--bo-border)' }}>
                  <button className="bo-btn bo-btn-ghost bo-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
                  <span style={{ fontSize: 13, color: 'var(--bo-text-secondary)', fontWeight: 500 }}>Page {page} of {totalPages}</span>
                  <button className="bo-btn bo-btn-ghost bo-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AuditLogs;
