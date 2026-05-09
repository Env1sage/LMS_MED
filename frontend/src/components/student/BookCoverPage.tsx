import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Play,
  User,
  Layers,
  Clock,
  ArrowLeft,
  X,
  Info,
} from 'lucide-react';

interface BookCoverPageProps {
  learningUnit: {
    id: string;
    title: string;
    type?: string;
    deliveryType?: string;
    estimatedDuration?: number;
    author?: string;
    edition?: string;
    version?: string;
    coverImageUrl?: string;
    introVideoUrl?: string;
    description?: string;
  };
  onStartReading: () => void;
  onBack?: () => void;
}

const BookCoverPage: React.FC<BookCoverPageProps> = ({
  learningUnit,
  onStartReading,
  onBack,
}) => {
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = !!learningUnit.introVideoUrl;
  const hasCover = !!learningUnit.coverImageUrl;

  return (
    <div style={styles.container}>
      {/* Background gradient */}
      <div style={styles.backgroundGradient} />

      {/* Back button */}
      {onBack && (
        <button onClick={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} />
          <span>Back to Library</span>
        </button>
      )}

      {/* Main content card */}
      <div style={styles.card}>
        {/* Cover image or placeholder */}
        <div style={styles.coverSection}>
          {hasCover ? (
            <img
              src={learningUnit.coverImageUrl}
              alt={learningUnit.title}
              style={styles.coverImage}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div style={styles.coverPlaceholder}>
              <BookOpen size={64} color="#94A3B8" />
              <span style={styles.coverPlaceholderText}>
                {learningUnit.type === 'PDF' ? 'PDF' : 'EPUB'}
              </span>
            </div>
          )}

          {/* Video thumbnail overlay */}
          {hasVideo && !showVideo && (
            <button
              onClick={() => setShowVideo(true)}
              style={styles.videoThumbnail}
            >
              <div style={styles.playButton}>
                <Play size={32} fill="#fff" color="#fff" />
              </div>
              <span style={styles.videoLabel}>Watch Introduction</span>
            </button>
          )}
        </div>

        {/* Book info */}
        <div style={styles.infoSection}>
          <h1 style={styles.title}>{learningUnit.title}</h1>

          {/* Meta info row */}
          <div style={styles.metaRow}>
            {learningUnit.author && (
              <div style={styles.metaItem}>
                <User size={16} color="#6B7280" />
                <span>{learningUnit.author}</span>
              </div>
            )}
            {learningUnit.edition && (
              <div style={styles.metaItem}>
                <Layers size={16} color="#6B7280" />
                <span>Edition {learningUnit.edition}</span>
              </div>
            )}
            {learningUnit.version && (
              <div style={styles.metaItem}>
                <Info size={16} color="#6B7280" />
                <span>v{learningUnit.version}</span>
              </div>
            )}
            {learningUnit.estimatedDuration && (
              <div style={styles.metaItem}>
                <Clock size={16} color="#6B7280" />
                <span>{learningUnit.estimatedDuration} min</span>
              </div>
            )}
          </div>

          {/* Description */}
          {learningUnit.description && (
            <p style={styles.description}>{learningUnit.description}</p>
          )}

          {/* Start reading button */}
          <button onClick={onStartReading} style={styles.startButton}>
            <BookOpen size={20} />
            Start Reading
          </button>
        </div>
      </div>

      {/* Video modal */}
      {showVideo && learningUnit.introVideoUrl && (
        <div style={styles.videoOverlay}>
          <div style={styles.videoModal}>
            <div style={styles.videoHeader}>
              <h3 style={styles.videoTitle}>Introduction Video</h3>
              <button
                onClick={() => {
                  setShowVideo(false);
                  if (videoRef.current) videoRef.current.pause();
                }}
                style={styles.closeVideoBtn}
              >
                <X size={20} />
              </button>
            </div>
            <video
              ref={videoRef}
              src={learningUnit.introVideoUrl}
              controls
              autoPlay
              style={styles.videoPlayer}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    zIndex: 9999,
    overflow: 'auto',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at 30% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  backBtn: {
    position: 'absolute',
    top: '24px',
    left: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#E2E8F0',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    zIndex: 10,
    backdropFilter: 'blur(8px)',
    transition: 'all 0.2s',
  },
  card: {
    display: 'flex',
    maxWidth: '900px',
    width: '90%',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: '24px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(20px)',
    zIndex: 5,
  },
  coverSection: {
    position: 'relative',
    width: '320px',
    minHeight: '420px',
    backgroundColor: '#1E293B',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  coverPlaceholderText: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#64748B',
    letterSpacing: '4px',
  },
  videoThumbnail: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 20px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '30px',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.2s',
  },
  playButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLabel: {
    whiteSpace: 'nowrap',
  },
  infoSection: {
    flex: 1,
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#F1F5F9',
    lineHeight: 1.3,
    margin: 0,
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    color: '#94A3B8',
  },
  description: {
    fontSize: '0.925rem',
    color: '#94A3B8',
    lineHeight: 1.7,
    margin: 0,
  },
  startButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px 32px',
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: 'auto',
    alignSelf: 'flex-start',
  },
  videoOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  videoModal: {
    width: '90%',
    maxWidth: '800px',
    backgroundColor: '#1E293B',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  videoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  videoTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#F1F5F9',
    margin: 0,
  },
  closeVideoBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: '4px',
  },
  videoPlayer: {
    width: '100%',
    display: 'block',
    maxHeight: '500px',
  },
};

export default BookCoverPage;
