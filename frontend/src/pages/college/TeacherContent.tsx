import React, { useState, useEffect } from 'react';
import CollegeLayout from '../../components/college/CollegeLayout';
import apiService from '../../services/api.service';
import { BookOpen, ChevronDown, ChevronRight, FileText, Video, Headphones, Search } from 'lucide-react';
import '../../styles/bitflow-owner.css';

interface FacultyContent {
  faculty: { id: string; fullName: string; email: string };
  courses: Array<{
    id: string;
    title: string;
    courseCode: string;
    academicYear: string;
    courseType: string;
    status: string;
    createdAt: string;
    learning_flow_steps: Array<{
      stepNumber: number;
      learning_units: {
        id: string; title: string; type: string; subject: string;
        status: string; fileFormat: string | null; author: string | null; createdAt: string;
      };
    }>;
    _count: { course_assignments: number; student_progress: number; tests: number };
  }>;
  totalCourses: number;
  totalContent: number;
}

const typeIcon = (type: string) => {
  if (type === 'VIDEO') return <Video size={14} />;
  if (type === 'AUDIO') return <Headphones size={14} />;
  return <FileText size={14} />;
};

const statusColor = (status: string) => {
  if (status === 'PUBLISHED') return { bg: '#ECFDF5', color: '#059669' };
  if (status === 'DRAFT') return { bg: '#FEF3C7', color: '#D97706' };
  return { bg: '#F3F4F6', color: '#6B7280' };
};

const TeacherContent: React.FC = () => {
  const [data, setData] = useState<{ totalCourses: number; totalFaculty: number; facultyContent: FacultyContent[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiService.get<any>('/governance/course-analytics/teacher-content');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load teacher content');
    } finally { setLoading(false); }
  };

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const filtered = data?.facultyContent?.filter(fc =>
    fc.faculty.fullName.toLowerCase().includes(search.toLowerCase()) ||
    fc.courses.some(c => c.title.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <CollegeLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Teacher Content</h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>View all courses and content created by faculty</p>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Stats */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div className="bo-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{data.totalFaculty}</div>
            <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>Faculty Members</div>
          </div>
          <div className="bo-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2563EB' }}>{data.totalCourses}</div>
            <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>Total Courses</div>
          </div>
          <div className="bo-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#7C3AED' }}>
              {data.facultyContent.reduce((s, fc) => s + fc.totalContent, 0)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>Total Content Units</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--bo-text-muted)' }} />
        <input
          type="text" placeholder="Search faculty or courses..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--bo-text-muted)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bo-card" style={{ textAlign: 'center', padding: 60 }}>
          <BookOpen size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 500 }}>No teacher content found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(fc => (
            <div key={fc.faculty.id} className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Faculty header */}
              <div
                style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: expanded[fc.faculty.id] ? '#F9FAFB' : 'white' }}
                onClick={() => toggle(fc.faculty.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 }}>
                    {fc.faculty.fullName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{fc.faculty.fullName}</div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{fc.faculty.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--bo-text-secondary)' }}>{fc.totalCourses} courses · {fc.totalContent} content units</span>
                  {expanded[fc.faculty.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </div>

              {/* Courses */}
              {expanded[fc.faculty.id] && (
                <div style={{ borderTop: '1px solid var(--bo-border)' }}>
                  {fc.courses.map(course => {
                    const sc = statusColor(course.status);
                    return (
                      <div key={course.id} style={{ padding: '12px 20px 12px 48px', borderBottom: '1px solid var(--bo-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{course.title}</span>
                          {course.courseCode && <span style={{ fontSize: 10, color: 'var(--bo-text-muted)', background: '#F3F4F6', padding: '2px 6px', borderRadius: 4 }}>{course.courseCode}</span>}
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color }}>{course.status}</span>
                          <span style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>{course.courseType} · {course.academicYear}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginBottom: 6 }}>
                          {course._count.student_progress} students · {course._count.tests} tests · {course.learning_flow_steps.length} content units
                        </div>
                        {course.learning_flow_steps.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {course.learning_flow_steps.map(step => (
                              <span key={step.stepNumber} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#F3F4F6', borderRadius: 6, fontSize: 11, color: 'var(--bo-text-secondary)' }}>
                                {typeIcon(step.learning_units.type)} {step.learning_units.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </CollegeLayout>
  );
};

export default TeacherContent;
