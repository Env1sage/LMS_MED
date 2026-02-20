import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PublisherLayout from '../components/publisher/PublisherLayout';
import TopicSearch from '../components/TopicSearch';
import CompetencySearch from '../components/common/CompetencySearch';
import FileUploadButton from '../components/publisher/FileUploadButton';
import learningUnitService, { UpdateLearningUnitDto } from '../services/learning-unit.service';
import { LearningUnit, LearningUnitType, DeliveryType, DifficultyLevel } from '../types';
import { Topic } from '../services/topics.service';
import { Save, ArrowLeft, BookOpen, Video, FileText } from 'lucide-react';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

interface TopicCompetency {
  id: string;
  code: string;
  title: string;
  description: string;
  domain: string;
  academicLevel: string;
  subject: string;
}

const EditLearningUnit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [original, setOriginal] = useState<LearningUnit | null>(null);

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

  // Competencies
  const [availableCompetencies, setAvailableCompetencies] = useState<TopicCompetency[]>([]);
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<string[]>([]);

  useEffect(() => {
    if (id) loadUnit();
  }, [id]);

  const loadUnit = async () => {
    try {
      setLoading(true);
      const unit = await learningUnitService.getById(id!);
      setOriginal(unit);
      // Populate form
      setType(unit.type);
      setTitle(unit.title);
      setDescription(unit.description);
      setSubject(unit.subject);
      setTopic(unit.topic);
      setSubTopic(unit.subTopic || '');
      setDifficultyLevel(unit.difficultyLevel);
      setEstimatedDuration(unit.estimatedDuration);
      setSecureAccessUrl(unit.secureAccessUrl);
      setDeliveryType(unit.deliveryType);
      setWatermarkEnabled(unit.watermarkEnabled);
      setSessionExpiryMinutes(unit.sessionExpiryMinutes);
      setTags(unit.tags?.join(', ') || '');
      setSelectedCompetencyIds(unit.competencyIds || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load learning unit');
    } finally {
      setLoading(false);
    }
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (title.length < 5) { setError('Title must be at least 5 characters'); return; }
    if (description.length < 20) { setError('Description must be at least 20 characters'); return; }

    try {
      setSaving(true);
      const dto: UpdateLearningUnitDto = {
        title,
        description,
        subject,
        topic,
        subTopic: subTopic || undefined,
        difficultyLevel,
        estimatedDuration,
        competencyIds: selectedCompetencyIds,
        deliveryType,
        watermarkEnabled,
        sessionExpiryMinutes,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      // Only include secureAccessUrl if changed
      if (secureAccessUrl !== original?.secureAccessUrl) {
        dto.secureAccessUrl = secureAccessUrl;
      }

      await learningUnitService.update(id!, dto);
      setSuccess('Learning unit updated successfully!');
      setTimeout(() => navigate(`/publisher-admin/view/${id}`), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const fileTypeMap: Record<LearningUnitType, 'book' | 'video'> = {
    BOOK: 'book', VIDEO: 'video', NOTES: 'book', MCQ: 'book',
    HANDBOOK: 'book', PPT: 'book', DOCUMENT: 'book',
  };

  const diffLabels: Record<string, string> = {
    K: 'Knows (Knowledge recall)', KH: 'Knows How (Applied knowledge)',
    S: 'Shows (Demonstrates)', SH: 'Shows How (Performance)', P: 'Performs (Independent practice)',
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

  if (loading) return (
    <PublisherLayout>
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
        <div className="loading-title">Loading Editor</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </PublisherLayout>
  );

  if (error && !original) return (
    <PublisherLayout>
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 16, color: 'var(--bo-danger)', marginBottom: 12 }}>{error}</div>
        <button className="bo-btn bo-btn-outline" onClick={() => navigate('/publisher-admin/content')}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    </PublisherLayout>
  );

  return (
    <PublisherLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}
            onClick={() => navigate(`/publisher-admin/view/${id}`)}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text)' }}>Edit Learning Unit</h1>
            <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginTop: 2 }}>
              Editing: {original?.title}
            </p>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 14, marginBottom: 16 }}>{error}</div>
        )}
        {success && (
          <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#16A34A', fontSize: 14, marginBottom: 16 }}>{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Content Type (read-only) */}
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Content Type</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--bo-bg)', borderRadius: 8 }}>
              {type === 'BOOK' && <BookOpen size={20} style={{ color: '#3B82F6' }} />}
              {type === 'VIDEO' && <Video size={20} style={{ color: '#8B5CF6' }} />}
              <span style={{ fontSize: 14, fontWeight: 600 }}>{type === 'BOOK' ? 'E-Book' : type}</span>
              <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>(cannot be changed)</span>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Basic Information</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
                  required minLength={5} />
              </div>
              <div>
                <label style={labelStyle}>Description *</label>
                <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={description}
                  onChange={e => setDescription(e.target.value)} required minLength={20} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Difficulty Level</label>
                  <select style={inputStyle} value={difficultyLevel}
                    onChange={e => setDifficultyLevel(e.target.value as DifficultyLevel)}>
                    {Object.entries(diffLabels).map(([k, v]) => (
                      <option key={k} value={k}>{k} - {v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Duration (minutes)</label>
                  <input type="number" style={inputStyle} value={estimatedDuration}
                    onChange={e => setEstimatedDuration(Number(e.target.value))} min={1} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Tags (comma-separated)</label>
                <input style={inputStyle} value={tags} onChange={e => setTags(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Topic & Competency */}
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Subject, Topic & Competencies</h3>
            <div style={{ marginBottom: 12, padding: 10, background: 'var(--bo-bg)', borderRadius: 8, fontSize: 13 }}>
              Current: <strong>{subject}</strong> → <strong>{topic}</strong>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Change Topic (search below)</label>
              <TopicSearch
                selectedTopicId={selectedTopicId}
                selectedSubject={subject}
                onTopicSelect={handleTopicSelect}
                onSubjectSelect={s => setSubject(s)}
                onCompetenciesLoad={handleCompetenciesLoad}
              />
            </div>
            <div>
              <label style={labelStyle}>Sub-Topic</label>
              <input style={inputStyle} value={subTopic} onChange={e => setSubTopic(e.target.value)} />
            </div>
            {availableCompetencies.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <CompetencySearch
                  competencies={availableCompetencies}
                  selectedIds={selectedCompetencyIds}
                  onChange={setSelectedCompetencyIds}
                  label="Competency Mapping"
                />
              </div>
            )}
            {selectedCompetencyIds.length > 0 && availableCompetencies.length === 0 && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--bo-text-muted)' }}>
                {selectedCompetencyIds.length} competencies currently mapped. Select a topic above to manage mappings.
              </div>
            )}
          </div>

          {/* File Upload */}
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Content File</h3>
            {secureAccessUrl && (
              <div style={{ padding: 12, background: 'var(--bo-bg)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                Current file: <span style={{ color: 'var(--bo-primary)', wordBreak: 'break-all' }}>{secureAccessUrl}</span>
              </div>
            )}
            <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 12 }}>
              Upload a new file to replace the current one, or leave as is.
            </p>
            <FileUploadButton
              fileType={fileTypeMap[type]}
              onUploadComplete={url => { if (url) setSecureAccessUrl(url); }}
              label="Upload Replacement File"
            />
          </div>

          {/* Delivery */}
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Delivery & Security</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Delivery Type</label>
                <select style={inputStyle} value={deliveryType}
                  onChange={e => setDeliveryType(e.target.value as DeliveryType)}>
                  <option value="EMBED">Embed</option>
                  <option value="REDIRECT">Redirect</option>
                  <option value="STREAM">Stream</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Session Expiry (min)</label>
                <input type="number" style={inputStyle} value={sessionExpiryMinutes}
                  onChange={e => setSessionExpiryMinutes(Number(e.target.value))} min={5} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={watermarkEnabled}
                  onChange={e => setWatermarkEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 14 }}>Enable watermark</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="bo-btn bo-btn-outline"
              onClick={() => navigate(`/publisher-admin/view/${id}`)}>Cancel</button>
            <button type="submit" className="bo-btn bo-btn-primary" disabled={saving}
              style={{ padding: '10px 24px' }}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </PublisherLayout>
  );
};

export default EditLearningUnit;
