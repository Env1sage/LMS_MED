import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Image, Upload, Copy, Check, Trash2, Eye, X, Download, FolderUp,
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const STATIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

interface ImageEntry {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  preview?: string; // blob or static URL
  url: string;       // relative e.g. /uploads/images/...
  fullUrl: string;   // absolute e.g. http://localhost:3001/uploads/images/...
}

const getToken = () => localStorage.getItem('accessToken') || '';
const generateId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const BulkImageUpload: React.FC = () => {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load previously uploaded images from DB on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/publisher-admin/uploaded-files`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return;
        const files = await res.json();
        const loaded: ImageEntry[] = files
          .filter((f: any) => f.fileCategory === 'image')
          .map((f: any) => ({
            id: f.id,
            name: f.originalName,
            size: f.fileSize,
            mimeType: f.mimeType,
            status: 'done' as const,
            preview: f.fileUrl.startsWith('http') ? f.fileUrl : `${STATIC_BASE_URL}${f.fileUrl}`,
            url: f.fileUrl,
            fullUrl: f.fileUrl.startsWith('http') ? f.fileUrl : `${STATIC_BASE_URL}${f.fileUrl}`,
          }));
        setImages(loaded);
      } catch {}
    };
    load();
  }, []);

  const saveToDb = async (entry: ImageEntry) => {
    try {
      const res = await fetch(`${API_BASE_URL}/publisher-admin/uploaded-files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: entry.url.split('/').pop() || entry.name,
          originalName: entry.name,
          fileUrl: entry.url,
          fileCategory: 'image',
          fileSize: entry.size,
          mimeType: entry.mimeType,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setImages(prev => prev.map(e => e.id === entry.id ? { ...e, id: saved.id } : e));
      }
    } catch {}
  };

  const deleteFromDb = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/publisher-admin/uploaded-files/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {}
  };

  const uploadFile = useCallback(async (file: File) => {
    const id = generateId();
    const preview = URL.createObjectURL(file);
    const entry: ImageEntry = {
      id, name: file.name, size: file.size, mimeType: file.type,
      status: 'uploading', preview, url: '', fullUrl: '',
    };
    setImages(prev => [entry, ...prev]);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE_URL}/publisher-admin/mcqs/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const relUrl = data.url || data.fileUrl || '';
      const fullUrl = relUrl.startsWith('http') ? relUrl : `${STATIC_BASE_URL}${relUrl}`;
      const done: ImageEntry = { ...entry, status: 'done', url: relUrl, fullUrl, preview: fullUrl };
      setImages(prev => prev.map(e => e.id === id ? done : e));
      saveToDb(done);
    } catch (err: any) {
      setImages(prev => prev.map(e => e.id === id ? { ...e, status: 'error', error: err.message } : e));
    }
  }, []);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 50 * 1024 * 1024; // 50MB per image
    Array.from(files).forEach(file => {
      if (!allowed.includes(file.type)) {
        const id = generateId();
        setImages(prev => [{
          id, name: file.name, size: file.size, mimeType: file.type,
          status: 'error', error: 'Unsupported file type', url: '', fullUrl: '',
        }, ...prev]);
        return;
      }
      if (file.size > maxSize) {
        const id = generateId();
        setImages(prev => [{
          id, name: file.name, size: file.size, mimeType: file.type,
          status: 'error', error: 'Exceeds 50MB limit', url: '', fullUrl: '',
        }, ...prev]);
        return;
      }
      uploadFile(file);
    });
  }, [uploadFile]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const item = prev.find(e => e.id === id);
      if (item?.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      if (item?.status === 'done') deleteFromDb(id);
      return prev.filter(e => e.id !== id);
    });
  };

  const copyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const doneImages = images.filter(e => e.status === 'done');

  const copyAllUrls = async () => {
    const text = doneImages.map(e => e.fullUrl || e.url).join('\n');
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopiedId('all');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadUrlsCsv = () => {
    const header = 'File Name,URL\n';
    const rows = doneImages.map(e => `"${e.name.replace(/"/g, '""')}","${e.fullUrl || e.url}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'image_urls.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const uploadingCount = images.filter(e => e.status === 'uploading').length;
  const errorCount = images.filter(e => e.status === 'error').length;

  return (
    <div style={{ padding: 24 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--bo-primary, #c47335)' : 'var(--bo-border)'}`,
          borderRadius: 12, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? 'rgba(196,115,53,0.04)' : 'var(--bo-bg)',
          transition: 'all 0.2s', marginBottom: 24,
        }}
      >
        <FolderUp size={40} style={{ color: 'var(--bo-text-muted)', marginBottom: 10 }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>
          Drop images here or click to browse
        </div>
        <div style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
          JPG, PNG, GIF, WebP — select multiple files at once — Max 50MB each
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* Status bar */}
      {images.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--bo-text-secondary)', fontWeight: 500 }}>
              <Image size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {images.length} image{images.length !== 1 ? 's' : ''}
              {uploadingCount > 0 && <span style={{ color: '#F59E0B', marginLeft: 8 }}>({uploadingCount} uploading…)</span>}
              {errorCount > 0 && <span style={{ color: '#EF4444', marginLeft: 8 }}>({errorCount} failed)</span>}
            </span>
          </div>
          {doneImages.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={downloadUrlsCsv}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: '1px solid var(--bo-border)',
                  borderRadius: 7, padding: '6px 12px', cursor: 'pointer',
                  fontSize: 13, color: 'var(--bo-text-secondary)', fontWeight: 500,
                }}
              >
                <Download size={14} /> Download URLs CSV
              </button>
              <button
                onClick={copyAllUrls}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: copiedId === 'all' ? '#10B981' : 'var(--bo-primary, #c47335)',
                  border: 'none', borderRadius: 7, padding: '6px 12px', cursor: 'pointer',
                  fontSize: 13, color: '#fff', fontWeight: 500,
                }}
              >
                {copiedId === 'all' ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === 'all' ? 'Copied!' : `Copy All URLs (${doneImages.length})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Image list table */}
      {images.length > 0 && (
        <div style={{
          border: '1px solid var(--bo-border)', borderRadius: 10, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bo-bg)', borderBottom: '1px solid var(--bo-border)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase', width: 80 }}>Preview</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>File Name</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase', width: 80 }}>Size</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase', width: 90 }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>URL</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase', width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img, idx) => (
                <tr
                  key={img.id}
                  style={{
                    borderBottom: idx < images.length - 1 ? '1px solid var(--bo-border)' : 'none',
                    background: img.status === 'error' ? '#FFF5F5' : '#fff',
                  }}
                >
                  {/* Thumbnail */}
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{
                      width: 56, height: 40, borderRadius: 6, overflow: 'hidden',
                      background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {img.preview ? (
                        <img src={img.preview} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Image size={18} style={{ color: '#D1D5DB' }} />
                      )}
                    </div>
                  </td>
                  {/* Name */}
                  <td style={{ padding: '8px 12px', maxWidth: 220 }}>
                    <div style={{ fontWeight: 500, color: 'var(--bo-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.name}
                    </div>
                    {img.status === 'error' && (
                      <div style={{ fontSize: 11, color: '#EF4444', marginTop: 1 }}>{img.error}</div>
                    )}
                  </td>
                  {/* Size */}
                  <td style={{ padding: '8px 12px', color: 'var(--bo-text-muted)', whiteSpace: 'nowrap' }}>
                    {formatSize(img.size)}
                  </td>
                  {/* Status */}
                  <td style={{ padding: '8px 12px' }}>
                    {img.status === 'uploading' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#F59E0B', fontSize: 12 }}>
                        <div style={{
                          width: 12, height: 12, border: '2px solid #F59E0B',
                          borderTopColor: 'transparent', borderRadius: '50%',
                          animation: 'spin 0.7s linear infinite', flexShrink: 0,
                        }} />
                        Uploading
                      </span>
                    )}
                    {img.status === 'done' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#10B981', fontSize: 12, fontWeight: 500 }}>
                        <Check size={13} /> Done
                      </span>
                    )}
                    {img.status === 'error' && (
                      <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 500 }}>Failed</span>
                    )}
                  </td>
                  {/* URL */}
                  <td style={{ padding: '8px 12px' }}>
                    {img.status === 'done' && (
                      <code style={{
                        fontSize: 11, color: 'var(--bo-text-secondary)', background: '#F8F9FA',
                        padding: '2px 6px', borderRadius: 4, display: 'block',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 300, cursor: 'pointer',
                      }}
                        title={img.fullUrl || img.url}
                        onClick={() => copyUrl(img.id, img.fullUrl || img.url)}
                      >
                        {img.fullUrl || img.url}
                      </code>
                    )}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                      {img.status === 'done' && (
                        <>
                          <button
                            onClick={() => copyUrl(img.id, img.fullUrl || img.url)}
                            title="Copy URL"
                            style={{
                              background: copiedId === img.id ? '#10B981' : 'var(--bo-primary, #c47335)',
                              color: '#fff', border: 'none', borderRadius: 5,
                              padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            }}
                          >
                            {copiedId === img.id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                          <a
                            href={img.fullUrl || img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View image"
                            style={{
                              background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                              borderRadius: 5, padding: '4px 6px', display: 'flex', alignItems: 'center',
                              textDecoration: 'none',
                            }}
                          >
                            <Eye size={12} />
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => removeImage(img.id)}
                        title="Delete"
                        style={{
                          background: 'none', border: '1px solid #FCA5A5', borderRadius: 5,
                          color: '#EF4444', padding: '4px 6px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {images.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--bo-text-muted)', fontSize: 13 }}>
          No images uploaded yet. Drop files above or click to browse.
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default BulkImageUpload;
