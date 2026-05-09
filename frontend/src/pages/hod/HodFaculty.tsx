/**
 * HOD Faculty page — view department faculty and assign work tasks.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import HodLayout from '../../components/hod/HodLayout';
import governanceService, { Faculty, FacultyAssignment } from '../../services/governance.service';
import { UserCog, Search, RefreshCw, ClipboardList, X } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';
import { formatDate } from '../../utils/dateUtils';

const TASK_TYPES = [
  { value: 'ADD_CONTENT', label: 'Add Content' },
  { value: 'CREATE_NOTIFICATION', label: 'Create Notification' },
  { value: 'REVIEW_CONTENT', label: 'Review Content' },
  { value: 'OTHER', label: 'Other' },
];

const HodFaculty: React.FC = () => {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Task assignment modal state
  const [taskModal, setTaskModal] = useState<{ open: boolean; faculty: Faculty | null }>({ open: false, faculty: null });
  const [taskForm, setTaskForm] = useState({ taskType: 'ADD_CONTENT', title: '', description: '', dueDate: '' });
  const [taskLoading, setTaskLoading] = useState(false);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const res = await governanceService.getFacultyUsers();
      setFaculty(Array.isArray(res) ? res : (res as any).data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load faculty');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); } }, [success]);

  const openTaskModal = (f: Faculty) => {
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

  const filtered = faculty.filter(f =>
    !search || f.fullName?.toLowerCase().includes(search.toLowerCase()) || f.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <HodLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <UserCog size={24} color="#7C3AED" />
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Department Faculty</h1>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--bo-text-muted)' }}>{filtered.length} members</span>
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
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>No faculty found</div>
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
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: f.role === 'COLLEGE_HOD' ? '#EFF6FF' : '#F5F3FF', color: f.role === 'COLLEGE_HOD' ? '#2563EB' : '#7C3AED' }}>
                      {f.role === 'COLLEGE_HOD' ? 'HOD' : 'Faculty'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: f.status === 'ACTIVE' ? '#ECFDF5' : '#FEF2F2', color: f.status === 'ACTIVE' ? '#059669' : '#DC2626' }}>
                      {f.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--bo-text-muted)' }}>{f.lastLoginAt ? formatDate(f.lastLoginAt) : 'Never'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => openTaskModal(f)} title="Assign Task"
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
                <input type="text" required value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Add chapter 5 content for Anatomy" maxLength={100}
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
    </HodLayout>
  );
};

export default HodFaculty;
