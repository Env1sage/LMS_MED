import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EpubReaderAnnotated from '../../components/student/EpubReaderAnnotated';
import apiService from '../../services/api.service';
import { ArrowLeft } from 'lucide-react';
import '../../styles/loading-screen.css';

const FacultyContentViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        zIndex: 9999
      }}>
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
          <div className="loading-title">Loading EPUB Reader</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}>
        <div style={{
          fontSize: '18px',
          color: '#ef4444',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {error}
        </div>
        <button
          onClick={() => navigate('/faculty/dashboard')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!accessToken || !id) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#ffffff',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      <EpubReaderAnnotated
        learningUnitId={id}
        accessToken={accessToken}
      />
    </div>
  );
};

export default FacultyContentViewer;

