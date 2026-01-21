import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import learningUnitService from '../services/learning-unit.service';
import competencyService from '../services/competency.service';
import {
  LearningUnit,
  LearningUnitType,
  DeliveryType,
  DifficultyLevel,
  LearningUnitStatus,
  Competency,
  CompetencyStatus,
  LearningUnitStats,
  LearningUnitAnalytics,
} from '../types';
import '../styles/PublisherAdmin.css';

const PublisherAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [learningUnits, setLearningUnits] = useState<LearningUnit[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [stats, setStats] = useState<LearningUnitStats | null>(null);
  const [analytics, setAnalytics] = useState<LearningUnitAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [unitsRes, competenciesRes, statsRes, analyticsRes] = await Promise.all([
        learningUnitService.getAll(),
        competencyService.getAll({ limit: 100, status: CompetencyStatus.ACTIVE }),
        learningUnitService.getStats(),
        learningUnitService.getAnalytics(),
      ]);
      
      setLearningUnits(unitsRes?.data || []);
      setCompetencies(competenciesRes?.data || []);
      setStats(statsRes || null);
      setAnalytics(analyticsRes || null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load data';
      console.error('Dashboard load error:', err);
      setError(errorMsg);
      setLearningUnits([]);
      setCompetencies([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: LearningUnitType) => {
    switch (type) {
      case LearningUnitType.BOOK:
        return '📚';
      case LearningUnitType.VIDEO:
        return '🎥';
      case LearningUnitType.MCQ:
        return '✅';
      case LearningUnitType.NOTES:
        return '📝';
    }
  };

  const getStatusBadge = (status: LearningUnitStatus) => {
    const className = `status-badge status-${status.toLowerCase()}`;
    return <span className={className}>{status}</span>;
  };

  return (
    <div className="publisher-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>📚 Publisher Admin Portal</h1>
          <p>Manage your learning content and view analytics</p>
        </div>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          <button onClick={() => navigate('/publisher-admin/create')} className="btn-primary">
            📝 Create Learning Unit
          </button>
          <button onClick={() => navigate('/publisher-admin/mcqs')} className="btn-primary">
            ✅ Manage MCQs
          </button>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {loading && <div className="alert" style={{background: '#f0f0f0'}}>Loading...</div>}

      <div className="tabs">
        <button className={tab === 'overview' ? 'tab active' : 'tab'} onClick={() => setTab('overview')}>
          Overview
        </button>
        <button className={tab === 'units' ? 'tab active' : 'tab'} onClick={() => setTab('units')}>
          Learning Units
        </button>
        <button className={tab === 'analytics' ? 'tab active' : 'tab'} onClick={() => setTab('analytics')}>
          Analytics
        </button>
      </div>

      {tab === 'overview' && stats && (
        <div className="tab-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Units</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Units</div>
              <div className="stat-value success">{stats.byStatus.ACTIVE || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Books</div>
              <div className="stat-value">📚 {stats.byType.BOOK || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Videos</div>
              <div className="stat-value">🎥 {stats.byType.VIDEO || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">MCQs</div>
              <div className="stat-value">✅ {stats.byType.MCQ || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Notes</div>
              <div className="stat-value">📝 {stats.byType.NOTES || 0}</div>
            </div>
          </div>

          {analytics && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Accesses</div>
                <div className="stat-value">{analytics.totalAccesses}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Unique Users</div>
                <div className="stat-value">{analytics.uniqueUsers}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg. Duration (min)</div>
                <div className="stat-value">{Math.round(analytics.averageDuration)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'units' && !loading && (
        <div className="tab-content">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Difficulty</th>
                  <th>Duration</th>
                  <th>Competencies</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {learningUnits && learningUnits.length > 0 ? (
                  learningUnits.map((unit) => (
                    <tr key={unit.id}>
                      <td>{getTypeIcon(unit.type)}</td>
                      <td>
                        <strong>{unit.title}</strong>
                        <br />
                        <small>{unit.topic}</small>
                      </td>
                      <td>{unit.subject}</td>
                      <td>{unit.difficultyLevel}</td>
                      <td>{unit.estimatedDuration} min</td>
                      <td>{unit.competencyIds.length}</td>
                      <td>{getStatusBadge(unit.status)}</td>
                      <td>
                        <button 
                          onClick={() => navigate(`/publisher-admin/view/${unit.id}`)}
                          className="btn-view"
                          title="Preview Content"
                        >
                          👁️ View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{textAlign: 'center', padding: '20px'}}>
                      No learning units found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'analytics' && analytics && (
        <div className="tab-content">
          <div className="card">
            <h3>Popular Learning Units</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Access Count</th>
                </tr>
              </thead>
              <tbody>
                {analytics.popularUnits && analytics.popularUnits.length > 0 ? (
                  analytics.popularUnits.map((unit) => (
                    <tr key={unit.id}>
                      <td>{getTypeIcon(unit.type)}</td>
                      <td>{unit.title}</td>
                      <td>{unit.accessCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{textAlign: 'center', padding: '20px'}}>
                      No analytics data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublisherAdminDashboard;
