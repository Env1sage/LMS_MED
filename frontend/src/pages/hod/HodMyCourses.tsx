import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HodLayout from '../../components/hod/HodLayout';
import { courseService } from '../../services/course.service';
import { BookOpen, Plus, Search, Eye, Edit2, Users, BarChart3, Trash2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';
import { formatDate } from '../../utils/dateUtils';
import apiService from '../../services/api.service';

const ACCENT = '#2563EB';

const YEAR_LABELS: Record<string, string> = {
  YEAR_1: 'Year 1', YEAR_2: 'Year 2',
  YEAR_3_PART1: 'Year 3 Part 1', YEAR_3_PART2: 'Year 3 Part 2',
  INTERNSHIP: 'Internship',
  FIRST_YEAR: 'Year 1', SECOND_YEAR: 'Year 2',
  YEAR_3_MINOR: 'Year 3 Part 1', YEAR_3_MAJOR: 'Year 3 Part 2',
  THIRD_YEAR: 'Year 3 Part 1', FOURTH_YEAR: 'Year 3 Part 2', FIFTH_YEAR: 'Internship',
  PART_1: 'Year 3 Part 1', PART_2: 'Year 3 Part 2',
};

interface ReviewModal { courseId: string; courseTitle: string; teacherName: string; }

const HodMyCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [pendingCourses, setPendingCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'pending' | 'mine'>('pending');
  const [rejectModal, setRejectModal] = useState<ReviewModal | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [mine, pending] = await Promise.all([
        courseService.getAll({ page: 1, limit: 100 }),
        courseService.getPendingReview(),
      ]);
      setCourses(mine.data || []);
      setPendingCourses(Array.isArray(pending) ? pending : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (courseId: string, title: string, note?: string) => {
    if (!window.confirm(`Approve and publish "${title}" in your name?`)) return;
    try {
      setActionLoading(courseId);
      await courseService.hodApprove(courseId, note);
      setSuccess(`"${title}" approved and published!`);
      setTimeout(() => setSuccess(''), 4000);
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve');
      setTimeout(() => setError(''), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    try {
      setActionLoading(rejectModal.courseId);
      await courseService.hodReject(rejectModal.courseId, rejectReason);
      setSuccess(`"${rejectModal.courseTitle}" returned to teacher for revision.`);
      setTimeout(() => setSuccess(''), 4000);
      setRejectModal(null);
      setRejectReason('');
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject');
      setTimeout(() => setError(''), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (id: string) => {
    if (!window.confirm('Publish this course?')) return;
    try {
      await courseService.publish(id);
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to publish');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this course?')) return;
    try {
      await courseService.delete(id);
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
      setTimeout(() => setError(''), 5000);
    }
  };

  const filtered = courses.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.title?.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) return (
    <HodLayout>
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
        <div className="loading-title">Loading Courses...</div>
        <div className="loading-bar-track"><div className="loading-bar-fill"></div></div>
      </div>
    </HodLayout>
  );

  return (
    <HodLayout>
      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 460, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#111827' }}>Return Course for Revision</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280' }}>"{rejectModal.courseTitle}" by {rejectModal.teacherName}</p>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Reason for revision (required)</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain what the teacher should fix or improve..."
              rows={4}
              style={{ width: '100%', padding: 10, border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                style={{ padding: '9px 18px', border: '1px solid #D1D5DB', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || !!actionLoading}
                style={{ padding: '9px 18px', border: 'none', borderRadius: 8, background: '#EF4444', color: '#fff', cursor: !rejectReason.trim() ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: !rejectReason.trim() ? 0.6 : 1 }}>
                {actionLoading ? 'Processing...' : 'Return for Revision'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Course Approvals & My Courses</h1>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>
            {pendingCourses.length > 0
              ? <span style={{ color: '#B45309', fontWeight: 600 }}>⚠️ {pendingCourses.length} course(s) awaiting your approval</span>
              : 'No courses pending approval'}
          </p>
        </div>
        <button className="bo-btn bo-btn-primary" style={{ background: ACCENT, borderColor: ACCENT }} onClick={() => navigate('/hod/create-course')}>
          <Plus size={16} /> Create Course
        </button>
      </div>

      {error && <div style={{ padding: 12, background: '#FEE2E2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
      {success && <div style={{ padding: 12, background: '#D1FAE5', color: '#065F46', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>✓ {success}</div>}

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #E5E7EB' }}>
        <button onClick={() => setActiveTab('pending')}
          style={{ padding: '10px 22px', border: 'none', borderBottom: activeTab === 'pending' ? `2px solid ${ACCENT}` : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: activeTab === 'pending' ? 700 : 400, color: activeTab === 'pending' ? ACCENT : '#6B7280', marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={15} />
          Pending Approval
          {pendingCourses.length > 0 && (
            <span style={{ padding: '1px 8px', background: '#FEF3C7', color: '#B45309', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
              {pendingCourses.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('mine')}
          style={{ padding: '10px 22px', border: 'none', borderBottom: activeTab === 'mine' ? `2px solid ${ACCENT}` : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: activeTab === 'mine' ? 700 : 400, color: activeTab === 'mine' ? ACCENT : '#6B7280', marginBottom: -2 }}>
          My Published Courses ({courses.length})
        </button>
      </div>

      {/* ── PENDING APPROVAL TAB ── */}
      {activeTab === 'pending' && (
        <>
          {pendingCourses.length === 0 ? (
            <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
              <CheckCircle size={48} style={{ color: '#10B981', opacity: 0.4, marginBottom: 16 }} />
              <h3 style={{ color: 'var(--bo-text-secondary)', fontWeight: 500 }}>No courses pending review</h3>
              <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>When teachers submit courses for approval, they'll appear here</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {pendingCourses.map((c: any) => (
                <div key={c.id} className="bo-card" style={{ padding: 20, borderLeft: '4px solid #F59E0B' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{c.title}</h3>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#FEF3C7', color: '#92400E', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> Pending Review
                        </span>
                      </div>
                      {c.description && <p style={{ color: 'var(--bo-text-secondary)', fontSize: 13, margin: '0 0 8px' }}>{c.description.substring(0, 150)}</p>}
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                        <span>👤 Teacher: <strong>{c.teacherName || 'Unknown'}</strong></span>
                        <span>📅 {YEAR_LABELS[c.academicYear] || c.academicYear?.replace(/_/g, ' ')}</span>
                        <span>📚 {c.stepCount || 0} steps</span>
                        <span>🕐 Submitted: {formatDate(c.submittedAt || c.updatedAt)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 16, flexShrink: 0 }}>
                      <button onClick={() => navigate(`/hod/courses/${c.id}`)} title="View Full Course"
                        style={{ padding: '8px 14px', border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: 'var(--bo-text-secondary)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                        <Eye size={15} /> Review
                      </button>
                      <button
                        onClick={() => handleApprove(c.id, c.title)}
                        disabled={actionLoading === c.id}
                        style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#10B981', color: '#fff', cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CheckCircle size={15} /> {actionLoading === c.id ? '...' : 'Approve & Publish'}
                      </button>
                      <button
                        onClick={() => setRejectModal({ courseId: c.id, courseTitle: c.title, teacherName: c.teacherName || 'Teacher' })}
                        disabled={actionLoading === c.id}
                        style={{ padding: '8px 16px', border: '1px solid #EF4444', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <XCircle size={15} /> Return
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MY COURSES TAB ── */}
      {activeTab === 'mine' && (
        <>
          <div className="bo-card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
              <input type="text" placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff' }}>
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
              <BookOpen size={48} style={{ color: 'var(--bo-text-muted)', opacity: 0.4, marginBottom: 16 }} />
              <h3 style={{ color: 'var(--bo-text-secondary)', fontWeight: 500 }}>No courses found</h3>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {filtered.map(c => (
                <div key={c.id} className="bo-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, cursor: 'pointer' }} onClick={() => navigate(`/hod/courses/${c.id}`)}>
                          {c.title}
                        </h3>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.status === 'PUBLISHED' ? '#D1FAE5' : '#FEF3C7', color: c.status === 'PUBLISHED' ? '#065F46' : '#92400E' }}>
                          {c.status}
                        </span>
                      </div>
                      {c.description && <p style={{ color: 'var(--bo-text-secondary)', fontSize: 13, margin: '0 0 8px' }}>{c.description.substring(0, 120)}{c.description.length > 120 ? '...' : ''}</p>}
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                        <span>📅 {YEAR_LABELS[c.academicYear] || c.academicYear?.replace(/_/g, ' ')}</span>
                        <span>📚 {c._count?.learningFlowSteps || 0} steps</span>
                        <span>👥 {c._count?.courseAssignments || 0} assigned</span>
                        <span>🕐 {formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
                      <button onClick={() => navigate(`/hod/courses/${c.id}`)} title="View"
                        style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: 'var(--bo-text-secondary)' }}>
                        <Eye size={16} />
                      </button>
                      {c.status === 'DRAFT' && (
                        <>
                          <button onClick={() => navigate(`/hod/edit-course/${c.id}`)} title="Edit"
                            style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#F59E0B' }}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handlePublish(c.id)} title="Publish"
                            style={{ padding: 8, border: '1px solid #10B981', borderRadius: 8, background: '#D1FAE5', cursor: 'pointer', color: '#065F46', fontSize: 12, fontWeight: 600 }}>
                            🚀
                          </button>
                        </>
                      )}
                      {c.status === 'PUBLISHED' && (
                        <>
                          <button onClick={() => navigate(`/hod/assign-course/${c.id}`)} title="Assign to Students"
                            style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#3B82F6' }}>
                            <Users size={16} />
                          </button>
                          <button onClick={() => navigate(`/hod/courses/${c.id}/analytics`)} title="Analytics"
                            style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: ACCENT }}>
                            <BarChart3 size={16} />
                          </button>
                        </>
                      )}
                      {c.status === 'DRAFT' && !c._count?.courseAssignments && (
                        <button onClick={() => handleDelete(c.id)} title="Delete"
                          style={{ padding: 8, border: '1px solid #FCA5A5', borderRadius: 8, background: '#FEE2E2', cursor: 'pointer', color: '#DC2626' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </HodLayout>
  );
};

export default HodMyCourses;
