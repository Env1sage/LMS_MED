import React, { useState, useEffect, useCallback } from 'react';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import facultyAssignmentService, { TeacherAssignment, SelfPacedResource } from '../../services/faculty-assignment.service';
import { facultyAnalyticsService } from '../../services/faculty-analytics.service';
import { studentService } from '../../services/student.service';
import {
  ClipboardList, Plus, Users, CheckCircle, Clock,
  X, Search, Award, Trash2
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';

const formatYear = (y: string) => {
  const m: Record<string, string> = {
    YEAR_1: 'Year 1', YEAR_2: 'Year 2', YEAR_3: 'Year 3',
    YEAR_3_MINOR: 'Year 3 (Part 1)', YEAR_3_MAJOR: 'Year 3 (Part 2)',
    YEAR_4: 'Year 4', YEAR_5: 'Year 5',
    FIRST_YEAR: '1st Year', SECOND_YEAR: '2nd Year', THIRD_YEAR: '3rd Year',
    FOURTH_YEAR: '4th Year', FIFTH_YEAR: '5th Year', INTERNSHIP: 'Internship',
    PART_1: 'Part 1', PART_2: 'Part 2',
  };
  return m[y] || y?.replace(/_/g, ' ') || '—';
};

type View = 'list' | 'create' | 'detail' | 'grade';

const FacultyAssignments: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [resources, setResources] = useState<SelfPacedResource[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<TeacherAssignment | null>(null);
  const [filterCourse, setFilterCourse] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create form
  const [form, setForm] = useState({
    courseId: '', title: '', description: '', totalMarks: 100, passingMarks: 40,
    dueDate: '', startDate: '', selfPacedResourceId: '',
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  // Grade form
  const [gradeStudentId, setGradeStudentId] = useState('');
  const [gradeScore, setGradeScore] = useState(0);
  const [gradeFeedback, setGradeFeedback] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Load independently so one failure doesn't block the other
      const [assignmentsResult, dashResult] = await Promise.allSettled([
        facultyAssignmentService.getAll(),
        facultyAnalyticsService.getDashboardOverview(),
      ]);
      if (assignmentsResult.status === 'fulfilled') {
        setAssignments(assignmentsResult.value);
      } else {
        console.error('Failed to load assignments:', assignmentsResult.reason);
        setError('Failed to load assignments. Please try refreshing the page.');
      }
      if (dashResult.status === 'fulfilled') {
        setCourses(dashResult.value.courses || []);
      } else {
        console.error('Failed to load courses:', dashResult.reason);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadStudentsForCourse = async (courseId: string) => {
    try {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        const data = await studentService.getAll({
          currentAcademicYear: course.academicYear,
          status: 'ACTIVE', page: 1, limit: 500,
        });
        setStudents(data.data || data || []);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const loadResources = async () => {
    try {
      const data = await facultyAssignmentService.getResources();
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources:', err);
    }
  };

  const handleCreate = async () => {
    try {
      if (!form.courseId || !form.title) { setError('Course and title are required'); return; }
      setError('');
      await facultyAssignmentService.create({
        ...form,
        totalMarks: Number(form.totalMarks),
        passingMarks: Number(form.passingMarks),
        studentIds: selectedStudents,
      });
      setSuccess('Assignment created successfully!');
      setForm({ courseId: '', title: '', description: '', totalMarks: 100, passingMarks: 40, dueDate: '', startDate: '', selfPacedResourceId: '' });
      setSelectedStudents([]);
      setView('list');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await facultyAssignmentService.delete(id);
      setSuccess('Assignment deleted');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleGrade = async () => {
    try {
      if (!selectedAssignment || !gradeStudentId) return;
      await facultyAssignmentService.gradeStudent(selectedAssignment.id, gradeStudentId, {
        score: gradeScore, feedback: gradeFeedback,
      });
      setSuccess('Student graded successfully!');
      // Reload assignment detail
      const updated = await facultyAssignmentService.getOne(selectedAssignment.id);
      setSelectedAssignment(updated);
      setView('detail');
      setGradeStudentId('');
      setGradeScore(0);
      setGradeFeedback('');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to grade');
    }
  };

  const openDetail = async (a: TeacherAssignment) => {
    try {
      const detail = await facultyAssignmentService.getOne(a.id);
      setSelectedAssignment(detail);
      setView('detail');
    } catch (err) {
      setError('Failed to load assignment details');
    }
  };

  const openGrade = (studentId: string) => {
    setGradeStudentId(studentId);
    setGradeScore(0);
    setGradeFeedback('');
    setView('grade');
  };

  const filtered = assignments.filter(a =>
    !filterCourse || a.course.id === filterCourse
  );

  const filteredStudents = students.filter(s => {
    const term = studentSearch.toLowerCase();
    return s.fullName?.toLowerCase().includes(term) || s.user?.email?.toLowerCase().includes(term);
  });

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (loading) return (
    <FacultyLayout>
      <div className="page-loading-screen">
        <div className="loading-rings"><div className="loading-ring loading-ring-1" /><div className="loading-ring loading-ring-2" /><div className="loading-ring loading-ring-3" /></div>
        <div className="loading-dots"><div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" /></div>
        <div className="loading-title">Loading Assignments...</div>
        <div className="loading-bar-track"><div className="loading-bar-fill" /></div>
      </div>
    </FacultyLayout>
  );

  return (
    <FacultyLayout>
      {/* Alerts */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#FEE2E2', color: '#991B1B', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
          {error} <X size={16} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', background: '#D1FAE5', color: '#065F46', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          ✅ {success}
        </div>
      )}

      {/* === LIST VIEW === */}
      {view === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--bo-text-primary)' }}>📋 Assignments</h1>
              <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', margin: '4px 0 0' }}>Create & manage assignments for your courses</p>
            </div>
            <button onClick={() => { setView('create'); loadResources(); setForm({ courseId: '', title: '', description: '', totalMarks: 100, passingMarks: 40, dueDate: '', startDate: '', selfPacedResourceId: '' }); setSelectedStudents([]); }}
              className="bo-btn bo-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, background: ACCENT }}>
              <Plus size={16} /> New Assignment
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total', value: assignments.length, icon: <ClipboardList size={20} />, color: ACCENT },
              { label: 'Students Assigned', value: assignments.reduce((s, a) => s + a.totalStudents, 0), icon: <Users size={20} />, color: '#3B82F6' },
              { label: 'Submitted', value: assignments.reduce((s, a) => s + a.submittedCount, 0), icon: <CheckCircle size={20} />, color: '#10B981' },
              { label: 'Graded', value: assignments.reduce((s, a) => s + a.gradedCount, 0), icon: <Award size={20} />, color: '#F59E0B' },
            ].map((stat, i) => (
              <div key={i} className="bo-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>{stat.icon}</div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text-primary)' }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter */}
          {courses.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, background: '#fff' }}>
                <option value="">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}

          {/* Assignment Cards */}
          {filtered.length === 0 ? (
            <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
              <ClipboardList size={48} style={{ color: 'var(--bo-text-muted)', marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>No assignments yet</h3>
              <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, marginBottom: 16 }}>Create your first assignment to get started</p>
              <button onClick={() => { setView('create'); loadResources(); }} className="bo-btn bo-btn-primary" style={{ background: ACCENT }}>
                <Plus size={14} /> Create Assignment
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(a => {
                const isPastDue = a.dueDate && new Date(a.dueDate) < new Date();
                const progress = a.totalStudents > 0 ? Math.round((a.submittedCount / a.totalStudents) * 100) : 0;
                return (
                  <div key={a.id} className="bo-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onClick={() => openDetail(a)}>
                    <div style={{ display: 'flex' }}>
                      {/* Left accent */}
                      <div style={{ width: 5, background: isPastDue ? '#EF4444' : a.gradedCount === a.totalStudents && a.totalStudents > 0 ? '#10B981' : ACCENT }} />
                      <div style={{ flex: 1, padding: '18px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--bo-text-primary)' }}>{a.title}</h3>
                            <p style={{ fontSize: 12, color: 'var(--bo-text-muted)', margin: '4px 0 0' }}>
                              {a.course.title} • {formatYear(a.course.academicYear)} • {a.totalMarks} marks
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: a.status === 'ACTIVE' ? '#D1FAE5' : a.status === 'COMPLETED' ? '#DBEAFE' : '#E5E7EB',
                              color: a.status === 'ACTIVE' ? '#065F46' : a.status === 'COMPLETED' ? '#1E40AF' : '#374151',
                            }}>{a.status}</span>
                            <button onClick={e => { e.stopPropagation(); handleDelete(a.id); }}
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--bo-border)', background: '#fff', cursor: 'pointer', color: '#EF4444' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {a.description && (
                          <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                            {a.description.length > 120 ? a.description.substring(0, 120) + '...' : a.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={13} /> {a.totalStudents} students</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={13} /> {a.submittedCount} submitted</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Award size={13} /> {a.gradedCount} graded</span>
                          {a.dueDate && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: isPastDue ? '#EF4444' : 'inherit' }}>
                              <Clock size={13} /> Due: {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: progress >= 80 ? '#10B981' : progress >= 40 ? '#F59E0B' : ACCENT, borderRadius: 3, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--bo-text-secondary)' }}>{progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* === CREATE VIEW === */}
      {view === 'create' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => setView('list')} className="bo-btn bo-btn-outline" style={{ fontSize: 13 }}>← Back</button>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Create New Assignment</h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left — Form */}
            <div>
              <div className="bo-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>Assignment Details</h3>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Course *</label>
                  <select value={form.courseId} onChange={e => { setForm(f => ({ ...f, courseId: e.target.value })); if (e.target.value) loadStudentsForCourse(e.target.value); }}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 14 }}>
                    <option value="">Select a course...</option>
                    {courses.filter(c => c.status === 'PUBLISHED').map(c => <option key={c.id} value={c.id}>{c.title} — {formatYear(c.academicYear)}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Anatomy Lab Report Week 3"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 14 }} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Assignment instructions..."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 14, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Total Marks</label>
                    <input type="number" value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Passing Marks</label>
                    <input type="number" value={form.passingMarks} onChange={e => setForm(f => ({ ...f, passingMarks: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 14 }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Start Date</label>
                    <input type="datetime-local" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>Due Date</label>
                    <input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 14 }} />
                  </div>
                </div>

                {/* Self-paced resource attachment */}
                {resources.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--bo-text-secondary)' }}>
                      📚 Attach Self-Paced Resource (Optional)
                    </label>
                    <select value={form.selfPacedResourceId} onChange={e => setForm(f => ({ ...f, selfPacedResourceId: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 14 }}>
                      <option value="">None</option>
                      {resources.map(r => <option key={r.id} value={r.id}>{r.title} ({r.resourceType})</option>)}
                    </select>
                  </div>
                )}

                <button onClick={handleCreate} className="bo-btn bo-btn-primary" style={{ width: '100%', background: ACCENT, padding: '12px', fontWeight: 600, fontSize: 15 }}>
                  <ClipboardList size={16} /> Create Assignment
                </button>
              </div>
            </div>

            {/* Right — Student selection */}
            <div>
              <div className="bo-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Assign to Students</h3>
                    <p style={{ fontSize: 12, color: 'var(--bo-text-muted)', margin: '4px 0 0' }}>
                      {form.courseId ? `${selectedStudents.length} of ${filteredStudents.length} selected` : 'Select a course first'}
                    </p>
                  </div>
                  {filteredStudents.length > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox"
                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                        onChange={() => {
                          if (selectedStudents.length === filteredStudents.length) setSelectedStudents([]);
                          else setSelectedStudents(filteredStudents.map((s: any) => s.id));
                        }}
                      /> Select All
                    </label>
                  )}
                </div>

                {form.courseId && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
                      <input placeholder="Search students..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13 }} />
                    </div>
                  </div>
                )}

                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {!form.courseId ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--bo-text-muted)', fontSize: 13 }}>
                      Select a course to see eligible students
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--bo-text-muted)', fontSize: 13 }}>
                      No students found
                    </div>
                  ) : (
                    filteredStudents.map((s: any) => (
                      <div key={s.id} onClick={() => toggleStudent(s.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
                          cursor: 'pointer', marginBottom: 4, transition: 'all 0.1s',
                          background: selectedStudents.includes(s.id) ? '#F5F3FF' : 'transparent',
                          border: `1px solid ${selectedStudents.includes(s.id) ? ACCENT + '40' : 'transparent'}`,
                        }}>
                        <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => {}} style={{ accentColor: ACCENT }} />
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${ACCENT}15`, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                          {s.fullName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{s.fullName}</div>
                          <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{s.user?.email || '—'} • {formatYear(s.currentAcademicYear)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* === DETAIL VIEW === */}
      {view === 'detail' && selectedAssignment && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => { setView('list'); setSelectedAssignment(null); }} className="bo-btn bo-btn-outline" style={{ fontSize: 13 }}>← Back</button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{selectedAssignment.title}</h1>
              <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', margin: '4px 0 0' }}>
                {selectedAssignment.course.title} • {formatYear(selectedAssignment.course.academicYear)} • {selectedAssignment.totalMarks} marks
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Students', value: selectedAssignment.students.length, color: ACCENT },
              { label: 'Submitted', value: selectedAssignment.students.filter(s => s.status === 'SUBMITTED' || s.status === 'GRADED').length, color: '#3B82F6' },
              { label: 'Graded', value: selectedAssignment.students.filter(s => s.status === 'GRADED').length, color: '#10B981' },
              { label: 'Avg Score', value: (() => {
                const graded = selectedAssignment.students.filter(s => s.percentageScore != null);
                return graded.length > 0 ? Math.round(graded.reduce((sum, s) => sum + (s.percentageScore || 0), 0) / graded.length) + '%' : '—';
              })(), color: '#F59E0B' },
            ].map((stat, i) => (
              <div key={i} className="bo-card" style={{ padding: 18, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {selectedAssignment.description && (
            <div className="bo-card" style={{ padding: 20, marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: 'var(--bo-text-secondary)' }}>Description</h4>
              <p style={{ fontSize: 14, color: 'var(--bo-text-primary)', lineHeight: 1.6, margin: 0 }}>{selectedAssignment.description}</p>
            </div>
          )}

          {/* Student Results Table */}
          <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #0a2e36, #1a4a54)', color: '#fff' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Student Submissions</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bo-border)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>Student</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>Year</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>Score</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>Result</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAssignment.students.map((s, i) => (
                    <tr key={s.studentId} style={{ borderBottom: '1px solid var(--bo-border)', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{s.email || ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--bo-text-secondary)' }}>{formatYear(s.academicYear)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: s.status === 'GRADED' ? '#D1FAE5' : s.status === 'SUBMITTED' ? '#DBEAFE' : s.status === 'IN_PROGRESS' ? '#FEF3C7' : '#E5E7EB',
                          color: s.status === 'GRADED' ? '#065F46' : s.status === 'SUBMITTED' ? '#1E40AF' : s.status === 'IN_PROGRESS' ? '#92400E' : '#374151',
                        }}>{s.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: s.score != null ? ACCENT : 'var(--bo-text-muted)' }}>
                        {s.score != null ? `${s.score}/${selectedAssignment.totalMarks}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {s.isPassed === true && <span style={{ color: '#10B981', fontWeight: 700 }}>✅ Pass</span>}
                        {s.isPassed === false && <span style={{ color: '#EF4444', fontWeight: 700 }}>❌ Fail</span>}
                        {s.isPassed == null && <span style={{ color: 'var(--bo-text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button onClick={() => openGrade(s.studentId)}
                          className="bo-btn bo-btn-outline" style={{ fontSize: 12, padding: '4px 12px', color: ACCENT, borderColor: ACCENT }}>
                          <Award size={12} /> Grade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* === GRADE VIEW === */}
      {view === 'grade' && selectedAssignment && gradeStudentId && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => setView('detail')} className="bo-btn bo-btn-outline" style={{ fontSize: 13 }}>← Back to Assignment</button>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Grade Student</h1>
          </div>

          <div className="bo-card" style={{ padding: 24, maxWidth: 500 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: 'var(--bo-text-muted)' }}>Student</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {selectedAssignment.students.find(s => s.studentId === gradeStudentId)?.name || 'Unknown'}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Score (out of {selectedAssignment.totalMarks})
              </label>
              <input type="number" value={gradeScore} onChange={e => setGradeScore(Number(e.target.value))}
                min={0} max={selectedAssignment.totalMarks}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 16, fontWeight: 700 }} />
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>
                Passing: {selectedAssignment.passingMarks} marks ({Math.round((selectedAssignment.passingMarks / selectedAssignment.totalMarks) * 100)}%)
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Feedback (Optional)</label>
              <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} rows={3}
                placeholder="Write feedback for the student..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 14, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderRadius: 8, marginBottom: 20,
              background: gradeScore >= selectedAssignment.passingMarks ? '#D1FAE5' : '#FEE2E2',
            }}>
              <span style={{ fontSize: 20 }}>{gradeScore >= selectedAssignment.passingMarks ? '✅' : '❌'}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {gradeScore >= selectedAssignment.passingMarks ? 'PASS' : 'FAIL'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                  {gradeScore}/{selectedAssignment.totalMarks} ({Math.round((gradeScore / selectedAssignment.totalMarks) * 100)}%)
                </div>
              </div>
            </div>

            <button onClick={handleGrade} className="bo-btn bo-btn-primary" style={{ width: '100%', background: ACCENT, padding: '12px', fontWeight: 600 }}>
              <Award size={16} /> Submit Grade
            </button>
          </div>
        </>
      )}
    </FacultyLayout>
  );
};

export default FacultyAssignments;
