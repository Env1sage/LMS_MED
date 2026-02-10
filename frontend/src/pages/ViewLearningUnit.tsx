import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PublisherLayout from '../components/publisher/PublisherLayout';
import SecurePdfViewer from '../components/SecurePdfViewer';
import learningUnitService from '../services/learning-unit.service';
import { LearningUnit } from '../types';
import { API_BASE_URL } from '../config/api';
import {
  ArrowLeft, BookOpen, Video, FileText, Edit2, ToggleLeft, ToggleRight,
  Clock, Shield, Eye, Tag, Award, Calendar, ExternalLink
} from 'lucide-react';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

const ViewLearningUnit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<LearningUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showViewer, setShowViewer] = useState(true);

  useEffect(() => {
    if (id) loadUnit();
  }, [id]);

  const loadUnit = async () => {
    try {
      setLoading(true);
      const data = await learningUnitService.getById(id!);
      setUnit(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load learning unit');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!unit) return;
    try {
      setActionLoading(true);
      if (unit.status === 'ACTIVE') {
        await learningUnitService.deactivateContent(unit.id, 'Deactivated by publisher');
      } else {
        await learningUnitService.activateContent(unit.id);
      }
      loadUnit();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const typeIcon = (type: string) => {
    if (type === 'VIDEO') return <Video size={20} style={{ color: '#8B5CF6' }} />;
    if (type === 'BOOK') return <BookOpen size={20} style={{ color: '#3B82F6' }} />;
    return <FileText size={20} style={{ color: '#10B981' }} />;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: '#10B981', DRAFT: '#F59E0B', PENDING_MAPPING: '#6366F1',
      INACTIVE: '#6B7280', SUSPENDED: '#EF4444',
    };
    const c = colors[status] || '#6B7280';
    return (
      <span style={{
        padding: '4px 14px', borderRadius: 16, fontSize: 13, fontWeight: 600,
        background: `${c}15`, color: c,
      }}>
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  const diffLabel: Record<string, string> = {
    K: 'Knows', KH: 'Knows How', S: 'Shows', SH: 'Shows How', P: 'Performs'
  };

  // Build the full file URL for the content viewer
  const getFileUrl = (url: string | undefined) => {
    if (!url) return '';
    // If it starts with /uploads/, it's a local file — prefix with API base URL
    if (url.startsWith('/uploads/')) {
      return `${API_BASE_URL.replace('/api', '')}${'/api'}${url}`;
    }
    // External URL (e.g., YouTube)
    return url;
  };

  const isLocalFile = (url: string | undefined) => url?.startsWith('/uploads/');
  const isPdf = (url: string | undefined) => url?.toLowerCase().endsWith('.pdf');
  const isVideo = (url: string | undefined) => {
    if (!url) return false;
    // Check for video file extensions
    if (/\.(mp4|webm|ogg|mov)$/i.test(url)) return true;
    // Check for YouTube/Vimeo URLs
    if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) return true;
    return false;
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url;
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
        <div className="loading-title">Loading Learning Unit</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </PublisherLayout>
  );

  if (error || !unit) return (
    <PublisherLayout>
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 18, color: 'var(--bo-danger)', marginBottom: 12 }}>{error || 'Not found'}</div>
        <button className="bo-btn bo-btn-outline" onClick={() => navigate('/publisher-admin/content')}>
          <ArrowLeft size={16} /> Back to Content
        </button>
      </div>
    </PublisherLayout>
  );

  const infoRow = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid var(--bo-border)' }}>
      <div style={{ width: 180, fontSize: 13, color: 'var(--bo-text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--bo-text)', flex: 1 }}>{value || '—'}</div>
    </div>
  );

  return (
    <PublisherLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}
              onClick={() => navigate('/publisher-admin/content')}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                {typeIcon(unit.type)}
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text)' }}>{unit.title}</h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {statusBadge(unit.status)}
                <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                  Created {new Date(unit.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="bo-btn bo-btn-outline" onClick={() => navigate(`/publisher-admin/edit/${unit.id}`)}>
              <Edit2 size={14} /> Edit
            </button>
            <button className="bo-btn bo-btn-outline" onClick={handleToggleStatus} disabled={actionLoading}>
              {unit.status === 'ACTIVE' ? <><ToggleRight size={14} /> Deactivate</> : <><ToggleLeft size={14} /> Activate</>}
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        {unit.secureAccessUrl && (
          <div className="bo-card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderBottom: '1px solid var(--bo-border)', background: 'var(--bo-bg)',
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Eye size={16} style={{ color: 'var(--bo-primary)' }} />
                Content Preview
              </h3>
              <button
                className="bo-btn bo-btn-outline"
                style={{ fontSize: 12, padding: '4px 14px' }}
                onClick={() => setShowViewer(!showViewer)}
              >
                {showViewer ? 'Hide' : 'Show'} Viewer
              </button>
            </div>
            {showViewer && (
              <div style={{ padding: 0 }}>
                {/* PDF Viewer */}
                {isPdf(unit.secureAccessUrl) && isLocalFile(unit.secureAccessUrl) && (
                  <SecurePdfViewer
                    url={getFileUrl(unit.secureAccessUrl)}
                    watermarkText={unit.watermarkEnabled ? `${unit.title} - View Only` : ''}
                  />
                )}

                {/* Video Player - local files */}
                {isVideo(unit.secureAccessUrl) && isLocalFile(unit.secureAccessUrl) && (
                  <div style={{ background: '#000', padding: 0 }}>
                    <video
                      controls
                      controlsList="nodownload"
                      style={{ width: '100%', maxHeight: 600, display: 'block' }}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <source
                        src={(() => {
                          const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
                          return `${getFileUrl(unit.secureAccessUrl)}?token=${token}`;
                        })()}
                        type="video/mp4"
                      />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* YouTube / External Video */}
                {isVideo(unit.secureAccessUrl) && !isLocalFile(unit.secureAccessUrl) && (
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                    <iframe
                      src={getYouTubeEmbedUrl(unit.secureAccessUrl)}
                      title={unit.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '100%', height: '100%', border: 'none',
                      }}
                    />
                  </div>
                )}

                {/* External link fallback (not PDF, not video) */}
                {!isPdf(unit.secureAccessUrl) && !isVideo(unit.secureAccessUrl) && (
                  <div style={{
                    padding: 40, textAlign: 'center', color: 'var(--bo-text-muted)',
                  }}>
                    <ExternalLink size={32} style={{ marginBottom: 12, color: 'var(--bo-primary)' }} />
                    <div style={{ fontSize: 14, marginBottom: 16 }}>
                      This content type cannot be previewed inline.
                    </div>
                    <a
                      href={unit.secureAccessUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bo-btn bo-btn-primary"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <ExternalLink size={14} /> Open Content
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Details */}
        <div className="bo-card" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Content Details</h3>
          {infoRow('Type', <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{typeIcon(unit.type)} {unit.type}</span>)}
          {infoRow('Description', unit.description)}
          {infoRow('Subject', unit.subject)}
          {infoRow('Topic', unit.topic)}
          {unit.subTopic && infoRow('Sub-Topic', unit.subTopic)}
          {infoRow('Difficulty Level', `${unit.difficultyLevel} — ${diffLabel[unit.difficultyLevel] || unit.difficultyLevel}`)}
          {infoRow('Estimated Duration', `${unit.estimatedDuration} minutes`)}
        </div>

        {/* Delivery & Security */}
        <div className="bo-card" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Delivery & Security</h3>
          {infoRow('Delivery Type', unit.deliveryType)}
          {infoRow('Watermark', unit.watermarkEnabled ? '✅ Enabled' : '❌ Disabled')}
          {infoRow('Session Expiry', `${unit.sessionExpiryMinutes} minutes`)}
          {infoRow('Download Allowed', unit.downloadAllowed ? 'Yes' : 'No')}
          {infoRow('View Only', unit.viewOnly ? 'Yes' : 'No')}
          {infoRow('File URL', unit.secureAccessUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--bo-primary)', wordBreak: 'break-all', flex: 1 }}>
                {unit.secureAccessUrl}
              </span>
              {isLocalFile(unit.secureAccessUrl) && (
                <button
                  className="bo-btn bo-btn-outline"
                  style={{ fontSize: 11, padding: '2px 10px', flexShrink: 0 }}
                  onClick={() => {
                    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
                    window.open(`${getFileUrl(unit.secureAccessUrl)}?token=${token}`, '_blank');
                  }}
                >
                  <ExternalLink size={12} /> Open
                </button>
              )}
            </div>
          ) : '—')}
        </div>

        {/* Competencies */}
        <div className="bo-card" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            Competency Mapping
            <span style={{ fontSize: 12, color: 'var(--bo-text-muted)', fontWeight: 400, marginLeft: 8 }}>
              ({unit.competencyIds?.length || 0} mapped)
            </span>
          </h3>
          {infoRow('Mapping Status', statusBadge(unit.competencyMappingStatus || 'PENDING'))}
          {unit.competencyIds && unit.competencyIds.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 8 }}>Mapped Competency IDs:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {unit.competencyIds.map(cid => (
                  <span key={cid} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11,
                    background: 'var(--bo-primary-light)', color: 'var(--bo-primary)',
                    fontFamily: 'monospace',
                  }}>
                    {cid.substring(0, 8)}...
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--bo-text-muted)', fontSize: 13 }}>
              No competencies mapped. <button className="bo-btn bo-btn-outline" style={{ fontSize: 12, padding: '2px 10px', marginLeft: 8 }}
                onClick={() => navigate(`/publisher-admin/edit/${unit.id}`)}>Add Competencies</button>
            </div>
          )}
        </div>

        {/* Tags & Metadata */}
        {(unit.tags && unit.tags.length > 0) && (
          <div className="bo-card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Tags</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {unit.tags.map((tag, i) => (
                <span key={i} style={{
                  padding: '4px 12px', borderRadius: 16, fontSize: 12,
                  background: 'var(--bo-bg)', border: '1px solid var(--bo-border)',
                  color: 'var(--bo-text-secondary)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status History */}
        <div className="bo-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Status History</h3>
          {infoRow('Current Status', statusBadge(unit.status))}
          {infoRow('Created', new Date(unit.createdAt).toLocaleString())}
          {infoRow('Last Updated', new Date(unit.updatedAt).toLocaleString())}
          {unit.activatedAt && infoRow('Activated', new Date(unit.activatedAt).toLocaleString())}
          {unit.deactivatedAt && infoRow('Deactivated', `${new Date(unit.deactivatedAt).toLocaleString()} — ${unit.deactivationReason || 'No reason'}`)}
        </div>
      </div>
    </PublisherLayout>
  );
};

export default ViewLearningUnit;
