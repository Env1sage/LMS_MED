import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../services/api.service';
import {
  Upload, Search, Trash2, File, Image, Film, Music, FileText,
  HardDrive, Copy, FolderOpen, Eye, X, Check, BarChart3
} from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

const ACCENT = '#7C3AED';

interface Asset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  fileUrl: string;
  type: string;
  folder: string | null;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  uploader?: { id: string; fullName: string };
}

interface Stats {
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  byType: Record<string, { count: number; size: number }>;
}

const typeIcons: Record<string, React.ReactNode> = {
  DOCUMENT: <FileText size={16} />,
  IMAGE: <Image size={16} />,
  VIDEO: <Film size={16} />,
  AUDIO: <Music size={16} />,
  PRESENTATION: <FileText size={16} />,
  SPREADSHEET: <BarChart3 size={16} />,
  ARCHIVE: <FolderOpen size={16} />,
  OTHER: <File size={16} />,
};

const typeColors: Record<string, string> = {
  DOCUMENT: '#3B82F6', IMAGE: '#10B981', VIDEO: '#EF4444', AUDIO: '#F59E0B',
  PRESENTATION: '#8B5CF6', SPREADSHEET: '#06B6D4', ARCHIVE: '#6B7280', OTHER: '#9CA3AF',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface AssetManagerProps {
  Layout: React.FC<{ children: React.ReactNode }>;
}

const AssetManager: React.FC<AssetManagerProps> = ({ Layout }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('general');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadPublic, setUploadPublic] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('search', search);
      const [assetsRes, statsRes] = await Promise.all([
        apiService.get(`/assets?${params.toString()}`),
        apiService.get('/assets/stats'),
      ]);
      setAssets(assetsRes.data);
      setStats(statsRes.data);
    } catch { /* empty */ }
    setLoading(false);
  }, [typeFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', uploadFolder);
      if (uploadDesc) formData.append('description', uploadDesc);
      if (uploadPublic) formData.append('isPublic', 'true');

      const token = localStorage.getItem('accessToken');
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${baseUrl}/assets/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      setShowUpload(false);
      setUploadFolder('general');
      setUploadDesc('');
      setUploadPublic(false);
      load();
    } catch { alert('Upload failed'); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this file?')) return;
    try { await apiService.delete(`/assets/${id}`); load(); } catch { /* empty */ }
  };

  const handleCopyLink = async (id: string) => {
    try {
      const res = await apiService.get(`/assets/${id}/signed-url`);
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const fullUrl = `${baseUrl}${res.data.url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* empty */ }
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text)' }}>Asset Manager</h1>
            <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>Upload, manage, and share files</p>
          </div>
          <button onClick={() => setShowUpload(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontWeight: 600, fontSize: 14,
          }}>
            <Upload size={18} /> Upload File
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid var(--bo-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Total Files</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: ACCENT }}>{stats.totalFiles}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid var(--bo-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Storage Used</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3B82F6' }}>{stats.totalSizeFormatted}</div>
            </div>
            {Object.entries(stats.byType).slice(0, 2).map(([type, data]) => (
              <div key={type} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid var(--bo-border)' }}>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: typeColors[type] }}>{typeIcons[type]}</span> {type}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: typeColors[type] }}>{data.count}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--bo-text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search files..."
              style={{
                width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8,
                border: '1px solid var(--bo-border)', fontSize: 14, outline: 'none',
              }}
            />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{
            padding: '10px 16px', borderRadius: 8, border: '1px solid var(--bo-border)',
            fontSize: 14, outline: 'none', background: '#fff', minWidth: 150,
          }}>
            <option value="">All Types</option>
            {['DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO', 'PRESENTATION', 'SPREADSHEET', 'ARCHIVE', 'OTHER'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* File list */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--bo-text-muted)', padding: 40 }}>Loading...</p>
        ) : assets.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12,
            border: '1px solid var(--bo-border)', color: 'var(--bo-text-muted)',
          }}>
            <HardDrive size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>No files uploaded yet</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--bo-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bo-border)', background: '#FAFAFA' }}>
                  <th style={thStyle}>File</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Size</th>
                  <th style={thStyle}>Uploaded</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: typeColors[a.type] || '#9CA3AF' }}>
                          {typeIcons[a.type] || <File size={16} />}
                        </span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--bo-text)' }}>{a.originalName}</div>
                          {a.description && (
                            <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{a.description}</div>
                          )}
                          {a.folder && (
                            <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>📁 {a.folder}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                        background: `${typeColors[a.type] || '#9CA3AF'}15`, color: typeColors[a.type] || '#9CA3AF',
                      }}>{a.type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--bo-text-secondary)' }}>
                      {formatBytes(a.size)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--bo-text-muted)' }}>
                      {formatDate(a.createdAt)}
                      {a.uploader && (
                        <div style={{ fontSize: 11 }}>{a.uploader.fullName}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleCopyLink(a.id)} title="Copy signed URL" style={actionBtnStyle}>
                          {copied === a.id ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                        </button>
                        <button onClick={() => window.open(
                          `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}${a.fileUrl}?token=${localStorage.getItem('accessToken')}`,
                          '_blank'
                        )} title="Preview" style={actionBtnStyle}>
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleDelete(a.id)} title="Delete" style={{
                          ...actionBtnStyle, borderColor: '#FCA5A5',
                        }}>
                          <Trash2 size={14} color="#EF4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Upload Modal */}
        {showUpload && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Upload File</h2>
                <button onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Folder</label>
                  <input value={uploadFolder} onChange={e => setUploadFolder(e.target.value)}
                    style={inputStyle} placeholder="general" />
                </div>
                <div>
                  <label style={labelStyle}>Description (optional)</label>
                  <input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)}
                    style={inputStyle} placeholder="Brief description..." />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="isPublic" checked={uploadPublic}
                    onChange={e => setUploadPublic(e.target.checked)} />
                  <label htmlFor="isPublic" style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>
                    Make publicly accessible
                  </label>
                </div>
                <div>
                  <label style={labelStyle}>Select File</label>
                  <input ref={fileRef} type="file" onChange={handleUpload} disabled={uploading}
                    style={{ fontSize: 14 }} />
                </div>
                {uploading && (
                  <p style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>Uploading...</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600,
  color: 'var(--bo-text-muted)', textTransform: 'uppercase',
};
const actionBtnStyle: React.CSSProperties = {
  padding: 6, borderRadius: 6, border: '1px solid var(--bo-border)',
  background: '#fff', cursor: 'pointer',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--bo-border)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

export default AssetManager;
