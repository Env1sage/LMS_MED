import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../components/student/StudentLayout';
import apiService from '../services/api.service';
import { BookOpen, CheckCircle, ChevronRight, Clock, PlayCircle, FileText, Star } from 'lucide-react';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';
import { formatDate } from '../utils/dateUtils';
import { formatAcademicYear } from '../utils/academicYear';

interface CompletedCourse {
  courseId: string;
  title: string;
  description?: string;
  courseCode?: string;
  courseType?: string;
  academicYear?: string;
  facultyName: string;
  completedAt?: string;
  lessonCount: number;
}

interface AssignedCourse {
  courseId: string;
  title: string;
  description?: string;
  courseCode?: string;
  courseType?: string;
  academicYear?: string;
  facultyName: string;
  lessonCount: number;
  assignedAt?: string;
  dueDate?: string;
  status: string;
  progressPercent: number;
  completedAt?: string;
}

interface CompletedTest {
  attemptId: string;
  testId: string;
  title: string;
  subject?: string;
  type?: string;
  totalMarks?: number;
  totalQuestions?: number;
  timeLimitMinutes?: number;
  description?: string;
  percentageScore?: number;
  totalCorrect?: number;
  totalIncorrect?: number;
  totalSkipped?: number;
  submittedAt?: string;
  isPassed?: boolean;
}

const COURSE_STATUS_BADGE: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  COMPLETED:   { label: 'Completed',   bg: '#D1FAE5', color: '#065F46', icon: '✅' },
  IN_PROGRESS: { label: 'In Progress', bg: '#DBEAFE', color: '#1E40AF', icon: '📖' },
  NOT_STARTED: { label: 'Not Started', bg: '#FEF3C7', color: '#92400E', icon: '🔖' },
};

const TEST_TYPE_LABELS: Record<string, string> = {
  ASSIGNMENT: 'Assignment', QUIZ: 'Quiz', PRACTICE_TEST: 'Practice Test',
  SCHEDULED_TEST: 'Scheduled Test', MCQ: 'MCQ',
};

const StudentSelfPaced: React.FC = () => {
  const navigate = useNavigate();
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([]);
  const [allAssigned, setAllAssigned] = useState<AssignedCourse[]>([]);
  const [completedTests, setCompletedTests] = useState<CompletedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'tests' | 'courses' | 'selfpaced'>('tests');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [completedRes, allRes, testsRes] = await Promise.all([
        apiService.get('/student-portal/completed-courses'),
        apiService.get('/student-portal/all-assigned-courses'),
        apiService.get('/student-portal/completed-tests'),
      ]);
      setCompletedCourses(Array.isArray(completedRes.data) ? completedRes.data : []);
      setAllAssigned(Array.isArray(allRes.data) ? allRes.data : []);
      setCompletedTests(Array.isArray(testsRes.data) ? testsRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="page-loading-screen">
          <div className="loading-rings">
            <div className="loading-ring loading-ring-1"></div>
            <div className="loading-ring loading-ring-2"></div>
            <div className="loading-ring loading-ring-3"></div>
          </div>
          <div className="loading-dots">
            <div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div>
          </div>
          <div className="loading-title">Loading Self-Paced Learning</div>
          <div className="loading-bar-track"><div className="loading-bar-fill"></div></div>
        </div>
      </StudentLayout>
    );
  }

  const completedCourseCount = allAssigned.filter(c => c.status === 'COMPLETED').length;
  const inProgressCount = allAssigned.filter(c => c.status === 'IN_PROGRESS').length;

  const tabs = [
    { key: 'tests' as const,     label: `Assignments & Tests (${completedTests.length})` },
    { key: 'courses' as const,   label: `All Courses (${allAssigned.length})` },
    { key: 'selfpaced' as const, label: `Self-Paced Completed (${completedCourses.length})` },
  ];

  return (
    <StudentLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>Self-Paced Learning</h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          Review completed assignments, tests, and courses anytime for revision
        </p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="bo-stats-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <div className="bo-stat-card">
          <div className="bo-stat-icon purple"><FileText size={20} /></div>
          <div className="bo-stat-value">{completedTests.length}</div>
          <div className="bo-stat-label">Tests Completed</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon blue"><BookOpen size={20} /></div>
          <div className="bo-stat-value">{allAssigned.length}</div>
          <div className="bo-stat-label">Courses Assigned</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon green"><CheckCircle size={20} /></div>
          <div className="bo-stat-value">{completedCourseCount}</div>
          <div className="bo-stat-label">Courses Done</div>
        </div>
        <div className="bo-stat-card">
          <div className="bo-stat-icon orange"><PlayCircle size={20} /></div>
          <div className="bo-stat-value">{inProgressCount}</div>
          <div className="bo-stat-label">In Progress</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--bo-border)' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 14,
              fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? '#7C3AED' : 'var(--bo-text-secondary)',
              background: 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid #7C3AED' : '2px solid transparent',
              marginBottom: -2, whiteSpace: 'nowrap',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TESTS TAB ── */}
      {activeTab === 'tests' && (
        completedTests.length === 0 ? (
          <div className="bo-card" style={{ padding: 80, textAlign: 'center' }}>
            <FileText size={64} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 8 }}>No completed tests yet</h3>
            <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>
              Submit an assignment or test and it will appear here for review
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {completedTests.map(test => (
              <div key={test.attemptId} className="bo-card"
                style={{ padding: 20, borderLeft: `4px solid ${test.isPassed ? '#10B981' : '#F59E0B'}`, cursor: 'pointer', transition: 'transform 0.15s' }}
                onClick={() => navigate(`/student/tests/${test.testId}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: test.isPassed ? '#D1FAE5' : '#FEF3C7',
                        color: test.isPassed ? '#065F46' : '#92400E',
                      }}>
                        {test.isPassed ? '✅ Passed' : '📝 Submitted'}
                      </span>
                      {test.type && (
                        <span style={{ padding: '2px 8px', borderRadius: 8, background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 600 }}>
                          {TEST_TYPE_LABELS[test.type] || test.type}
                        </span>
                      )}
                      {test.subject && (
                        <span style={{ padding: '2px 8px', borderRadius: 8, background: '#EEF2FF', color: '#4338CA', fontSize: 11 }}>
                          {test.subject}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--bo-text-primary)', marginBottom: 6 }}>{test.title}</h3>
                    {/* Score summary */}
                    {test.percentageScore != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={14} style={{ color: '#F59E0B' }} />
                          <span style={{ fontSize: 15, fontWeight: 700, color: test.isPassed ? '#10B981' : '#F59E0B' }}>
                            {Math.round(test.percentageScore)}%
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                          ✓ {test.totalCorrect ?? 0} correct &nbsp;✗ {test.totalIncorrect ?? 0} wrong &nbsp;— {test.totalQuestions ?? 0} questions
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                      {test.submittedAt && <span><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />Submitted {formatDate(test.submittedAt)}</span>}
                      {test.timeLimitMinutes && <span>⏱ {test.timeLimitMinutes} min</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginLeft: 16 }}>
                    <ChevronRight size={20} style={{ color: 'var(--bo-text-muted)' }} />
                    <span style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>Review →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── ALL COURSES TAB ── */}
      {activeTab === 'courses' && (
        allAssigned.length === 0 ? (
          <div className="bo-card" style={{ padding: 80, textAlign: 'center' }}>
            <BookOpen size={64} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 8 }}>No courses assigned yet</h3>
            <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>Courses assigned to you will appear here</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {allAssigned.map(course => {
              const badge = COURSE_STATUS_BADGE[course.status] || COURSE_STATUS_BADGE.NOT_STARTED;
              const borderColor = course.status === 'COMPLETED' ? '#10B981' : course.status === 'IN_PROGRESS' ? '#3B82F6' : '#F59E0B';
              return (
                <div key={course.courseId} className="bo-card"
                  style={{ padding: 20, borderLeft: `4px solid ${borderColor}`, cursor: 'pointer', transition: 'transform 0.15s' }}
                  onClick={() => navigate(`/student/courses/${course.courseId}`)}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 12, background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700 }}>
                          {badge.icon} {badge.label}
                        </span>
                        {course.courseCode && <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{course.courseCode}</span>}
                        {course.academicYear && (
                          <span style={{ fontSize: 11, padding: '2px 8px', background: '#F3F4F6', color: '#6B7280', borderRadius: 8 }}>
                            {formatAcademicYear(course.academicYear)}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--bo-text-primary)', marginBottom: 4 }}>{course.title}</h3>
                      {course.description && (
                        <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
                          {course.description.length > 140 ? course.description.substring(0, 140) + '…' : course.description}
                        </p>
                      )}
                      {course.progressPercent > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${course.progressPercent}%`, background: course.status === 'COMPLETED' ? '#10B981' : '#3B82F6', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 2, display: 'block' }}>{course.progressPercent}% complete</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--bo-text-muted)', flexWrap: 'wrap' }}>
                        <span>👨‍🏫 {course.facultyName}</span>
                        <span><BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} />{course.lessonCount} lessons</span>
                        {course.assignedAt && <span><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />Assigned {formatDate(course.assignedAt)}</span>}
                        {course.dueDate && <span style={{ color: '#EF4444' }}>Due {formatDate(course.dueDate)}</span>}
                      </div>
                    </div>
                    <ChevronRight size={20} style={{ color: 'var(--bo-text-muted)', flexShrink: 0, marginLeft: 12, marginTop: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── SELF-PACED COMPLETED TAB ── */}
      {activeTab === 'selfpaced' && (
        completedCourses.length === 0 ? (
          <div className="bo-card" style={{ padding: 80, textAlign: 'center' }}>
            <CheckCircle size={64} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 8 }}>No completed self-paced courses yet</h3>
            <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>Complete a self-paced course and it will appear here for permanent access</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {completedCourses.map(course => (
              <div key={course.courseId} className="bo-card"
                style={{ padding: 20, borderLeft: '4px solid #10B981', cursor: 'pointer', transition: 'transform 0.15s' }}
                onClick={() => navigate(`/student/courses/${course.courseId}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ padding: '2px 10px', borderRadius: 12, background: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: 700 }}>✅ Completed</span>
                      {course.courseCode && <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{course.courseCode}</span>}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--bo-text-primary)', marginBottom: 4 }}>{course.title}</h3>
                    {course.description && (
                      <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
                        {course.description.length > 140 ? course.description.substring(0, 140) + '…' : course.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                      <span>👨‍🏫 {course.facultyName}</span>
                      <span><BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} />{course.lessonCount} lessons</span>
                      {course.completedAt && <span>Completed {formatDate(course.completedAt)}</span>}
                    </div>
                  </div>
                  <ChevronRight size={20} style={{ color: '#10B981', flexShrink: 0, marginLeft: 12, marginTop: 4 }} />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </StudentLayout>
  );
};

export default StudentSelfPaced;
