import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import governanceService from '../../services/governance.service';
import { ClipboardList, RefreshCw, X, Send, BookOpen, PlusCircle, ChevronDown } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import { formatDate } from '../../utils/dateUtils';

const TASK_TYPE_LABEL: Record<string, string> = {
  ADD_CONTENT: 'Add Content',
  CREATE_NOTIFICATION: 'Create Notification',
  REVIEW_CONTENT: 'Review Content',
  OTHER: 'General Task',
};

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:     { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  IN_PROGRESS: { bg: '#DBEAFE', color: '#1E40AF', label: 'In Progress' },
  SUBMITTED:   { bg: '#EDE9FE', color: '#5B21B6', label: 'Awaiting Review' },
  APPROVED:    { bg: '#D1FAE5', color: '#065F46', label: 'Approved' },
  REJECTED:    { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
};

interface Task {
  id: string; title: string; description: string; taskType: string;
  status: string; dueDate: string | null;
  submissionNote: string | null; submissionUrl: string | null;
  submissionData: any; reviewNote: string | null; createdAt: string;
  assignedBy?: { fullName: string; email: string };
}

interface DraftUnit {
  id: string; title: string; code?: string; courseType?: string;
  academicYear?: string; stepCount?: number; createdAt: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: '1px solid var(--bo-border)',
  borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block',
};

const FacultyTasks: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draftUnits, setDraftUnits] = useState<DraftUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Submit modal
  const [submitModal, setSubmitModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [generalNote, setGeneralNote] = useState('');
  const [generalUrl, setGeneralUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [taskRes, draftRes] = await Promise.all([
        governanceService.getMyTasks(),
        governanceService.getMyDraftUnits().catch(() => []),
      ]);
      setTasks(Array.isArray(taskRes) ? taskRes : []);
      setDraftUnits(Array.isArray(draftRes) ? draftRes : []);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load tasks'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 3500); return () => clearTimeout(t); } }, [success]);

  const openSubmit = (task: Task) => {
    setSubmitModal({ open: true, task });
    setSelectedDraftId('');
    setGeneralNote(task.submissionNote || '');
    setGeneralUrl(task.submissionUrl || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModal.task) return;
    const isAddContent = submitModal.task.taskType === 'ADD_CONTENT';
    if (isAddContent && !selectedDraftId) {
      setError('Please select a draft learning unit to submit'); return;
    }
    setSubmitting(true);
    try {
      const selectedDraft = draftUnits.find(d => d.id === selectedDraftId);
      const body = isAddContent
        ? {
            submissionNote: selectedDraft ? `Draft course: ${selectedDraft.title}` : 'Draft course submitted',
            submissionData: { courseId: selectedDraftId },
          }
        : { submissionNote: generalNote, submissionUrl: generalUrl };
      await governanceService.submitTask(submitModal.task.id, body);
      setSuccess('Submitted to HOD for review');
      setSubmitModal({ open: false, task: null });
      fetchTasks();
    } catch (err: any) { setError(err.response?.data?.message || 'Submit failed'); }
    finally { setSubmitting(false); }
  };

  const pendingCount = tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;

  return (
    <FacultyLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <ClipboardList size={24} color="#7C3AED" />
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Tasks Assigned to Me</h1>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--bo-text-muted)' }}>{tasks.length} total</span>
        <button onClick={fetchTasks} className="bo-btn bo-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {tasks.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ padding: '7px 16px', borderRadius: 8, background: '#FEF3C7', color: '#92400E', fontSize: 13, fontWeight: 600 }}>{pendingCount} pending</div>
          <div style={{ padding: '7px 16px', borderRadius: 8, background: '#EDE9FE', color: '#5B21B6', fontSize: 13, fontWeight: 600 }}>{tasks.filter(t => t.status === 'SUBMITTED').length} awaiting review</div>
          <div style={{ padding: '7px 16px', borderRadius: 8, background: '#D1FAE5', color: '#065F46', fontSize: 13, fontWeight: 600 }}>{tasks.filter(t => t.status === 'APPROVED').length} approved</div>
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
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 6 }}>Your HOD will assign tasks here</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tasks.map(task => {
            const badge = STATUS_BADGE[task.status] || STATUS_BADGE.PENDING;
            const canSubmit = task.status === 'PENDING' || task.status === 'IN_PROGRESS' || task.status === 'REJECTED';
            const isAddContent = task.taskType === 'ADD_CONTENT';
            const d = task.submissionData;
            const submittedLuId = d?.learningUnitId;
            const submittedCourseId = d?.courseId;

            return (
              <div key={task.id} className="bo-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1, paddingRight: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{task.title}</span>
                      <span style={{ padding: '1px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: isAddContent ? '#DBEAFE' : '#F3F4F6', color: isAddContent ? '#1E40AF' : '#374151' }}>
                        {isAddContent ? '📄 ' : ''}{TASK_TYPE_LABEL[task.taskType] || task.taskType}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                      By: <strong>{task.assignedBy?.fullName || 'HOD'}</strong>
                      {task.dueDate && <> · Due: <strong style={{ color: new Date(task.dueDate) < new Date() && task.status !== 'APPROVED' ? '#DC2626' : undefined }}>{formatDate(task.dueDate)}</strong></>}
                    </div>
                  </div>
                  <span style={{ padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {badge.label}
                  </span>
                </div>

                <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>{task.description}</p>

                {/* Submitted course/LU reference */}
                {(submittedCourseId || submittedLuId) && (
                  <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: '#0369A1', marginBottom: 2 }}>
                      {submittedCourseId ? '📚 Submitted Draft Course' : '📄 Submitted Learning Unit'}
                    </div>
                    {task.submissionNote && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>{task.submissionNote}</div>}
                  </div>
                )}

                {/* Legacy submitted draft preview (old format) */}
                {d && isAddContent && !submittedLuId && (
                  <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '12px 14px', marginBottom: 12, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, color: '#0369A1' }}>📄 Submitted Draft</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                      <div><strong>Title:</strong> {d.title}</div>
                      <div><strong>Type:</strong> {d.type}</div>
                      <div><strong>Subject:</strong> {d.subject}</div>
                      <div><strong>Year:</strong> {d.academicYear}</div>
                    </div>
                  </div>
                )}

                {task.reviewNote && (
                  <div style={{ background: task.status === 'APPROVED' ? '#D1FAE5' : '#FEE2E2', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                    <strong>{task.status === 'APPROVED' ? '✅ Published:' : '❌ HOD Feedback:'}</strong> {task.reviewNote}
                  </div>
                )}

                {canSubmit && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {isAddContent && (
                      <button
                        onClick={() => navigate('/faculty/create-course')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #7C3AED', background: '#fff', color: '#7C3AED', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        <PlusCircle size={14} /> Create Draft Course
                      </button>
                    )}
                    <button
                      onClick={() => openSubmit(task)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: isAddContent ? '#2563EB' : '#7C3AED', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      {isAddContent ? <><ChevronDown size={14} /> Select Draft & Submit</> : <><Send size={14} /> Submit Work</>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Modal */}
      {submitModal.open && submitModal.task && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="bo-card" style={{ padding: 28, width: 560, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                  {submitModal.task.taskType === 'ADD_CONTENT' ? '📚 Submit Draft Course to HOD' : 'Submit Work to HOD'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>Task: <strong>{submitModal.task.title}</strong></p>
              </div>
              <button onClick={() => setSubmitModal({ open: false, task: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', flexShrink: 0 }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              {submitModal.task.taskType === 'ADD_CONTENT' ? (
                <>
                  <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#1E40AF' }}>
                    Select a course you've already created as a draft. Your HOD will review and activate it.
                    {draftUnits.length === 0 && (
                      <div style={{ marginTop: 8, fontWeight: 600 }}>
                        No draft courses yet —{' '}
                        <button type="button" onClick={() => { setSubmitModal({ open: false, task: null }); navigate('/faculty/create-course'); }}
                          style={{ background: 'none', border: 'none', color: '#1E40AF', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                          create one first
                        </button>
                      </div>
                    )}
                  </div>

                  {draftUnits.length > 0 ? (
                    <div style={{ marginBottom: 18 }}>
                      <label style={labelStyle}>Select Draft Course *</label>
                      <select value={selectedDraftId} onChange={e => setSelectedDraftId(e.target.value)}
                        style={{ ...inputStyle, borderColor: !selectedDraftId ? '#EF4444' : undefined }}>
                        <option value="">-- Choose a draft course --</option>
                        {draftUnits.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.title}{d.code ? ` (${d.code})` : ''}{d.academicYear ? ` · ${d.academicYear}` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedDraftId && (
                        <div style={{ marginTop: 8, padding: '10px 12px', background: '#F0F9FF', borderRadius: 6, fontSize: 12, color: '#0369A1' }}>
                          {(() => {
                            const d = draftUnits.find(x => x.id === selectedDraftId);
                            return d ? (
                              <span><strong>{d.title}</strong>{d.code ? ` · ${d.code}` : ''}{d.stepCount != null ? ` · ${d.stepCount} steps` : ''}{d.academicYear ? ` · ${d.academicYear}` : ''}</span>
                            ) : null;
                          })()}
                        </div>
                      )}
                      <div style={{ marginTop: 10 }}>
                        <button type="button"
                          onClick={() => { setSubmitModal({ open: false, task: null }); navigate('/faculty/create-course'); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: '1px solid #7C3AED', background: '#fff', color: '#7C3AED', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          <PlusCircle size={13} /> Create Another Draft Course
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <BookOpen size={32} style={{ color: 'var(--bo-text-muted)', marginBottom: 8 }} />
                      <p style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>No draft courses yet</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>What did you do? *</label>
                    <textarea required value={generalNote} onChange={e => setGeneralNote(e.target.value)} rows={4}
                      placeholder="Describe the work you completed…"
                      style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle}>Reference URL (optional)</label>
                    <input type="url" value={generalUrl} onChange={e => setGeneralUrl(e.target.value)}
                      placeholder="https://…" style={inputStyle} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setSubmitModal({ open: false, task: null })} className="bo-btn bo-btn-outline" disabled={submitting}>Cancel</button>
                <button type="submit" className="bo-btn bo-btn-primary" disabled={submitting || (submitModal.task.taskType === 'ADD_CONTENT' && !selectedDraftId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563EB', borderColor: '#2563EB', opacity: (submitting || (submitModal.task.taskType === 'ADD_CONTENT' && !selectedDraftId)) ? 0.6 : 1 }}>
                  <Send size={14} /> {submitting ? 'Submitting…' : 'Send to HOD for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </FacultyLayout>
  );
};

export default FacultyTasks;
