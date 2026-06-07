import React, { useState, useEffect, useCallback } from 'react';
import HodLayout from '../../components/hod/HodLayout';
import governanceService from '../../services/governance.service';
import { UserCog, Search, RefreshCw, ClipboardList, X, Eye, CheckCircle, XCircle } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import { formatDate } from '../../utils/dateUtils';

const TASK_TYPES = [
  { value: 'ADD_CONTENT', label: 'Add Content' },
  { value: 'CREATE_NOTIFICATION', label: 'Create Notification' },
  { value: 'REVIEW_CONTENT', label: 'Review Content' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  IN_PROGRESS: { bg: '#DBEAFE', color: '#1E40AF', label: 'In Progress' },
  SUBMITTED: { bg: '#EDE9FE', color: '#5B21B6', label: 'Submitted' },
  APPROVED:  { bg: '#D1FAE5', color: '#065F46', label: 'Approved' },
  REJECTED:  { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
};

interface Task {
  id: string;
  title: string;
  description: string;
  taskType: string;
  status: string;
  assignedToId: string;
  dueDate: string | null;
  submissionNote: string | null;
  submissionUrl: string | null;
  reviewNote: string | null;
  createdAt: string;
  assignedTo?: { fullName: string; email: string };
}

const HodFaculty: React.FC = () => {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Assign task modal
  const [taskModal, setTaskModal] = useState<{ open: boolean; faculty: any | null }>({ open: false, faculty: null });
  const [taskForm, setTaskForm] = useState({ taskType: 'ADD_CONTENT', title: '', description: '', dueDate: '' });
  const [taskLoading, setTaskLoading] = useState(false);

  // View tasks modal
  const [viewTasksModal, setViewTasksModal] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED' as 'APPROVED' | 'REJECTED', reviewNote: '' });
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await governanceService.getFacultyUsers();
      setFaculty(Array.isArray(res) ? res : (res as any).data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load faculty');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await governanceService.getAssignedTasks();
      setTasks(Array.isArray(res) ? res : []);
    } catch { setTasks([]); }
    finally { setTasksLoading(false); }
  }, []);

  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); } }, [success]);

  const openTaskModal = (f: any) => {
    setTaskModal({ open: true, faculty: f });
    setTaskForm({ taskType: 'ADD_CONTENT', title: '', description: '', dueDate: '' });
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskModal.faculty) return;
    setTaskLoading(true);
    try {
      const res = await governanceService.assignTaskToFaculty(taskModal.faculty.id, taskForm);
      setSuccess((res as any).message || 'Task assigned successfully');
      setTaskModal({ open: false, faculty: null });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign task');
    } finally { setTaskLoading(false); }
  };

  const openViewTasks = () => {
    setViewTasksModal(true);
    fetchTasks();
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal.task) return;
    setReviewLoading(true);
    try {
      await governanceService.reviewTask(reviewModal.task.id, reviewForm);
      setSuccess(`Task ${reviewForm.status === 'APPROVED' ? 'approved' : 'rejected'} successfully`);
      setReviewModal({ open: false, task: null });
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Review failed');
    } finally { setReviewLoading(false); }
  };

  const filtered = faculty.filter(f =>
    !search || f.fullName?.toLowerCase().includes(search.toLowerCase()) || f.email?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingReviews = tasks.filter(t => t.status === 'SUBMITTED').length;

  return (
    <HodLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <UserCog size={24} color="#7C3AED" />
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Department Faculty</h1>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--bo-text-muted)' }}>{filtered.length} members</span>
        <button onClick={openViewTasks} className="bo-btn bo-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, position: 'relative' }}>
          <Eye size={14} /> View Tasks
          {pendingReviews > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              {pendingReviews}
            </span>
          )}
        </button>
        <button onClick={fetchFaculty} className="bo-btn bo-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ paddingLeft: 32, width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
      </div>

      <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>No faculty found in your department</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--bo-border)' }}>
                {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--bo-border)', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{f.fullName}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--bo-text-muted)' }}>{f.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#F5F3FF', color: '#7C3AED' }}>Faculty</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: f.status === 'ACTIVE' ? '#ECFDF5' : '#FEF2F2', color: f.status === 'ACTIVE' ? '#059669' : '#DC2626' }}>
                      {f.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--bo-text-muted)' }}>{f.lastLoginAt ? formatDate(f.lastLoginAt) : 'Never'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => openTaskModal(f)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #D97706', background: '#FFFBEB', color: '#D97706', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                      <ClipboardList size={13} /> Assign Task
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Assign Task Modal */}
      {taskModal.open && taskModal.faculty && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="bo-card" style={{ padding: 28, width: 500, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Assign Task</h3>
                <p style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>To: <strong>{taskModal.faculty.fullName}</strong> ({taskModal.faculty.email})</p>
              </div>
              <button onClick={() => setTaskModal({ open: false, faculty: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 2 }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAssignTask}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block' }}>Task Type</label>
                <select value={taskForm.taskType} onChange={e => setTaskForm(f => ({ ...f, taskType: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                  {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block' }}>Task Title *</label>
                <input type="text" required value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Prepare chapter 5 notes for Anatomy" maxLength={100}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block' }}>Description *</label>
                <textarea required value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Describe what needs to be done…" maxLength={500}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block' }}>Due Date (optional)</label>
                <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setTaskModal({ open: false, faculty: null })} className="bo-btn bo-btn-outline" disabled={taskLoading}>Cancel</button>
                <button type="submit" className="bo-btn bo-btn-primary" style={{ background: '#D97706', borderColor: '#D97706', display: 'flex', alignItems: 'center', gap: 6 }} disabled={taskLoading}>
                  <ClipboardList size={14} /> {taskLoading ? 'Sending…' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Tasks Modal */}
      {viewTasksModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="bo-card" style={{ padding: 28, width: 760, maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>Assigned Tasks</h3>
              <button onClick={() => setViewTasksModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)' }}><X size={18} /></button>
            </div>
            {tasksLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>Loading tasks…</div>
            ) : tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>No tasks assigned yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tasks.map(task => {
                  const badge = STATUS_BADGE[task.status] || STATUS_BADGE.PENDING;
                  return (
                    <div key={task.id} style={{ border: '1px solid var(--bo-border)', borderRadius: 10, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                            To: <strong>{task.assignedTo?.fullName || 'Faculty'}</strong> • Type: {TASK_TYPES.find(t => t.value === task.taskType)?.label || task.taskType}
                            {task.dueDate && <> • Due: {formatDate(task.dueDate)}</>}
                          </div>
                        </div>
                        <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
                          {badge.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: task.submissionNote ? 8 : 0 }}>{task.description}</p>
                      {task.submissionNote && (
                        <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 12px', marginTop: 8, fontSize: 13 }}>
                          <strong>Faculty Submission:</strong> {task.submissionNote}
                          {task.submissionUrl && <div style={{ marginTop: 4 }}><a href={task.submissionUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB' }}>View submitted content ↗</a></div>}
                        </div>
                      )}
                      {task.reviewNote && (
                        <div style={{ background: task.status === 'APPROVED' ? '#D1FAE5' : '#FEE2E2', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 13 }}>
                          <strong>Your Review:</strong> {task.reviewNote}
                        </div>
                      )}
                      {task.status === 'SUBMITTED' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button onClick={() => { setReviewModal({ open: true, task }); setReviewForm({ status: 'APPROVED', reviewNote: '' }); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            <CheckCircle size={13} /> Review & Approve
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.open && reviewModal.task && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="bo-card" style={{ padding: 28, width: 460, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Review Task</h3>
              <button onClick={() => setReviewModal({ open: false, task: null })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 16 }}>Task: <strong>{reviewModal.task.title}</strong></p>
            <form onSubmit={handleReview}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Decision *</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['APPROVED', 'REJECTED'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setReviewForm(f => ({ ...f, status: s }))}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${reviewForm.status === s ? (s === 'APPROVED' ? '#059669' : '#DC2626') : 'var(--bo-border)'}`, background: reviewForm.status === s ? (s === 'APPROVED' ? '#ECFDF5' : '#FEE2E2') : 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: s === 'APPROVED' ? '#065F46' : '#991B1B' }}>
                      {s === 'APPROVED' ? <CheckCircle size={14} /> : <XCircle size={14} />} {s === 'APPROVED' ? 'Approve' : 'Reject'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Review Note (optional)</label>
                <textarea value={reviewForm.reviewNote} onChange={e => setReviewForm(f => ({ ...f, reviewNote: e.target.value }))} rows={3} placeholder="Add feedback for the faculty…"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setReviewModal({ open: false, task: null })} className="bo-btn bo-btn-outline" disabled={reviewLoading}>Cancel</button>
                <button type="submit" className="bo-btn bo-btn-primary" disabled={reviewLoading}
                  style={{ background: reviewForm.status === 'APPROVED' ? '#059669' : '#DC2626', borderColor: reviewForm.status === 'APPROVED' ? '#059669' : '#DC2626' }}>
                  {reviewLoading ? 'Saving…' : `${reviewForm.status === 'APPROVED' ? 'Approve' : 'Reject'} Task`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HodLayout>
  );
};

export default HodFaculty;
