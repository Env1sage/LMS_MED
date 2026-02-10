import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, BookOpen, TrendingUp, Activity,
  ArrowUpRight, Globe2, Award, BarChart3, Shield, Settings as SettingsIcon
} from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import '../styles/bitflow-owner.css';

interface DashboardData {
  totalPublishers: number;
  totalColleges: number;
  totalStudents: number;
  totalContent: number;
  totalCompetencies: number;
  activePublishers: number;
  activeColleges: number;
}

const BitflowOwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    totalPublishers: 0, totalColleges: 0, totalStudents: 0,
    totalContent: 0, totalCompetencies: 0, activePublishers: 0, activeColleges: 0
  });
  const [publishers, setPublishers] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashRes, pubRes, colRes, compRes] = await Promise.all([
          apiService.get('/bitflow-owner/dashboard').catch(() => ({ data: {} })),
          apiService.get('/bitflow-owner/publishers').catch(() => ({ data: { publishers: [] } })),
          apiService.get('/bitflow-owner/colleges').catch(() => ({ data: { colleges: [] } })),
          apiService.get('/competencies/stats').catch(() => ({ data: { total: 0 } })),
        ]);

        const pubs = pubRes.data?.publishers || pubRes.data || [];
        const cols = colRes.data?.colleges || colRes.data || [];

        setPublishers(Array.isArray(pubs) ? pubs : []);
        setColleges(Array.isArray(cols) ? cols : []);

        setData({
          totalPublishers: Array.isArray(pubs) ? pubs.length : 0,
          totalColleges: Array.isArray(cols) ? cols.length : 0,
          totalStudents: dashRes.data?.studentCount || dashRes.data?.totalStudents || cols.reduce((s: number, c: any) => s + (c.totalStudents || 0), 0),
          totalContent: dashRes.data?.contentByType
            ? (dashRes.data.contentByType.books || 0) + (dashRes.data.contentByType.videos || 0) + (dashRes.data.contentByType.mcqs || 0)
            : dashRes.data?.totalContent || dashRes.data?.totalLearningUnits || 0,
          totalCompetencies: compRes.data?.total || compRes.data?.totalCompetencies || 0,
          activePublishers: dashRes.data?.activePublishers || (Array.isArray(pubs) ? pubs.filter((p: any) => p.status === 'ACTIVE').length : 0),
          activeColleges: dashRes.data?.activeColleges || (Array.isArray(cols) ? cols.filter((c: any) => c.status === 'ACTIVE').length : 0),
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <MainLayout loading={true} loadingMessage="Loading Dashboard" />;
  }

  return (
    <MainLayout>
      <div className="bo-page">
        {/* Header */}
        <div className="bo-page-header">
          <div>
            <h1 className="bo-page-title">Dashboard</h1>
            <p className="bo-page-subtitle">Platform overview and quick actions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="bo-stats-grid">
          <div className="bo-stat-card" onClick={() => navigate('/publishers')}>
            <div className="bo-stat-icon purple"><Building2 size={22} /></div>
            <div className="bo-stat-value">{data.totalPublishers}</div>
            <div className="bo-stat-label">Publishers</div>
            <div className="bo-stat-trend"><TrendingUp size={14} /> {data.activePublishers} active</div>
          </div>
          <div className="bo-stat-card" onClick={() => navigate('/colleges')}>
            <div className="bo-stat-icon cyan"><Globe2 size={22} /></div>
            <div className="bo-stat-value">{data.totalColleges}</div>
            <div className="bo-stat-label">Colleges</div>
            <div className="bo-stat-trend"><TrendingUp size={14} /> {data.activeColleges} active</div>
          </div>
          <div className="bo-stat-card">
            <div className="bo-stat-icon green"><Users size={22} /></div>
            <div className="bo-stat-value">{data.totalStudents.toLocaleString()}</div>
            <div className="bo-stat-label">Students</div>
            <div className="bo-stat-trend"><Activity size={14} /> Enrolled</div>
          </div>
          <div className="bo-stat-card" onClick={() => navigate('/competencies')}>
            <div className="bo-stat-icon orange"><Award size={22} /></div>
            <div className="bo-stat-value">{data.totalCompetencies.toLocaleString()}</div>
            <div className="bo-stat-label">Competencies</div>
            <div className="bo-stat-trend"><Activity size={14} /> MCI Framework</div>
          </div>
          <div className="bo-stat-card" onClick={() => navigate('/content')}>
            <div className="bo-stat-icon blue"><BookOpen size={22} /></div>
            <div className="bo-stat-value">{data.totalContent}</div>
            <div className="bo-stat-label">Learning Units</div>
            <div className="bo-stat-trend"><TrendingUp size={14} /> Content library</div>
          </div>
        </div>

        {/* Two Column */}
        <div className="bo-grid-2">
          {/* Recent Publishers */}
          <div className="bo-card">
            <div className="bo-card-header">
              <h3 className="bo-card-title">Recent Publishers</h3>
              <button className="bo-btn bo-btn-ghost bo-btn-sm" onClick={() => navigate('/publishers')}>
                View All <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="bo-card-body" style={{ padding: 0 }}>
              {publishers.length > 0 ? (
                publishers.slice(0, 5).map((pub: any) => (
                  <div
                    key={pub.id}
                    className="bo-list-item"
                    style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--bo-border-light)' }}
                    onClick={() => navigate('/publishers')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--bo-text-primary)', fontSize: '14px' }}>{pub.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--bo-text-muted)', marginTop: 2 }}>{pub.contactEmail}</div>
                    </div>
                    <span className={`bo-badge ${pub.status === 'ACTIVE' ? 'bo-badge-success' : 'bo-badge-warning'}`}>
                      {pub.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="bo-empty">
                  <Building2 size={40} className="bo-empty-icon" />
                  <h3>No Publishers Yet</h3>
                  <p>Create your first publisher to get started</p>
                  <button className="bo-btn bo-btn-primary" onClick={() => navigate('/publishers')}>Add Publisher</button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Colleges */}
          <div className="bo-card">
            <div className="bo-card-header">
              <h3 className="bo-card-title">Recent Colleges</h3>
              <button className="bo-btn bo-btn-ghost bo-btn-sm" onClick={() => navigate('/colleges')}>
                View All <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="bo-card-body" style={{ padding: 0 }}>
              {colleges.length > 0 ? (
                colleges.slice(0, 5).map((col: any) => (
                  <div
                    key={col.id}
                    className="bo-list-item"
                    style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--bo-border-light)' }}
                    onClick={() => navigate('/colleges')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--bo-text-primary)', fontSize: '14px' }}>{col.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--bo-text-muted)', marginTop: 2 }}>
                        <Users size={12} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                        {col.totalStudents || 0} students
                      </div>
                    </div>
                    <span className={`bo-badge ${col.status === 'ACTIVE' ? 'bo-badge-success' : 'bo-badge-warning'}`}>
                      {col.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="bo-empty">
                  <Globe2 size={40} className="bo-empty-icon" />
                  <h3>No Colleges Yet</h3>
                  <p>Create your first college to get started</p>
                  <button className="bo-btn bo-btn-primary" onClick={() => navigate('/colleges')}>Add College</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bo-card" style={{ marginTop: 22 }}>
          <div className="bo-card-header">
            <h3 className="bo-card-title">Quick Actions</h3>
          </div>
          <div className="bo-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { icon: BarChart3, label: 'Analytics', sub: 'Platform metrics', path: '/analytics' },
                { icon: Shield, label: 'Audit Logs', sub: 'Security & activity', path: '/audit-logs' },
                { icon: BookOpen, label: 'Content', sub: 'Learning units', path: '/content' },
                { icon: SettingsIcon, label: 'Settings', sub: 'Configuration', path: '/settings' },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.path}
                    className="bo-btn bo-btn-secondary"
                    style={{ padding: '16px', flexDirection: 'column', alignItems: 'flex-start', gap: 8, height: 'auto' }}
                    onClick={() => navigate(action.path)}
                  >
                    <Icon size={20} color="var(--bo-accent)" />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--bo-text-primary)' }}>{action.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>{action.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default BitflowOwnerDashboard;
