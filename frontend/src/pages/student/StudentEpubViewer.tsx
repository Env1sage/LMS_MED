import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EpubReaderAnnotated from '../../components/student/EpubReaderAnnotated';
import apiService from '../../services/api.service';
import { ArrowLeft } from 'lucide-react';

const StudentEpubViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learningUnit, setLearningUnit] = useState<any>(null);

  useEffect(() => {
    const generateAccessToken = async () => {
      if (!id) {
        setError('No learning unit ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Generate access token for this learning unit
        const tokenResponse = await apiService.post('/learning-units/access', {
          learningUnitId: id,
        });

        setAccessToken(tokenResponse.data.accessToken);

        // Get learning unit details
        const unitResponse = await apiService.get(`/learning-units/${id}/info`);
        setLearningUnit(unitResponse.data);

        setError(null);
      } catch (err: any) {
        console.error('Failed to generate access token:', err);
        setError(
          err.response?.data?.message || 
          'Failed to access content. You may not have permission to view this content.'
        );
      } finally {
        setLoading(false);
      }
    };

    generateAccessToken();
  }, [id]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading content...</p>
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
          onClick={() => navigate('/student/library')}
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
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <EpubReaderAnnotated
        learningUnitId={id}
        accessToken={accessToken}
        onBack={() => navigate('/student/library')}
      />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#FAFBFD',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #E5E7EB',
    borderTopColor: '#0A84FF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '1rem',
    fontSize: '0.875rem',
    color: '#6B7280',
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
};

export default StudentEpubViewer;
