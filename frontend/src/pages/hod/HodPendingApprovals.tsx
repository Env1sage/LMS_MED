import React, { useState, useEffect, useCallback } from 'react';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import facultyAssignmentService from '../../services/faculty-assignment.service';
import { courseService } from '../../services/course.service';
import { CheckCircle, XCircle, Clock, Bell, ClipboardList, Calendar, BookMarked, RefreshCw } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

const ACCENT = '#7C3AED';

interface RejectModalState {
  open: boolean;
  type: 'test' | 'notification' | 'lecture' | 'course';
  id: string;
  title: string;
}

const HodPendingApprovals: React.FC = () => {
  const [tab, setTab] = useState<'courses' | 'tests' | 'notifications' | 'lectures'>('courses');
  const [courses, setCourses] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectModal, setRejectModal] = useState<RejectModalState>({ open: false, type: 'test', id: '', title: '' });
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [coursesRes, testsRes, notifsRes, lecturesRes] = await Promise.allSettled([
      courseService.getPendingReview(),
      facultyAssignmentService.getPendingTests(),
      facultyAssignmentService.getPendingNotifications(),
      facultyAssignmentService.getPendingLectures(),
    ]);
    if (coursesRes.status === 'fulfilled') setCourses(Array.isArray(coursesRes.value) ? coursesRes.value : []);
    if (testsRes.status === 'fulfilled') setTests(Array.isArray(testsRes.value) ? testsRes.value : []);
    if (notifsRes.status === 'fulfilled') setNotifications(Array.isArray(notifsRes.value) ? notifsRes.value : []);
    if (lecturesRes.status === 'fulfilled') setLectures(Array.isArray(lecturesRes.value) ? lecturesRes.value : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);

  const handleApprove = async (type: RejectModalState['type'], id: string, title: string) => {
    try {
      setActionLoading(id);
      setError('');
      if (type === 'course') await courseService.hodApprove(id);
      else if (type === 'test') await facultyAssignmentService.hodApproveTest(id);
      else if (type === 'notification') await facultyAssignmentService.hodApproveNotification(id);
      else if (type === 'lecture') await facultyAssignmentService.hodApproveLecture(id);
      setSuccess(`"${title}" approved successfully`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const openReject = (type: RejectModalState['type'], id: string, title: string) => {
    setRejectReason('');
    setRejectModal({ open: true, type, id, title });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { setError('Please provide a reason for rejection'); return; }
    try {
      setActionLoading(rejectModal.id);
      setError('');
      const { type, id, title } = rejectModal;
      if (type === 'course') await courseService.hodReject(id, rejectReason);
      else if (type === 'test') await facultyAssignmentService.hodRejectTest(id, rejectReason);
      else if (type === 'notification') await facultyAssignmentService.hodRejectNotification(id, rejectReason);
      else if (type === 'lecture') await facultyAssignmentService.hodRejectLecture(id, rejectReason);
      setSuccess(`"${title}" returned to faculty`);
      setRejectModal({ open: false, type: 'test', id: '', title: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPending = courses.length + tests.length + notifications.length + lectures.length;

  const tabs = [
    { key: 'courses' as const, label: 'Courses', icon: <BookMarked size={15} />, count: courses.length },
    { key: 'tests' as const, label: 'Tests', icon: <ClipboardList size={15} />, count: tests.length },
    { key: 'notifications' as const, label: 'Notifications', icon: <Bell size={15} />, count: notifications.length },
    { key: 'lectures' as const, label: 'Online Lectures', icon: <Calendar size={15} />, count: lectures.length },
  ];

  const ApprovalCard = ({ item, type, title, subtitle, meta }: { item: any; type: RejectModalState['type']; title: string; subtitle?: string; meta?: string }) => (
    <div className="bo-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--bo-text-primary)', marginBottom: 4 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: 4 }}>{subtitle}</div>}
        {meta && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{meta}</div>}
        {item.submittedForReviewAt && (
          <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 4 }}>
            <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
            Submitted: {formatDate(item.submittedForReviewAt)}
          </div>
        )}
        {item.createdAt && !item.submittedForReviewAt && (
          <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 4 }}>
            <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
            Created: {formatDate(item.createdAt)}
          </div>
        )}
        {item.creator && (
          <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 2 }}>By: {item.creator.fullName}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => handleApprove(type, item.id, title)}
          disabled={actionLoading === item.id}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#10B981', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: actionLoading === item.id ? 0.6 : 1 }}
        >
          <CheckCircle size={14} /> Approve
        </button>
        <button
          onClick={() => openReject(type, item.id, title)}
          disabled={actionLoading === item.id}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #EF4444', background: '#fff', color: '#EF4444', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: actionLoading === item.id ? 0.6 : 1 }}
        >
          <XCircle size={14} /> Reject
        </button>
      </div>
    </div>
  );

  return (
    <FacultyLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--bo-text-primary)' }}>Pending Approvals</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {totalPending > 0 ? `${totalPending} item${totalPending !== 1 ? 's' : ''} awaiting your review` : 'All caught up!'}
          </p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--bo-text-secondary)' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div style={{ padding: '12px 16px', background: '#FEE2E2', color: '#991B1B', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
      {success && <div style={{ padding: '12px 16px', background: '#D1FAE5', color: '#065F46', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>✓ {success}</div>}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {tabs.map(t => (
          <div key={t.key} onClick={() => setTab(t.key)} className="bo-card" style={{ padding: '14px 18px', cursor: 'pointer', borderLeft: tab === t.key ? `3px solid ${ACCENT}` : '3px solid transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: ACCENT }}>{t.icon}</div>
              <span style={{ fontSize: 20, fontWeight: 700, color: t.count > 0 ? '#EF4444' : 'var(--bo-text-muted)' }}>{t.count}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: 'var(--bo-text-primary)' }}>{t.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--bo-border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 14, fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? ACCENT : 'var(--bo-text-secondary)',
              borderBottom: tab === t.key ? `2px solid ${ACCENT}` : '2px solid transparent',
              marginBottom: -2,
            }}>
            {t.icon} {t.label}
            {t.count > 0 && <span style={{ padding: '1px 7px', borderRadius: 10, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--bo-text-muted)' }}>Loading...</div>
      ) : (
        <>
          {tab === 'courses' && (
            courses.length === 0 ? (
              <div className="bo-card" style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
                <BookMarked size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div>No courses pending review</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {courses.map((c: any) => (
                  <ApprovalCard key={c.id} item={c} type="course" title={c.title}
                    subtitle={c.description}
                    meta={`${c.learning_flow_steps?.length || 0} steps • ${c.academicYear?.replace(/_/g, ' ')}`}
                  />
                ))}
              </div>
            )
          )}

          {tab === 'tests' && (
            tests.length === 0 ? (
              <div className="bo-card" style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
                <ClipboardList size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div>No tests pending review</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {tests.map((t: any) => (
                  <ApprovalCard key={t.id} item={t} type="test" title={t.title}
                    subtitle={t.description}
                    meta={`${t._count?.questions || t.totalQuestions || 0} questions • ${t.durationMinutes} min • ${t.type?.replace(/_/g, ' ')}`}
                  />
                ))}
              </div>
            )
          )}

          {tab === 'notifications' && (
            notifications.length === 0 ? (
              <div className="bo-card" style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
                <Bell size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div>No notifications pending approval</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {notifications.map((n: any) => (
                  <ApprovalCard key={n.id} item={n} type="notification" title={n.title}
                    subtitle={n.message}
                    meta={`${n.type?.replace(/_/g, ' ')} • ${n.priority} priority • ${n.audience}`}
                  />
                ))}
              </div>
            )
          )}

          {tab === 'lectures' && (
            lectures.length === 0 ? (
              <div className="bo-card" style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
                <Calendar size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div>No online lectures pending approval</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {lectures.map((l: any) => (
                  <ApprovalCard key={l.id} item={l} type="lecture" title={l.title}
                    subtitle={`Speaker: ${l.speaker}`}
                    meta={`${new Date(l.date).toLocaleDateString()} ${l.startTime}–${l.endTime} • ${l.type?.replace(/_/g, ' ')}`}
                  />
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setRejectModal(m => ({ ...m, open: false }))}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 480, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Return to Faculty</h3>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--bo-text-muted)' }}>
              <strong>"{rejectModal.title}"</strong> will be returned to the faculty as DRAFT.
            </p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Reason for returning *</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain what needs to be changed..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
              autoFocus
            />
            {error && <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setRejectModal(m => ({ ...m, open: false }))} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--bo-border)', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || !!actionLoading}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: !rejectReason.trim() ? 0.5 : 1 }}>
                Return to Faculty
              </button>
            </div>
          </div>
        </div>
      )}
    </FacultyLayout>
  );
};

export default HodPendingApprovals;
