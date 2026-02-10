import React, { useState, useRef, useCallback, useEffect } from 'react';
import learningUnitService from '../../services/learning-unit.service';
import topicsService from '../../services/topics.service';
import { Topic } from '../../services/topics.service';
import TopicSearch from '../TopicSearch';
import CompetencySearch from '../common/CompetencySearch';
import { BookOpen, Video, Upload, X, Check, FileText, Plus, Trash2, Download, Search, ChevronDown } from 'lucide-react';

interface ContentRow {
  id: string;
  type: 'BOOK' | 'VIDEO';
  title: string;
  description: string;
  subject: string;
  topic: string;
  difficultyLevel: string;
  estimatedDuration: number;
  file: File | null;
  tags: string;
  competencyCodes: string;
}

interface BulkContentUploadProps {
  onSuccess?: () => void;
}

const BulkContentUpload: React.FC<BulkContentUploadProps> = ({ onSuccess }) => {
  const [rows, setRows] = useState<ContentRow[]>([createEmptyRow()]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Per-row competency tracking (keyed by row.id)
  const [rowCompetencies, setRowCompetencies] = useState<Record<string, Array<{
    id: string; code: string; title: string; description: string;
    subject: string; domain?: string; academicLevel?: string;
  }>>>({}); 
  const [rowSelectedCompIds, setRowSelectedCompIds] = useState<Record<string, string[]>>({});
  const [rowTopicIds, setRowTopicIds] = useState<Record<string, string | undefined>>({});
  const [rowTopicSubjects, setRowTopicSubjects] = useState<Record<string, string>>({});

  const diffLevels = [
    { value: 'K', label: 'K — Knows' },
    { value: 'KH', label: 'KH — Knows How' },
    { value: 'S', label: 'S — Shows' },
    { value: 'SH', label: 'SH — Shows How' },
    { value: 'P', label: 'P — Performs' },
  ];

  useEffect(() => {
    topicsService.getSubjects().then(setSubjects).catch(() => {});
  }, []);

  function createEmptyRow(): ContentRow {
    return {
      id: crypto.randomUUID(),
      type: 'BOOK',
      title: '',
      description: '',
      subject: '',
      topic: '',
      difficultyLevel: 'K',
      estimatedDuration: 30,
      file: null,
      tags: '',
      competencyCodes: '',
    };
  }

  const addRow = () => setRows(prev => [...prev, createEmptyRow()]);

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof ContentRow, value: any) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleFileSelect = (id: string, file: File | null) => {
    if (file && file.size > 500 * 1024 * 1024) {
      setError('File size must be less than 500MB');
      return;
    }
    updateRow(id, 'file', file);
  };

  const handleUpload = async () => {
    setError('');
    setResult(null);

    // Validate
    const invalid = rows.filter(r => !r.title || !r.subject || !r.file);
    if (invalid.length > 0) {
      setError(`${invalid.length} row(s) missing required fields (title, subject, or file)`);
      return;
    }

    setUploading(true);
    try {
      const files = rows.map(r => r.file!);
      const metadata = rows.map(r => ({
        type: r.type,
        title: r.title,
        description: r.description || r.title,
        subject: r.subject,
        topic: r.topic,
        difficultyLevel: r.difficultyLevel,
        estimatedDuration: r.estimatedDuration,
        tags: r.tags.split(',').map(t => t.trim()).filter(Boolean),
        competencyCodes: r.competencyCodes ? r.competencyCodes.split(',').map(c => c.trim()).filter(Boolean) : [],
      }));

      const data = await learningUnitService.bulkUploadFiles(files, metadata);
      setResult(data);
      if (data.success > 0 && onSuccess) onSuccess();
      if (data.failed === 0) {
        setRows([createEmptyRow()]);
      }
    } catch (err: any) {
      setError(err.message || 'Bulk upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `type,title,description,subject,topic,difficultyLevel,estimatedDuration,tags
"BOOK","Harrison's Principles of Internal Medicine","Comprehensive medical textbook","Medicine","General Medicine","K","60","medicine,textbook"
"VIDEO","Cardiac Examination Technique","Step by step cardiac exam","Medicine","Cardiovascular System","KH","15","cardiology,clinical-skills"`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--bo-border)',
    fontSize: 13, background: 'var(--bo-card-bg)', color: 'var(--bo-text)',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer',
    appearance: 'none' as const, WebkitAppearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '14px',
    paddingRight: 32,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--bo-text-muted)',
    display: 'block', marginBottom: 6, letterSpacing: '0.03em', textTransform: 'uppercase' as const,
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text)', marginBottom: 4 }}>
            Bulk Content Upload
          </h3>
          <p style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
            Upload multiple E-Books and Videos at once with metadata
          </p>
        </div>
        <button onClick={downloadTemplate} className="bo-btn bo-btn-outline" style={{ fontSize: 12 }}>
          <Download size={14} /> CSV Template
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <X size={14} /> {error}
        </div>
      )}

      {/* Content Rows */}
      {rows.map((row, idx) => (
        <div key={row.id} className="bo-card" style={{ padding: 16, marginBottom: 12, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bo-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bo-primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                {idx + 1}
              </span>
              Content Item
            </div>
            {rows.length > 1 && (
              <button type="button" onClick={() => removeRow(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-danger, #EF4444)', padding: 4 }}>
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, marginBottom: 14 }}>
            {/* Type */}
            <div>
              <label style={labelStyle}>Type *</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['BOOK', 'VIDEO'] as const).map(t => {
                  const isActive = row.type === t;
                  return (
                    <button key={t} type="button" onClick={() => updateRow(row.id, 'type', t)}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: 8,
                        border: `2px solid ${isActive ? '#6366F1' : '#4B5563'}`,
                        background: isActive ? '#6366F1' : '#1F2937',
                        color: isActive ? '#FFFFFF' : '#D1D5DB',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'all 0.2s',
                        boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                      }}>
                      {t === 'BOOK' ? <BookOpen size={14} /> : <Video size={14} />}
                      {t === 'BOOK' ? 'E-Book' : 'Video'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>Title *</label>
              <input
                style={inputStyle}
                value={row.title}
                onChange={e => updateRow(row.id, 'title', e.target.value)}
                placeholder="Enter content title..."
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Topic Search & Competency Mapping */}
          <div style={{ padding: 14, marginBottom: 12, background: 'var(--bo-bg)', border: '1px solid var(--bo-border)', borderRadius: 10 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--bo-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Topic & Competency Mapping
            </h4>
            <TopicSearch
              selectedTopicId={rowTopicIds[row.id]}
              selectedSubject={rowTopicSubjects[row.id] || ''}
              onTopicSelect={(topic: Topic | null) => {
                if (topic) {
                  setRowTopicIds(prev => ({ ...prev, [row.id]: topic.id }));
                  updateRow(row.id, 'topic', topic.name);
                  updateRow(row.id, 'subject', topic.subject);
                  setRowTopicSubjects(prev => ({ ...prev, [row.id]: topic.subject }));
                } else {
                  setRowTopicIds(prev => ({ ...prev, [row.id]: undefined }));
                  updateRow(row.id, 'topic', '');
                }
              }}
              onSubjectSelect={(s: string) => {
                setRowTopicSubjects(prev => ({ ...prev, [row.id]: s }));
                if (s) updateRow(row.id, 'subject', s);
              }}
              onCompetenciesLoad={(comps) => {
                setRowCompetencies(prev => ({ ...prev, [row.id]: comps }));
                const allIds = comps.map(c => c.id);
                setRowSelectedCompIds(prev => ({ ...prev, [row.id]: allIds }));
                const codes = comps.map(c => c.code).join(', ');
                updateRow(row.id, 'competencyCodes', codes);
              }}
              placeholder="Search topics to auto-fill subject & competencies..."
            />
            {(rowCompetencies[row.id] || []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <CompetencySearch
                  competencies={rowCompetencies[row.id] || []}
                  selectedIds={rowSelectedCompIds[row.id] || []}
                  onChange={(ids) => {
                    setRowSelectedCompIds(prev => ({ ...prev, [row.id]: ids }));
                    const selectedComps = (rowCompetencies[row.id] || []).filter(c => ids.includes(c.id));
                    const codes = selectedComps.map(c => c.code).join(', ');
                    updateRow(row.id, 'competencyCodes', codes);
                  }}
                  label="Mapped Competencies (auto-loaded from topic)"
                  maxHeight="250px"
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 100px', gap: 12, marginBottom: 12 }}>
            {/* Subject */}
            <div>
              <label style={labelStyle}>Subject *</label>
              <select
                style={{ ...selectStyle, borderColor: !row.subject ? '#F59E0B40' : 'var(--bo-border)' }}
                value={row.subject}
                onChange={e => updateRow(row.id, 'subject', e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = !row.subject ? '#F59E0B40' : 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Topic (read-only, auto-filled from search) */}
            <div>
              <label style={labelStyle}>Topic</label>
              <input
                style={{ ...inputStyle, background: row.topic ? '#1a1a2e' : 'var(--bo-card-bg)' }}
                value={row.topic}
                onChange={e => updateRow(row.id, 'topic', e.target.value)}
                placeholder="Auto-filled from search above"
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Difficulty */}
            <div>
              <label style={labelStyle}>Difficulty *</label>
              <select
                style={selectStyle}
                value={row.difficultyLevel}
                onChange={e => updateRow(row.id, 'difficultyLevel', e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {diffLevels.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label style={labelStyle}>Min</label>
              <input type="number" style={inputStyle} value={row.estimatedDuration} min={1}
                onChange={e => updateRow(row.id, 'estimatedDuration', Number(e.target.value))}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* File */}
            <div>
              <label style={labelStyle}>
                File * {row.type === 'BOOK' ? '(PDF/EPUB)' : '(MP4/WebM)'}
              </label>
              {row.file ? (
                <div style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #10B981', background: '#F0FDF4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                    ✅ {row.file.name}
                  </span>
                  <button type="button" onClick={() => handleFileSelect(row.id, null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 14, padding: 0 }}>×</button>
                </div>
              ) : (
                <div>
                  <input type="file" ref={el => { fileRefs.current[row.id] = el; }}
                    accept={row.type === 'BOOK' ? '.pdf,.epub' : '.mp4,.webm,.ogg'}
                    onChange={e => handleFileSelect(row.id, e.target.files?.[0] || null)}
                    style={{ display: 'none' }} />
                  <button type="button" onClick={() => fileRefs.current[row.id]?.click()}
                    style={{
                      ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      color: 'var(--bo-text-muted)', border: '1px dashed var(--bo-border)',
                    }}>
                    <Upload size={14} /> Choose file...
                  </button>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label style={labelStyle}>Tags</label>
              <input
                style={inputStyle}
                value={row.tags}
                onChange={e => updateRow(row.id, 'tags', e.target.value)}
                placeholder="e.g. anatomy, NEET"
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add More / Upload */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={addRow} className="bo-btn bo-btn-outline" style={{ fontSize: 13 }}>
          <Plus size={14} /> Add Another Item
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--bo-text-muted)', alignSelf: 'center' }}>
            {rows.length} item{rows.length > 1 ? 's' : ''} ready
          </span>
          <button type="button" onClick={handleUpload} className="bo-btn bo-btn-primary" disabled={uploading}
            style={{ padding: '10px 24px', fontSize: 14 }}>
            {uploading ? 'Uploading...' : `Upload ${rows.length} Item${rows.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bo-card" style={{ padding: 20, marginTop: 20, borderLeft: `4px solid ${result.failed === 0 ? '#10B981' : '#F59E0B'}` }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: result.failed === 0 ? '#10B981' : 'var(--bo-text)' }}>
            {result.failed === 0 ? '✅ All uploaded successfully!' : '⚠️ Upload completed with errors'}
          </h4>
          <div style={{ display: 'flex', gap: 24, marginBottom: result.errors.length > 0 ? 12 : 0 }}>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: '#10B981', fontWeight: 700, fontSize: 20 }}>{result.success}</span>
              <span style={{ color: 'var(--bo-text-muted)', marginLeft: 6 }}>successful</span>
            </div>
            {result.failed > 0 && (
              <div style={{ fontSize: 13 }}>
                <span style={{ color: '#EF4444', fontWeight: 700, fontSize: 20 }}>{result.failed}</span>
                <span style={{ color: 'var(--bo-text-muted)', marginLeft: 6 }}>failed</span>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div style={{ fontSize: 12, color: '#EF4444', maxHeight: 120, overflowY: 'auto', background: 'var(--bo-bg)', padding: 10, borderRadius: 6 }}>
              {result.errors.map((err, i) => <div key={i} style={{ marginBottom: 4 }}>• {err}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkContentUpload;
