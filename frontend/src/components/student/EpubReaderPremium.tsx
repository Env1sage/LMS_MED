import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  List,
  X,
  Settings,
  Maximize,
  Minimize,
  ArrowLeft,
} from 'lucide-react';
import apiService from '../../services/api.service';

interface EpubReaderPremiumProps {
  learningUnitId: string;
  accessToken: string;
  onBack?: () => void;
}

interface Chapter {
  id: string;
  chapterTitle: string;
  chapterOrder: number;
}

interface WatermarkData {
  text: string;
  style: {
    rotation: number;
    offsetX: number;
    offsetY: number;
    opacity: number;
  };
  forensicHash: string;
}

interface ReaderSettings {
  fontSize: number;
  lineSpacing: number;
  readingWidth: 'normal' | 'wide';
  focusMode: boolean;
}

export const EpubReaderPremium: React.FC<EpubReaderPremiumProps> = ({
  learningUnitId,
  accessToken,
  onBack,
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [watermark, setWatermark] = useState<WatermarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChapterPanel, setShowChapterPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const [settings, setSettings] = useState<ReaderSettings>({
    fontSize: 18,
    lineSpacing: 1.85,
    readingWidth: 'normal',
    focusMode: false,
  });
  
  const watermarkRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const toolbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load chapters
  useEffect(() => {
    const loadChapters = async () => {
      try {
        setLoading(true);
        const response = await apiService.get(
          `/api/epub/chapters/${learningUnitId}?token=${accessToken}`
        );
        
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

  // Load chapter content
  useEffect(() => {
    if (!currentChapter) return;

    const loadChapterContent = async () => {
      try {
        setLoading(true);
        const response = await apiService.get(
          `/api/epub/chapter/${currentChapter.id}?token=${accessToken}&learningUnitId=${learningUnitId}`
        );
        
        setChapterContent(response.data.content);
        setWatermark(response.data.watermark);
        setError(null);
        setScrollProgress(0);
        
        // Scroll to top
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      } catch (err: any) {
        console.error('Failed to load chapter content:', err);
        setError(err.response?.data?.message || 'Failed to load chapter content');
      } finally {
        setLoading(false);
      }
    };

    loadChapterContent();
  }, [currentChapter, accessToken, learningUnitId]);

  // Tamper detection
  useEffect(() => {
    if (!watermarkRef.current) return;

    const handleTamper = async (tamperType: string) => {
      console.warn('🚨 Tamper detected:', tamperType);

      try {
        const deviceId = localStorage.getItem('bitflow_device_id') || 'unknown';

        await apiService.post('/api/security/tamper-detected', {
          learningUnitId,
          chapterId: currentChapter?.id,
          deviceId,
          tamperType,
        });

        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        alert('Security violation detected. This session has been terminated.');
        window.location.href = '/login';
      } catch (error) {
        console.error('Failed to report tamper:', error);
        window.location.href = '/login';
      }
    };

    observerRef.current = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          
          if (target.classList.contains('bf-watermark-layer')) {
            const style = window.getComputedStyle(target);
            const opacity = parseFloat(style.opacity);
            
            if (opacity < 0.06 || style.display === 'none') {
              handleTamper('WATERMARK_MANIPULATION');
            }
          }
        } else if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement && node.classList.contains('bf-watermark-layer')) {
              handleTamper('WATERMARK_REMOVAL');
            }
          });
        }
      });
    });

    observerRef.current.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['style', 'class'],
    });

    const devToolsCheck = setInterval(() => {
      if (watermarkRef.current) {
        const style = window.getComputedStyle(watermarkRef.current);
        const opacity = parseFloat(style.opacity);
        
        if (opacity < 0.06 || style.display === 'none') {
          handleTamper('DEVTOOLS_MANIPULATION');
        }
      }
    }, 3000);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      clearInterval(devToolsCheck);
    };
  }, [watermarkRef.current, learningUnitId, currentChapter]);

  // Auto-hide toolbar
  useEffect(() => {
    const resetTimer = () => {
      setToolbarVisible(true);
      
      if (toolbarTimeoutRef.current) {
        clearTimeout(toolbarTimeoutRef.current);
      }
      
      if (!settings.focusMode) {
        toolbarTimeoutRef.current = setTimeout(() => {
          setToolbarVisible(false);
        }, 3000);
      }
    };

    const handleMouseMove = () => resetTimer();
    const handleScroll = () => resetTimer();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('scroll', handleScroll);
    resetTimer();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      if (toolbarTimeoutRef.current) {
        clearTimeout(toolbarTimeoutRef.current);
      }
    };
  }, [settings.focusMode]);

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setScrollProgress(Math.min(progress, 100));
      }
    };

    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (contentEl) {
        contentEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, [chapterContent]);

  const goToNextChapter = () => {
    if (!currentChapter || !chapters.length) return;
    
    const currentIndex = chapters.findIndex(ch => ch.id === currentChapter.id);
    if (currentIndex < chapters.length - 1) {
      setCurrentChapter(chapters[currentIndex + 1]);
    }
  };

  const goToPreviousChapter = () => {
    if (!currentChapter || !chapters.length) return;
    
    const currentIndex = chapters.findIndex(ch => ch.id === currentChapter.id);
    if (currentIndex > 0) {
      setCurrentChapter(chapters[currentIndex - 1]);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const currentChapterIndex = currentChapter 
    ? chapters.findIndex(ch => ch.id === currentChapter.id) 
    : -1;

  const maxWidth = settings.readingWidth === 'wide' ? '960px' : '760px';

  if (loading && !chapterContent) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading content...</p>
      </div>
    );
  }

  if (error && !chapterContent) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h3 style={styles.errorTitle}>Failed to Load Content</h3>
        <p style={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  const watermarkStyle: React.CSSProperties = watermark
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${watermark.style.rotation}deg)`,
        fontSize: '72px',
        fontWeight: 600,
        color: `rgba(107, 114, 128, ${watermark.style.opacity})`,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 1,
        whiteSpace: 'nowrap',
        letterSpacing: '0.05em',
      }
    : {};

  return (
    <div style={styles.container}>
      {/* Watermark */}
      <div 
        ref={watermarkRef}
        className="bf-watermark-layer" 
        style={watermarkStyle}
        data-forensic={watermark?.forensicHash}
      >
        {watermark?.text || 'View Only'}
      </div>

      {/* Floating Toolbar */}
      <div 
        style={{
          ...styles.toolbar,
          ...(toolbarVisible || settings.focusMode === false ? {} : { transform: 'translateY(-100%)' }),
        }}
      >
        <div style={styles.toolbarLeft}>
          {onBack && (
            <button onClick={onBack} style={styles.toolbarButton} title="Back">
              <ArrowLeft size={20} />
            </button>
          )}
          <BookOpen size={20} style={{ color: '#0A84FF' }} />
          <span style={styles.toolbarTitle}>
            {currentChapter?.chapterTitle || 'EPUB Reader'}
          </span>
        </div>

        <div style={styles.toolbarRight}>
          <button
            onClick={() => setShowChapterPanel(!showChapterPanel)}
            style={{
              ...styles.toolbarButton,
              ...(showChapterPanel ? styles.toolbarButtonActive : {}),
            }}
            title="Chapters"
          >
            <List size={20} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              ...styles.toolbarButton,
              ...(showSettings ? styles.toolbarButtonActive : {}),
            }}
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button onClick={toggleFullscreen} style={styles.toolbarButton} title="Fullscreen">
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      {/* Chapter Panel */}
      {showChapterPanel && (
        <div style={styles.chapterPanel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>Chapters</h3>
            <button onClick={() => setShowChapterPanel(false)} style={styles.closeButton}>
              <X size={20} />
            </button>
          </div>
          <div style={styles.chapterList}>
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => {
                  setCurrentChapter(chapter);
                  setShowChapterPanel(false);
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

      {/* Settings Panel */}
      {showSettings && (
        <div style={styles.settingsPanel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>Reading Settings</h3>
            <button onClick={() => setShowSettings(false)} style={styles.closeButton}>
              <X size={20} />
            </button>
          </div>
          <div style={styles.settingsContent}>
            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Font Size</label>
              <input
                type="range"
                min="14"
                max="24"
                step="1"
                value={settings.fontSize}
                onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                style={styles.slider}
              />
              <span style={styles.settingValue}>{settings.fontSize}px</span>
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Line Spacing</label>
              <input
                type="range"
                min="1.4"
                max="2.2"
                step="0.1"
                value={settings.lineSpacing}
                onChange={(e) => setSettings({ ...settings, lineSpacing: parseFloat(e.target.value) })}
                style={styles.slider}
              />
              <span style={styles.settingValue}>{settings.lineSpacing.toFixed(1)}</span>
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Reading Width</label>
              <div style={styles.toggleButtons}>
                <button
                  onClick={() => setSettings({ ...settings, readingWidth: 'normal' })}
                  style={{
                    ...styles.toggleButton,
                    ...(settings.readingWidth === 'normal' ? styles.toggleButtonActive : {}),
                  }}
                >
                  Normal
                </button>
                <button
                  onClick={() => setSettings({ ...settings, readingWidth: 'wide' })}
                  style={{
                    ...styles.toggleButton,
                    ...(settings.readingWidth === 'wide' ? styles.toggleButtonActive : {}),
                  }}
                >
                  Wide
                </button>
              </div>
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Focus Mode</label>
              <button
                onClick={() => setSettings({ ...settings, focusMode: !settings.focusMode })}
                style={{
                  ...styles.focusModeButton,
                  ...(settings.focusMode ? styles.focusModeButtonActive : {}),
                }}
              >
                {settings.focusMode ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div ref={contentRef} style={styles.mainContent}>
        <div style={{ ...styles.readingContainer, maxWidth }}>
          {currentChapter && (
            <div style={styles.contentHeader}>
              <h1 style={styles.contentTitle}>{currentChapter.chapterTitle}</h1>
              <p style={styles.contentMeta}>
                Chapter {currentChapter.chapterOrder} of {chapters.length}
              </p>
            </div>
          )}

          <div
            style={{
              ...styles.htmlContent,
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineSpacing,
            }}
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
              Previous
            </button>
            
            <button
              onClick={goToNextChapter}
              disabled={currentChapterIndex === chapters.length - 1}
              style={{
                ...styles.navButton,
                ...(currentChapterIndex === chapters.length - 1 ? styles.navButtonDisabled : {}),
              }}
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressBarContainer}>
        <div style={{ ...styles.progressBar, width: `${scrollProgress}%` }} />
      </div>
    </div>
  );
};

// Premium Light Theme Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#FAFBFD',
    position: 'relative',
  },
  toolbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #ECEFF3',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 2rem',
    zIndex: 100,
    transition: 'transform 0.3s ease',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  toolbarTitle: {
    fontSize: '0.95rem',
    fontWeight: 500,
    color: '#374151',
  },
  toolbarButton: {
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6B7280',
    transition: 'all 0.2s',
  },
  toolbarButtonActive: {
    backgroundColor: '#EFF6FF',
    color: '#0A84FF',
  },
  chapterPanel: {
    position: 'fixed',
    top: '60px',
    left: 0,
    width: '320px',
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #ECEFF3',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    boxShadow: '4px 0 16px rgba(0, 0, 0, 0.04)',
  },
  settingsPanel: {
    position: 'fixed',
    top: '60px',
    right: 0,
    width: '320px',
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderLeft: '1px solid #ECEFF3',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.04)',
  },
  panelHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #ECEFF3',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelTitle: {
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
    borderRadius: '4px',
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
  settingsContent: {
    padding: '1.5rem',
    overflowY: 'auto',
  },
  settingItem: {
    marginBottom: '1.5rem',
  },
  settingLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '0.5rem',
  },
  slider: {
    width: '100%',
    marginBottom: '0.5rem',
  },
  settingValue: {
    fontSize: '0.875rem',
    color: '#6B7280',
  },
  toggleButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  toggleButton: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#6B7280',
    transition: 'all 0.2s',
  },
  toggleButtonActive: {
    backgroundColor: '#0A84FF',
    color: '#FFFFFF',
    borderColor: '#0A84FF',
  },
  focusModeButton: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#6B7280',
    transition: 'all 0.2s',
  },
  focusModeButtonActive: {
    backgroundColor: '#0A84FF',
    color: '#FFFFFF',
    borderColor: '#0A84FF',
  },
  mainContent: {
    paddingTop: '60px',
    minHeight: '100vh',
    overflowY: 'auto',
  },
  readingContainer: {
    backgroundColor: '#FFFFFF',
    margin: '48px auto',
    padding: '48px 32px',
    borderRadius: '12px',
    boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
    position: 'relative',
    zIndex: 2,
  },
  contentHeader: {
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #ECEFF3',
  },
  contentTitle: {
    fontSize: '28px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '0.5rem',
    lineHeight: 1.3,
  },
  contentMeta: {
    fontSize: '0.875rem',
    color: '#9CA3AF',
    margin: 0,
  },
  htmlContent: {
    color: '#374151',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
  },
  chapterNav: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '3rem',
    paddingTop: '2rem',
    borderTop: '1px solid #ECEFF3',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#0A84FF',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  navButtonDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#D1D5DB',
    cursor: 'not-allowed',
  },
  progressBarContainer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '3px',
    backgroundColor: '#E6EEF8',
    zIndex: 100,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0A84FF',
    transition: 'width 0.2s ease',
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

export default EpubReaderPremium;
