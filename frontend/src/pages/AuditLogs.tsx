import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Search, Clock, Filter, X, Users, Building2, GraduationCap, BookOpen, ChevronDown, RefreshCw, BarChart3, FileSpreadsheet, AlertTriangle } from 'lucide-react';
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
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [showWeekly, setShowWeekly] = useState(false);
  const [exportingWeekly, setExportingWeekly] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportPreviewData, setExportPreviewData] = useState<{ headers: string[]; rows: any[] } | null>(null);

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

  const fetchWeeklySummary = async () => {
    try {
      setLoading(true);
      const endDate = dateTo || new Date().toISOString().split('T')[0];
      const startDate = dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const res = await apiService.get(`/bitflow-owner/analytics/weekly-summary?startDate=${startDate}&endDate=${endDate}`);
      setWeeklyData(res.data);
      setShowWeekly(true);
    } catch (err) {
      console.error('Error fetching weekly summary:', err);
      alert('Failed to load weekly summary');
    } finally {
      setLoading(false);
    }
  };

  const exportWeeklySummary = async () => {
    try {
      setExportingWeekly(true);
      const endDate = dateTo || new Date().toISOString().split('T')[0];
      const startDate = dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const res = await apiService.get(`/bitflow-owner/analytics/export/weekly-activity?startDate=${startDate}&endDate=${endDate}`);
      const data = res.data;

      // Create CSV content
      let csvContent = `Weekly Activity Report (${startDate} to ${endDate})\n\n`;
      
      csvContent += 'USER ACTIVITY\n';
      csvContent += `Total Logins,${data.userActivity?.totalLogins || 0}\n`;
      csvContent += `Unique Users,${data.userActivity?.uniqueUsers || 0}\n`;
      csvContent += `New Users,${data.userActivity?.newUsers || 0}\n\n`;
      
      csvContent += 'CONTENT ACTIVITY\n';
      csvContent += `Content Accessed,${data.contentActivity?.contentAccessed || 0}\n`;
      csvContent += `Courses Started,${data.contentActivity?.coursesStarted || 0}\n`;
      csvContent += `Courses Completed,${data.contentActivity?.coursesCompleted || 0}\n`;
      csvContent += `Tests Attempted,${data.contentActivity?.testsAttempted || 0}\n`;
      csvContent += `Practice Sessions,${data.contentActivity?.practiceSessionsCompleted || 0}\n\n`;
      
      csvContent += 'SECURITY EVENTS\n';
      csvContent += `Failed Logins,${data.securityEvents?.failedLoginAttempts || 0}\n`;
      csvContent += `Suspicious Activities,${data.securityEvents?.suspiciousActivities || 0}\n`;
      csvContent += `Blocked Access,${data.securityEvents?.blockedAccessAttempts || 0}\n\n`;
      
      if (data.topActiveColleges && data.topActiveColleges.length > 0) {
        csvContent += 'TOP ACTIVE COLLEGES\n';
        csvContent += 'College Name,Content Accessed\n';
        data.topActiveColleges.forEach((c: any) => {
          csvContent += `${c.collegeName},${c.contentAccessed}\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `weekly_activity_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export weekly report');
    } finally {
      setExportingWeekly(false);
    }
  };

  const handleExportLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch ALL logs with current filters (no pagination limit)
      const params: any = { limit: 100000 }; // Get all logs for export

      if (actionCategory !== 'ALL') {
        const cat = ACTION_CATEGORIES[actionCategory];
        if (cat) {
          params.action = cat.actions[0];
        }
      }

      if (roleFilter) params.userRole = roleFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      if (searchTerm) params.search = searchTerm;

      console.log('Fetching logs for export with params:', params);
      const res = await apiService.get('/bitflow-owner/audit-logs', { params });
      const allLogs = res.data?.logs || res.data || [];
      console.log('Fetched logs count:', allLogs.length);
      
      // Client-side category filter for full category matching
      const filteredForExport = allLogs.filter((log: AuditLog) => {
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
      
      console.log('Filtered logs count:', filteredForExport.length);
      
      if (filteredForExport.length === 0) {
        alert('No logs found matching the current filters.');
        return;
      }
      
      // Prepare export data from ALL filtered logs
      const headers = ['Timestamp', 'Action', 'User', 'Email', 'Role', 'College/Publisher', 'Entity Type', 'Entity', 'IP Address', 'Details'];
      const rows = filteredForExport.map((log: AuditLog) => [
        formatFullTimestamp(log.createdAt || log.timestamp),
        formatAction(log.action || ''),
        log.userName || 'Unknown',
        log.userEmail || 'N/A',
        log.userRole || 'N/A',
        log.collegeName || log.publisherName || 'N/A',
        log.entityType || 'N/A',
        log.entity || 'N/A',
        log.ipAddress || 'N/A',
        log.description || log.details || 'N/A'
      ]);

      console.log('Prepared export data with rows:', rows.length);
      setExportPreviewData({ headers, rows });
      setShowExportPreview(true);
    } catch (err: any) {
      console.error('Export error:', err);
      alert(`Failed to prepare export data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmExportLogs = () => {
    if (!exportPreviewData) return;

    const csvContent = [
      exportPreviewData.headers.join(','),
      ...exportPreviewData.rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const filterSuffix = actionCategory !== 'ALL' ? `_${actionCategory}` : roleFilter ? `_${roleFilter}` : '';
    const dateRange = dateFrom && dateTo ? `_${dateFrom}_to_${dateTo}` : '';
    link.download = `activity_logs${filterSuffix}${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowExportPreview(false);
    setExportPreviewData(null);
  };

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
            <button className="bo-btn bo-btn-secondary bo-btn-sm" onClick={fetchWeeklySummary} title="View Weekly Summary">
              <BarChart3 size={15} /> Weekly Summary
            </button>
            <button 
              className="bo-btn bo-btn-primary bo-btn-sm" 
              onClick={handleExportLogs}
              title="Export Filtered Logs"
              disabled={loading}
            >
              <FileSpreadsheet size={15} /> Export Logs
            </button>
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

        {/* Weekly Summary Modal */}
        {showWeekly && weeklyData && (
          <div className="bo-modal-overlay" onClick={() => setShowWeekly(false)}>
            <div className="bo-modal" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title">Weekly Activity Summary</h3>
                <button className="bo-modal-close" onClick={() => setShowWeekly(false)}><X size={20} /></button>
              </div>
              <div className="bo-modal-body">
                <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 20 }}>
                  {weeklyData.weekStartDate} to {weeklyData.weekEndDate}
                </div>

                {/* User Activity */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>User Activity</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div className="bo-card" style={{ padding: '16px', background: '#EEF2FF' }}>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Total Logins</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#6366F1' }}>{weeklyData.userActivity?.totalLogins || 0}</div>
                    </div>
                    <div className="bo-card" style={{ padding: '16px', background: '#F0FDF4' }}>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Unique Users</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>{weeklyData.userActivity?.uniqueUsers || 0}</div>
                    </div>
                    <div className="bo-card" style={{ padding: '16px', background: '#FEF3C7' }}>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>New Users</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{weeklyData.userActivity?.newUsers || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Content Activity */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Content Activity</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                    <div className="bo-card" style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Content Accessed</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{weeklyData.contentActivity?.contentAccessed || 0}</div>
                    </div>
                    <div className="bo-card" style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Courses Started</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{weeklyData.contentActivity?.coursesStarted || 0}</div>
                    </div>
                    <div className="bo-card" style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Completed</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{weeklyData.contentActivity?.coursesCompleted || 0}</div>
                    </div>
                    <div className="bo-card" style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Tests Attempted</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{weeklyData.contentActivity?.testsAttempted || 0}</div>
                    </div>
                    <div className="bo-card" style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Practice Sessions</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{weeklyData.contentActivity?.practiceSessionsCompleted || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Security Events */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Security Events</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div className="bo-card" style={{ padding: '16px', background: '#FEE2E2' }}>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Failed Logins</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626' }}>{weeklyData.securityEvents?.failedLoginAttempts || 0}</div>
                    </div>
                    <div className="bo-card" style={{ padding: '16px', background: '#FEF2F2' }}>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Suspicious Activities</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#EF4444' }}>{weeklyData.securityEvents?.suspiciousActivities || 0}</div>
                    </div>
                    <div className="bo-card" style={{ padding: '16px', background: '#FEE2E2' }}>
                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Blocked Access</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626' }}>{weeklyData.securityEvents?.blockedAccessAttempts || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Top Active Colleges */}
                {weeklyData.topActiveColleges && weeklyData.topActiveColleges.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Top Active Colleges</h4>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {weeklyData.topActiveColleges.map((college: any, i: number) => (
                        <div key={i} className="bo-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{college.collegeName}</span>
                          <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{college.contentAccessed} activities</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="bo-modal-footer">
                <button className="bo-btn bo-btn-primary" onClick={exportWeeklySummary} disabled={exportingWeekly}>
                  {exportingWeekly ? <><div className="bo-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Exporting...</> : <><FileSpreadsheet size={15} /> Export CSV</>}
                </button>
                <button className="bo-btn bo-btn-secondary" onClick={() => setShowWeekly(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Export Preview Modal */}
        {showExportPreview && exportPreviewData && (
          <div className="bo-modal-backdrop" onClick={() => setShowExportPreview(false)}>
            <div className="bo-modal" style={{ maxWidth: 1200, width: '95%' }} onClick={(e) => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Export Preview - Activity Logs</h2>
                <button className="bo-btn bo-btn-ghost bo-btn-icon" onClick={() => setShowExportPreview(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="bo-modal-body" style={{ padding: 20 }}>
                <div style={{ marginBottom: 16, padding: 12, background: '#FEF3C7', borderRadius: 8, border: '1px solid #FCD34D' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <Activity size={16} style={{ color: '#F59E0B' }} />
                    <span style={{ fontWeight: 500 }}>
                      Ready to export {exportPreviewData.rows.length} activity logs
                      {actionCategory !== 'ALL' && ` • Category: ${ACTION_CATEGORIES[actionCategory]?.label}`}
                      {roleFilter && ` • Role: ${roleFilter}`}
                      {dateFrom && dateTo && ` • Date Range: ${dateFrom} to ${dateTo}`}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 13, marginBottom: 12, color: 'var(--bo-text-muted)' }}>
                  Showing first 10 records as preview. All {exportPreviewData.rows.length} records will be exported.
                </div>

                <div style={{ overflow: 'auto', maxHeight: '50vh', border: '1px solid var(--bo-border)', borderRadius: 8 }}>
                  <table className="bo-table" style={{ fontSize: 11 }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bo-bg)', zIndex: 1 }}>
                      <tr>
                        {exportPreviewData.headers.map((h, i) => (
                          <th key={i} style={{ fontSize: 11, padding: 8, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {exportPreviewData.rows.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell: any, j: number) => (
                            <td key={j} style={{ fontSize: 10, padding: 6, whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bo-modal-footer">
                <button className="bo-btn bo-btn-primary" onClick={confirmExportLogs}>
                  <FileSpreadsheet size={15} /> Download CSV ({exportPreviewData.rows.length} records)
                </button>
                <button className="bo-btn bo-btn-secondary" onClick={() => setShowExportPreview(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AuditLogs;
