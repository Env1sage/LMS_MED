import React, { useState, useRef } from 'react';
import { Upload, FileText, Video, BookOpen, X, Link, ArrowUpFromLine } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  fileType: 'book' | 'video' | 'image';
  label?: string;
}

const FileUploadButton: React.FC<FileUploadProps> = ({ onUploadComplete, fileType, label }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<string>('');
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');

  const getAcceptedTypes = () => {
    switch (fileType) {
      case 'book':
        return '.pdf,.epub';
      case 'video':
        return '.mp4,.webm,.ogg';
      case 'image':
        return '.jpg,.jpeg,.png,.gif,.webp';
      default:
        return '*';
    }
  };

  const getIcon = () => {
    switch (fileType) {
      case 'book':
        return <BookOpen size={20} />;
      case 'video':
        return <Video size={20} />;
      case 'image':
        return <FileText size={20} />;
      default:
        return <Upload size={20} />;
    }
  };

  const getLabel = () => {
    if (label) return label;
    switch (fileType) {
      case 'book':
        return 'Upload Book (PDF/EPUB)';
      case 'video':
        return 'Upload Video (MP4/WebM)';
      case 'image':
        return 'Upload Image';
      default:
        return 'Upload File';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
      setError('File size must be less than 500MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/learning-units/upload?type=${fileType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      const uploadedUrl = data.url;
      
      setUploadedFile(file.name);
      onUploadComplete(uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const clearUpload = () => {
    setUploadedFile('');
    setUrlInput('');
    setError('');
    onUploadComplete('');
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setError('Please enter a URL');
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setError('Please enter a valid URL (e.g. https://...)');
      return;
    }
    setError('');
    setUploadedFile(trimmed);
    onUploadComplete(trimmed);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    background: active ? 'var(--bo-card-bg, #fff)' : 'transparent',
    color: active ? 'var(--bo-primary, #c47335)' : 'var(--bo-text-muted, #94a3b8)',
    border: 'none', borderBottom: active ? '2px solid var(--bo-primary, #c47335)' : '2px solid transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'all 0.2s',
  });

  return (
    <div style={{ marginBottom: 16 }}>
      {uploadedFile ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            {getIcon()}
            <span style={{ fontSize: 13, fontWeight: 600, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ✅ {uploadedFile.startsWith('http') ? uploadedFile : `Uploaded: ${uploadedFile}`}
            </span>
          </div>
          <button
            type="button"
            onClick={clearUpload}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#dc2626', padding: 4, borderRadius: 4,
              display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div>
          {/* Mode tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--bo-border, #e2e8f0)',
            marginBottom: 12, borderRadius: '8px 8px 0 0', overflow: 'hidden',
            background: 'var(--bo-bg, #f9fafb)',
          }}>
            <button type="button" style={tabStyle(mode === 'upload')} onClick={() => { setMode('upload'); setError(''); }}>
              <ArrowUpFromLine size={14} /> Upload File
            </button>
            <button type="button" style={tabStyle(mode === 'url')} onClick={() => { setMode('url'); setError(''); }}>
              <Link size={14} /> Add URL
            </button>
          </div>

          {mode === 'upload' ? (
            <>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={getAcceptedTypes()}
                onChange={handleFileSelect}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              {/* Styled clickable drop zone */}
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '24px 16px', border: '2px dashed var(--bo-border, #d1d5db)',
                  borderRadius: 10, cursor: uploading ? 'wait' : 'pointer',
                  background: 'var(--bo-bg, #f9fafb)', transition: 'all 0.2s ease',
                  gap: 8,
                }}
                onMouseEnter={e => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = 'var(--bo-primary, #c47335)';
                    e.currentTarget.style.background = 'rgba(196, 115, 53, 0.04)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--bo-border, #d1d5db)';
                  e.currentTarget.style.background = 'var(--bo-bg, #f9fafb)';
                }}
              >
                <div style={{ color: 'var(--bo-primary, #c47335)', marginBottom: 2 }}>
                  {uploading ? (
                    <div style={{
                      width: 24, height: 24, border: '3px solid var(--bo-border)',
                      borderTopColor: 'var(--bo-primary, #c47335)', borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                  ) : (
                    getIcon()
                  )}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-text, #1e293b)' }}>
                  {uploading ? 'Uploading...' : getLabel()}
                </span>
                {!uploading && (
                  <span style={{ fontSize: 11, color: 'var(--bo-text-muted, #94a3b8)' }}>
                    Click to browse or drag & drop
                  </span>
                )}
              </div>
              <p style={{ marginTop: 6, fontSize: 11, color: 'var(--bo-text-muted, #94a3b8)' }}>
                Max size: 500MB • Accepted: {getAcceptedTypes().replace(/\./g, '').toUpperCase()}
              </p>
            </>
          ) : (
            /* URL input mode */
            <div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Link size={14} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--bo-text-muted, #94a3b8)',
                  }} />
                  <input
                    type="url"
                    placeholder={fileType === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com/file.pdf'}
                    value={urlInput}
                    onChange={e => { setUrlInput(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                    style={{
                      width: '100%', padding: '10px 12px 10px 34px', fontSize: 13,
                      border: '1px solid var(--bo-border, #d1d5db)', borderRadius: 8,
                      outline: 'none', color: 'var(--bo-text, #1e293b)',
                      background: 'var(--bo-card-bg, #fff)',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--bo-primary, #c47335)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--bo-border, #d1d5db)'}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUrlSubmit}
                  style={{
                    padding: '10px 18px', fontSize: 13, fontWeight: 600,
                    background: 'var(--bo-primary, #c47335)', color: '#fff',
                    border: 'none', borderRadius: 8, cursor: 'pointer',
                    transition: 'opacity 0.2s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Add
                </button>
              </div>
              <p style={{ marginTop: 6, fontSize: 11, color: 'var(--bo-text-muted, #94a3b8)' }}>
                {fileType === 'video'
                  ? 'Paste a YouTube, Vimeo, or direct video URL'
                  : 'Paste an external URL to the content'}
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 8, padding: '8px 12px', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#991b1b',
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUploadButton;
