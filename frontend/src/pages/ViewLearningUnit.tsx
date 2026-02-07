import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import learningUnitService from '../services/learning-unit.service';
import { LearningUnit, DeliveryType, LearningUnitStatus } from '../types';
import SecurePdfViewer from '../components/SecurePdfViewer';
import '../styles/ViewLearningUnit.css';

// Backend API URL for serving files with authentication
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Helper to get full content URL
const getFullContentUrl = (url: string | undefined): string => {
  if (!url) {
    console.warn('No URL provided to getFullContentUrl');
    return '';
  }
  // If it's already a full URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('Full URL detected:', url);
    return url;
  }
  // If it's a relative path starting with /uploads, prepend API_URL
  if (url.startsWith('/uploads/')) {
    const fullUrl = `${API_URL}${url}`;
    console.log('Built full URL:', fullUrl, 'from:', url);
    return fullUrl;
  }
  // For other relative paths, construct the URL
  const fullUrl = `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  console.log('Built full URL:', fullUrl, 'from:', url);
  return fullUrl;
};

const ViewLearningUnit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<LearningUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // ===== SECURITY: Block keyboard shortcuts =====
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Block Print Screen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      setSecurityWarning('Screenshots are not allowed');
      setTimeout(() => setSecurityWarning(null), 3000);
      return false;
    }
    
    // Block Ctrl/Cmd + P (Print)
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      setSecurityWarning('Printing is not allowed');
      setTimeout(() => setSecurityWarning(null), 3000);
      return false;
    }
    
    // Block Ctrl/Cmd + S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      setSecurityWarning('Saving is not allowed');
      setTimeout(() => setSecurityWarning(null), 3000);
      return false;
    }
    
    // Block Ctrl/Cmd + C (Copy)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      setSecurityWarning('Copying is not allowed');
      setTimeout(() => setSecurityWarning(null), 3000);
      return false;
    }
    
    // Block Ctrl/Cmd + Shift + I (Dev Tools)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    
    // Block Ctrl/Cmd + U (View Source)
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      return false;
    }
    
    // Block F12 (Dev Tools)
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
  }, []);

  // ===== SECURITY: Block right-click context menu =====
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setSecurityWarning('Right-click is disabled for security');
    setTimeout(() => setSecurityWarning(null), 2000);
    return false;
  }, []);

  // ===== SECURITY: Block drag events =====
  const handleDragStart = useCallback((e: DragEvent) => {
    e.preventDefault();
    return false;
  }, []);

  // ===== SECURITY: Setup and cleanup event listeners =====
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    
    // Disable text selection via CSS (backup)
    document.body.style.userSelect = 'none';
    (document.body.style as any).webkitUserSelect = 'none';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
    };
  }, [handleKeyDown, handleContextMenu, handleDragStart]);

  useEffect(() => {
    loadUnit();
  }, [id]);

  const loadUnit = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await learningUnitService.getById(id);
      setUnit(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load learning unit');
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = () => {
    if (unit?.secureAccessUrl) {
      window.open(unit.secureAccessUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleActivate = async () => {
    if (!id || !unit) return;
    
    // Check if competencies are mapped
    if (!unit.competencyIds || unit.competencyIds.length === 0) {
      setActionMessage({ type: 'error', text: 'Cannot activate: No competencies mapped. Please map at least one competency first.' });
      return;
    }

    setActionLoading(true);
    setActionMessage(null);
    try {
      const updated = await learningUnitService.activateContent(id);
      setUnit(updated);
      setActionMessage({ type: 'success', text: 'Content activated successfully! It is now visible to colleges and teachers.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || 'Failed to activate content' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!id) return;
    
    const reason = prompt('Reason for deactivation (optional):');
    
    setActionLoading(true);
    setActionMessage(null);
    try {
      const updated = await learningUnitService.deactivateContent(id, reason || undefined);
      setUnit(updated);
      setActionMessage({ type: 'success', text: 'Content deactivated successfully. It is now hidden from colleges and teachers.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || 'Failed to deactivate content' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="view-learning-unit">
        <div className="loading">Loading content...</div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="view-learning-unit">
        <div className="error-box">
          <h2>Error</h2>
          <p>{error || 'Learning unit not found'}</p>
          <button onClick={() => navigate('/publisher-admin')} className="btn-back">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const contentUrl = getFullContentUrl(unit.secureAccessUrl);

  return (
    <div className="view-learning-unit secure-viewer">
      {/* Security Warning Toast */}
      {securityWarning && (
        <div className="security-warning-toast">
          🔒 {securityWarning}
        </div>
      )}

      <div className="viewer-header">
        <div>
          <button onClick={() => navigate('/publisher-admin')} className="btn-back">
            ← Back
          </button>
          <h1>{unit.title}</h1>
          <p className="unit-meta">
            {unit.subject} • {unit.topic} • {unit.type} • {unit.difficultyLevel}
          </p>
        </div>
        <div className="viewer-actions">
          {/* Edit Button */}
          <button 
            onClick={() => navigate(`/publisher-admin/learning-units/${id}/edit`)} 
            className="btn-edit"
          >
            ✏️ Edit
          </button>
          {/* Activate/Deactivate Buttons */}
          {unit.status !== LearningUnitStatus.ACTIVE && unit.status !== LearningUnitStatus.SUSPENDED && (
            <button 
              onClick={handleActivate} 
              className="btn-activate"
              disabled={actionLoading}
              title={unit.competencyIds?.length === 0 ? 'Map competencies first to activate' : 'Activate content'}
            >
              {actionLoading ? '⏳' : '✅'} Activate
            </button>
          )}
          {unit.status === LearningUnitStatus.ACTIVE && (
            <button 
              onClick={handleDeactivate} 
              className="btn-deactivate"
              disabled={actionLoading}
            >
              {actionLoading ? '⏳' : '⏸️'} Deactivate
            </button>
          )}
          {unit.deliveryType === DeliveryType.REDIRECT && (
            <button onClick={handleRedirect} className="btn-redirect">
              🔗 Open in New Tab
            </button>
          )}
        </div>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className={`action-message ${actionMessage.type}`}>
          {actionMessage.type === 'success' ? '✅' : '❌'} {actionMessage.text}
        </div>
      )}

      {/* Security Badge */}
      <div className="security-badge">
        🔒 Secure View Mode: Copy, Print, Download & Screenshots Disabled
      </div>

      {/* SECURE CONTENT AREA */}
      <div 
        className="content-area secure-content" 
        ref={contentRef}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {!unit.secureAccessUrl ? (
          <div className="no-content-warning">
            <div className="warning-content">
              <h2>⚠️ No Content URL Configured</h2>
              <p>This learning unit doesn't have a content URL set. Please edit the learning unit and provide a valid URL.</p>
            </div>
          </div>
        ) : (
          <div className="secure-embed-container">
            {/* Multiple Watermark Overlays - only for non-PDF content */}
            {!unit.secureAccessUrl.match(/\.(pdf)$/i) && (
              <div className="watermark-overlay">
                <div className="watermark-grid">
                  {[...Array(20)].map((_, i) => (
                    <span key={i} className="watermark-text">
                      {unit.publisherId} • View Only
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* PDF: Use SecurePdfViewer - renders as canvas, NO DOWNLOAD possible */}
            {unit.secureAccessUrl.match(/\.(pdf)$/i) ? (
              <SecurePdfViewer 
                url={contentUrl} 
                watermarkText={`${unit.publisherId} • View Only`}
              />
            ) : unit.secureAccessUrl.match(/\.(mp4|webm|ogg)$/i) ? (
              <video 
                className="secure-video"
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
              >
                <source src={contentUrl} />
                Your browser does not support the video tag.
              </video>
            ) : unit.secureAccessUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <div className="secure-image-container">
                <img 
                  src={contentUrl} 
                  alt={unit.title} 
                  className="secure-image"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
              </div>
            ) : contentUrl.includes('youtube.com') || contentUrl.includes('youtu.be') ? (
              <iframe
                src={contentUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                title={unit.title}
                className="secure-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={() => setIframeError(true)}
              />
            ) : (
              <iframe
                src={contentUrl}
                title={unit.title}
                className="secure-iframe"
                sandbox="allow-same-origin allow-scripts allow-forms"
                onError={() => setIframeError(true)}
              />
            )}

            {iframeError && (
              <div className="iframe-error-overlay">
                <div className="error-content">
                  <h2>⚠️ Cannot Display Content</h2>
                  <p>The content cannot be loaded in secure view mode.</p>
                  <button onClick={() => setIframeError(false)} className="btn-retry">
                    🔄 Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="content-info">
        <div className="info-section">
          <h3>Description</h3>
          <p>{unit.description}</p>
        </div>
        
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Duration:</span>
            <span className="value">⏱️ Learn in {unit.estimatedDuration} minutes</span>
          </div>
          <div className="info-item">
            <span className="label">Delivery Type:</span>
            <span className="value">{unit.deliveryType}</span>
          </div>
          <div className="info-item">
            <span className="label">Watermark:</span>
            <span className="value">{unit.watermarkEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="info-item">
            <span className="label">Session Expiry:</span>
            <span className="value">{unit.sessionExpiryMinutes} minutes</span>
          </div>
          <div className="info-item">
            <span className="label">Competencies:</span>
            <span className="value">{unit.competencyIds.length} mapped</span>
          </div>
          <div className="info-item">
            <span className="label">Status:</span>
            <span className="value status-badge">{unit.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewLearningUnit;
