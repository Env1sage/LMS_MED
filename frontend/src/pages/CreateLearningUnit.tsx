import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PublisherLayout from '../components/publisher/PublisherLayout';
import TopicSearch from '../components/TopicSearch';
import CompetencySearch from '../components/common/CompetencySearch';
import FileUploadButton from '../components/publisher/FileUploadButton';
import SecurePdfViewer from '../components/SecurePdfViewer';
import learningUnitService, { CreateLearningUnitDto } from '../services/learning-unit.service';
import { LearningUnitType, DeliveryType, DifficultyLevel } from '../types';
import { Topic } from '../services/topics.service';
import { API_BASE_URL } from '../config/api';
import { Save, ArrowLeft, BookOpen, Video, FileText, Eye, Edit2, CheckCircle2, Clock, Shield, Tag, Layers, GraduationCap } from 'lucide-react';
import '../styles/bitflow-owner.css';

interface TopicCompetency {
  id: string;
  code: string;
  title: string;
  description: string;
  domain: string;
  academicLevel: string;
  subject: string;
}

const CreateLearningUnit: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [type, setType] = useState<LearningUnitType>(LearningUnitType.BOOK);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>();
  const [subTopic, setSubTopic] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(DifficultyLevel.K);
  const [estimatedDuration, setEstimatedDuration] = useState(30);
  const [secureAccessUrl, setSecureAccessUrl] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(DeliveryType.EMBED);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [sessionExpiryMinutes, setSessionExpiryMinutes] = useState(30);
  const [tags, setTags] = useState('');

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Competencies
  const [availableCompetencies, setAvailableCompetencies] = useState<TopicCompetency[]>([]);
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<string[]>([]);

  const fileTypeMap: Record<LearningUnitType, 'book' | 'video'> = {
    BOOK: 'book',
    VIDEO: 'video',
    NOTES: 'book',
    MCQ: 'book',
    HANDBOOK: 'book',
    PPT: 'book',
    DOCUMENT: 'book',
  };

  const diffLabels: Record<string, string> = {
    K: 'Knows (Knowledge recall)',
    KH: 'Knows How (Applied knowledge)',
    S: 'Shows (Demonstrates)',
    SH: 'Shows How (Performance)',
    P: 'Performs (Independent practice)',
  };

  const handleTopicSelect = (t: Topic | null) => {
    if (t) {
      setSubject(t.subject);
      setTopic(t.name);
      setSelectedTopicId(t.id);
    } else {
      setTopic('');
      setSelectedTopicId(undefined);
    }
  };

  const handleCompetenciesLoad = (comps: TopicCompetency[]) => {
    setAvailableCompetencies(comps);
    // Auto-select all loaded competencies
    setSelectedCompetencyIds(comps.map(c => c.id));
  };

  const handlePreview = () => {
    setError('');
    if (title.length < 5) { setError('Title must be at least 5 characters'); return; }
    if (description.length < 20) { setError('Description must be at least 20 characters'); return; }
    if (!subject) { setError('Please select a subject via topic search'); return; }
    if (!topic) { setError('Please select a topic'); return; }
    if (!secureAccessUrl) { setError('Please upload a file'); return; }
    setShowPreview(true);
    setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (title.length < 5) { setError('Title must be at least 5 characters'); return; }
    if (description.length < 20) { setError('Description must be at least 20 characters'); return; }
    if (!subject) { setError('Please select a subject via topic search'); return; }
    if (!topic) { setError('Please select a topic'); return; }
    if (!secureAccessUrl) { setError('Please upload a file'); return; }

    try {
      setSaving(true);
      const dto: CreateLearningUnitDto = {
        type,
        title,
        description,
        subject,
        topic,
        subTopic: subTopic || undefined,
        difficultyLevel,
        estimatedDuration,
        competencyIds: selectedCompetencyIds,
        secureAccessUrl,
        deliveryType,
        watermarkEnabled,
        sessionExpiryMinutes,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };

      const created = await learningUnitService.create(dto);
      setSuccess('Learning unit created successfully!');
      setTimeout(() => navigate(`/publisher-admin/view/${created.id}`), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create learning unit');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--bo-border)', fontSize: 14,
    background: 'var(--bo-bg)', color: 'var(--bo-text)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: 'var(--bo-text-secondary)', marginBottom: 6,
  };

  // Content preview helpers
  const getFileUrl = (url: string) => {
    if (url.startsWith('/uploads/')) {
      return `${API_BASE_URL.replace('/api', '')}/api${url}`;
    }
    return url;
  };
  const isPdf = (url: string) => url?.toLowerCase().endsWith('.pdf');
  const isVideoFile = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url) || /youtube\.com|youtu\.be/i.test(url);
  const isLocalFile = (url: string) => url?.startsWith('/uploads/');
  const token = localStorage.getItem('token') || '';

  return (
    <PublisherLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}
            onClick={() => navigate('/publisher-admin/content')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text)' }}>Create Learning Unit</h1>
            <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginTop: 2 }}>
              Upload and configure new educational content
            </p>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#16A34A', fontSize: 14, marginBottom: 16 }}>
            {success}
          </div>
        )}

        {/* ============ FORM ============ */}
        <form onSubmit={e => e.preventDefault()}>
          {/* Content Type */}
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Content Type</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {([
                { value: LearningUnitType.BOOK, label: 'E-Book / PDF', icon: <BookOpen size={24} />, color: '#3B82F6' },
                { value: LearningUnitType.VIDEO, label: 'Video', icon: <Video size={24} />, color: '#8B5CF6' },
              ]).map(opt => (
                <div key={opt.value}
                  onClick={() => { setType(opt.value); setSecureAccessUrl(''); setShowPreview(false); }}
                  style={{
                    padding: 20, borderRadius: 12, border: `2px solid ${type === opt.value ? opt.color : 'var(--bo-border)'}`,
                    background: type === opt.value ? `${opt.color}08` : 'transparent',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                  }}>
                  <div style={{ color: opt.color, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{opt.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: type === opt.value ? opt.color : 'var(--bo-text)' }}>{opt.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Basic Information</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={title} onChange={e => { setTitle(e.target.value); setShowPreview(false); }}
                  placeholder="Enter a descriptive title (min 5 characters)" required minLength={5} />
              </div>
              <div>
                <label style={labelStyle}>Description *</label>
                <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={description}
                  onChange={e => { setDescription(e.target.value); setShowPreview(false); }}
                  placeholder="Detailed description of the content (min 20 characters)" required minLength={20} />
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 4 }}>{description.length}/20 min characters</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Difficulty Level *</label>
                  <select style={inputStyle} value={difficultyLevel}
                    onChange={e => setDifficultyLevel(e.target.value as DifficultyLevel)}>
                    {Object.entries(diffLabels).map(([k, v]) => (
                      <option key={k} value={k}>{k} - {v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Estimated Duration (minutes) *</label>
                  <input type="number" style={inputStyle} value={estimatedDuration}
                    onChange={e => setEstimatedDuration(Number(e.target.value))} min={1} required />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Tags (comma-separated)</label>
                <input style={inputStyle} value={tags} onChange={e => setTags(e.target.value)}
                  placeholder="e.g. anatomy, cardiovascular, MBBS" />
              </div>
            </div>
          </div>

          {/* Topic & Competency */}
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Subject, Topic & Competencies</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Subject & Topic * (from CBME Repository)</label>
              <TopicSearch
                selectedTopicId={selectedTopicId}
                selectedSubject={subject}
                onTopicSelect={handleTopicSelect}
                onSubjectSelect={s => setSubject(s)}
                onCompetenciesLoad={handleCompetenciesLoad}
                required
              />
            </div>
            {subject && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>
                  Selected: <strong>{subject}</strong> → <strong>{topic || 'Select a topic above'}</strong>
                </div>
              </div>
            )}
            <div>
              <label style={labelStyle}>Sub-Topic (optional)</label>
              <input style={inputStyle} value={subTopic} onChange={e => setSubTopic(e.target.value)}
                placeholder="Optional sub-topic within the selected topic" />
            </div>
            {availableCompetencies.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <CompetencySearch
                  competencies={availableCompetencies}
                  selectedIds={selectedCompetencyIds}
                  onChange={setSelectedCompetencyIds}
                  label="Map Competencies (auto-loaded from topic)"
                />
              </div>
            )}
          </div>

          {/* File Upload */}
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Content File</h3>
            <FileUploadButton
              fileType={fileTypeMap[type]}
              onUploadComplete={url => { setSecureAccessUrl(url); setShowPreview(false); }}
              label={`Upload ${type === 'BOOK' ? 'E-Book (PDF/EPUB)' : 'Video (MP4/WebM)'}`}
            />
            {secureAccessUrl && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--bo-success)' }}>
                ✅ File uploaded: {secureAccessUrl.split('/').pop()}
              </div>
            )}
          </div>

          {/* Delivery Settings */}
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Delivery & Security</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Delivery Type</label>
                <select style={inputStyle} value={deliveryType}
                  onChange={e => setDeliveryType(e.target.value as DeliveryType)}>
                  <option value="EMBED">Embed (in-app viewer)</option>
                  <option value="REDIRECT">Redirect (external link)</option>
                  <option value="STREAM">Stream (video streaming)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Session Expiry (minutes)</label>
                <input type="number" style={inputStyle} value={sessionExpiryMinutes}
                  onChange={e => setSessionExpiryMinutes(Number(e.target.value))} min={5} max={480} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={watermarkEnabled}
                  onChange={e => setWatermarkEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 14 }}>Enable watermark protection</span>
              </label>
            </div>
          </div>

          {/* Preview Button */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: showPreview ? 0 : 24 }}>
            <button type="button" className="bo-btn bo-btn-outline" onClick={() => navigate('/publisher-admin/content')}>
              Cancel
            </button>
            <button type="button" className="bo-btn bo-btn-primary" onClick={handlePreview}
              style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={16} /> {showPreview ? 'Refresh Preview' : 'Preview & Create'}
            </button>
          </div>
        </form>

        {/* ============ PREVIEW & CREATE SECTION (below form) ============ */}
        {showPreview && (
          <div ref={previewRef} style={{ marginTop: 32 }}>
            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bo-border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: '#6366F1', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                <Eye size={14} /> Preview
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--bo-border)' }} />
            </div>

            {/* Content Preview — Actual Viewer */}
            <div className="bo-card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: type === LearningUnitType.BOOK ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
                }}>
                  {type === LearningUnitType.BOOK ? <BookOpen size={22} /> : <Video size={22} />}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--bo-text)', margin: 0 }}>{title}</h2>
                  <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                    {subject} • {topic} • {difficultyLevel} Level • {estimatedDuration} min
                  </div>
                </div>
              </div>

              {/* Actual Content Viewer */}
              {secureAccessUrl && isPdf(secureAccessUrl) && isLocalFile(secureAccessUrl) && (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--bo-border)' }}>
                  <SecurePdfViewer
                    url={getFileUrl(secureAccessUrl)}
                    watermarkText={watermarkEnabled ? `${title} - Preview` : ''}
                  />
                </div>
              )}

              {secureAccessUrl && isVideoFile(secureAccessUrl) && isLocalFile(secureAccessUrl) && (
                <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                  <video
                    controls
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ width: '100%', maxHeight: 500, display: 'block' }}
                  >
                    <source src={`${getFileUrl(secureAccessUrl)}?token=${token}`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {secureAccessUrl && !isLocalFile(secureAccessUrl) && (
                <div style={{ padding: 20, background: 'var(--bo-bg)', borderRadius: 10, border: '1px solid var(--bo-border)', textAlign: 'center' }}>
                  <FileText size={32} style={{ color: 'var(--bo-text-muted)', marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>External content: {secureAccessUrl}</div>
                </div>
              )}

              {/* Description */}
              <div style={{ padding: 14, background: 'var(--bo-bg)', borderRadius: 10, border: '1px solid var(--bo-border)', marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Description</div>
                <p style={{ fontSize: 14, color: 'var(--bo-text)', lineHeight: 1.7, margin: 0 }}>{description}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="bo-card" style={{ padding: 24, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={16} style={{ color: '#6366F1' }} /> Content Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Subject', value: subject, color: '#3B82F6' },
                  { label: 'Topic', value: topic, color: '#10B981' },
                  { label: 'Sub-Topic', value: subTopic || '—', color: '#6B7280' },
                  { label: 'Difficulty', value: `${difficultyLevel} — ${diffLabels[difficultyLevel]?.split('(')[0]?.trim() || ''}`, color: '#F59E0B' },
                  { label: 'Duration', value: `${estimatedDuration} min`, color: '#8B5CF6' },
                  { label: 'Delivery', value: deliveryType === 'EMBED' ? 'Embed' : deliveryType === 'REDIRECT' ? 'Redirect' : 'Stream', color: '#EC4899' },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: 12, borderRadius: 10, border: '1px solid var(--bo-border)', background: 'var(--bo-bg)',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: item.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Competencies + Tags + Security in a row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Competencies */}
              {selectedCompetencyIds.length > 0 && (
                <div className="bo-card" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GraduationCap size={14} style={{ color: '#6366F1' }} /> Competencies ({selectedCompetencyIds.length})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {availableCompetencies
                      .filter(c => selectedCompetencyIds.includes(c.id))
                      .map(comp => (
                        <span key={comp.id} style={{
                          padding: '4px 10px', borderRadius: 14, fontSize: 12, fontWeight: 600,
                          background: '#E0E7FF', color: '#3730A3', border: '1px solid #C7D2FE',
                        }}>
                          {comp.code}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Security */}
              <div className="bo-card" style={{ padding: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={14} style={{ color: '#6366F1' }} /> Security
                </h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--bo-text-muted)' }}>Watermark</span>
                    <span style={{ fontWeight: 600, color: watermarkEnabled ? '#10B981' : '#EF4444' }}>
                      {watermarkEnabled ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--bo-text-muted)' }}>Session Expiry</span>
                    <span style={{ fontWeight: 600, color: 'var(--bo-text)' }}>{sessionExpiryMinutes} min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            {tags && (
              <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <Tag size={14} style={{ color: '#6366F1', marginTop: 2 }} />
                  {tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                    <span key={i} style={{
                      padding: '4px 12px', borderRadius: 14, fontSize: 12, fontWeight: 500,
                      background: '#6366F1', color: '#fff',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Create Button */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 32 }}>
              <button type="button" className="bo-btn bo-btn-primary" disabled={saving}
                onClick={(e) => handleSubmit(e as any)}
                style={{ padding: '14px 32px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12 }}>
                <CheckCircle2 size={20} /> {saving ? 'Creating...' : 'Create Learning Unit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </PublisherLayout>
  );
};

export default CreateLearningUnit;
