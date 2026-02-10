import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import CourseRating from '../../components/CourseRating';
import { BookOpen, Clock, TrendingUp, Play, CheckCircle, Search, Filter } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface Course {
  id: number;
  title: string;
  code: string;
  facultyName: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lastAccessed?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'NOT_STARTED';
}

const StudentCourses: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [error, setError] = useState('');

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get('/student-portal/dashboard');
      const coursesData = response.data?.courses;
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (err: any) {
      console.error('Failed to fetch courses:', err);
      setError(err.response?.data?.message || 'Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleRatingSubmit = async (courseId: number, rating: number) => {
    try {
      await apiService.post(`/student-portal/courses/${courseId}/rate`, { rating });
      alert('✅ Thank you for rating this course!');
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      alert(error.response?.data?.message || 'Failed to submit rating');
    }
  };

  const filteredCourses = Array.isArray(courses) ? courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'completed' && course.status === 'COMPLETED') ||
                         (filterStatus === 'in-progress' && course.status === 'ACTIVE') ||
                         (filterStatus === 'not-started' && course.status === 'NOT_STARTED');
    return matchesSearch && matchesFilter;
  }) : [];

  const statusCounts = {
    all: Array.isArray(courses) ? courses.length : 0,
    completed: Array.isArray(courses) ? courses.filter(c => c.status === 'COMPLETED').length : 0,
    inProgress: Array.isArray(courses) ? courses.filter(c => c.status === 'ACTIVE').length : 0,
    notStarted: Array.isArray(courses) ? courses.filter(c => c.status === 'NOT_STARTED').length : 0,
  };

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
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
          <div className="loading-title">Loading Courses</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
          My Courses
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          Track your enrolled courses and learning progress
        </p>
      </div>

      {/* Stats */}
      <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
        <div className="bo-stat-card">
          <div className="bo-stat-icon blue">
            <BookOpen size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.all}</div>
          <div className="bo-stat-label">Total Courses</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon purple">
            <Play size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.inProgress}</div>
          <div className="bo-stat-label">In Progress</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon green">
            <CheckCircle size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.completed}</div>
          <div className="bo-stat-label">Completed</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon orange">
            <Clock size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.notStarted}</div>
          <div className="bo-stat-label">Not Started</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bo-card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid var(--bo-border)',
                borderRadius: 'var(--bo-radius)',
                fontSize: 14,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={16} style={{ color: 'var(--bo-text-muted)' }} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--bo-border)',
                borderRadius: 'var(--bo-radius)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <option value="all">All Courses</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="not-started">Not Started</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {error && (
        <div className="bo-card" style={{ padding: 24, marginBottom: 24, textAlign: 'center', color: 'var(--bo-danger)' }}>
          {error}
        </div>
      )}

      {filteredCourses.length === 0 ? (
        <div className="bo-card" style={{ padding: 80, textAlign: 'center' }}>
          <BookOpen size={64} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 8 }}>
            No courses found
          </h3>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>
            {searchTerm || filterStatus !== 'all' ? 'Try adjusting your search or filter' : 'You have no enrolled courses yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredCourses.map((course) => (
            <div 
              key={course.id}
              className="bo-card"
              style={{ 
                padding: 24, 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid var(--bo-border)',
                position: 'relative',
              }}
              onClick={() => navigate(`/student/courses/${course.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--bo-shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--bo-shadow-sm)';
              }}
            >
              {/* Status Badge */}
              <div style={{ 
                position: 'absolute', 
                top: 12, 
                right: 12, 
                padding: '4px 10px', 
                borderRadius: 12, 
                fontSize: 11, 
                fontWeight: 600,
                background: course.status === 'COMPLETED' ? 'var(--bo-success-light)' : 
                           course.status === 'ACTIVE' ? 'var(--bo-info-light)' : 'var(--bo-border-light)',
                color: course.status === 'COMPLETED' ? 'var(--bo-success)' : 
                       course.status === 'ACTIVE' ? 'var(--bo-info)' : 'var(--bo-text-muted)'
              }}>
                {course.status === 'COMPLETED' ? 'Completed' : 
                 course.status === 'ACTIVE' ? 'In Progress' : 'Not Started'}
              </div>

              <div style={{ marginBottom: 20, paddingRight: 80 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 6 }}>
                  {course.title}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', margin: 0 }}>
                  {course.code}
                </p>
                <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginTop: 8, marginBottom: 8 }}>
                  👨‍🏫 {course.facultyName}
                </p>
                <div onClick={(e) => e.stopPropagation()}>
                  <CourseRating 
                    courseId={course.id} 
                    onRatingSubmit={(rating) => handleRatingSubmit(course.id, rating)}
                  />
                </div>
              </div>
              
              {/* Progress */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={14} /> {course.progress}% Complete
                  </span>
                  <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                </div>
                <div style={{ height: 8, background: 'var(--bo-border-light)', borderRadius: 4, overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: 'linear-gradient(90deg, var(--bo-accent), var(--bo-info))', 
                      width: `${course.progress}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>

              {course.lastAccessed && (
                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--bo-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} /> Last accessed {new Date(course.lastAccessed).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentCourses;
