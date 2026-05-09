import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PublisherLayout from '../components/publisher/PublisherLayout';
import apiService from '../services/api.service';
import {
  Upload, FileText, Image, Copy, Check, Trash2, X, Link, Eye,
  CloudUpload, ArrowLeft, Video, BookMarked, Search
} from 'lucide-react';
import '../styles/bitflow-owner.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const STATIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

// Always return an absolute URL with a proper slash separator
const toFullUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${STATIC_BASE_URL}/${url.replace(/^\/+/, '')}`;
};

type FileCategory = 'pdf' | 'epub' | 'video' | 'image';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: FileCategory;
  url: string;
  fullUrl: string;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  preview?: string;
}

const CATEGORY_META: Record<FileCategory, { label: string; color: string; bg: string; accept: string; icon: React.ReactNode }> = {
  pdf:   { label: 'PDF',   color: '#DC2626', bg: '#FEF2F2', accept: 'application/pdf,.pdf', icon: <FileText size={18} style={{ color: '#DC2626' }} /> },
  epub:  { label: 'EPUB',  color: '#2563EB', bg: '#EFF6FF', accept: '.epub,application/epub+zip', icon: <BookMarked size={18} style={{ color: '#2563EB' }} /> },
  video: { label: 'Video', color: '#7C3AED', bg: '#F3E8FF', accept: 'video/*,.mp4,.webm,.mov', icon: <Video size={18} style={{ color: '#7C3AED' }} /> },
  image: { label: 'Image', color: '#059669', bg: '#ECFDF5', accept: 'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png', icon: <Image size={18} style={{ color: '#059669' }} /> },
};

const CATEGORIES: FileCategory[] = ['pdf', 'epub', 'video', 'image'];

const FileUploadHub: React.FC = () => {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState<FileCategory | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<FileCategory>('pdf');
  const inputRefs = useRef<Record<FileCategory, HTMLInputElement | null>>({ pdf: null, epub: null, video: null, image: null });
  const mainInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Detect category from file
  const detectCategory = (file: File): FileCategory => {
    const name = file.name.toLowerCase();
    const mime = file.type.toLowerCase();
    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/.test(name)) return 'image';
    if (mime.includes('epub') || name.endsWith('.epub')) return 'epub';
    if (mime.startsWith('video/') || /\.(mp4|webm|mov|avi)$/.test(name)) return 'video';
    return 'pdf';
  };

  // Load previously uploaded files from database on mount
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const res = await apiService.get('/publisher-admin/uploaded-files');
        const files = res.data || [];
        const loaded: UploadedFile[] = files.map((f: any) => ({
          id: f.id,
          name: f.originalName,
          size: f.fileSize,
          type: f.mimeType,
          // normalize legacy 'book' value stored by the old two-zone hub
          category: (f.fileCategory === 'book' ? 'pdf' : f.fileCategory) as FileCategory,
          url: f.fileUrl,
          fullUrl: toFullUrl(f.fileUrl),
          status: 'done' as const,
          preview: f.fileCategory === 'image' ? toFullUrl(f.fileUrl) : undefined,
        }));
        setUploads(loaded);
      } catch {}
    };
    loadFiles();
  }, []);

  // Save file record to database
  const saveFileRecord = async (entry: UploadedFile) => {
    try {
      const res = await apiService.post('/publisher-admin/uploaded-files', {
        fileName: entry.url.split('/').pop() || entry.name,
        originalName: entry.name,
        fileUrl: entry.url,
        fileCategory: entry.category,
        fileSize: entry.size,
        mimeType: entry.type,
      });
      // Update the entry ID to the database ID so delete works
      setUploads(prev => prev.map(u => u.id === entry.id ? { ...u, id: res.data.id } : u));
    } catch (e) {
      console.error('[FileUploadHub] saveFileRecord failed:', e);
    }
  };

  // Delete file record from database
  const deleteFileRecord = async (id: string) => {
    try {
      await apiService.delete(`/publisher-admin/uploaded-files/${encodeURIComponent(id)}`);
    } catch {}
  };

  const uploadFile = useCallback(async (file: File, category: FileCategory) => {
    const id = generateId();
    const preview = category === 'image' ? URL.createObjectURL(file) : undefined;

    const entry: UploadedFile = {
      id, name: file.name, size: file.size, type: file.type,
      category, url: '', fullUrl: '', status: 'uploading', preview,
    };

    setUploads(prev => [entry, ...prev]);

    // Map category to backend upload type
    const typeMap: Record<FileCategory, string> = {
      pdf: 'book', epub: 'book', video: 'video', image: 'image',
    };
    const backendType = typeMap[category];

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use apiService (axios) so 401s are auto-retried with refreshed token
      const res = await apiService.post(`/learning-units/upload?type=${backendType}`, formData);
      const data = res.data;

      // Always store a relative /uploads/... path — strip any http://host prefix
      let relativeUrl = data.url || data.fileUrl || '';
      try { relativeUrl = new URL(relativeUrl).pathname; } catch { /* already relative */ }
      // Ensure leading slash for correct URL construction
      if (relativeUrl && !relativeUrl.startsWith('/')) relativeUrl = '/' + relativeUrl;
      const fullUrl = toFullUrl(relativeUrl);
      const previewUrl = category === 'image' ? fullUrl : entry.preview;

      const updatedEntry = { ...entry, status: 'done' as const, url: relativeUrl, fullUrl };
      setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'done', url: relativeUrl, fullUrl, preview: previewUrl } : u));
      saveFileRecord(updatedEntry);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Upload failed';
      setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: Array.isArray(msg) ? msg.join(', ') : msg } : u));
    }
  }, []);

  const handleFiles = useCallback((files: FileList | File[], forcedCategory?: FileCategory) => {
    const maxSize = 500 * 1024 * 1024;
    Array.from(files).forEach(file => {
      const category = forcedCategory ?? detectCategory(file);
      if (file.size > maxSize) {
        const id = generateId();
        setUploads(prev => [{
          id, name: file.name, size: file.size, type: file.type,
          category, url: '', fullUrl: '', status: 'error', error: 'File exceeds 500MB limit',
        }, ...prev]);
        return;
      }
      uploadFile(file, category);
    });
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent, category?: FileCategory) => {
    e.preventDefault();
    setDragging(null);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files, category);
  }, [handleFiles]);

  const removeUpload = (id: string) => {
    setUploads(prev => {
      const item = prev.find(u => u.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      if (item?.status === 'done') deleteFileRecord(id);
      return prev.filter(u => u.id !== id);
    });
  };

  const copyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const [searchQuery, setSearchQuery] = useState('');

  const completedUrls = uploads.filter(u => u.status === 'done');

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--bo-border)', fontSize: 13,
    background: '#fff', color: 'var(--bo-text-primary)',
    fontFamily: 'monospace',
  };

  const sectionUploads = uploads
    .filter(u => u.category === activeSection)
    .filter(u => !searchQuery.trim() || u.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const meta = CATEGORY_META[activeSection];

  return (
    <PublisherLayout>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}
            onClick={() => navigate('/publisher-admin')}>
            <ArrowLeft size={16} />
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
            <CloudUpload size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--bo-primary, #c47335)' }} />
            File Upload Hub
          </h1>
        </div>
        <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, marginTop: 4 }}>
          Upload all content types — PDF, EPUB, Video, and Images. Copy generated URLs for use in bulk upload.
        </p>
      </div>

      {/* Single unified upload zone */}
      <div className="bo-card" style={{ padding: 20, marginBottom: 24 }}>
        <div
          style={{
            border: `2px dashed ${dragging ? 'var(--bo-primary, #c47335)' : 'var(--bo-border)'}`,
            borderRadius: 12, padding: '36px 24px', textAlign: 'center',
            cursor: 'pointer', background: dragging ? 'rgba(196,115,53,0.04)' : 'var(--bo-bg)',
            transition: 'all 0.2s',
          }}
          onDragOver={e => { e.preventDefault(); setDragging('pdf'); }}
          onDragLeave={() => setDragging(null)}
          onDrop={e => handleDrop(e)}
          onClick={() => mainInputRef.current?.click()}
        >
          <Upload size={36} style={{ color: 'var(--bo-text-muted)', marginBottom: 10 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>
            Drop any file here or click to browse
          </div>
          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
            Supports: <strong>.pdf</strong> · <strong>.epub</strong> · <strong>.mp4 / .webm</strong> · <strong>.jpg / .png / .webp</strong> — Max 500MB each
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
            {CATEGORIES.map(cat => {
              const m = CATEGORY_META[cat];
              return (
                <span key={cat} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: m.bg, color: m.color }}>
                  {m.label}
                </span>
              );
            })}
          </div>
        </div>
        <input
          ref={mainInputRef}
          type="file"
          multiple
          accept=".pdf,.epub,.mp4,.webm,.mov,.jpg,.jpeg,.png,.gif,.webp,application/pdf,application/epub+zip,video/*,image/*"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
        />
        {/* Hidden per-category refs kept for compatibility */}
        {CATEGORIES.map(cat => (
          <input
            key={cat}
            ref={el => { inputRefs.current[cat] = el; }}
            type="file"
            multiple
            accept={CATEGORY_META[cat].accept}
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files, cat); e.target.value = ''; }}
          />
        ))}
      </div>

      {/* 4-section tabs for uploaded files */}
      <div className="bo-card" style={{ overflow: 'hidden', marginBottom: 24 }}>
        {/* Tab header with counts */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bo-border)' }}>
          {CATEGORIES.map(cat => {
            const m = CATEGORY_META[cat];
            const count = uploads.filter(u => u.category === cat).length;
            const isActive = activeSection === cat;
            return (
              <button
                key={cat}
                onClick={() => { setActiveSection(cat); setSearchQuery(''); }}
                style={{
                  flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
                  background: isActive ? m.bg : 'transparent',
                  borderBottom: isActive ? `3px solid ${m.color}` : '3px solid transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.icon}
                  <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? m.color : 'var(--bo-text-secondary)' }}>{m.label}</span>
                </div>
                {count > 0 && (
                  <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: isActive ? m.color : '#E5E7EB', color: isActive ? '#fff' : 'var(--bo-text-secondary)' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div style={{ padding: '12px 20px 0', borderTop: '1px solid var(--bo-border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
            <input
              type="text"
              placeholder={`Search ${meta.label} files…`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, background: 'var(--bo-bg)', color: 'var(--bo-text-primary)', boxSizing: 'border-box' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex' }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Section body */}
        <div style={{ padding: 20 }}>
          {sectionUploads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--bo-text-muted)' }}>
              {meta.icon}
              <div style={{ marginTop: 8, fontSize: 13 }}>{searchQuery ? `No ${meta.label} files match "${searchQuery}"` : `No ${meta.label} files uploaded yet`}</div>
              <button
                className="bo-btn bo-btn-outline"
                style={{ marginTop: 12, fontSize: 12 }}
                onClick={() => inputRefs.current[activeSection]?.click()}
              >
                <Upload size={13} /> Upload {meta.label}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sectionUploads.map(u => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 10, border: '1px solid var(--bo-border)', background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  {/* Thumbnail for images, icon for others */}
                  {u.category === 'image' && u.preview ? (
                    <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#F3F4F6' }}>
                      <img src={u.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 6, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {meta.icon}
                    </div>
                  )}

                  {/* File info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--bo-text-primary)' }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 1 }}>
                      {formatSize(u.size)}
                      {u.status === 'uploading' && <span style={{ marginLeft: 8, color: 'var(--bo-primary, #c47335)' }}>Uploading…</span>}
                      {u.status === 'error' && <span style={{ marginLeft: 8, color: '#EF4444' }}>{u.error}</span>}
                    </div>
                    {u.status === 'done' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <input
                          readOnly value={u.fullUrl || u.url}
                          style={{ ...inputStyle, fontSize: 11, padding: '4px 8px' }}
                          onClick={e => (e.target as HTMLInputElement).select()}
                        />
                        {u.category === 'image' && (
                          <a href={u.fullUrl || u.url} target="_blank" rel="noopener noreferrer"
                            style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--bo-text-secondary)', textDecoration: 'none', flexShrink: 0 }}>
                            <Eye size={12} /> View
                          </a>
                        )}
                        <button
                          onClick={() => copyUrl(u.id, u.fullUrl || u.url)}
                          style={{
                            background: copiedId === u.id ? '#10B981' : meta.color,
                            color: '#fff', border: 'none', borderRadius: 6,
                            padding: '4px 10px', cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                          }}
                        >
                          {copiedId === u.id ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === u.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Spinner / status */}
                  {u.status === 'uploading' && (
                    <div style={{ width: 20, height: 20, border: '2px solid var(--bo-border)', borderTopColor: meta.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  )}
                  {u.status === 'done' && <Check size={16} style={{ color: '#10B981', flexShrink: 0 }} />}

                  <button onClick={() => removeUpload(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 4, flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generated URLs Summary */}
      {completedUrls.length > 0 && (
        <div className="bo-card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link size={18} style={{ color: 'var(--bo-primary, #c47335)' }} />
              Generated URLs ({completedUrls.length})
            </h3>
            <button
              onClick={() => {
                const text = completedUrls.map(u => `${u.name}\t${u.fullUrl || u.url}`).join('\n');
                navigator.clipboard.writeText(text);
                setCopiedId('all');
                setTimeout(() => setCopiedId(null), 2000);
              }}
              className="bo-btn bo-btn-outline"
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              {copiedId === 'all' ? <Check size={12} /> : <Copy size={12} />}
              {copiedId === 'all' ? ' All Copied' : ' Copy All URLs'}
            </button>
          </div>
          <div style={{ overflow: 'auto', maxHeight: 300 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bo-border)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>File</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>URL</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase', width: 60 }}>Copy</th>
                </tr>
              </thead>
              <tbody>
                {completedUrls.map(u => {
                  const m = CATEGORY_META[u.category] ?? CATEGORY_META['pdf'];
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--bo-border)' }}>
                      <td style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.icon}
                        <span style={{ marginLeft: 6, verticalAlign: 'middle' }}>{u.name}</span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: m.bg, color: m.color }}>
                          {m.label}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <code style={{ fontSize: 11, color: 'var(--bo-text-secondary)', background: 'var(--bo-bg)', padding: '2px 6px', borderRadius: 4 }}>
                          {u.fullUrl || u.url}
                        </code>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => copyUrl(u.id, u.fullUrl || u.url)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === u.id ? '#10B981' : 'var(--bo-text-muted)' }}
                        >
                          {copiedId === u.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Workflow Guide */}
      <div className="bo-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>How to use the Upload Hub</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { step: '1', title: 'Upload Files', desc: 'Drag & drop any file. PDFs, EPUBs, Videos and Images are auto-detected and placed in the correct section.', icon: <Upload size={20} /> },
            { step: '2', title: 'Copy URLs', desc: 'Each uploaded file gets a unique URL. Click the Copy button next to any file, or use Copy All URLs.', icon: <Copy size={20} /> },
            { step: '3', title: 'Paste in Excel', desc: 'Go to Bulk Upload, choose the correct template, paste the ISBN and URLs into the File URL column.', icon: <FileText size={20} /> },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bo-primary, #c47335)', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {s.step}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--bo-text-primary)' }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-secondary)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </PublisherLayout>
  );
};

export default FileUploadHub;
