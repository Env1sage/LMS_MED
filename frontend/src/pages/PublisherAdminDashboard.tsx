import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import publisherProfileService, { PublisherProfile } from '../services/publisher-profile.service';
import learningUnitService from '../services/learning-unit.service';
import mcqService, { McqStats } from '../services/mcq.service';
import PublisherLayout from '../components/publisher/PublisherLayout';
import {
  BookOpen, Video, FileText, ClipboardList, PlusCircle,
  TrendingUp, Eye, Users, ArrowRight, RefreshCw
} from 'lucide-react';
import { LearningUnitStats, LearningUnit } from '../types';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

const POLL_INTERVAL = 30000; // 30 seconds

const PublisherAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [luStats, setLuStats] = useState<LearningUnitStats | null>(null);
  const [mcqStats, setMcqStats] = useState<McqStats | null>(null);
  const [recentContent, setRecentContent] = useState<LearningUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const [profileRes, statsRes, mcqStatsRes, contentRes] = await Promise.allSettled([
        publisherProfileService.getProfile(),
        learningUnitService.getStats(),
        mcqService.getStats(),
        learningUnitService.getAll({ page: 1, limit: 5 }),
      ]);
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
      if (statsRes.status === 'fulfilled') setLuStats(statsRes.value);
      if (mcqStatsRes.status === 'fulfilled') setMcqStats(mcqStatsRes.value);
      if (contentRes.status === 'fulfilled') {
        const d = (contentRes.value as any)?.data || contentRes.value || [];
        setRecentContent(Array.isArray(d) ? d : []);
      }
      setLastUpdated(new Date());
    } catch (err) { console.error('Dashboard load error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    loadDashboard();
    intervalRef.current = setInterval(() => loadDashboard(true), POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadDashboard]);

  const statusBadge = (status: string) => {
    const c: Record<string, string> = { ACTIVE: 'var(--bo-success)', DRAFT: 'var(--bo-warning)', PENDING_MAPPING: 'var(--bo-primary)', INACTIVE: 'var(--bo-text-muted)', SUSPENDED: 'var(--bo-danger)' };
    return <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: `${c[status] || '#999'}15`, color: c[status] || '#999' }}>{status?.replace(/_/g, ' ')}</span>;
  };
  const typeIcon = (type: string) => {
    if (type === 'VIDEO') return <Video size={16} style={{ color: '#8B5CF6' }} />;
    return <BookOpen size={16} style={{ color: '#3B82F6' }} />;
  };

  if (loading) return (
    <PublisherLayout>
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
        <div className="loading-title">Loading Publisher Dashboard</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </PublisherLayout>
  );

  const totalLU = luStats?.total || 0;
  const activeLU = (luStats?.byStatus as any)?.ACTIVE || 0;
  const draftLU = (luStats?.byStatus as any)?.DRAFT || 0;
  const pendingLU = (luStats?.byStatus as any)?.PENDING_MAPPING || 0;
  const bookCount = (luStats?.byType as any)?.BOOK || 0;
  const videoCount = (luStats?.byType as any)?.VIDEO || 0;

  return (
    <PublisherLayout>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text)' }}>Welcome back, {profile?.contactPerson || user?.fullName}</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>{profile?.companyName} — Content Management Dashboard</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="bo-btn bo-btn-outline"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Content', value: totalLU, color: 'var(--bo-primary)', icon: <BookOpen size={22} /> },
          { label: 'Active', value: activeLU, color: 'var(--bo-success)', icon: <TrendingUp size={22} /> },
          { label: 'Pending Mapping', value: pendingLU, color: '#F59E0B', icon: <Eye size={22} /> },
          { label: 'Drafts', value: draftLU, color: 'var(--bo-text-muted)', icon: <FileText size={22} /> },
        ].map((s, i) => (
          <div key={i} className="bo-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginTop: 6 }}>{s.value}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Type Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'E-Books', value: bookCount, icon: <BookOpen size={18} />, color: '#3B82F6' },
          { label: 'Videos', value: videoCount, icon: <Video size={18} />, color: '#8B5CF6' },
          { label: 'MCQs', value: mcqStats?.total || 0, icon: <ClipboardList size={18} />, color: '#F59E0B' },
        ].map((s, i) => (
          <div key={i} className="bo-card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => i === 2 ? navigate('/publisher-admin/mcqs') : navigate('/publisher-admin/content')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
        {/* Quick Actions */}
        <div className="bo-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="bo-btn bo-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/publisher-admin/create')}><PlusCircle size={16} /> Create Learning Unit</button>
            <button className="bo-btn bo-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/publisher-admin/bulk-upload')}><FileText size={16} /> Bulk Upload</button>
            <button className="bo-btn bo-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/publisher-admin/mcqs')}><ClipboardList size={16} /> Manage MCQs</button>
            <button className="bo-btn bo-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/publisher-admin/content')}><BookOpen size={16} /> View All Content</button>
            <button className="bo-btn bo-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/publisher-admin/profile')}><Users size={16} /> Publisher Profile</button>
          </div>
          {profile && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--bo-border)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text-muted)', marginBottom: 10 }}>PUBLISHER INFO</h4>
              <div style={{ fontSize: 13, display: 'grid', gap: 6 }}>
                <div><span style={{ color: 'var(--bo-text-muted)' }}>Code:</span> <strong>{profile.publisherCode}</strong></div>
                <div><span style={{ color: 'var(--bo-text-muted)' }}>Status:</span> {statusBadge(profile.status)}</div>
                <div><span style={{ color: 'var(--bo-text-muted)' }}>Since:</span> {new Date(profile.createdAt).toLocaleDateString()}</div>
                <div>
                  <span style={{ color: 'var(--bo-text-muted)' }}>Expires:</span>{' '}
                  {profile.contractEndDate ? (
                    <strong style={{
                      color: new Date(profile.contractEndDate) < new Date() ? '#EF4444'
                        : new Date(profile.contractEndDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? '#F59E0B'
                        : '#10B981',
                    }}>
                      {new Date(profile.contractEndDate).toLocaleDateString()}
                    </strong>
                  ) : (
                    <span style={{ color: '#10B981', fontWeight: 600 }}>No expiry</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Content */}
        <div className="bo-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Recent Content</h3>
            <button className="bo-btn bo-btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => navigate('/publisher-admin/content')}>View All <ArrowRight size={14} /></button>
          </div>
          {recentContent.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
              <BookOpen size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>No content yet</div>
              <button className="bo-btn bo-btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/publisher-admin/create')}><PlusCircle size={16} /> Create Now</button>
            </div>
          ) : (
            recentContent.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--bo-border)', cursor: 'pointer' }} onClick={() => navigate(`/publisher-admin/view/${item.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {typeIcon(item.type)}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{item.subject} • {item.topic}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {statusBadge(item.status)}
                  <ArrowRight size={14} style={{ color: 'var(--bo-text-muted)' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PublisherLayout>
  );
};

export default PublisherAdminDashboard;
