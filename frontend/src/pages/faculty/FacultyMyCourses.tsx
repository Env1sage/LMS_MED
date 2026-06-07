import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { courseService } from '../../services/course.service';
import { BookOpen, Plus, Search, Eye, Edit2, Users, BarChart3, Trash2, Send, AlertCircle, Clock } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';
import { formatDate } from '../../utils/dateUtils';

const ACCENT = '#7C3AED';

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:          { bg: '#FEF3C7', color: '#92400E', label: 'Draft' },
  PENDING_REVIEW: { bg: '#DBEAFE', color: '#1E40AF', label: 'Pending HOD Review' },
  PUBLISHED:      { bg: '#D1FAE5', color: '#065F46', label: 'Published' },
  ARCHIVED:       { bg: '#F3F4F6', color: '#6B7280', label: 'Archived' },
};

const FacultyMyCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'NORMAL' | 'SELF_PACED'>('ALL');
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await courseService.getAll({ page: 1, limit: 100 });
      setCourses(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForReview = async (id: string, title: string) => {
    if (!window.confirm(`Submit "${title}" to HOD for review and approval?\n\nOnce submitted, you cannot edit it until the HOD reviews it.`)) return;
    try {
      setSubmitting(id);
      setError('');
      await courseService.submitForReview(id);
      setSuccess(`"${title}" submitted to HOD for review!`);
      setTimeout(() => setSuccess(''), 4000);
      loadCourses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit for review');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSubmitting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this course? This cannot be undone.')) return;
    try {
      await courseService.delete(id);
      loadCourses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
      setTimeout(() => setError(''), 5000);
    }
  };

  const filtered = courses.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (yearFilter !== 'ALL' && c.academicYear !== yearFilter) return false;
    if (typeFilter !== 'ALL') {
      const ct = c.courseType || 'NORMAL';
      if (ct !== typeFilter) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return c.title?.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s);
    }
    return true;
  });

  const pendingCount = courses.filter(c => c.status === 'PENDING_REVIEW').length;
  const uniqueYears = courses.map(c => c.academicYear).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).sort();

  if (loading) return (
    <FacultyLayout>
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
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </FacultyLayout>
  );

  return (
    <FacultyLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>My Courses</h1>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>
            {courses.length} courses total
            {pendingCount > 0 && <span style={{ marginLeft: 8, color: '#1E40AF', fontWeight: 600 }}>· {pendingCount} awaiting HOD review</span>}
          </p>
        </div>
        <button className="bo-btn bo-btn-primary" style={{ background: ACCENT, borderColor: ACCENT }} onClick={() => navigate('/faculty/create-course')}>
          <Plus size={16} /> Create Course
        </button>
      </div>

      {/* Maker-Checker Info Banner */}
      <div style={{ padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <AlertCircle size={18} style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: '#1E40AF', lineHeight: 1.5 }}>
          <strong>Maker-Checker Process:</strong> Build your course (Draft) → Submit for HOD Review → HOD approves and publishes.
          Courses cannot be published directly — HOD approval is required.
        </div>
      </div>

      {error && <div style={{ padding: 12, background: '#FEE2E2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
      {success && <div style={{ padding: 12, background: '#D1FAE5', color: '#065F46', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>✓ {success}</div>}

      {/* Course Type Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([{ key: 'ALL', label: 'All Courses' }, { key: 'NORMAL', label: 'Regular' }, { key: 'SELF_PACED', label: 'Self-Paced' }] as const).map(btn => (
          <button key={btn.key} onClick={() => setTypeFilter(btn.key)}
            style={{
              padding: '7px 18px', borderRadius: 20, fontSize: 13, fontWeight: typeFilter === btn.key ? 600 : 400, cursor: 'pointer', border: 'none',
              background: typeFilter === btn.key ? ACCENT : '#F3F4F6',
              color: typeFilter === btn.key ? '#fff' : 'var(--bo-text-secondary)',
              transition: 'all 0.15s',
            }}>
            {btn.label}
            {btn.key !== 'ALL' && (
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.85 }}>
                ({courses.filter(c => (c.courseType || 'NORMAL') === btn.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bo-card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
          <input
            type="text" placeholder="Search courses..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff' }}>
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff' }}>
          <option value="ALL">All Years</option>
          {uniqueYears.map(y => <option key={y} value={y}>{y.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Course Cards */}
      {filtered.length === 0 ? (
        <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
          <BookOpen size={48} style={{ color: 'var(--bo-text-muted)', opacity: 0.4, marginBottom: 16 }} />
          <h3 style={{ color: 'var(--bo-text-secondary)', fontWeight: 500 }}>No courses found</h3>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>Try adjusting your filters or create a new course</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filtered.map(c => {
            const st = STATUS_STYLE[c.status] || STATUS_STYLE.DRAFT;
            const rejectionReason = c.metadata?.rejectionReason;
            const isPending = c.status === 'PENDING_REVIEW';
            const isRejected = c.status === 'DRAFT' && rejectionReason;
            return (
              <div key={c.id} className="bo-card" style={{ padding: 20, borderLeft: isPending ? '4px solid #3B82F6' : isRejected ? '4px solid #EF4444' : undefined }}>
                {/* Rejection reason alert */}
                {isRejected && (
                  <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#DC2626', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Returned for revision</strong> by HOD — {rejectionReason}
                      <span style={{ marginLeft: 8, color: '#6B7280', fontSize: 11 }}>Rejected by {c.metadata?.rejectedBy}</span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--bo-text-primary)', cursor: 'pointer' }}
                        onClick={() => navigate(`/faculty/courses/${c.id}`)}>
                        {c.title}
                      </h3>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isPending && <Clock size={10} />}
                        {st.label}
                      </span>
                      {(c.courseType === 'SELF_PACED') && (
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#EDE9FE', color: ACCENT }}>Self-Paced</span>
                      )}
                    </div>
                    {c.description && <p style={{ color: 'var(--bo-text-secondary)', fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 }}>{c.description.substring(0, 120)}{c.description.length > 120 ? '...' : ''}</p>}
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                      <span>📅 {c.academicYear?.replace(/_/g, ' ')}</span>
                      <span>📚 {c.learning_flow_steps?.length || c._count?.learningFlowSteps || 0} steps</span>
                      <span>👥 {c._count?.course_assignments || c._count?.courseAssignments || 0} assigned</span>
                      <span>🕐 {formatDate(c.createdAt)}</span>
                    </div>
                    {isPending && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> Awaiting HOD review — you cannot edit until reviewed
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
                    <button onClick={() => navigate(`/faculty/courses/${c.id}`)} title="View"
                      style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: 'var(--bo-text-secondary)' }}>
                      <Eye size={16} />
                    </button>

                    {/* DRAFT: edit + submit for review */}
                    {c.status === 'DRAFT' && (
                      <>
                        <button onClick={() => navigate(`/faculty/edit-course/${c.id}`)} title="Edit"
                          style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#F59E0B' }}>
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleSubmitForReview(c.id, c.title)}
                          disabled={submitting === c.id || (c.learning_flow_steps?.length || 0) === 0}
                          title={!c.learning_flow_steps?.length ? 'Add learning steps first' : 'Submit for HOD Review'}
                          style={{
                            padding: '8px 14px', border: '1px solid #3B82F6', borderRadius: 8,
                            background: submitting === c.id ? '#BFDBFE' : '#EFF6FF',
                            cursor: (submitting === c.id || !c.learning_flow_steps?.length) ? 'not-allowed' : 'pointer',
                            color: '#1E40AF', fontSize: 12, fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 5, opacity: !c.learning_flow_steps?.length ? 0.5 : 1,
                          }}>
                          <Send size={13} />
                          {submitting === c.id ? 'Submitting...' : 'Submit for Review'}
                        </button>
                      </>
                    )}

                    {/* PENDING_REVIEW: read-only, cannot edit */}
                    {isPending && (
                      <div style={{ padding: '8px 14px', border: '1px solid #BFDBFE', borderRadius: 8, background: '#DBEAFE', color: '#1E40AF', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={13} /> Under Review
                      </div>
                    )}

                    {/* PUBLISHED: assign + analytics */}
                    {c.status === 'PUBLISHED' && (
                      <>
                        <button onClick={() => navigate(`/faculty/assign-course/${c.id}`)} title="Assign"
                          style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#3B82F6' }}>
                          <Users size={16} />
                        </button>
                        <button onClick={() => navigate(`/faculty/courses/${c.id}/analytics`)} title="Analytics"
                          style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: ACCENT }}>
                          <BarChart3 size={16} />
                        </button>
                      </>
                    )}

                    {/* Delete only DRAFT with no assignments */}
                    {c.status === 'DRAFT' && (!c._count?.course_assignments) && (
                      <button onClick={() => handleDelete(c.id)} title="Delete"
                        style={{ padding: 8, border: '1px solid #FCA5A5', borderRadius: 8, background: '#FEE2E2', cursor: 'pointer', color: '#DC2626' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </FacultyLayout>
  );
};

export default FacultyMyCourses;
