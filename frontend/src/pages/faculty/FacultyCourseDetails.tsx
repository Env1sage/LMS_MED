import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { courseService } from '../../services/course.service';
import learningUnitService from '../../services/learning-unit.service';
import competencyService from '../../services/competency.service';
import { ArrowLeft, Edit, Send, BarChart3, Trash2, BookOpen, Users, Clock, Eye } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';

interface Course {
  id: string;
  title: string;
  description: string;
  academicYear: string;
  status: string;
  createdAt: string;
  learning_flow_steps: Array<{
    id: string;
    stepOrder: number;
    stepType: string;
    mandatory: boolean;
    completionCriteria: any;
    learning_units: { id: string; title: string; description: string; contentType: string; type: string; competencyIds: string[] };
  }>;
  course_competencies: Array<{ competencies: { id: string; title: string; description: string } }>;
  _count: { courseAssignments: number };
}

const FacultyCourseDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [competencies, setCompetencies] = useState<any[]>([]);

  useEffect(() => { loadCourse(); }, [id]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const [data, compsRes] = await Promise.all([
        courseService.getById(id!),
        competencyService.getAll({ page: 1, limit: 500 }),
      ]);
      setCourse(data);
      setCompetencies(compsRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Publish this course? The learning flow cannot be modified after publishing.')) return;
    try {
      await courseService.publish(id!);
      loadCourse();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this course? This action cannot be undone.')) return;
    try {
      await courseService.delete(id!);
      navigate('/faculty/courses');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const getCompetencyNames = (ids: string[] | undefined) => {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => {
      const comp = competencies.find((c: any) => c.id === id);
      return comp ? (comp.code ? `${comp.code} - ${comp.title}` : comp.title) : null;
    }).filter(Boolean);
  };

  const handleViewContent = async (unitId: string) => {
    try {
      // Navigate to the faculty content viewer
      navigate(`/faculty/content/${unitId}/view`);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to open content';
      alert(`Error: ${errorMsg}`);
    }
  };

  const getTypeBadge = (type: string) => {
    const t = type === 'NOTES' ? 'MCQ' : type;
    const colors: Record<string, { bg: string; color: string }> = {
      VIDEO: { bg: '#DBEAFE', color: '#1D4ED8' },
      BOOK: { bg: '#FEF3C7', color: '#92400E' },
      MCQ: { bg: '#F5F3FF', color: '#6D28D9' },
    };
    const c = colors[t] || { bg: '#E5E7EB', color: '#374151' };
    return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>{t === 'BOOK' ? 'E-Book' : t}</span>;
  };

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
        <div className="loading-title">Loading Course Details...</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </FacultyLayout>
  );

  if (error || !course) {
    return (
      <FacultyLayout>
        <div className="bo-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#DC2626', marginBottom: 16 }}>{error || 'Course not found'}</p>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/courses')}>Back to Courses</button>
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/faculty/courses')} style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}><ArrowLeft size={18} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>{course.title}</h1>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: course.status === 'PUBLISHED' ? '#D1FAE5' : '#FEF3C7',
              color: course.status === 'PUBLISHED' ? '#065F46' : '#92400E',
            }}>{course.status}</span>
          </div>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>Course Details</p>
        </div>
      </div>

      {/* Course Info */}
      <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Academic Year</div><div style={{ fontWeight: 600 }}>{({'YEAR_1':'Year 1','YEAR_2':'Year 2','YEAR_3':'Year 3','YEAR_3_MINOR':'Year 3 (Part 1)','YEAR_3_MAJOR':'Year 3 (Part 2)','YEAR_4':'Year 4','YEAR_5':'Year 5','FIRST_YEAR':'1st Year','SECOND_YEAR':'2nd Year','THIRD_YEAR':'3rd Year','FOURTH_YEAR':'4th Year','FIFTH_YEAR':'5th Year','INTERNSHIP':'Internship','PART_1':'Part 1','PART_2':'Part 2'} as Record<string,string>)[course.academicYear] || course.academicYear?.replace(/_/g, ' ')}</div></div>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Created</div><div style={{ fontWeight: 600 }}>{formatDate(course.createdAt)}</div></div>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Learning Steps</div><div style={{ fontWeight: 600 }}>{course.learning_flow_steps?.length || 0}</div></div>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Assignments</div><div style={{ fontWeight: 600 }}>{course._count?.courseAssignments || 0}</div></div>
        </div>
        {course.description && (
          <div style={{ padding: 14, background: 'var(--bo-bg)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Description</div>
            <p style={{ fontSize: 14, color: 'var(--bo-text-primary)', margin: 0, lineHeight: 1.6 }}>{course.description}</p>
          </div>
        )}
      </div>

      {/* Competencies */}
      {course.course_competencies?.length > 0 && (
        <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--bo-text-primary)' }}>Competencies ({course.course_competencies.length})</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {course.course_competencies.map(cc => (
              <div key={cc.competencies.id} style={{ padding: 12, background: 'var(--bo-bg)', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{cc.competencies.title}</div>
                {cc.competencies.description && <p style={{ fontSize: 12, color: 'var(--bo-text-secondary)', margin: '4px 0 0' }}>{cc.competencies.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Flow */}
      <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--bo-text-primary)' }}>Learning Flow ({course.learning_flow_steps?.length || 0} steps)</h3>
        {!course.learning_flow_steps?.length ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--bo-text-muted)' }}>No learning flow defined</div>
        ) : (
          <div style={{ display: 'grid', gap: 0 }}>
            {course.learning_flow_steps.map((step, idx) => (
              <div key={step.id} style={{ display: 'flex', gap: 16 }}>
                {/* Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {step.stepOrder}
                  </div>
                  {idx < course.learning_flow_steps.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: `${ACCENT}30`, minHeight: 20 }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ flex: 1, paddingBottom: 16 }}>
                  <div style={{ padding: 14, background: 'var(--bo-bg)', borderRadius: 8, border: '1px solid var(--bo-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bo-text-primary)' }}>{step.learning_units?.title || 'Learning Unit'}</div>
                        {step.learning_units?.description && <p style={{ fontSize: 12, color: 'var(--bo-text-secondary)', margin: '4px 0 0' }}>{step.learning_units.description}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {getTypeBadge(step.stepType)}
                        {step.mandatory && <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#FEE2E2', color: '#DC2626' }}>REQUIRED</span>}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewContent(step.learning_units?.id); }}
                          style={{ padding: '4px 10px', border: '1px solid ' + ACCENT, borderRadius: 6, background: '#fff', cursor: 'pointer', color: ACCENT, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                          title="View this content"
                        >
                          <Eye size={12} /> View
                        </button>
                      </div>
                    </div>
                    {/* Publisher-assigned Competencies */}
                    {step.learning_units?.competencyIds?.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>📋 Competencies:</span>
                        {getCompetencyNames(step.learning_units.competencyIds).slice(0, 4).map((name: any, ci: number) => (
                          <span key={ci} style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, background: '#ECFDF5', color: '#065F46' }}>{name}</span>
                        ))}
                        {step.learning_units.competencyIds.length > 4 && <span style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>+{step.learning_units.competencyIds.length - 4} more</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bo-card" style={{ padding: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {course.status === 'DRAFT' && (
          <>
            <button className="bo-btn bo-btn-primary" style={{ background: ACCENT, borderColor: ACCENT }} onClick={() => navigate(`/faculty/edit-course/${course.id}`)}>
              <Edit size={16} /> Edit Course
            </button>
            <button className="bo-btn bo-btn-primary" style={{ background: '#10B981', borderColor: '#10B981' }} onClick={handlePublish} disabled={!course.learning_flow_steps?.length}>
              🚀 Publish Course
            </button>
            {(!course._count?.courseAssignments || course._count.courseAssignments === 0) && (
              <button className="bo-btn bo-btn-danger" onClick={handleDelete}>
                <Trash2 size={16} /> Delete Course
              </button>
            )}
          </>
        )}
        {course.status === 'PUBLISHED' && (
          <>
            <button className="bo-btn bo-btn-primary" style={{ background: '#3B82F6', borderColor: '#3B82F6' }} onClick={() => navigate(`/faculty/assign-course/${course.id}`)}>
              <Send size={16} /> Assign to Students
            </button>
            <button className="bo-btn bo-btn-outline" onClick={() => navigate(`/faculty/courses/${course.id}/analytics`)}>
              <BarChart3 size={16} /> View Analytics
            </button>
            <button className="bo-btn bo-btn-outline" onClick={() => navigate(`/faculty/courses/${course.id}/tracking`)}>
              <Users size={16} /> Student Tracking
            </button>
          </>
        )}
      </div>
    </FacultyLayout>
  );
};

export default FacultyCourseDetails;
