import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  List,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import apiService from '../../services/api.service';

interface EpubReaderViewerProps {
  learningUnitId: string;
  accessToken: string;
  watermarkText?: string;
}

interface Chapter {
  id: string;
  chapterTitle: string;
  chapterOrder: number;
}

interface LearningUnit {
  id: string;
  title: string;
  epubStatus: string;
  chapterCount: number;
}

export const EpubReaderViewer: React.FC<EpubReaderViewerProps> = ({
  learningUnitId,
  accessToken,
  watermarkText = 'View Only',
}) => {
  const [learningUnit, setLearningUnit] = useState<LearningUnit | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChapterList, setShowChapterList] = useState(false);
  const [fontSize, setFontSize] = useState(16);

  // Load chapters list
  useEffect(() => {
    const loadChapters = async () => {
      try {
        setLoading(true);
        const response = await apiService.get(
          `/epub/chapters/${learningUnitId}?token=${accessToken}`
        );
        
        setLearningUnit(response.data.learningUnit);
        setChapters(response.data.chapters);
        
        if (response.data.chapters.length > 0) {
          setCurrentChapter(response.data.chapters[0]);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Failed to load chapters:', err);
        setError(err.response?.data?.message || 'Failed to load EPUB chapters');
      } finally {
        setLoading(false);
      }
    };

    loadChapters();
  }, [learningUnitId, accessToken]);

  // Load chapter content when current chapter changes
  useEffect(() => {
    if (!currentChapter) return;

    const loadChapterContent = async () => {
      try {
        setLoading(true);
        const response = await apiService.get(
          `/epub/chapter/${currentChapter.id}?token=${accessToken}&learningUnitId=${learningUnitId}`
        );
        
        setChapterContent(response.data.content);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load chapter content:', err);
        setError(err.response?.data?.message || 'Failed to load chapter content');
      } finally {
        setLoading(false);
      }
    };

    loadChapterContent();
  }, [currentChapter, accessToken, learningUnitId]);

  const goToNextChapter = () => {
    if (!currentChapter || !chapters.length) return;
    
    const currentIndex = chapters.findIndex(ch => ch.id === currentChapter.id);
    if (currentIndex < chapters.length - 1) {
      setCurrentChapter(chapters[currentIndex + 1]);
      window.scrollTo(0, 0);
    }
  };

  const goToPreviousChapter = () => {
    if (!currentChapter || !chapters.length) return;
    
    const currentIndex = chapters.findIndex(ch => ch.id === currentChapter.id);
    if (currentIndex > 0) {
      setCurrentChapter(chapters[currentIndex - 1]);
      window.scrollTo(0, 0);
    }
  };

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12));
  };

  const currentChapterIndex = currentChapter 
    ? chapters.findIndex(ch => ch.id === currentChapter.id) 
    : -1;

  if (loading && !chapterContent) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading EPUB content...</p>
      </div>
    );
  }

  if (error && !chapterContent) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h3 style={styles.errorTitle}>Failed to Load EPUB</h3>
        <p style={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Watermark */}
      <div style={styles.watermark}>
        {watermarkText}
      </div>

      {/* Top Navigation Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <BookOpen size={20} style={styles.bookIcon} />
          <h2 style={styles.title}>{learningUnit?.title || 'EPUB Reader'}</h2>
        </div>
        
        <div style={styles.topBarRight}>
          <button
            onClick={decreaseFontSize}
            style={styles.iconButton}
            title="Decrease font size"
          >
            <ZoomOut size={20} />
          </button>
          <span style={styles.fontSizeLabel}>{fontSize}px</span>
          <button
            onClick={increaseFontSize}
            style={styles.iconButton}
            title="Increase font size"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={() => setShowChapterList(!showChapterList)}
            style={{
              ...styles.iconButton,
              ...(showChapterList ? styles.iconButtonActive : {}),
            }}
            title="Table of Contents"
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={styles.mainContent}>
        {/* Chapter List Sidebar */}
        {showChapterList && (
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h3 style={styles.sidebarTitle}>Table of Contents</h3>
              <button
                onClick={() => setShowChapterList(false)}
                style={styles.closeButton}
              >
                <X size={20} />
              </button>
            </div>
            <div style={styles.chapterList}>
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => {
                    setCurrentChapter(chapter);
                    setShowChapterList(false);
                  }}
                  style={{
                    ...styles.chapterItem,
                    ...(currentChapter?.id === chapter.id ? styles.chapterItemActive : {}),
                  }}
                >
                  <span style={styles.chapterNumber}>{chapter.chapterOrder}</span>
                  <span style={styles.chapterTitle}>{chapter.chapterTitle}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Display */}
        <div style={styles.contentArea}>
          {currentChapter && (
            <div style={styles.chapterHeader}>
              <h1 style={styles.chapterHeading}>{currentChapter.chapterTitle}</h1>
              <p style={styles.chapterMeta}>
                Chapter {currentChapter.chapterOrder} of {chapters.length}
              </p>
            </div>
          )}

          <div
            style={{ ...styles.htmlContent, fontSize: `${fontSize}px` }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(chapterContent) }}
          />

          {/* Chapter Navigation */}
          <div style={styles.chapterNav}>
            <button
              onClick={goToPreviousChapter}
              disabled={currentChapterIndex === 0}
              style={{
                ...styles.navButton,
                ...(currentChapterIndex === 0 ? styles.navButtonDisabled : {}),
              }}
            >
              <ChevronLeft size={20} />
              Previous Chapter
            </button>
            
            <button
              onClick={goToNextChapter}
              disabled={currentChapterIndex === chapters.length - 1}
              style={{
                ...styles.navButton,
                ...(currentChapterIndex === chapters.length - 1 ? styles.navButtonDisabled : {}),
              }}
            >
              Next Chapter
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles matching the Medical LMS design system
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#FAFBFD',
    position: 'relative',
  },
  watermark: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: '80px',
    fontWeight: 'bold',
    color: 'rgba(10, 132, 255, 0.05)',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 1,
    whiteSpace: 'nowrap',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E5E7EB',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  bookIcon: {
    color: '#0A84FF',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#111827',
  },
  fontSizeLabel: {
    fontSize: '0.875rem',
    color: '#6B7280',
    minWidth: '40px',
    textAlign: 'center',
  },
  iconButton: {
    backgroundColor: 'transparent',
    border: '1px solid #E5E7EB',
    borderRadius: '0.375rem',
    padding: '0.5rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6B7280',
    transition: 'all 0.2s',
  },
  iconButtonActive: {
    backgroundColor: '#0A84FF',
    color: '#FFFFFF',
    borderColor: '#0A84FF',
  },
  mainContent: {
    display: 'flex',
    height: 'calc(100vh - 73px)',
  },
  sidebar: {
    width: '320px',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    color: '#111827',
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem',
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
  },
  chapterList: {
    overflowY: 'auto',
    flex: 1,
  },
  chapterItem: {
    width: '100%',
    textAlign: 'left',
    padding: '1rem 1.5rem',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    transition: 'background-color 0.2s',
    borderLeft: '3px solid transparent',
  },
  chapterItemActive: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#0A84FF',
  },
  chapterNumber: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
    borderRadius: '0.25rem',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    minWidth: '32px',
    textAlign: 'center',
  },
  chapterTitle: {
    fontSize: '0.875rem',
    color: '#374151',
    flex: 1,
  },
  contentArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '2rem',
    position: 'relative',
    zIndex: 2,
  },
  chapterHeader: {
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #E5E7EB',
  },
  chapterHeading: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '0.5rem',
  },
  chapterMeta: {
    fontSize: '0.875rem',
    color: '#6B7280',
    margin: 0,
  },
  htmlContent: {
    maxWidth: '800px',
    margin: '0 auto',
    lineHeight: 1.8,
    color: '#374151',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
  },
  chapterNav: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '3rem',
    paddingTop: '2rem',
    borderTop: '1px solid #E5E7EB',
    maxWidth: '800px',
    margin: '3rem auto 0',
  },
  navButton: {
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
  navButtonDisabled: {
    backgroundColor: '#E5E7EB',
    color: '#9CA3AF',
    cursor: 'not-allowed',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
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
    minHeight: '100vh',
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
    fontSize: '0.875rem',
    color: '#6B7280',
    textAlign: 'center',
  },
};

export default EpubReaderViewer;
