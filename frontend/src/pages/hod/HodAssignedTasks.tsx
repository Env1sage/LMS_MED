import React, { useState, useEffect, useCallback } from 'react';
import HodLayout from '../../components/hod/HodLayout';
import governanceService from '../../services/governance.service';
import { courseService } from '../../services/course.service';
import {
  ClipboardList, RefreshCw, X, CheckCircle, XCircle,
  BookOpen, ExternalLink, Eye, ArrowLeft,
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import { formatDate } from '../../utils/dateUtils';
import { getAuthImageUrl } from '../../utils/imageUrl';
import BookCover from '../../components/BookCover';

const TASK_TYPE_LABEL: Record<string, string> = {
  ADD_CONTENT: 'Add Content',
  CREATE_NOTIFICATION: 'Create Notification',
  REVIEW_CONTENT: 'Review Content',
  OTHER: 'General Task',
};

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:     { bg: '#FEF3C7', color: '#92400E',  label: 'Pending' },
  IN_PROGRESS: { bg: '#DBEAFE', color: '#1E40AF',  label: 'In Progress' },
  SUBMITTED:   { bg: '#EDE9FE', color: '#5B21B6',  label: 'Awaiting Review' },
  APPROVED:    { bg: '#D1FAE5', color: '#065F46',  label: 'Approved' },
  REJECTED:    { bg: '#FEE2E2', color: '#991B1B',  label: 'Revision Requested' },
};

const YEAR_LABELS: Record<string, string> = {
  YEAR_1: 'Year 1', YEAR_2: 'Year 2', YEAR_3_PART1: 'Year 3 Part 1', YEAR_3_PART2: 'Year 3 Part 2',
  YEAR_3_MINOR: 'Year 3 Part 1', YEAR_3_MAJOR: 'Year 3 Part 2',
  INTERNSHIP: 'Internship', FIRST_YEAR: 'Year 1', SECOND_YEAR: 'Year 2',
  THIRD_YEAR: 'Year 3 Part 1', FOURTH_YEAR: 'Year 3 Part 2', FIFTH_YEAR: 'Internship',
  PART_1: 'Year 3 Part 1', PART_2: 'Year 3 Part 2',
};

const ACCENT = '#7C3AED';

interface Task {
  id: string; title: string; description: string; taskType: string;
  status: string; dueDate: string | null;
  submissionNote: string | null; submissionUrl: string | null;
  submissionData: any; reviewNote: string | null; createdAt: string;
  assignedTo?: { fullName: string; email: string };
}

interface LUDetails {
  id: string; type: string; title: string; description?: string;
  subject: string; topic?: string; subTopic?: string;
  difficultyLevel?: string; estimatedDuration?: number;
  secureAccessUrl?: string; deliveryType?: string; academicYear?: string; status?: string;
}

interface CourseDetail {
  id: string; title: string; description: string; academicYear: string;
  status: string; createdAt: string;
  learning_flow_steps: Array<{
    id: string; stepOrder: number; stepType: string; mandatory: boolean;
    learning_units: { id: string; title: string; description: string; contentType: string; type: string; thumbnailUrl?: string };
  }>;
  _count: { course_assignments: number };
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: '1px solid var(--bo-border)',
  borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

const luCache: Record<string, LUDetails | null> = {};

const HodAssignedTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [luDetails, setLuDetails] = useState<Record<string, LUDetails | null>>({});

  // Course detail review (for ADD_CONTENT with courseId)
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [reviewCourse, setReviewCourse] = useState<CourseDetail | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);

  // LU-only review modal
  const [luReviewTask, setLuReviewTask] = useState<Task | null>(null);

  // Shared review action state
  const [reviewAction, setReviewAction] = useState<'approve' | 'disapprove' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [filter, setFilter] = useState<'ALL' | 'SUBMITTED' | 'PENDING' | 'APPROVED'>('ALL');

  const fetchTasks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await governanceService.getAssignedTasks();
      const taskList: Task[] = Array.isArray(res) ? res : [];
      setTasks(taskList);
      // Pre-fetch LU details for non-course submissions
      const toFetch = taskList.filter(t => {
        const id = t.submissionData?.learningUnitId;
        return t.taskType === 'ADD_CONTENT' && id && !luCache[id];
      });
      if (toFetch.length > 0) {
        const fetches = await Promise.allSettled(
          toFetch.map(t => {
            const id = t.submissionData.learningUnitId;
            return governanceService.getLearningUnitForReview(id).then(lu => ({ id, lu }));
          })
        );
        const newDetails: Record<string, LUDetails | null> = {};
        fetches.forEach(r => {
          if (r.status === 'fulfilled') {
            luCache[r.value.id] = r.value.lu;
            newDetails[r.value.id] = r.value.lu;
          }
        });
        setLuDetails(prev => ({ ...prev, ...newDetails }));
      }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load tasks'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); }
  }, [success]);

  const openReview = async (task: Task) => {
    setReviewAction(null);
    setReviewNote('');
    const courseId = task.submissionData?.courseId;
    if (task.taskType === 'ADD_CONTENT' && courseId) {
      // Full course detail review
      setReviewTask(task);
      setReviewCourse(null);
      setCourseLoading(true);
      try {
        const data = await courseService.getById(courseId);
        setReviewCourse(data);
      } catch {
        setError('Failed to load course details');
        setReviewTask(null);
      } finally {
        setCourseLoading(false);
      }
    } else {
      // LU or general task review
      setLuReviewTask(task);
    }
  };

  const closeReview = () => {
    setReviewTask(null);
    setReviewCourse(null);
    setLuReviewTask(null);
    setReviewAction(null);
    setReviewNote('');
  };

  const handleConfirm = async (task: Task) => {
    if (!reviewAction) return;
    setSaving(true);
    try {
      if (reviewAction === 'approve') {
        if (task.taskType === 'ADD_CONTENT') {
          await governanceService.publishTask(task.id);
          setSuccess(task.submissionData?.courseId
            ? 'Approved — course moved to My Courses as draft.'
            : 'Approved — learning unit published.');
        } else {
          await governanceService.reviewTask(task.id, { status: 'APPROVED', reviewNote });
          setSuccess('Task approved.');
        }
      } else {
        await governanceService.reviewTask(task.id, { status: 'REJECTED', reviewNote });
        setSuccess('Sent back to faculty for revision.');
      }
      closeReview();
      fetchTasks();
    } catch (err: any) { setError(err.response?.data?.message || 'Action failed'); }
    finally { setSaving(false); }
  };

  const getTypeBadge = (type: string) => {
    const t = type === 'NOTES' ? 'MCQ' : type;
    const colors: Record<string, { bg: string; color: string }> = {
      VIDEO: { bg: '#DBEAFE', color: '#1D4ED8' },
      BOOK:  { bg: '#FEF3C7', color: '#92400E' },
      MCQ:   { bg: '#F5F3FF', color: '#6D28D9' },
    };
    const c = colors[t] || { bg: '#E5E7EB', color: '#374151' };
    return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>{t === 'BOOK' ? 'E-Book' : t}</span>;
  };

  const filtered = tasks.filter(t => {
    if (filter === 'SUBMITTED') return t.status === 'SUBMITTED';
    if (filter === 'PENDING') return t.status === 'PENDING' || t.status === 'IN_PROGRESS';
    if (filter === 'APPROVED') return t.status === 'APPROVED';
    return true;
  });

  const submittedCount = tasks.filter(t => t.status === 'SUBMITTED').length;
  const pendingCount   = tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
  const approvedCount  = tasks.filter(t => t.status === 'APPROVED').length;

  // LU details for the LU review modal
  const luReviewId = luReviewTask?.submissionData?.courseId || luReviewTask?.submissionData?.learningUnitId;
  const reviewLu: LUDetails | null = luReviewId ? (luDetails[luReviewId] ?? luCache[luReviewId] ?? null) : null;

  // ── Review action panel (shared) ─────────────────────────────────────────
  const ReviewActionPanel = ({ task }: { task: Task }) => (
    <div>
      {reviewAction === null && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button onClick={() => setReviewAction('approve')}
            style={{ padding: '14px', borderRadius: 10, border: '2px solid #059669', background: '#ECFDF5', color: '#059669', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <CheckCircle size={18} /> Approve
          </button>
          <button onClick={() => setReviewAction('disapprove')}
            style={{ padding: '14px', borderRadius: 10, border: '2px solid #EF4444', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <XCircle size={18} /> Disapprove
          </button>
        </div>
      )}
      {reviewAction === 'approve' && (
        <div style={{ padding: '14px 16px', borderRadius: 10, border: '2px solid #059669', background: '#ECFDF5' }}>
          <div style={{ fontWeight: 700, color: '#059669', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={16} />
            {task.taskType === 'ADD_CONTENT'
              ? (task.submissionData?.courseId ? 'Approve — move to My Courses as draft' : 'Approve — publish learning unit')
              : 'Approve task'}
          </div>
          {task.taskType !== 'ADD_CONTENT' && (
            <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
              rows={2} placeholder="Approval note (optional)…"
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 10 }} />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setReviewAction(null)} className="bo-btn bo-btn-outline" style={{ flex: 1 }}>Back</button>
            <button onClick={() => handleConfirm(task)} disabled={saving}
              style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <BookOpen size={15} /> {saving ? 'Approving…' : 'Confirm Approve'}
            </button>
          </div>
        </div>
      )}
      {reviewAction === 'disapprove' && (
        <div style={{ padding: '14px 16px', borderRadius: 10, border: '2px solid #EF4444', background: '#FEF2F2' }}>
          <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <XCircle size={16} /> Send back to faculty for revision
          </div>
          <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
            rows={3} placeholder="Describe what needs to be changed… (required)"
            style={{ ...inputStyle, resize: 'vertical', marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setReviewAction(null)} className="bo-btn bo-btn-outline" style={{ flex: 1 }}>Back</button>
            <button onClick={() => handleConfirm(task)} disabled={saving || !reviewNote.trim()}
              style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', cursor: saving || !reviewNote.trim() ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: saving || !reviewNote.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <XCircle size={15} /> {saving ? 'Sending…' : 'Confirm Disapprove'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <HodLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <ClipboardList size={24} color="#2563EB" />
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Assigned Tasks</h1>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--bo-text-muted)' }}>{tasks.length} total</span>
        <button onClick={fetchTasks} className="bo-btn bo-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {tasks.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'ALL',       label: `All (${tasks.length})`,        bg: '#F3F4F6', color: '#374151' },
            { key: 'PENDING',   label: `${pendingCount} Pending`,       bg: '#FEF3C7', color: '#92400E' },
            { key: 'SUBMITTED', label: `${submittedCount} Need Review`, bg: '#EDE9FE', color: '#5B21B6' },
            { key: 'APPROVED',  label: `${approvedCount} Approved`,     bg: '#D1FAE5', color: '#065F46' },
          ].map(chip => (
            <button key={chip.key} onClick={() => setFilter(chip.key as any)}
              style={{ padding: '7px 16px', borderRadius: 8, border: filter === chip.key ? '2px solid currentColor' : '1px solid transparent', background: chip.bg, color: chip.color, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--bo-text-muted)' }}>Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="bo-card" style={{ textAlign: 'center', padding: 60 }}>
          <ClipboardList size={40} style={{ color: 'var(--bo-text-muted)', marginBottom: 12 }} />
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 15 }}>No tasks assigned yet</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bo-card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>No tasks in this category</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(task => {
            const badge = STATUS_BADGE[task.status] || STATUS_BADGE.PENDING;
            const isSubmitted = task.status === 'SUBMITTED';
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'APPROVED';

            return (
              <div key={task.id} className="bo-card" style={{ padding: 20, borderLeft: isSubmitted ? '4px solid #7C3AED' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, paddingRight: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{task.title}</span>
                      <span style={{ padding: '1px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#F3F4F6', color: '#374151' }}>
                        {TASK_TYPE_LABEL[task.taskType] || task.taskType}
                      </span>
                      {isSubmitted && (
                        <span style={{ padding: '1px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#7C3AED', color: '#fff' }}>
                          Needs Review
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 8 }}>
                      Assigned to: <strong>{task.assignedTo?.fullName || 'Faculty'}</strong>
                      {' '}({task.assignedTo?.email || ''})
                      {task.dueDate && (
                        <> · Due: <strong style={{ color: isOverdue ? '#DC2626' : undefined }}>{formatDate(task.dueDate)}{isOverdue ? ' (overdue)' : ''}</strong></>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', lineHeight: 1.6, margin: 0 }}>{task.description}</p>
                    {task.reviewNote && task.status !== 'SUBMITTED' && (
                      <div style={{ background: task.status === 'APPROVED' ? '#D1FAE5' : '#FEF3C7', borderRadius: 8, padding: '8px 12px', marginTop: 10, fontSize: 13 }}>
                        <strong>{task.status === 'APPROVED' ? '✅ Note:' : '↩️ Revision note:'}</strong> {task.reviewNote}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <span style={{ padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
                      {badge.label}
                    </span>
                    {isSubmitted && (
                      <button onClick={() => openReview(task)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        <Eye size={14} /> Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Full Course Detail Review Overlay ── */}
      {reviewTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--bo-bg)', width: '100%', maxWidth: 860, borderRadius: 16, overflow: 'hidden', marginTop: 8, marginBottom: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            {/* Header */}
            <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid var(--bo-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={closeReview} style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex' }}>
                <ArrowLeft size={18} />
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 2 }}>Review Submission</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  <strong>{reviewTask.assignedTo?.fullName}</strong>
                  <span style={{ fontWeight: 400, color: 'var(--bo-text-muted)', marginLeft: 6 }}>({reviewTask.assignedTo?.email})</span>
                </div>
              </div>
              <button onClick={closeReview} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {courseLoading ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--bo-text-muted)' }}>Loading course details…</div>
              ) : reviewCourse ? (
                <>
                  {/* Course Title + Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0, flex: 1 }}>{reviewCourse.title}</h1>
                    <span style={{
                      padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: reviewCourse.status === 'PUBLISHED' ? '#D1FAE5' : '#FEF3C7',
                      color: reviewCourse.status === 'PUBLISHED' ? '#065F46' : '#92400E',
                    }}>{reviewCourse.status}</span>
                  </div>

                  {/* Course metadata card */}
                  <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: reviewCourse.description ? 16 : 0 }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Academic Year</div>
                        <div style={{ fontWeight: 600 }}>{YEAR_LABELS[reviewCourse.academicYear] || reviewCourse.academicYear?.replace(/_/g, ' ')}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Created</div>
                        <div style={{ fontWeight: 600 }}>{formatDate(reviewCourse.createdAt)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Learning Steps</div>
                        <div style={{ fontWeight: 600 }}>{reviewCourse.learning_flow_steps?.length || 0}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Assignments</div>
                        <div style={{ fontWeight: 600 }}>{reviewCourse._count?.course_assignments || 0}</div>
                      </div>
                    </div>
                    {reviewCourse.description && (
                      <div style={{ padding: 12, background: 'var(--bo-bg)', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Description</div>
                        <p style={{ fontSize: 14, color: 'var(--bo-text-primary)', margin: 0, lineHeight: 1.6 }}>{reviewCourse.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Learning Flow */}
                  <div className="bo-card" style={{ padding: 20, marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--bo-text-primary)' }}>
                      Learning Flow ({reviewCourse.learning_flow_steps?.length || 0} steps)
                    </h3>
                    {!reviewCourse.learning_flow_steps?.length ? (
                      <div style={{ textAlign: 'center', padding: 24, color: 'var(--bo-text-muted)' }}>No learning flow defined</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 0 }}>
                        {reviewCourse.learning_flow_steps.map((step, idx) => (
                          <div key={step.id} style={{ display: 'flex', gap: 14 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36 }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                {step.stepOrder}
                              </div>
                              {idx < reviewCourse.learning_flow_steps.length - 1 && (
                                <div style={{ width: 2, flex: 1, background: `${ACCENT}30`, minHeight: 16 }} />
                              )}
                            </div>
                            <div style={{ flex: 1, paddingBottom: 14 }}>
                              <div style={{ padding: 14, background: 'var(--bo-bg)', borderRadius: 8, border: '1px solid var(--bo-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                                    {step.learning_units?.thumbnailUrl && getAuthImageUrl(step.learning_units.thumbnailUrl) ? (
                                      <div style={{ width: 38, height: 50, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--bo-border)', background: '#1a1a2e' }}>
                                        <img src={getAuthImageUrl(step.learning_units.thumbnailUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                      </div>
                                    ) : (
                                      <BookCover title={step.learning_units?.title || 'Learning Unit'} type={step.stepType} width={38} height={50} />
                                    )}
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bo-text-primary)' }}>{step.learning_units?.title || 'Learning Unit'}</div>
                                      {step.learning_units?.description && (
                                        <p style={{ fontSize: 12, color: 'var(--bo-text-secondary)', margin: '3px 0 0' }}>{step.learning_units.description}</p>
                                      )}
                                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 3 }}>
                                        {step.learning_units?.contentType || 'Teacher uploaded content'}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
                                    {getTypeBadge(step.stepType)}
                                    {step.mandatory && (
                                      <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#FEE2E2', color: '#DC2626' }}>REQUIRED</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Approve / Disapprove */}
                  <div className="bo-card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 14 }}>Review Decision</div>
                    <ReviewActionPanel task={reviewTask} />
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#DC2626' }}>Failed to load course details.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LU / General Task Review Modal ── */}
      {luReviewTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="bo-card" style={{ padding: 0, width: 580, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--bo-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Review Submission</h3>
              <button onClick={closeReview} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)' }}><X size={18} /></button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16, padding: '12px 14px', background: '#F8FAFC', borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{luReviewTask.title}</div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                  By: <strong>{luReviewTask.assignedTo?.fullName}</strong> ({luReviewTask.assignedTo?.email})
                  {luReviewTask.dueDate && <> · Due {formatDate(luReviewTask.dueDate)}</>}
                </div>
              </div>

              {luReviewTask.taskType === 'ADD_CONTENT' && luReviewId && (
                <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 10, color: '#0369A1', fontSize: 14 }}>📄 Learning Unit Submitted</div>
                  {reviewLu ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                      <div><label style={labelStyle}>Title</label>{reviewLu.title}</div>
                      <div><label style={labelStyle}>Type</label>{reviewLu.type}</div>
                      <div><label style={labelStyle}>Subject</label>{reviewLu.subject}</div>
                      {reviewLu.academicYear && <div><label style={labelStyle}>Year</label>{reviewLu.academicYear}</div>}
                      {reviewLu.difficultyLevel && <div><label style={labelStyle}>Difficulty</label>{reviewLu.difficultyLevel}</div>}
                      {reviewLu.topic && <div><label style={labelStyle}>Topic</label>{reviewLu.topic}</div>}
                      {reviewLu.secureAccessUrl && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Content URL</label>
                          <a href={reviewLu.secureAccessUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                            Open link <ExternalLink size={11} />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#64748B' }}>Loading content details…</div>
                  )}
                </div>
              )}

              {luReviewTask.taskType !== 'ADD_CONTENT' && luReviewTask.submissionNote && (
                <div style={{ background: '#F9FAFB', border: '1px solid var(--bo-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                  <label style={labelStyle}>Faculty Submission</label>
                  <p style={{ color: 'var(--bo-text-secondary)', lineHeight: 1.6, margin: 0 }}>{luReviewTask.submissionNote}</p>
                  {luReviewTask.submissionUrl && (
                    <a href={luReviewTask.submissionUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      View reference <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              )}

              <ReviewActionPanel task={luReviewTask} />
            </div>
          </div>
        </div>
      )}
    </HodLayout>
  );
};

export default HodAssignedTasks;
