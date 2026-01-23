import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import learningUnitService from '../services/learning-unit.service';
import BulkLearningUnitUpload from '../components/publisher/BulkLearningUnitUpload';
import {
  LearningUnit,
  LearningUnitType,
  LearningUnitStatus,
  LearningUnitStats,
  LearningUnitAnalytics,
} from '../types';

const PublisherAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [learningUnits, setLearningUnits] = useState<LearningUnit[]>([]);
  const [stats, setStats] = useState<LearningUnitStats | null>(null);
  const [analytics, setAnalytics] = useState<LearningUnitAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
      const [unitsRes, statsRes, analyticsRes] = await Promise.all([
        learningUnitService.getAll(),
        learningUnitService.getStats(),
        learningUnitService.getAnalytics(),
      ]);
      
      setLearningUnits(unitsRes?.data || []);
      setStats(statsRes || null);
      setAnalytics(analyticsRes || null);
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: LearningUnitType) => {
    const icons: Record<string, string> = {
      BOOK: '📚',
      VIDEO: '🎥',
      MCQ: '✅',
      NOTES: '📝',
    };
    return icons[type] || '📄';
  };

  const getStatusColor = (status: LearningUnitStatus) => {
    const colors: Record<string, string> = {
      ACTIVE: '#22c55e',
      DRAFT: '#eab308',
      INACTIVE: '#6b7280',
      PENDING_MAPPING: '#3b82f6',
      SUSPENDED: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    header: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      padding: '20px 40px',
      borderBottom: '1px solid #334155',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    logo: {
      fontSize: '28px',
    },
    headerTitle: {
      margin: 0,
      fontSize: '24px',
      fontWeight: 600,
      color: '#f8fafc',
    },
    headerSubtitle: {
      margin: 0,
      fontSize: '14px',
      color: '#94a3b8',
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    userInfo: {
      textAlign: 'right' as const,
      marginRight: '15px',
    },
    userName: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#f8fafc',
    },
    userRole: {
      fontSize: '12px',
      color: '#94a3b8',
    },
    logoutBtn: {
      padding: '8px 16px',
      background: 'transparent',
      border: '1px solid #475569',
      borderRadius: '6px',
      color: '#94a3b8',
      cursor: 'pointer',
      fontSize: '14px',
    },
    main: {
      padding: '30px 40px',
    },
    quickActions: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '30px',
    },
    actionCard: {
      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      padding: '20px',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      border: 'none',
      textAlign: 'left' as const,
      color: 'white',
    },
    actionCardGreen: {
      background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
    },
    actionCardPurple: {
      background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    },
    actionCardOrange: {
      background: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)',
    },
    actionIcon: {
      fontSize: '32px',
      marginBottom: '10px',
    },
    actionTitle: {
      fontSize: '16px',
      fontWeight: 600,
      margin: '0 0 5px 0',
    },
    actionDesc: {
      fontSize: '12px',
      opacity: 0.9,
      margin: 0,
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '15px',
      marginBottom: '30px',
    },
    statCard: {
      background: '#1e293b',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #334155',
      textAlign: 'center' as const,
    },
    statValue: {
      fontSize: '32px',
      fontWeight: 700,
      color: '#f8fafc',
      marginBottom: '5px',
    },
    statLabel: {
      fontSize: '13px',
      color: '#94a3b8',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    section: {
      background: '#1e293b',
      borderRadius: '12px',
      border: '1px solid #334155',
      marginBottom: '20px',
      overflow: 'hidden',
    },
    sectionHeader: {
      padding: '15px 20px',
      borderBottom: '1px solid #334155',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      margin: 0,
      fontSize: '16px',
      fontWeight: 600,
      color: '#f8fafc',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    th: {
      padding: '12px 15px',
      textAlign: 'left' as const,
      fontSize: '12px',
      fontWeight: 600,
      color: '#94a3b8',
      textTransform: 'uppercase' as const,
      borderBottom: '1px solid #334155',
      background: '#0f172a',
    },
    td: {
      padding: '12px 15px',
      borderBottom: '1px solid #334155',
      fontSize: '14px',
      color: '#e2e8f0',
    },
    statusBadge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
    },
    viewBtn: {
      padding: '6px 12px',
      background: '#3b82f6',
      border: 'none',
      borderRadius: '6px',
      color: 'white',
      cursor: 'pointer',
      fontSize: '12px',
    },
    alert: {
      padding: '15px 20px',
      borderRadius: '8px',
      marginBottom: '20px',
      background: '#7f1d1d',
      border: '1px solid #991b1b',
      color: '#fecaca',
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '60px',
      color: '#94a3b8',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '40px',
      color: '#64748b',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div>⏳ Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>📚</span>
          <div>
            <h1 style={styles.headerTitle}>Publisher Portal</h1>
            <p style={styles.headerSubtitle}>Content Management System</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user.fullName || user.email}</div>
            <div style={styles.userRole}>Publisher Admin</div>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {error && <div style={styles.alert}>⚠️ {error}</div>}

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <button
            style={styles.actionCard}
            onClick={() => navigate('/publisher-admin/create')}
          >
            <div style={styles.actionIcon}>📝</div>
            <h3 style={styles.actionTitle}>Create Content</h3>
            <p style={styles.actionDesc}>Add new learning unit</p>
          </button>

          <button
            style={{ ...styles.actionCard, ...styles.actionCardGreen }}
            onClick={() => navigate('/publisher-admin/mcqs')}
          >
            <div style={styles.actionIcon}>✅</div>
            <h3 style={styles.actionTitle}>Manage MCQs</h3>
            <p style={styles.actionDesc}>Create & edit questions</p>
          </button>

          <button
            style={{ ...styles.actionCard, ...styles.actionCardOrange }}
            onClick={() => setShowBulkUpload(!showBulkUpload)}
          >
            <div style={styles.actionIcon}>📤</div>
            <h3 style={styles.actionTitle}>Bulk Upload</h3>
            <p style={styles.actionDesc}>Import from CSV</p>
          </button>

          <button
            style={{ ...styles.actionCard, ...styles.actionCardPurple }}
            onClick={() => navigate('/publisher-admin/profile')}
          >
            <div style={styles.actionIcon}>👤</div>
            <h3 style={styles.actionTitle}>My Profile</h3>
            <p style={styles.actionDesc}>Manage account</p>
          </button>

          <button
            style={{ ...styles.actionCard, backgroundColor: '#374151' }}
            onClick={() => loadData()}
          >
            <div style={styles.actionIcon}>🔄</div>
            <h3 style={styles.actionTitle}>Refresh Data</h3>
            <p style={styles.actionDesc}>Reload all content</p>
          </button>
        </div>

        {/* Bulk Upload Section */}
        {showBulkUpload && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>📤 Bulk Upload Learning Units</h2>
              <button
                style={styles.viewBtn}
                onClick={() => setShowBulkUpload(false)}
              >
                ✕ Close
              </button>
            </div>
            <BulkLearningUnitUpload onSuccess={() => { loadData(); setShowBulkUpload(false); }} />
          </div>
        )}

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats?.total || 0}</div>
            <div style={styles.statLabel}>Total Units</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#22c55e' }}>
              {stats?.byStatus?.ACTIVE || 0}
            </div>
            <div style={styles.statLabel}>Active</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#3b82f6' }}>
              {stats?.byStatus?.PENDING_MAPPING || 0}
            </div>
            <div style={styles.statLabel}>Pending Mapping</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#eab308' }}>
              {stats?.byStatus?.DRAFT || 0}
            </div>
            <div style={styles.statLabel}>Draft</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>📚 {stats?.byType?.BOOK || 0}</div>
            <div style={styles.statLabel}>Books</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>🎥 {stats?.byType?.VIDEO || 0}</div>
            <div style={styles.statLabel}>Videos</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {analytics?.totalAccesses || 0}
            </div>
            <div style={styles.statLabel}>Total Views</div>
          </div>
        </div>

        {/* Learning Units Table */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>📋 Learning Units ({learningUnits.length})</h2>
          </div>
          {learningUnits.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Difficulty</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {learningUnits.map((unit) => (
                  <tr key={unit.id}>
                    <td style={styles.td}>
                      <span style={{ fontSize: '20px' }}>{getTypeIcon(unit.type)}</span>
                    </td>
                    <td style={styles.td}>
                      <strong>{unit.title}</strong>
                      <br />
                      <span style={{ color: '#64748b', fontSize: '12px' }}>{unit.topic}</span>
                    </td>
                    <td style={styles.td}>{unit.subject}</td>
                    <td style={styles.td}>{unit.difficultyLevel}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          background: getStatusColor(unit.status) + '20',
                          color: getStatusColor(unit.status),
                        }}
                      >
                        {unit.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.viewBtn}
                        onClick={() => navigate(`/publisher-admin/view/${unit.id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>📭</div>
              <h3>No Learning Units Yet</h3>
              <p>Click "Create Content" to add your first learning unit</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PublisherAdminDashboard;
