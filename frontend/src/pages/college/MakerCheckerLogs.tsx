import React, { useEffect, useState, useCallback } from 'react';
import CollegeLayout from '../../components/college/CollegeLayout';
import { courseService } from '../../services/course.service';
import {
  ClipboardList, CheckCircle, XCircle, Clock, Filter,
  RefreshCw, ChevronDown, BookOpen, User, Calendar,
} from 'lucide-react';

interface LogEntry {
  id: string;
  action: string;
  courseId: string;
  courseTitle: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  note: string | null;
  metadata: any;
  createdAt: string;
}

const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  SUBMITTED: {
    label: 'Submitted for Review',
    color: '#2563EB',
    bg: '#EFF6FF',
    icon: <Clock size={16} />,
  },
  APPROVED: {
    label: 'Approved & Published',
    color: '#059669',
    bg: '#ECFDF5',
    icon: <CheckCircle size={16} />,
  },
  REJECTED: {
    label: 'Returned to Teacher',
    color: '#DC2626',
    bg: '#FEF2F2',
    icon: <XCircle size={16} />,
  },
  PUBLISHED: {
    label: 'Published',
    color: '#7C3AED',
    bg: '#F5F3FF',
    icon: <BookOpen size={16} />,
  },
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const MakerCheckerLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters: any = {};
      if (filterAction) filters.action = filterAction;
      if (filterFrom) filters.from = filterFrom;
      if (filterTo) filters.to = filterTo;
      const data = await courseService.getMakerCheckerLogs(filters);
      setLogs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  // Grouped by date
  const filtered = logs.filter(l => {
    if (!filterSearch) return true;
    const q = filterSearch.toLowerCase();
    return (
      l.courseTitle?.toLowerCase().includes(q) ||
      l.actorName?.toLowerCase().includes(q)
    );
  });

  const grouped: Record<string, LogEntry[]> = {};
  filtered.forEach(l => {
    const day = new Date(l.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(l);
  });

  // Summary counts
  const countBy = (action: string) => logs.filter(l => l.action === action).length;

  return (
    <CollegeLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <ClipboardList size={22} style={{ color: '#7C3AED' }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
              Maker-Checker Audit Log
            </h1>
          </div>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            Complete history of course approvals and rejections in your institution.
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { action: 'SUBMITTED', label: 'Total Submitted', icon: <Clock size={18} />, color: '#2563EB', bg: '#EFF6FF' },
            { action: 'APPROVED', label: 'Total Approved', icon: <CheckCircle size={18} />, color: '#059669', bg: '#ECFDF5' },
            { action: 'REJECTED', label: 'Total Returned', icon: <XCircle size={18} />, color: '#DC2626', bg: '#FEF2F2' },
          ].map(c => (
            <div key={c.action} style={{
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
              padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: c.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0,
              }}>
                {c.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.color, lineHeight: 1 }}>
                  {loading ? '–' : countBy(c.action)}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search by course or teacher name…"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              style={{
                flex: 1, padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8,
                fontSize: 14, outline: 'none',
              }}
            />
            <button
              onClick={() => setShowFilters(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB',
                background: showFilters ? '#F5F3FF' : '#fff',
                color: showFilters ? '#7C3AED' : '#374151',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
              }}
            >
              <Filter size={15} /> Filters <ChevronDown size={14} />
            </button>
            <button
              onClick={load}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB',
                background: '#fff', color: '#374151',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {showFilters && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12,
              paddingTop: 12, borderTop: '1px solid #F3F4F6',
            }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Action
                </label>
                <select
                  value={filterAction}
                  onChange={e => setFilterAction(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB',
                    borderRadius: 8, fontSize: 13, background: '#fff', outline: 'none',
                  }}
                >
                  <option value="">All Actions</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Returned</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={e => setFilterFrom(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB',
                    borderRadius: 8, fontSize: 13, background: '#fff', outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={filterTo}
                  onChange={e => setFilterTo(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB',
                    borderRadius: 8, fontSize: 13, background: '#fff', outline: 'none',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {error && (
          <div style={{
            padding: '14px 16px', background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 10, color: '#B91C1C', fontSize: 14, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 80, color: '#9CA3AF', gap: 10,
          }}>
            <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Loading audit log…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 80, background: '#fff',
            border: '1px solid #E5E7EB', borderRadius: 12,
          }}>
            <ClipboardList size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#374151', fontSize: 16 }}>No log entries found</p>
            <p style={{ color: '#6B7280', fontSize: 14 }}>
              {filterAction || filterFrom || filterTo || filterSearch
                ? 'Try adjusting your filters.'
                : 'Maker-checker actions will appear here once teachers start submitting courses for review.'}
            </p>
          </div>
        ) : (
          /* Timeline grouped by date */
          Object.keys(grouped).map(day => (
            <div key={day} style={{ marginBottom: 28 }}>
              {/* Date divider */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
              }}>
                <Calendar size={14} style={{ color: '#9CA3AF' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {day}
                </span>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              </div>

              {/* Entries */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 8 }}>
                {grouped[day].map((log, idx) => {
                  const meta = ACTION_META[log.action] || {
                    label: log.action, color: '#6B7280', bg: '#F9FAFB',
                    icon: <ClipboardList size={16} />,
                  };
                  return (
                    <div key={log.id} style={{
                      display: 'flex', gap: 14,
                      position: 'relative',
                    }}>
                      {/* Timeline connector */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: meta.bg, color: meta.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `2px solid ${meta.color}22`, flexShrink: 0,
                        }}>
                          {meta.icon}
                        </div>
                        {idx < grouped[day].length - 1 && (
                          <div style={{ width: 2, flex: 1, minHeight: 16, background: '#E5E7EB', margin: '4px 0' }} />
                        )}
                      </div>

                      {/* Card */}
                      <div style={{
                        flex: 1, background: '#fff', border: '1px solid #E5E7EB',
                        borderRadius: 10, padding: '12px 16px', marginBottom: 4,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            {/* Action badge */}
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                              color: meta.color, background: meta.bg, marginBottom: 6,
                            }}>
                              {meta.icon}
                              {meta.label}
                            </span>

                            {/* Course title */}
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                              📚 {log.courseTitle || 'Untitled Course'}
                            </div>

                            {/* Actor */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4B5563' }}>
                              <User size={13} />
                              <span>
                                <strong>{log.actorName || 'Unknown'}</strong>
                                <span style={{ color: '#9CA3AF' }}> · </span>
                                <span style={{ color: '#6B7280', fontSize: 12 }}>
                                  {log.actorRole === 'COLLEGE_HOD' ? 'HOD' :
                                   log.actorRole === 'FACULTY' ? 'Teacher' :
                                   log.actorRole?.replace('COLLEGE_', '') || log.actorRole}
                                </span>
                              </span>
                            </div>

                            {/* Note / rejection reason */}
                            {(log.note || log.metadata?.rejectionReason) && (
                              <div style={{
                                marginTop: 8, padding: '8px 12px',
                                background: log.action === 'REJECTED' ? '#FEF2F2' : '#F9FAFB',
                                borderRadius: 6, fontSize: 13,
                                color: log.action === 'REJECTED' ? '#B91C1C' : '#374151',
                                borderLeft: `3px solid ${log.action === 'REJECTED' ? '#FCA5A5' : '#D1D5DB'}`,
                              }}>
                                {log.action === 'REJECTED' ? '⚠️ ' : '💬 '}
                                {log.note || log.metadata?.rejectionReason}
                              </div>
                            )}
                          </div>

                          {/* Time */}
                          <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </CollegeLayout>
  );
};

export default MakerCheckerLogs;
