import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import SecurePdfViewer from '../../components/SecurePdfViewer';
import apiService from '../../services/api.service';
import { API_BASE_URL } from '../../config/api';
import {
  ArrowLeft, BookOpen, Video, FileText, Eye, ExternalLink
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface LearningUnit {
  id: string;
  title: string;
  description?: string;
  type: string;
  subject?: string;
  topic?: string;
  secureAccessUrl?: string;
  estimatedDuration?: number;
  watermarkEnabled?: boolean;
}

const FacultyContentViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<LearningUnit | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) loadContent();
  }, [id]);

  const loadContent = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check if token is provided in URL (backward compatibility)
      const urlToken = searchParams.get('token');
      if (urlToken) {
        setAccessToken(urlToken);
        // Fetch the learning unit details using the token
        // For now, we'll generate a new token to get the unit details
      }
      
      // Generate access token for this learning unit
      const tokenRes = await apiService.post('/learning-units/access', {
        learningUnitId: id,
        deviceType: 'web'
      });
      
      setAccessToken(tokenRes.data.token);
      setUnit(tokenRes.data.learningUnit);
    } catch (err: any) {
      console.error('Failed to load content:', err);
      setError(err?.response?.data?.message || 'Failed to load content. You may not have access to this resource.');
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = (url: string | undefined) => {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      const token = accessToken || localStorage.getItem('accessToken') || localStorage.getItem('token');
      return `${API_BASE_URL.replace('/api', '')}${'/api'}${url}?token=${token}`;
    }
    return url;
  };

  const isLocalFile = (url: string | undefined) => url?.startsWith('/uploads/');
  const isPdf = (url: string | undefined) => url?.toLowerCase().endsWith('.pdf');
  const isVideo = (url: string | undefined) => {
    if (!url) return false;
    if (/\.(mp4|webm|ogg|mov)$/i.test(url)) return true;
    if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) return true;
    return false;
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url;
  };

  const typeIcon = (type: string) => {
    if (type === 'VIDEO') return <Video size={20} style={{ color: '#8B5CF6' }} />;
    if (type === 'BOOK' || type === 'EBOOK') return <BookOpen size={20} style={{ color: '#3B82F6' }} />;
    return <FileText size={20} style={{ color: '#10B981' }} />;
  };

  if (loading) {
    return (
      <FacultyLayout>
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
          <div className="loading-title">Loading Content</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </FacultyLayout>
    );
  }

  if (error || !unit) {
    return (
      <FacultyLayout>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 18, color: 'var(--bo-danger)', marginBottom: 12 }}>
            {error || 'Content not found'}
          </div>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/courses')}>
            <ArrowLeft size={16} /> Back to Courses
          </button>
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              className="bo-btn bo-btn-outline" 
              style={{ padding: '6px 10px' }}
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                {typeIcon(unit.type)}
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text)' }}>
                  {unit.title}
                </h1>
              </div>
              {unit.subject && (
                <div style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
                  {unit.subject} {unit.topic && `• ${unit.topic}`}
                  {unit.estimatedDuration && ` • ${unit.estimatedDuration} mins`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {unit.description && (
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--bo-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {unit.description}
            </p>
          </div>
        )}

        {/* Content Viewer */}
        {unit.secureAccessUrl && (
          <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid var(--bo-border)',
              background: 'var(--bo-bg)',
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Eye size={16} style={{ color: 'var(--bo-accent)' }} />
                Content Preview
              </h3>
            </div>

            <div style={{ minHeight: 500 }}>
              {/* PDF Viewer */}
              {isPdf(unit.secureAccessUrl) && isLocalFile(unit.secureAccessUrl) && (
                <SecurePdfViewer
                  url={getFileUrl(unit.secureAccessUrl)}
                  watermarkText={unit.watermarkEnabled ? `${unit.title} - Preview` : ''}
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
                    <source src={getFileUrl(unit.secureAccessUrl)} type="video/mp4" />
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
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                  />
                </div>
              )}

              {/* External link fallback */}
              {!isPdf(unit.secureAccessUrl) && !isVideo(unit.secureAccessUrl) && (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
                  <ExternalLink size={32} style={{ marginBottom: 12, color: 'var(--bo-accent)' }} />
                  <div style={{ fontSize: 14, marginBottom: 16 }}>
                    This content type cannot be previewed inline.
                  </div>
                  <a
                    href={unit.secureAccessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bo-btn"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <ExternalLink size={14} /> Open Content
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </FacultyLayout>
  );
};

export default FacultyContentViewer;
