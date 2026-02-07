import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { AppShell, NavItem } from '../components/layout';
import { GlassButton } from '../components/ui';
import { DashboardLayout, StatGrid, StatCard, PageSection } from '../components/dashboard';
import './StudentDashboard.css';

interface CourseProgress {
  courseId: number;
  title: string;
  description: string;
  code: string;
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  lastAccessedAt: string | null;
  nextStepId: number | null;
  nextStepTitle: string | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student navigation items
  const navItems: NavItem[] = [
    { path: '/student', label: 'Dashboard', icon: '📊' },
    { path: '/student/portal', label: 'My Courses', icon: '📚' },
    { path: '/student/self-paced', label: 'Self-Paced', icon: '🎯' },
    { path: '/student/progress', label: 'Progress', icon: '📈' },
  ];

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/progress/my-courses');
      setCourses(response.data);
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      setError(err.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = (courseId: number) => {
    navigate(`/student/courses/${courseId}`);
  };

  const handleContinueCourse = (courseId: number) => {
    navigate(`/student/courses/${courseId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return <span className="badge badge-neutral">Not Started</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-info">In Progress</span>;
      case 'COMPLETED':
        return <span className="badge badge-success">✓ Completed</span>;
      default:
        return null;
    }
  };

  const formatLastAccessed = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <AppShell navItems={navItems}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your courses...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={navItems}>
      <DashboardLayout
        title="My Learning Dashboard"
        subtitle={`Welcome back, ${user?.fullName || 'Student'}!`}
      >
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <StatGrid columns={3}>
          <StatCard label="Total Courses" value={courses.length} type="default" />
          <StatCard 
            label="In Progress" 
            value={courses.filter(c => c.status === 'IN_PROGRESS').length} 
            type="accent" 
          />
          <StatCard 
            label="Completed" 
            value={courses.filter(c => c.status === 'COMPLETED').length} 
            type="success" 
          />
        </StatGrid>

        <PageSection title="My Courses">
          {courses.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: '48px' }}>🔒</span>
              <h3>No courses assigned yet</h3>
              <p>Your faculty will assign courses to you soon.</p>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.map((course) => (
                <div key={course.courseId} className="course-card">
                  <div className="course-header">
                    <h3 className="course-title">{course.title}</h3>
                    {getStatusBadge(course.status)}
                  </div>

                  <p className="course-description">{course.description}</p>

                  <div className="course-code">CODE: {course.code}</div>

                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-label">Progress</span>
                      <span className="progress-steps">{course.completedSteps} / {course.totalSteps} steps</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill"
                        style={{ width: `${course.progressPercentage}%` }}
                      />
                    </div>
                    <div className="progress-percentage">
                      {course.progressPercentage}% Complete
                    </div>
                  </div>

                  <div className="last-accessed">
                    <span className="last-accessed-icon">⏱</span>
                    <span>Last accessed: {formatLastAccessed(course.lastAccessedAt)}</span>
                  </div>

                  {course.nextStepTitle && course.status !== 'COMPLETED' && (
                    <div className="next-step">
                      <div className="next-step-label">Next Up</div>
                      <div className="next-step-title">{course.nextStepTitle}</div>
                    </div>
                  )}

                  {course.status === 'NOT_STARTED' ? (
                    <GlassButton
                      variant="primary"
                      onClick={() => handleStartCourse(course.courseId)}
                      fullWidth
                    >
                      Start Course
                    </GlassButton>
                  ) : course.status === 'COMPLETED' ? (
                    <GlassButton
                      variant="secondary"
                      onClick={() => handleContinueCourse(course.courseId)}
                      fullWidth
                    >
                      Review Course
                    </GlassButton>
                  ) : (
                    <GlassButton
                      variant="primary"
                      onClick={() => handleContinueCourse(course.courseId)}
                      fullWidth
                    >
                      Continue Learning
                    </GlassButton>
                  )}
                </div>
              ))}
            </div>
          )}
        </PageSection>
      </DashboardLayout>
    </AppShell>
  );
};

export default StudentDashboard;
