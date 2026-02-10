import React, { useState, useEffect } from 'react';
import { packagesService, PackageAssignment } from '../../services/packages.service';
import { useAuth } from '../../context/AuthContext';
import CollegeLayout from '../../components/college/CollegeLayout';
import { Package, Calendar, BookOpen, RefreshCw, Tag, Building } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const CollegePackages: React.FC = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState<PackageAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    setLoading(true); setError(null);
    try {
      if (user?.collegeId) {
        const data = await packagesService.getCollegePackages(user.collegeId);
        setPackages(Array.isArray(data) ? data : []);
      }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load packages'); }
    finally { setLoading(false); }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      ACTIVE: { bg: '#ECFDF5', color: '#059669' },
      INACTIVE: { bg: '#FEF3C7', color: '#D97706' },
      EXPIRED: { bg: '#FEF2F2', color: '#DC2626' },
      CANCELLED: { bg: '#F3F4F6', color: '#6B7280' },
    };
    const c = colors[status] || { bg: '#F3F4F6', color: '#6B7280' };
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>{status}</span>;
  };

  return (
    <CollegeLayout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Content Packages</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>View assigned content packages from publishers</p>
        </div>
        <button className="bo-btn bo-btn-outline" onClick={fetchPackages}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div className="page-loading-screen" style={{ padding: 60 }}>
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
          <div className="loading-title">Loading Packages</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      ) : packages.length === 0 ? (
        <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No Packages Assigned</div>
          <div style={{ color: 'var(--bo-text-muted)', fontSize: 13 }}>Contact your Bitflow administrator to get content packages</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {packages.map(pa => (
            <div key={pa.id} className="bo-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{pa.package?.name || 'Unnamed Package'}</div>
                  {pa.package?.publisher && (
                    <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building size={12} /> {pa.package.publisher.name}
                    </div>
                  )}
                </div>
                {statusBadge(pa.status)}
              </div>

              {pa.package?.description && (
                <p style={{ fontSize: 12, color: 'var(--bo-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>{pa.package.description}</p>
              )}

              {/* Subjects */}
              {pa.package?.subjects && pa.package.subjects.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Subjects</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {pa.package.subjects.map((s, i) => (
                      <span key={i} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: '#ECFDF5', color: '#059669' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Types */}
              {pa.package?.contentTypes && pa.package.contentTypes.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Content Types</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {pa.package.contentTypes.map((ct, i) => (
                      <span key={i} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: '#EFF6FF', color: '#2563EB' }}>
                        {ct}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 10, borderRadius: 8, background: 'var(--bo-bg)', border: '1px solid var(--bo-border)' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>Start Date</div>
                  <div style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Calendar size={12} /> {new Date(pa.startDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>End Date</div>
                  <div style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Calendar size={12} /> {pa.endDate ? new Date(pa.endDate).toLocaleDateString() : 'No end date'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollegeLayout>
  );
};

export default CollegePackages;
