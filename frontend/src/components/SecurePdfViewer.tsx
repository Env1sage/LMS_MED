































import React, { useEffect, useRef, useState, useCallback } from 'react';

interface SecurePdfViewerProps {
  url: string;
  watermarkText?: string;
}

// Declare pdf.js types
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const SecurePdfViewer: React.FC<SecurePdfViewerProps> = ({ url, watermarkText = 'View Only' }) => {
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load PDF.js from CDN
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfJsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfJsLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load PDF viewer');
      setLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script if needed
    };
  }, []);

  // Load PDF document when pdf.js is ready
  useEffect(() => {
    if (!pdfJsLoaded || !url) {
      if (!url) {
        setError('No PDF URL provided');
        setLoading(false);
      }
      return;
    }

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('SecurePdfViewer: Loading PDF from URL:', url);
        
        // Get JWT token from localStorage and append to URL
        // Check both 'accessToken' (new) and 'token' (legacy) for compatibility
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        console.log('SecurePdfViewer: Token from localStorage:', token ? `${token.substring(0, 30)}...` : 'NO TOKEN FOUND!');
        
        const urlWithToken = token ? `${url}?token=${token}` : url;
        console.log('SecurePdfViewer: Final URL with token:', urlWithToken);
        
        if (!token) {
          setError('No authentication token found. Please login again.');
          setLoading(false);
          return;
        }
        
        const loadingTask = window.pdfjsLib.getDocument({
          url: urlWithToken,
          disableRange: true,
          disableStream: true,
          withCredentials: false,
        });
        
        const pdfDoc = await loadingTask.promise;
        console.log('SecurePdfViewer: PDF loaded successfully, pages:', pdfDoc.numPages);
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setLoading(false);
      } catch (err: any) {
        console.error('SecurePdfViewer: Error loading PDF:', err);
        console.error('SecurePdfViewer: PDF URL:', url);
        console.error('SecurePdfViewer: Error details:', err.message, err.name);
        setError(`Failed to load PDF: ${err.message || 'Please check the file exists and is accessible'}`);
        setLoading(false);
      }
    };

    loadPdf();
  }, [pdfJsLoaded, url]);

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdf || !canvasRef.current) return;

      try {
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Add watermark overlay
        if (watermarkText) {
          context.save();
          context.globalAlpha = 0.08;
          context.font = '20px Arial';
          context.fillStyle = '#333';
          context.rotate(-Math.PI / 6);
          
          for (let y = -canvas.height; y < canvas.height * 2; y += 80) {
            for (let x = -canvas.width; x < canvas.width * 2; x += 180) {
              context.fillText(watermarkText, x, y);
            }
          }
          context.restore();
        }

      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();
  }, [pdf, currentPage, scale, watermarkText]);

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  // Block all security-related events
  const blockEvent = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '700px',
      backgroundColor: '#1a1a2e',
      borderRadius: '8px',
      overflow: 'hidden',
      userSelect: 'none',
    },
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '10px 16px',
      backgroundColor: '#16213e',
      borderBottom: '1px solid #0f3460',
      flexShrink: 0,
    },
    toolbarButton: {
      padding: '6px 14px',
      backgroundColor: '#0f3460',
      border: 'none',
      borderRadius: '6px',
      color: '#e2e8f0',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500,
      transition: 'background 0.2s',
    },
    toolbarButtonDisabled: {
      padding: '6px 14px',
      backgroundColor: '#1a1a2e',
      border: 'none',
      borderRadius: '6px',
      color: '#475569',
      cursor: 'not-allowed',
      fontSize: '13px',
      fontWeight: 500,
    },
    pageInfo: {
      color: '#94a3b8',
      fontSize: '13px',
      minWidth: '90px',
      textAlign: 'center',
    },
    divider: {
      color: '#334155',
      margin: '0 4px',
    },
    canvasContainer: {
      flex: 1,
      overflow: 'auto',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '20px',
      backgroundColor: '#0d1117',
    },
    canvas: {
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      maxWidth: '100%',
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#94a3b8',
      fontSize: '16px',
      gap: '12px',
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '3px solid #334155',
      borderTopColor: '#c47335',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    error: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#ef4444',
      fontSize: '16px',
    },
    securityNote: {
      padding: '8px 16px',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderTop: '1px solid rgba(34, 197, 94, 0.3)',
      color: '#4ade80',
      fontSize: '11px',
      textAlign: 'center',
      flexShrink: 0,
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span>Loading secure document...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <span>❌ {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={styles.container}
      onContextMenu={blockEvent}
      onCopy={blockEvent}
      onCut={blockEvent}
      onDragStart={blockEvent}
    >
      {/* Custom Toolbar - No Download/Print buttons */}
      <div style={styles.toolbar}>
        <button onClick={zoomOut} style={styles.toolbarButton} title="Zoom Out">
          🔍−
        </button>
        <span style={styles.pageInfo}>{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} style={styles.toolbarButton} title="Zoom In">
          🔍+
        </button>
        
        <span style={styles.divider}>|</span>
        
        <button
          onClick={goToPrevPage}
          disabled={currentPage <= 1}
          style={currentPage <= 1 ? styles.toolbarButtonDisabled : styles.toolbarButton}
          title="Previous Page"
        >
          ◀ Prev
        </button>
        <span style={styles.pageInfo}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages}
          style={currentPage >= totalPages ? styles.toolbarButtonDisabled : styles.toolbarButton}
          title="Next Page"
        >
          Next ▶
        </button>
      </div>

      {/* Canvas Container - Renders PDF as image (no file access) */}
      <div 
        style={styles.canvasContainer}
        onContextMenu={blockEvent}
      >
        <canvas 
          ref={canvasRef} 
          style={styles.canvas}
          onContextMenu={blockEvent}
        />
      </div>

      {/* Security Note */}
      <div style={styles.securityNote}>
        🔒 Secure Viewer: Document is rendered as image - Download, Print, Copy disabled
      </div>
    </div>
  );
};

export default SecurePdfViewer;

