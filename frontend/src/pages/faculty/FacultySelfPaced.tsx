import React, { useState, useEffect, useCallback } from 'react';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { Plus, Upload, Edit3, Trash2, Eye, Search, X, FileText, Video, Image, Book, Headphones } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const ACCENT = '#7C3AED';

interface SelfPacedResource {
  id: string;
  title: string;
  description?: string;
  resourceType: string;
  fileUrl?: string;
  content?: string;
  subject?: string;
  academicYear?: string;
  tags: string[];
  topicId?: string;
  competencyIds: string[];
  viewCount: number;
  facultyName: string;
  createdAt: string;
}

const RESOURCE_TYPES = [
  'VIDEO', 'DOCUMENT', 'IMAGE', 'REFERENCE', 'PRACTICE',
  'MCQ', 'HANDBOOK', 'CASE_STUDY', 'PRESENTATION', 'AUDIO',
];

const typeIcons: Record<string, React.ReactNode> = {
  VIDEO: <Video size={16} />, IMAGE: <Image size={16} />,
  DOCUMENT: <FileText size={16} />, AUDIO: <Headphones size={16} />, BOOK: <Book size={16} />,
  HANDBOOK: <Book size={16} />, PRESENTATION: <FileText size={16} />, MCQ: <FileText size={16} />,
};

const typeColors: Record<string, string> = {
  VIDEO: '#DC2626', IMAGE: '#059669', DOCUMENT: '#2563EB',
  AUDIO: '#7C3AED', MCQ: '#F59E0B', REFERENCE: '#6B7280', PRACTICE: '#EC4899',
  HANDBOOK: '#0891B2', CASE_STUDY: '#0D9488', PRESENTATION: '#EA580C',
};

const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('accessToken')}` });

const FacultySelfPaced: React.FC = () => {
  const [resources, setResources] = useState<SelfPacedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SelfPacedResource | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({ title: '', description: '', resourceType: 'VIDEO', content: '', subject: '', academicYear: '', tags: [] as string[], topicId: '', competencyIds: [] as string[] });
  const [file, setFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState('');

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/self-paced/my-resources`, { headers: getHeaders() });
      if (res.ok) setResources(await res.json());
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const resetForm = () => {
    setForm({ title: '', description: '', resourceType: 'VIDEO', content: '', subject: '', academicYear: '', tags: [], topicId: '', competencyIds: [] });
    setFile(null);
    setTagInput('');
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (r: SelfPacedResource) => {
    setEditing(r);
    setForm({ title: r.title, description: r.description || '', resourceType: r.resourceType, content: r.content || '', subject: r.subject || '', academicYear: r.academicYear || '', tags: r.tags || [], topicId: r.topicId || '', competencyIds: r.competencyIds || [] });
    setFile(null);
    setShowForm(true);
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API}/self-paced/upload`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }, body: fd });
      if (res.ok) { const data = await res.json(); return data.fileUrl; }
      return null;
    } catch { return null; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);

    try {
      let fileUrl: string | null = null;
      if (file) { fileUrl = await uploadFile(); if (!fileUrl) { alert('File upload failed'); setSaving(false); return; } }
      const payload = { ...form, ...(fileUrl ? { fileUrl } : {}) };

      if (editing) {
        await fetch(`${API}/self-paced/${editing.id}`, { method: 'PUT', headers: { ...getHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        await fetch(`${API}/self-paced`, { method: 'POST', headers: { ...getHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      setShowForm(false);
      resetForm();
      fetchResources();
    } catch (err) {
      alert('Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Archive this resource?')) return;
    try {
      await fetch(`${API}/self-paced/${id}`, { method: 'DELETE', headers: getHeaders() });
      fetchResources();
    } catch { alert('Failed to archive'); }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm(p => ({ ...p, tags: [...p.tags, t] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }));

  const filtered = resources.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || r.resourceType === filterType;
    return matchSearch && matchType;
  });

  const typeCounts = RESOURCE_TYPES.map(t => ({ type: t, count: resources.filter(r => r.resourceType === t).length })).filter(t => t.count > 0);

  if (loading) return (
    <FacultyLayout>
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
        <div className="loading-title">Loading Resources...</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </FacultyLayout>
  );

  return (
    <FacultyLayout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>Self-Paced Resources</h1>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>{resources.length} resources created</p>
        </div>
        <button className="bo-btn bo-btn-primary" style={{ background: ACCENT }} onClick={openCreate}>
          <Plus size={16} /> Create Resource
        </button>
      </div>

      {/* Stats Strip */}
      {typeCounts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {typeCounts.map(tc => (
            <button key={tc.type} onClick={() => setFilterType(filterType === tc.type ? '' : tc.type)}
              style={{ padding: '6px 14px', borderRadius: 20, border: filterType === tc.type ? `2px solid ${typeColors[tc.type] || ACCENT}` : '1px solid var(--bo-border)', background: filterType === tc.type ? `${typeColors[tc.type]}15` : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: typeColors[tc.type] || 'var(--bo-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {tc.type.replace('_', ' ')} <span style={{ background: typeColors[tc.type] || ACCENT, color: '#fff', width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{tc.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--bo-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff' }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff', minWidth: 160 }}>
          <option value="">All Types</option>
          {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Resource Grid */}
      {filtered.length === 0 ? (
        <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
          <FileText size={48} style={{ color: 'var(--bo-text-muted)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, color: 'var(--bo-text-primary)', marginBottom: 8 }}>No resources found</h3>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14 }}>{search || filterType ? 'Try adjusting your filters' : 'Create your first self-paced resource'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(r => (
            <div key={r.id} className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bo-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: `${typeColors[r.resourceType] || ACCENT}18`, color: typeColors[r.resourceType] || ACCENT, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {typeIcons[r.resourceType] || <FileText size={12} />}
                    {r.resourceType.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}><Eye size={12} style={{ marginRight: 4 }} />{r.viewCount}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '8px 0 4px', color: 'var(--bo-text-primary)' }}>{r.title}</h3>
                {r.description && <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{r.description}</p>}
              </div>
              <div style={{ padding: '12px 20px' }}>
                {r.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {r.tags.slice(0, 4).map(t => <span key={t} style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--bo-bg)', fontSize: 11, color: 'var(--bo-text-secondary)' }}>#{t}</span>)}
                    {r.tags.length > 4 && <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>+{r.tags.length - 4}</span>}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(r)} title="Edit" style={{ padding: 6, border: '1px solid var(--bo-border)', borderRadius: 6, background: '#fff', cursor: 'pointer', color: ACCENT }}><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(r.id)} title="Archive" style={{ padding: 6, border: '1px solid var(--bo-border)', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bo-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{editing ? 'Edit Resource' : 'Create Resource'}</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--bo-text-primary)' }}>Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14 }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--bo-text-primary)' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--bo-text-primary)' }}>Resource Type</label>
                  <select value={form.resourceType} onChange={e => setForm(p => ({ ...p, resourceType: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14 }}>
                    {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--bo-text-primary)' }}>Academic Year</label>
                  <input value={form.academicYear} onChange={e => setForm(p => ({ ...p, academicYear: e.target.value }))} placeholder="e.g. 2024-2025"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14 }} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--bo-text-primary)' }}>Subject</label>
                <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Anatomy"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14 }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--bo-text-primary)' }}>Content</label>
                <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={4} placeholder="Text content, notes, or external link..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, resize: 'vertical' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--bo-text-primary)' }}>File Upload</label>
                <div style={{ padding: 16, border: '2px dashed var(--bo-border)', borderRadius: 8, textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                  <input type="file" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  <Upload size={24} style={{ color: 'var(--bo-text-muted)', marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', margin: 0 }}>{file ? file.name : 'Click or drag a file here'}</p>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--bo-text-primary)' }}>Tags</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add a tag..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13 }} />
                  <button type="button" onClick={addTag} className="bo-btn bo-btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}>Add</button>
                </div>
                {form.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {form.tags.map(t => (
                      <span key={t} style={{ padding: '4px 10px', borderRadius: 12, background: `${ACCENT}15`, color: ACCENT, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        #{t} <button type="button" onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: ACCENT, fontWeight: 700 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid var(--bo-border)' }}>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="bo-btn bo-btn-outline">Cancel</button>
                <button type="submit" disabled={saving || !form.title.trim()} className="bo-btn bo-btn-primary" style={{ background: ACCENT, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : editing ? 'Update Resource' : 'Create Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </FacultyLayout>
  );
};

export default FacultySelfPaced;
