import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { courseService, AssignCourseData } from '../../services/course.service';
import { studentService } from '../../services/student.service';
import { ArrowLeft, Search, Users, Send } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';

const FacultyAssignCourse: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [course, setCourse] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignmentType, setAssignmentType] = useState<'BATCH' | 'INDIVIDUAL'>('BATCH');
  const [dueDate, setDueDate] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const courseData = await courseService.getById(id!);
      setCourse(courseData);
      if (courseData.status !== 'PUBLISHED') {
        setError('Only published courses can be assigned');
        return;
      }
      const studentsData = await studentService.getAll({ currentAcademicYear: courseData.academicYear, status: 'ACTIVE', page: 1, limit: 500 });
      // Filter out students who might already have this course assigned
      const allStudents = studentsData.data || [];
      setStudents(allStudents);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter(s => {
    if (!search) return true;
    const term = search.toLowerCase();
    return s.fullName?.toLowerCase().includes(term) || s.users?.email?.toLowerCase().includes(term) || s.currentAcademicYear?.toLowerCase().includes(term);
  });

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(s => s.id));
  };

  const toggleStudent = (sid: string) => {
    setSelected(prev => prev.includes(sid) ? prev.filter(i => i !== sid) : [...prev, sid]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length === 0) { alert('Select at least one student'); return; }
    try {
      setSubmitting(true);
      await courseService.assign({ courseId: id!, studentIds: selected, assignmentType, dueDate: dueDate || undefined });
      alert(`Course assigned to ${selected.length} student(s) successfully!`);
      navigate('/faculty/courses');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign course');
    } finally {
      setSubmitting(false);
    }
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
        <div className="loading-title">Loading Assignment...</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </FacultyLayout>
  );

  if (error) {
    return (
      <FacultyLayout>
        <div className="bo-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#DC2626', marginBottom: 16 }}>{error}</p>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/courses')}>Back to Courses</button>
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(`/faculty/courses/${id}`)} style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}><ArrowLeft size={18} /></button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>Assign Course</h1>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>{course?.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Course Info */}
        <div className="bo-card" style={{ padding: 20, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Course</div><div style={{ fontWeight: 600, fontSize: 14 }}>{course?.title}</div></div>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Academic Year</div><div style={{ fontWeight: 600, fontSize: 14 }}>{({'YEAR_1':'Year 1','YEAR_2':'Year 2','YEAR_3':'Year 3','YEAR_3_MINOR':'Year 3 (Part 1)','YEAR_3_MAJOR':'Year 3 (Part 2)','YEAR_4':'Year 4','YEAR_5':'Year 5','FIRST_YEAR':'1st Year','SECOND_YEAR':'2nd Year','THIRD_YEAR':'3rd Year','FOURTH_YEAR':'4th Year','FIFTH_YEAR':'5th Year','INTERNSHIP':'Internship','PART_1':'Part 1','PART_2':'Part 2'} as Record<string,string>)[course?.academicYear || ''] || course?.academicYear?.replace(/_/g, ' ')}</div></div>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Steps</div><div style={{ fontWeight: 600, fontSize: 14 }}>{course?.learning_flow_steps?.length || 0} units</div></div>
          <div><div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Status</div><div style={{ fontWeight: 600, fontSize: 14, color: '#10B981' }}>PUBLISHED</div></div>
        </div>

        {/* Options */}
        <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Assignment Options</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', display: 'block', marginBottom: 6 }}>Assignment Type</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {(['BATCH', 'INDIVIDUAL'] as const).map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                    <input type="radio" value={t} checked={assignmentType === t} onChange={() => setAssignmentType(t)} />
                    {t === 'BATCH' ? 'Batch (All at once)' : 'Individual'}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', display: 'block', marginBottom: 6 }}>Due Date (Optional)</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
            </div>
          </div>
        </div>

        {/* Student Selection */}
        <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Select Students</h3>
              <p style={{ fontSize: 12, color: 'var(--bo-text-muted)', margin: '4px 0 0' }}>
                Showing only <strong style={{ color: ACCENT }}>{({'YEAR_1':'Year 1','YEAR_2':'Year 2','YEAR_3':'Year 3','YEAR_3_MINOR':'Year 3 (Part 1)','YEAR_3_MAJOR':'Year 3 (Part 2)','YEAR_4':'Year 4','YEAR_5':'Year 5','FIRST_YEAR':'1st Year','SECOND_YEAR':'2nd Year','THIRD_YEAR':'3rd Year','FOURTH_YEAR':'4th Year','FIFTH_YEAR':'5th Year','INTERNSHIP':'Internship','PART_1':'Part 1','PART_2':'Part 2'} as Record<string,string>)[course?.academicYear || ''] || course?.academicYear?.replace(/_/g, ' ')}</strong> active students eligible for this course
              </p>
            </div>
            <span style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>{selected.length} of {filtered.length} selected</span>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
              <input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
              Select All
            </label>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--bo-text-muted)' }}>No students found</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bo-border)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', width: 40 }}></th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--bo-text-muted)', fontWeight: 500 }}>Name</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--bo-text-muted)', fontWeight: 500 }}>Email</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--bo-text-muted)', fontWeight: 500 }}>Year</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--bo-text-muted)', fontWeight: 500 }}>Admission</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--bo-border)', cursor: 'pointer', background: selected.includes(s.id) ? '#F5F3FF' : 'transparent' }} onClick={() => toggleStudent(s.id)}>
                      <td style={{ padding: '10px 12px' }}><input type="checkbox" checked={selected.includes(s.id)} onChange={() => {}} /></td>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{s.fullName}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--bo-text-secondary)' }}>{s.users?.email || 'N/A'}</td>
                      <td style={{ padding: '10px 12px' }}>{({'YEAR_1':'Year 1','YEAR_2':'Year 2','YEAR_3':'Year 3','YEAR_3_MINOR':'Year 3 (Part 1)','YEAR_3_MAJOR':'Year 3 (Part 2)','YEAR_4':'Year 4','YEAR_5':'Year 5','FIRST_YEAR':'1st Year','SECOND_YEAR':'2nd Year','THIRD_YEAR':'3rd Year','FOURTH_YEAR':'4th Year','FIFTH_YEAR':'5th Year','INTERNSHIP':'Internship','PART_1':'Part 1','PART_2':'Part 2'} as Record<string,string>)[s.currentAcademicYear] || s.currentAcademicYear?.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '10px 12px' }}>{s.yearOfAdmission}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="bo-btn bo-btn-outline" onClick={() => navigate(`/faculty/courses/${id}`)}>Cancel</button>
          <button type="submit" className="bo-btn bo-btn-primary" style={{ background: ACCENT, borderColor: ACCENT }} disabled={selected.length === 0 || submitting}>
            <Send size={16} /> {submitting ? 'Assigning...' : `Assign to ${selected.length} Student(s)`}
          </button>
        </div>
      </form>
    </FacultyLayout>
  );
};

export default FacultyAssignCourse;
