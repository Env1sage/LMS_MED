import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { courseService } from '../../services/course.service';
import { BookOpen, Plus, Search, Eye, Edit2, Users, BarChart3, Trash2 } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';

const FacultyMyCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

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

  const handlePublish = async (id: string) => {
    if (!window.confirm('Publish this course? Once published, the learning flow cannot be modified.')) return;
    try {
      await courseService.publish(id);
      loadCourses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this course? This cannot be undone.')) return;
    try {
      await courseService.delete(id);
      loadCourses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = courses.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (yearFilter !== 'ALL' && c.academicYear !== yearFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.title?.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s);
    }
    return true;
  });

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
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>{courses.length} courses total</p>
        </div>
        <button className="bo-btn bo-btn-primary" style={{ background: ACCENT, borderColor: ACCENT }} onClick={() => navigate('/faculty/create-course')}>
          <Plus size={16} /> Create Course
        </button>
      </div>

      {error && <div style={{ padding: 12, background: '#FEE2E2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

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
          <option value="PUBLISHED">Published</option>
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff' }}>
          <option value="ALL">All Years</option>
          {uniqueYears.map(y => <option key={y} value={y}>{y.replace('_', ' ')}</option>)}
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
          {filtered.map(c => (
            <div key={c.id} className="bo-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--bo-text-primary)', cursor: 'pointer' }} onClick={() => navigate(`/faculty/courses/${c.id}`)}>
                      {c.title}
                    </h3>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: c.status === 'PUBLISHED' ? '#D1FAE5' : '#FEF3C7',
                      color: c.status === 'PUBLISHED' ? '#065F46' : '#92400E',
                    }}>{c.status}</span>
                  </div>
                  {c.description && <p style={{ color: 'var(--bo-text-secondary)', fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 }}>{c.description.substring(0, 120)}{c.description.length > 120 ? '...' : ''}</p>}
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                    <span>📅 {({'YEAR_1':'Year 1','YEAR_2':'Year 2','YEAR_3':'Year 3','YEAR_3_MINOR':'Year 3 (Part 1)','YEAR_3_MAJOR':'Year 3 (Part 2)','YEAR_4':'Year 4','YEAR_5':'Year 5','FIRST_YEAR':'1st Year','SECOND_YEAR':'2nd Year','THIRD_YEAR':'3rd Year','FOURTH_YEAR':'4th Year','FIFTH_YEAR':'5th Year','INTERNSHIP':'Internship','PART_1':'Part 1','PART_2':'Part 2'} as Record<string,string>)[c.academicYear] || c.academicYear?.replace(/_/g, ' ')}</span>
                    <span>📚 {c.learning_flow_steps?.length || c._count?.learningFlowSteps || 0} steps</span>
                    <span>👥 {c._count?.courseAssignments || c._count?.assignments || 0} assigned</span>
                    <span>🕐 {new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
                  <button onClick={() => navigate(`/faculty/courses/${c.id}`)} title="View" style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: 'var(--bo-text-secondary)' }}>
                    <Eye size={16} />
                  </button>
                  {c.status === 'DRAFT' && (
                    <>
                      <button onClick={() => navigate(`/faculty/edit-course/${c.id}`)} title="Edit" style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#F59E0B' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handlePublish(c.id)} title="Publish" style={{ padding: 8, border: '1px solid #10B981', borderRadius: 8, background: '#D1FAE5', cursor: 'pointer', color: '#065F46', fontSize: 12, fontWeight: 600 }}>
                        🚀
                      </button>
                    </>
                  )}
                  {c.status === 'PUBLISHED' && (
                    <>
                      <button onClick={() => navigate(`/faculty/assign-course/${c.id}`)} title="Assign" style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#3B82F6' }}>
                        <Users size={16} />
                      </button>
                      <button onClick={() => navigate(`/faculty/courses/${c.id}/analytics`)} title="Analytics" style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: ACCENT }}>
                        <BarChart3 size={16} />
                      </button>
                    </>
                  )}
                  {c.status === 'DRAFT' && (!c._count?.courseAssignments) && (
                    <button onClick={() => handleDelete(c.id)} title="Delete" style={{ padding: 8, border: '1px solid #FCA5A5', borderRadius: 8, background: '#FEE2E2', cursor: 'pointer', color: '#DC2626' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </FacultyLayout>
  );
};

export default FacultyMyCourses;
