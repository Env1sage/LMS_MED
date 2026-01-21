import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import learningUnitService from '../services/learning-unit.service';
import competencyService from '../services/competency.service';
import FileUploadButton from '../components/publisher/FileUploadButton';
import CompetencySearch from '../components/common/CompetencySearch';
import {
  LearningUnitType,
  DeliveryType,
  DifficultyLevel,
  Competency,
  CompetencyStatus,
} from '../types';
import '../styles/CreateLearningUnit.css';

const CreateLearningUnit: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  
  const [formData, setFormData] = useState({
    type: LearningUnitType.BOOK,
    title: '',
    description: '',
    subject: '',
    topic: '',
    subTopic: '',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    estimatedDuration: 30,
    competencyIds: [] as string[],
    secureAccessUrl: '',
    deliveryType: DeliveryType.REDIRECT,
    watermarkEnabled: true,
    sessionExpiryMinutes: 30,
    maxAttempts: undefined as number | undefined,
    timeLimit: undefined as number | undefined,
    tags: [] as string[],
  });

  useEffect(() => {
    loadCompetencies();
  }, []);

  const loadCompetencies = async () => {
    try {
      const response = await competencyService.getAll({ status: CompetencyStatus.ACTIVE, limit: 5000 });
      setCompetencies(response.data);
    } catch (err) {
      console.error('Failed to load competencies:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await learningUnitService.create(formData);
      navigate('/publisher-admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create learning unit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-learning-unit">
      <div className="page-header">
        <h1>Create Learning Unit</h1>
        <button onClick={() => navigate('/publisher-admin')} className="btn-secondary">
          ← Back to Dashboard
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="learning-unit-form">
        <div className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-group">
            <label>Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as LearningUnitType })}
              required
            >
              <option value={LearningUnitType.BOOK}>📚 Book Chapter</option>
              <option value={LearningUnitType.VIDEO}>🎥 Video</option>
              <option value={LearningUnitType.MCQ}>✅ MCQ Set</option>
              <option value={LearningUnitType.NOTES}>📝 Notes</option>
            </select>
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Cardiovascular System Anatomy"
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              placeholder="Detailed description of the learning unit..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                placeholder="e.g., Anatomy"
              />
            </div>

            <div className="form-group">
              <label>Topic *</label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                required
                placeholder="e.g., Cardiovascular System"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Sub-Topic</label>
            <input
              type="text"
              value={formData.subTopic}
              onChange={(e) => setFormData({ ...formData, subTopic: e.target.value })}
              placeholder="e.g., Heart Anatomy (Optional)"
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Learning Parameters</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Difficulty Level *</label>
              <select
                value={formData.difficultyLevel}
                onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value as DifficultyLevel })}
                required
              >
                <option value={DifficultyLevel.BEGINNER}>Beginner</option>
                <option value={DifficultyLevel.INTERMEDIATE}>Intermediate</option>
                <option value={DifficultyLevel.ADVANCED}>Advanced</option>
              </select>
            </div>

            <div className="form-group">
              <label>Estimated Duration (minutes) *</label>
              <input
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) })}
                required
                min="1"
              />
            </div>
          </div>

          {formData.type === LearningUnitType.MCQ && (
            <div className="form-row">
              <div className="form-group">
                <label>Max Attempts</label>
                <input
                  type="number"
                  value={formData.maxAttempts || ''}
                  onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value ? parseInt(e.target.value) : undefined })}
                  min="1"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div className="form-group">
                <label>Time Limit (minutes)</label>
                <input
                  type="number"
                  value={formData.timeLimit || ''}
                  onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                  min="1"
                  placeholder="Leave empty for no limit"
                />
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>Secure Access Configuration</h2>
          
          <div className="info-box" style={{
            background: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: '4px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <strong>ℹ️ Important: Content Hosting</strong>
            <p style={{margin: '10px 0 0 0', fontSize: '14px'}}>
              Bitflow does NOT store your content files. You must host videos, PDFs, MCQs, etc. on YOUR OWN servers or CDN. 
              The URL below should point to your externally-hosted content. Bitflow will generate secure access tokens 
              to control who can view your content and track usage analytics.
            </p>
            <p style={{margin: '10px 0 0 0', fontSize: '13px', color: '#555'}}>
              Examples: Your CDN, Vimeo Private, AWS S3, Archive.org, Google Drive (with proper sharing), or your own content server.
            </p>
          </div>

          {/* File Upload Section */}
          {formData.type === LearningUnitType.BOOK && (
            <FileUploadButton
              fileType="book"
              onUploadComplete={(url) => setFormData({ ...formData, secureAccessUrl: url })}
              label="Upload Book File (Optional)"
            />
          )}

          {formData.type === LearningUnitType.VIDEO && (
            <FileUploadButton
              fileType="video"
              onUploadComplete={(url) => setFormData({ ...formData, secureAccessUrl: url })}
              label="Upload Video File (Optional)"
            />
          )}

          {formData.type === LearningUnitType.NOTES && (
            <FileUploadButton
              fileType="note"
              onUploadComplete={(url) => setFormData({ ...formData, secureAccessUrl: url })}
              label="Upload Notes File (Optional)"
            />
          )}

          <div className="form-group">
            <label>Secure Access URL * (Publisher-hosted)</label>
            <input
              type="url"
              value={formData.secureAccessUrl}
              onChange={(e) => setFormData({ ...formData, secureAccessUrl: e.target.value })}
              required
              placeholder="https://publisher.com/content/... or use file upload above"
            />
            <small>URL to your externally hosted content. You can upload directly above or provide your own URL.</small>
          </div>

          <div className="form-group">
            <label>Delivery Type *</label>
            <select
              value={formData.deliveryType}
              onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value as DeliveryType })}
              required
            >
              <option value={DeliveryType.REDIRECT}>Redirect (opens in new window)</option>
              <option value={DeliveryType.EMBED}>Embed (iframe within platform)</option>
              <option value={DeliveryType.STREAM}>Stream (for videos with HLS/DASH)</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.watermarkEnabled}
                  onChange={(e) => setFormData({ ...formData, watermarkEnabled: e.target.checked })}
                />
                <span>Enable Watermarking</span>
              </label>
              <small>Recommended for security. Shows student name/ID on content.</small>
            </div>

            <div className="form-group">
              <label>Session Expiry (minutes) *</label>
              <input
                type="number"
                value={formData.sessionExpiryMinutes}
                onChange={(e) => setFormData({ ...formData, sessionExpiryMinutes: parseInt(e.target.value) })}
                required
                min="5"
                max="180"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Competency Mapping</h2>
          <CompetencySearch
            competencies={competencies}
            selectedIds={formData.competencyIds}
            onChange={(selectedIds) => setFormData({ ...formData, competencyIds: selectedIds })}
            label="Select MCI Competencies"
            placeholder="Search by competency code or description..."
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/publisher-admin')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Learning Unit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateLearningUnit;
