import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import learningUnitService from '../services/learning-unit.service';
import { API_BASE_URL } from '../config/api';
import { LearningUnit, LearningUnitType, DeliveryType, DifficultyLevel } from '../types';

const EditLearningUnit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [unit, setUnit] = useState<LearningUnit | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    secureAccessUrl: '',
    deliveryType: DeliveryType.EMBED,
    watermarkEnabled: true,
    sessionExpiryMinutes: 30,
    difficultyLevel: DifficultyLevel.K,
    estimatedDuration: 30,
  });

  useEffect(() => {
    if (id) {
      loadUnit();
    }
  }, [id]);

  const loadUnit = async () => {
    try {
      setLoading(true);
      const data = await learningUnitService.getById(id!);
      setUnit(data);
      setFormData({
        title: data.title,
        description: data.description,
        secureAccessUrl: data.secureAccessUrl || '',
        deliveryType: data.deliveryType,
        watermarkEnabled: data.watermarkEnabled,
        sessionExpiryMinutes: data.sessionExpiryMinutes || 30,
        difficultyLevel: data.difficultyLevel,
        estimatedDuration: data.estimatedDuration,
      });
      if (data.secureAccessUrl) {
        setUploadedFile({ name: 'Current content', url: data.secureAccessUrl });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load learning unit');
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (): 'book' | 'video' | 'note' | 'image' => {
    switch (unit?.type) {
      case LearningUnitType.VIDEO: return 'video';
      case LearningUnitType.NOTES: return 'note';
      default: return 'book';
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE_URL}/learning-units/upload?type=${getFileType()}`,
        formDataUpload,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          }
        }
      );
      const url = response.data.url;
      setUploadedFile({ name: file.name, url });
      setFormData(prev => ({ ...prev, secureAccessUrl: url }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setFormData(prev => ({ ...prev, secureAccessUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (formData.description.length < 20) {
      setError('Description must be at least 20 characters');
      setSaving(false);
      return;
    }

    try {
      await learningUnitService.update(id!, formData);
      setSuccess(true);
      setTimeout(() => navigate(`/publisher-admin/view/${id}`), 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      padding: '24px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '32px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '600',
      color: '#f8fafc',
      margin: 0,
    },
    backButton: {
      padding: '8px 16px',
      background: 'transparent',
      border: '1px solid #475569',
      borderRadius: '8px',
      color: '#94a3b8',
      cursor: 'pointer',
      fontSize: '14px',
    },
    form: {
      maxWidth: '800px',
      margin: '0 auto',
    },
    card: {
      background: '#1e293b',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#f8fafc',
      marginBottom: '16px',
      paddingBottom: '12px',
      borderBottom: '1px solid #334155',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '500',
      color: '#cbd5e1',
    },
    input: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: '#e2e8f0',
      fontSize: '14px',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: '#e2e8f0',
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical' as const,
    },
    select: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: '#e2e8f0',
      fontSize: '14px',
    },
    dropzone: {
      border: '2px dashed',
      borderColor: dragActive ? '#c47335' : '#475569',
      borderRadius: '12px',
      padding: '32px',
      textAlign: 'center' as const,
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: dragActive ? 'rgba(196, 115, 53, 0.1)' : 'transparent',
    },
    uploadedFile: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      backgroundColor: 'rgba(196, 115, 53, 0.1)',
      border: '1px solid rgba(196, 115, 53, 0.3)',
      borderRadius: '8px',
      marginTop: '12px',
    },
    removeButton: {
      padding: '4px 8px',
      background: '#ef4444',
      border: 'none',
      borderRadius: '4px',
      color: 'white',
      cursor: 'pointer',
      fontSize: '12px',
    },
    error: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#fca5a5',
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '24px',
    },
    success: {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      color: '#86efac',
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '24px',
    },
    submitButton: {
      width: '100%',
      padding: '14px',
      background: 'linear-gradient(135deg, #c47335 0%, #a65d28 100%)',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '8px',
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
    },
    info: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '13px',
      color: '#93c5fd',
      marginBottom: '16px',
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Learning unit not found</div>
        <button onClick={() => navigate('/publisher-admin')} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Edit Learning Unit</h1>
        <button 
          onClick={() => navigate(`/publisher-admin/view/${id}`)} 
          style={styles.backButton}
        >
          ← Cancel
        </button>
      </div>

      <form style={styles.form} onSubmit={handleSubmit}>
        {error && <div style={styles.error}>❌ {error}</div>}
        {success && <div style={styles.success}>✅ Updated successfully! Redirecting...</div>}

        {/* Basic Info */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Basic Information</h2>
          
          <div style={styles.info}>
            <strong>Type:</strong> {unit.type} | <strong>Subject:</strong> {unit.subject} | <strong>Topic:</strong> {unit.topic}
            <br/><small>These fields cannot be changed after creation.</small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description * (min 20 characters)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              style={styles.textarea}
              required
            />
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Difficulty Level</label>
              <select
                value={formData.difficultyLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, difficultyLevel: e.target.value as DifficultyLevel }))}
                style={styles.select}
              >
                {Object.values(DifficultyLevel).map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Estimated Duration (minutes)</label>
              <input
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 30 }))}
                style={styles.input}
                min={1}
              />
            </div>
          </div>
        </div>

        {/* Content Upload */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>📎 Content File / URL</h2>
          
          <div 
            style={styles.dropzone}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,.mov,.avi,.jpg,.jpeg,.png,.gif"
            />
            {uploading ? (
              <div>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                <div>Uploading...</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                  Drop file here or click to upload
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Supports PDF, DOC, PPT, MP4, images
                </div>
              </>
            )}
          </div>

          {uploadedFile && (
            <div style={styles.uploadedFile}>
              <div>
                <strong>📄 {uploadedFile.name}</strong>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  {uploadedFile.url}
                </div>
              </div>
              <button type="button" onClick={removeUploadedFile} style={styles.removeButton}>
                ✕ Remove
              </button>
            </div>
          )}

          <div style={{ margin: '16px 0', textAlign: 'center', color: '#64748b' }}>— OR —</div>

          <div style={styles.formGroup}>
            <label style={styles.label}>External Content URL</label>
            <input
              type="url"
              value={formData.secureAccessUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, secureAccessUrl: e.target.value }))}
              style={styles.input}
              placeholder="https://example.com/content.pdf"
            />
          </div>
        </div>

        {/* Delivery Settings */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>⚙️ Delivery Settings</h2>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Delivery Type</label>
              <select
                value={formData.deliveryType}
                onChange={(e) => setFormData(prev => ({ ...prev, deliveryType: e.target.value as DeliveryType }))}
                style={styles.select}
              >
                <option value={DeliveryType.EMBED}>Embed (iframe)</option>
                <option value={DeliveryType.REDIRECT}>Redirect (new tab)</option>
                <option value={DeliveryType.STREAM}>Stream (video)</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Session Expiry (minutes)</label>
              <input
                type="number"
                value={formData.sessionExpiryMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, sessionExpiryMinutes: parseInt(e.target.value) || 30 }))}
                style={styles.input}
                min={5}
                max={480}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={formData.watermarkEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, watermarkEnabled: e.target.checked }))}
              />
              Enable Watermark for Preview
            </label>
          </div>
        </div>

        {/* Submit */}
        <button 
          type="submit" 
          style={{
            ...styles.submitButton,
            opacity: saving ? 0.6 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
          disabled={saving}
        >
          {saving ? '⏳ Saving...' : '💾 Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default EditLearningUnit;
