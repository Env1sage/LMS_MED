import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import FileUploadButton from '../../components/publisher/FileUploadButton';
import governanceService from '../../services/governance.service';
import { BookOpen, CheckCircle, ArrowLeft } from 'lucide-react';
import '../../styles/bitflow-owner.css';

const SUBJECTS = [
  'Anatomy','Physiology','Biochemistry','Pharmacology','Pathology',
  'Microbiology','Forensic Medicine','Community Medicine','Medicine',
  'Surgery','Obstetrics & Gynaecology','Paediatrics','Orthopaedics',
  'Ophthalmology','ENT','Dermatology','Psychiatry','Radiology','Anaesthesia',
];
const LU_TYPES = ['BOOK','VIDEO','NOTES','PPT','DOCUMENT','HANDBOOK'];
const DIFFICULTY = [
  { value: 'K', label: 'K — Knows (Basic recall)' },
  { value: 'KH', label: 'KH — Knows How (Applied)' },
  { value: 'S', label: 'S — Shows (Simulated)' },
  { value: 'SH', label: 'SH — Shows How (Competent)' },
  { value: 'P', label: 'P — Performs (Independent)' },
];
const ACAD_YEARS = [
  { value: 'YEAR_1', label: 'Year 1' },
  { value: 'YEAR_2', label: 'Year 2' },
  { value: 'YEAR_3_PART1', label: 'Year 3 Part 1' },
  { value: 'YEAR_3_PART2', label: 'Year 3 Part 2' },
  { value: 'INTERNSHIP', label: 'Internship' },
];
const DELIVERY = ['REDIRECT', 'EMBED', 'STREAM'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: '1px solid var(--bo-border)',
  borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block',
};

const FacultyCreateLearningUnit: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('task');

  const [form, setForm] = useState({
    type: 'NOTES',
    title: '',
    description: '',
    subject: '',
    topic: '',
    subTopic: '',
    academicYear: 'YEAR_1',
    difficultyLevel: 'K',
    estimatedDuration: '30',
    contentUrl: '',
    deliveryType: 'REDIRECT',
    watermarkEnabled: 'false',
    sessionExpiryMinutes: '60',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.subject || !form.contentUrl.trim()) {
      setError('Please fill in all required fields: Title, Description, Subject, Content URL');
      return;
    }
    if (form.description.trim().length < 20) {
      setError('Description must be at least 20 characters');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await governanceService.createDraftUnit({
        ...form,
        estimatedDuration: parseInt(form.estimatedDuration) || 30,
        sessionExpiryMinutes: parseInt(form.sessionExpiryMinutes) || 60,
        watermarkEnabled: form.watermarkEnabled === 'true',
      });
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <FacultyLayout>
        <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="#059669" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Learning Unit Saved as Draft</h2>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginBottom: 28 }}>
            Your learning unit has been saved as a draft. Go back to your tasks, select this draft from the dropdown, and submit it to your HOD for review.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => navigate(taskId ? `/faculty/tasks` : '/faculty/tasks')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              <ArrowLeft size={16} /> Back to Tasks
            </button>
          </div>
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => navigate('/faculty/tasks')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--bo-border)', background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--bo-text-secondary)' }}
          >
            <ArrowLeft size={14} /> Back to Tasks
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>
              <BookOpen size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              Create Learning Unit (Draft for HOD)
            </h1>
            {taskId && (
              <p style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                This draft will be available to attach to your assigned task
              </p>
            )}
          </div>
        </div>

        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1E40AF' }}>
          Create a complete learning unit below. It will be saved as a <strong>Draft</strong> — your HOD will review and publish it under their name.
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bo-card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--bo-text-primary)' }}>Basic Information</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Content Type *</label>
                <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
                  {LU_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Subject *</label>
                <select value={form.subject} onChange={e => set('subject', e.target.value)}
                  style={{ ...inputStyle, borderColor: !form.subject ? '#EF4444' : undefined }}>
                  <option value="">-- Select Subject --</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Title *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} required
                placeholder="e.g. Upper Limb Anatomy — Brachial Plexus"
                style={{ ...inputStyle, borderColor: !form.title.trim() ? '#EF4444' : undefined }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Description * (min 20 characters)</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} required rows={3}
                placeholder="Detailed description of what this content covers…"
                style={{ ...inputStyle, resize: 'vertical', borderColor: form.description.length > 0 && form.description.length < 20 ? '#EF4444' : undefined }} />
              {form.description.length > 0 && form.description.length < 20 && (
                <p style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{20 - form.description.length} more characters needed</p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Topic</label>
                <input value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="e.g. Upper Limb" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Sub-Topic</label>
                <input value={form.subTopic} onChange={e => set('subTopic', e.target.value)} placeholder="e.g. Brachial Plexus" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Academic Year *</label>
                <select value={form.academicYear} onChange={e => set('academicYear', e.target.value)} style={inputStyle}>
                  {ACAD_YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Difficulty Level *</label>
                <select value={form.difficultyLevel} onChange={e => set('difficultyLevel', e.target.value)} style={inputStyle}>
                  {DIFFICULTY.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Est. Duration (min)</label>
                <input type="number" value={form.estimatedDuration} onChange={e => set('estimatedDuration', e.target.value)} min="1" style={inputStyle} />
              </div>
            </div>
          </div>

          <div className="bo-card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--bo-text-primary)' }}>Content & Delivery</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Upload Content File *</label>
              <FileUploadButton
                fileType={form.type === 'VIDEO' ? 'video' : form.type === 'BOOK' ? 'book' : form.type === 'PPT' ? 'ppt' : 'document'}
                onUploadComplete={url => set('contentUrl', url)}
                label={`Upload ${form.type}`}
              />
              {form.contentUrl && (
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 4 }}>
                  URL: <code style={{ fontSize: 11 }}>{form.contentUrl}</code>
                </div>
              )}
              {!form.contentUrl && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ ...labelStyle, fontWeight: 400 }}>Or enter URL manually</label>
                  <input value={form.contentUrl} onChange={e => set('contentUrl', e.target.value)}
                    placeholder="https://… or /uploads/..."
                    style={{ ...inputStyle, borderColor: !form.contentUrl.trim() ? '#EF4444' : undefined }} />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Delivery Type</label>
                <select value={form.deliveryType} onChange={e => set('deliveryType', e.target.value)} style={inputStyle}>
                  {DELIVERY.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Watermark</label>
                <select value={form.watermarkEnabled} onChange={e => set('watermarkEnabled', e.target.value)} style={inputStyle}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Session Expiry (min)</label>
                <input type="number" value={form.sessionExpiryMinutes} onChange={e => set('sessionExpiryMinutes', e.target.value)} min="10" style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => navigate('/faculty/tasks')} className="bo-btn bo-btn-outline" disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 28px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              <BookOpen size={16} /> {saving ? 'Saving Draft…' : 'Save as Draft'}
            </button>
          </div>
        </form>
      </div>
    </FacultyLayout>
  );
};

export default FacultyCreateLearningUnit;
