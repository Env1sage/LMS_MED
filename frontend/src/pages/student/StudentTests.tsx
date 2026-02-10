import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import { FileText, Clock, CheckCircle, AlertCircle, Calendar, Target } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface Test {
  id: number;
  title: string;
  courseName: string;
  type: 'SCHEDULED' | 'SELF_PACED';
  duration: number;
  totalMarks: number;
  passingMarks: number;
  scheduledFor?: string;
  deadline?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  score?: number;
  completedAt?: string;
}

const StudentTests: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Test[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState('');

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get('/student-portal/tests');
      setTests(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Failed to fetch tests:', err);
      setError(err.response?.data?.message || 'Failed to load tests');
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const filteredTests = Array.isArray(tests) ? tests.filter(test => {
    if (filter === 'all') return true;
    if (filter === 'pending') return test.status === 'NOT_STARTED' || test.status === 'IN_PROGRESS';
    if (filter === 'completed') return test.status === 'COMPLETED';
    if (filter === 'scheduled') return test.type === 'SCHEDULED';
    if (filter === 'self-paced') return test.type === 'SELF_PACED';
    return true;
  }) : [];

  const statusCounts = {
    all: Array.isArray(tests) ? tests.length : 0,
    pending: Array.isArray(tests) ? tests.filter(t => t.status !== 'COMPLETED').length : 0,
    completed: Array.isArray(tests) ? tests.filter(t => t.status === 'COMPLETED').length : 0,
    scheduled: Array.isArray(tests) ? tests.filter(t => t.type === 'SCHEDULED').length : 0,
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
          <div className="loading-title">Loading Tests</div>
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
          Tests & Assessments
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          View and attempt your scheduled and self-paced tests
        </p>
      </div>

      {/* Stats */}
      <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
        <div className="bo-stat-card">
          <div className="bo-stat-icon blue">
            <FileText size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.all}</div>
          <div className="bo-stat-label">Total Tests</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon orange">
            <Clock size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.pending}</div>
          <div className="bo-stat-label">Pending</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon green">
            <CheckCircle size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.completed}</div>
          <div className="bo-stat-label">Completed</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon purple">
            <Calendar size={22} />
          </div>
          <div className="bo-stat-value">{statusCounts.scheduled}</div>
          <div className="bo-stat-label">Scheduled</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bo-card" style={{ padding: '12px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'All Tests' },
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'self-paced', label: 'Self-Paced' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--bo-radius)',
                border: filter === f.value ? 'none' : '1px solid var(--bo-border)',
                background: filter === f.value ? 'var(--bo-accent)' : 'transparent',
                color: filter === f.value ? '#fff' : 'var(--bo-text-secondary)',
                fontSize: 13,
                fontWeight: filter === f.value ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tests List */}
      {error && (
        <div className="bo-card" style={{ padding: 24, marginBottom: 24, textAlign: 'center', color: 'var(--bo-danger)' }}>
          {error}
        </div>
      )}

      {filteredTests.length === 0 ? (
        <div className="bo-card" style={{ padding: 80, textAlign: 'center' }}>
          <FileText size={64} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 8 }}>
            No tests found
          </h3>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>
            {filter !== 'all' ? 'Try adjusting your filter' : 'No tests are available at the moment'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredTests.map((test) => (
            <div 
              key={test.id}
              className="bo-card"
              style={{ 
                padding: 24,
                border: '1px solid var(--bo-border)',
                transition: 'all 0.2s ease',
                cursor: test.status !== 'COMPLETED' ? 'pointer' : 'default',
              }}
              onClick={() => test.status !== 'COMPLETED' && navigate(`/student/tests/${test.id}`)}
              onMouseEnter={(e) => {
                if (test.status !== 'COMPLETED') {
                  e.currentTarget.style.boxShadow = 'var(--bo-shadow-md)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--bo-shadow-sm)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', margin: 0 }}>
                      {test.title}
                    </h3>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: 12, 
                      fontSize: 11, 
                      fontWeight: 600,
                      background: test.type === 'SCHEDULED' ? 'var(--bo-info-light)' : 'var(--bo-success-light)',
                      color: test.type === 'SCHEDULED' ? 'var(--bo-info)' : 'var(--bo-success)'
                    }}>
                      {test.type === 'SCHEDULED' ? 'Scheduled' : 'Self-Paced'}
                    </span>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: 12, 
                      fontSize: 11, 
                      fontWeight: 600,
                      background: test.status === 'COMPLETED' ? 'var(--bo-success-light)' : 
                                 test.status === 'IN_PROGRESS' ? 'var(--bo-warning-light)' : 'var(--bo-border-light)',
                      color: test.status === 'COMPLETED' ? 'var(--bo-success)' : 
                             test.status === 'IN_PROGRESS' ? 'var(--bo-warning)' : 'var(--bo-text-muted)'
                    }}>
                      {test.status === 'COMPLETED' ? 'Completed' : 
                       test.status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started'}
                    </span>
                  </div>

                  <p style={{ fontSize: 14, color: 'var(--bo-text-secondary)', marginBottom: 16 }}>
                    📚 {test.courseName}
                  </p>

                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: 'var(--bo-text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} />
                      {test.duration} minutes
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Target size={14} />
                      {test.totalMarks} marks (Pass: {test.passingMarks})
                    </div>
                    {test.scheduledFor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={14} />
                        {new Date(test.scheduledFor).toLocaleString()}
                      </div>
                    )}
                    {test.deadline && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--bo-danger)' }}>
                        <AlertCircle size={14} />
                        Due: {new Date(test.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {test.status === 'COMPLETED' && test.score !== undefined && (
                    <div style={{ 
                      marginTop: 16, 
                      padding: 12, 
                      background: test.score >= test.passingMarks ? 'var(--bo-success-light)' : 'var(--bo-danger-light)',
                      borderRadius: 'var(--bo-radius)',
                      display: 'inline-block'
                    }}>
                      <span style={{ 
                        fontSize: 14, 
                        fontWeight: 600,
                        color: test.score >= test.passingMarks ? 'var(--bo-success)' : 'var(--bo-danger)'
                      }}>
                        Score: {test.score}/{test.totalMarks} ({((test.score / test.totalMarks) * 100).toFixed(1)}%)
                        {test.score >= test.passingMarks ? ' - Passed ✓' : ' - Failed ✗'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  {test.status === 'NOT_STARTED' && (
                    <button 
                      className="bo-btn bo-btn-primary"
                      onClick={() => navigate(`/student/tests/${test.id}`)}
                    >
                      Start Test
                    </button>
                  )}
                  {test.status === 'IN_PROGRESS' && (
                    <button 
                      className="bo-btn"
                      style={{ background: 'var(--bo-warning)', color: '#fff' }}
                      onClick={() => navigate(`/student/tests/${test.id}`)}
                    >
                      Continue Test
                    </button>
                  )}
                  {test.status === 'COMPLETED' && (
                    <button 
                      className="bo-btn bo-btn-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student/tests/${test.id}/results`);
                      }}
                    >
                      View Results
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentTests;
