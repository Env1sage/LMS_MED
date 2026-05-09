import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import EpubReaderAnnotated from '../../components/student/EpubReaderAnnotated';
import BookCoverPage from '../../components/student/BookCoverPage';
import apiService from '../../services/api.service';
import { ArrowLeft, Play, FileText, ClipboardList, ExternalLink } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/** Helpers to classify content */
const isVideoType = (type?: string) =>
  type === 'VIDEO' || type === 'video';

const isMcqType = (type?: string) =>
  type === 'MCQ' || type === 'mcq';

const isNotesType = (type?: string) =>
  type === 'NOTES' || type === 'notes';

const isBookType = (type?: string) =>
  !type || type === 'BOOK' || type === 'EBOOK' || type === 'PDF' || type === 'book' || type === 'ebook' || type === 'pdf';

const isVideoUrl = (url?: string) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.endsWith('.mov');
};

const isYouTubeUrl = (url?: string) => {
  if (!url) return false;
  return /youtube\.com|youtu\.be/i.test(url);
};

const getYouTubeEmbedUrl = (url: string) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
};

const getSecureFileUrl = (url?: string) => {
  if (!url) return '';
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = url.startsWith('/') ? `${API_URL}${url}` : `${API_URL}/${url}`;
  return token ? `${base}?token=${token}` : base;
};

/** MCQ Redirect: auto-finds the matching test by subject and navigates directly */
const McqRedirect: React.FC<{ learningUnit: any; navigate: any }> = ({ learningUnit, navigate }) => {
  const [searching, setSearching] = React.useState(true);
  const [matchedTests, setMatchedTests] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.get('/student-portal/tests');
        const tests = Array.isArray(res.data) ? res.data : [];
        if (cancelled) return;

        const unitTitle = (learningUnit?.title || '').toLowerCase();
        const unitSubject = (learningUnit?.subject || '').toLowerCase();

        // Score each test for relevance
        const scored = tests.map((t: any) => {
          const testSubject = (t.subject || '').toLowerCase();
          let score = 0;
          // Exact subject match
          if (unitSubject && testSubject === unitSubject) score += 10;
          // Subject appears in unit title
          if (testSubject && unitTitle.includes(testSubject)) score += 8;
          // Partial subject match
          if (unitSubject && testSubject && (testSubject.includes(unitSubject) || unitSubject.includes(testSubject))) score += 5;
          return { ...t, _score: score };
        }).filter((t: any) => t._score > 0)
          .sort((a: any, b: any) => b._score - a._score);

        if (scored.length === 1) {
          // Exactly one match — go directly to it
          navigate(`/student/tests/${scored[0].id}`, { replace: true });
          return;
        }
        if (scored.length > 1 && scored[0]._score > scored[1]._score) {
          // Clear best match — go directly
          navigate(`/student/tests/${scored[0].id}`, { replace: true });
          return;
        }
        setMatchedTests(scored.length > 0 ? scored : tests);
      } catch (err) {
        console.error('Failed to find tests:', err);
        setMatchedTests([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [learningUnit, navigate]);

  if (searching) {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div className="loading-rings"><div className="loading-ring loading-ring-1"></div><div className="loading-ring loading-ring-2"></div></div>
          <p style={{ color: '#6B7280', marginTop: 16 }}>Finding your test...</p>
        </div>
      </div>
    );
  }

  // Show test selection if multiple matches or no auto-redirect happened
  return (
    <div style={styles.container}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', padding: 40, textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20, display: 'flex',
          alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
        }}>
          <ClipboardList size={36} color="#fff" />
        </div>
        <h2 style={{ color: '#111827', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          {learningUnit?.title || 'MCQ Practice'}
        </h2>
        <p style={{ color: '#6B7280', fontSize: 15, marginBottom: 24, maxWidth: 400 }}>
          {matchedTests.length > 0 ? 'Select a test to start practicing:' : 'No tests found for this subject.'}
        </p>

        {matchedTests.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 480, marginBottom: 24 }}>
            {matchedTests.map((t: any) => (
              <button
                key={t.id}
                onClick={() => navigate(`/student/tests/${t.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderRadius: 12,
                  border: '1.5px solid #e0e7ff', background: '#f8faff',
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.background = '#eef2ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e7ff'; e.currentTarget.style.background = '#f8faff'; }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    {t.subject} • {t.totalQuestions} questions • {t.durationMinutes} min
                  </div>
                </div>
                <div style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: '#6366f1', color: '#fff',
                }}>Start</div>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate(-1 as any)}
            style={{ ...styles.backButton, background: '#F3F4F6', color: '#374151' }}
          >
            <ArrowLeft size={18} /> Go Back
          </button>
          <button
            onClick={() => navigate('/student/assignments')}
            style={styles.backButton}
          >
            <ClipboardList size={18} /> View All Tests
          </button>
        </div>
      </div>
    </div>
  );
};

const StudentContentViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine correct back path based on current route prefix
  const getBackPath = () => {
    const path = location.pathname;
    if (path.startsWith('/publisher-admin')) return '/publisher-admin/content';
    if (path.startsWith('/faculty')) return '/faculty/content';
    if (path.startsWith('/college-admin')) return '/college-admin';
    // If opened from a course, go back to that course
    const fromCourseId = (location.state as any)?.fromCourseId;
    if (fromCourseId) return `/student/courses/${fromCourseId}`;
    return '/student/library';
  };
  const backPath = getBackPath();

  const [accessToken, setAccessToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learningUnit, setLearningUnit] = useState<any>(null);
  const [showCover, setShowCover] = useState(true);
  const [readerReady, setReaderReady] = useState(false);

  useEffect(() => {
    if (id) loadContent();
  }, [id]);

  const loadContent = async () => {
    if (!id) {
      setError('No learning unit ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Generate access token for this learning unit
      const tokenRes = await apiService.post('/learning-units/access', {
        learningUnitId: id,
        deviceType: 'web'
      });
      
      setAccessToken(tokenRes.data.token);
      setLearningUnit(tokenRes.data.learningUnit);

      // Also try to fetch extended book info
      try {
        const infoRes = await apiService.get(`/learning-units/${id}/info`);
        if (infoRes.data) {
          setLearningUnit((prev: any) => ({ ...prev, ...infoRes.data }));
        }
      } catch (e) {
        // Info endpoint might not exist yet, that's ok
      }
    } catch (err: any) {
      console.error('Failed to load content:', err);
      setError(
        err?.response?.data?.message || 
        'Failed to load content. You may not have access to this resource.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartReading = () => {
    setShowCover(false);
    setReaderReady(true);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
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
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h2 style={styles.errorTitle}>Access Denied</h2>
        <p style={styles.errorMessage}>{error}</p>
        <button
          onClick={() => navigate(backPath)}
          style={styles.backButton}
        >
          <ArrowLeft size={20} />
          Back to Library
        </button>
      </div>
    );
  }

  if (!accessToken || !id) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorMessage}>Invalid access configuration</p>
        <button
          onClick={() => navigate(backPath)}
          style={styles.backButton}
        >
          <ArrowLeft size={20} />
          Back to Library
        </button>
      </div>
    );
  }

  // Show book cover page first (only for BOOK/EBOOK types)
  if (showCover && learningUnit && isBookType(learningUnit.type)) {
    return (
      <BookCoverPage
        learningUnit={learningUnit}
        onStartReading={handleStartReading}
        onBack={() => navigate(backPath)}
      />
    );
  }

  const unitType = learningUnit?.type?.toUpperCase() || '';
  const fileUrl = learningUnit?.secureAccessUrl || '';

  // ── VIDEO viewer ──
  if (isVideoType(unitType) || isVideoUrl(fileUrl) || isYouTubeUrl(fileUrl)) {
    return (
      <div style={styles.container}>
        {/* Top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 56,
          background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, zIndex: 10,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button onClick={() => navigate(backPath)} style={styles.topBackBtn}>
            <ArrowLeft size={18} />
          </button>
          <Play size={18} style={{ color: '#818cf8' }} />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{learningUnit?.title || 'Video'}</span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', paddingTop: 56, background: '#000',
        }}>
          {isYouTubeUrl(fileUrl) ? (
            <div style={{ width: '100%', maxWidth: 1100, aspectRatio: '16/9' }}>
              <iframe
                src={getYouTubeEmbedUrl(fileUrl)}
                title={learningUnit?.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          ) : (
            <video
              controls
              autoPlay
              controlsList="nodownload"
              onContextMenu={e => e.preventDefault()}
              style={{ width: '100%', maxWidth: 1100, maxHeight: 'calc(100vh - 56px)' }}
            >
              <source src={getSecureFileUrl(fileUrl)} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </div>
    );
  }

  // ── MCQ / Notes viewer ── Auto-find matching test
  if (isMcqType(unitType)) {
    return <McqRedirect learningUnit={learningUnit} navigate={navigate} />;
  }

  // ── NOTES viewer — treat as book/PDF if has chapters or show as document ──
  if (isNotesType(unitType)) {
    return (
      <div style={styles.container}>
        <EpubReaderAnnotated
          learningUnitId={id!}
          accessToken={accessToken}
          onBack={() => navigate(backPath)}
        />
      </div>
    );
  }

  // ── DOCUMENT / PPT / HANDBOOK — offer download or external link ──
  if (unitType === 'DOCUMENT' || unitType === 'PPT' || unitType === 'HANDBOOK') {
    return (
      <div style={styles.container}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', padding: 40, textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          }}>
            <FileText size={36} color="#fff" />
          </div>
          <h2 style={{ color: '#111827', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            {learningUnit?.title || 'Document'}
          </h2>
          <p style={{ color: '#6B7280', fontSize: 15, marginBottom: 32, maxWidth: 400 }}>
            {learningUnit?.description || 'Open this document to view its contents.'}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => navigate(backPath)}
              style={{ ...styles.backButton, background: '#F3F4F6', color: '#374151' }}
            >
              <ArrowLeft size={18} /> Back to Library
            </button>
            {fileUrl && (
              <button
                onClick={() => window.open(getSecureFileUrl(fileUrl), '_blank')}
                style={styles.backButton}
              >
                <ExternalLink size={18} /> Open Document
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Default: EPUB / BOOK / PDF reader — EpubReaderAnnotated handles both EPUB and PDF via pdfjs ──
  return (
    <div style={styles.container}>
      <EpubReaderAnnotated
        learningUnitId={id!}
        accessToken={accessToken}
        onBack={() => navigate(backPath)}
      />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#FAFBFD',
    zIndex: 9999,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#FAFBFD',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#FAFBFD',
    padding: '2rem',
  },
  errorIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  errorTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '0.5rem',
  },
  errorMessage: {
    fontSize: '1rem',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: '2rem',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#0A84FF',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  topBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
};

export default StudentContentViewer;
