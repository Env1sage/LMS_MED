import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import learningUnitService from '../services/learning-unit.service';
import { LearningUnit, DeliveryType } from '../types';
import '../styles/ViewLearningUnit.css';

const ViewLearningUnit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<LearningUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);

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

  return (
    <div className="view-learning-unit">
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
          {unit.deliveryType === DeliveryType.REDIRECT && (
            <button onClick={handleRedirect} className="btn-redirect">
              🔗 Open in New Tab
            </button>
          )}
        </div>
      </div>

      <div className="content-area">
        {unit.deliveryType === DeliveryType.EMBED || unit.deliveryType === DeliveryType.STREAM ? (
          <div className="embed-container">
            {!iframeError ? (
              <>
                <iframe
                  src={unit.secureAccessUrl}
                  title={unit.title}
                  className="content-iframe"
                  allowFullScreen
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                  onError={() => setIframeError(true)}
                />
                <div className="watermark">
                  Preview Mode - Publisher: {unit.publisherId}
                </div>
              </>
            ) : (
              <div className="iframe-error">
                <div className="error-content">
                  <h2>⚠️ Cannot Display Embedded Content</h2>
                  <p>The external content cannot be embedded due to security restrictions from the host server.</p>
                  <p className="url-info">URL: {unit.secureAccessUrl}</p>
                  <div className="error-actions">
                    <button onClick={handleRedirect} className="btn-open-external">
                      🔗 Open in New Tab
                    </button>
                    <button onClick={() => setIframeError(false)} className="btn-retry">
                      🔄 Retry
                    </button>
                  </div>
                  <div className="help-text">
                    <p><strong>Common causes:</strong></p>
                    <ul>
                      <li>Host server blocks iframe embedding (X-Frame-Options)</li>
                      <li>Content requires authentication</li>
                      <li>Invalid or unreachable URL</li>
                    </ul>
                    <p><strong>Solution:</strong> Change delivery type to REDIRECT or host content on an embed-friendly server.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="redirect-info">
            <div className="redirect-card">
              <h2>🔗 External Content</h2>
              <p>This learning unit is configured to open in a new window.</p>
              <p className="url-display">{unit.secureAccessUrl}</p>
              <button onClick={handleRedirect} className="btn-open-large">
                Open Content →
              </button>
            </div>
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
            <span className="value">{unit.estimatedDuration} minutes</span>
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
