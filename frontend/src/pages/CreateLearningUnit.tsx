import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import learningUnitService from '../services/learning-unit.service';
import competencyService from '../services/competency.service';
import { API_BASE_URL } from '../config/api';
import {
  LearningUnitType,
  DeliveryType,
  DifficultyLevel,
  Competency,
  CompetencyStatus,
} from '../types';

const CreateLearningUnit: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [competencySearch, setCompetencySearch] = useState('');
  const [showCompetencyDropdown, setShowCompetencyDropdown] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
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
  });

  useEffect(() => {
    loadCompetencies();
  }, []);

  const loadCompetencies = async () => {
    try {
      const response = await competencyService.getAll({ status: CompetencyStatus.ACTIVE, limit: 5000 });
      setCompetencies(response.data || []);
    } catch (err) {
      console.error('Failed to load competencies:', err);
    }
  };

  // File upload handlers
  const getFileType = (): 'book' | 'video' | 'note' | 'image' => {
    switch (formData.type) {
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
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFormData(prev => ({ ...prev, secureAccessUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.description.length < 20) {
      setError('Description must be at least 20 characters');
      setLoading(false);
      return;
    }

    if (!formData.secureAccessUrl) {
      setError('Please upload a file or enter an external content URL');
      setLoading(false);
      return;
    }

    try {
      await learningUnitService.create(formData);
      setSuccess(true);
      setTimeout(() => navigate('/publisher-admin'), 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompetencies = competencies.filter(c =>
    c.code.toLowerCase().includes(competencySearch.toLowerCase()) ||
    c.title.toLowerCase().includes(competencySearch.toLowerCase()) ||
    c.subject.toLowerCase().includes(competencySearch.toLowerCase())
  ).slice(0, 10);

  const toggleCompetency = (id: string) => {
    setFormData(prev => ({
      ...prev,
      competencyIds: prev.competencyIds.includes(id)
        ? prev.competencyIds.filter(cid => cid !== id)
        : [...prev.competencyIds, id]
    }));
  };

  const selectedCompetencies = competencies.filter(c => formData.competencyIds.includes(c.id));

  // Styles
  const styles: Record<string, React.CSSProperties> = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    header: {
      background: '#1e293b',
      padding: '20px 40px',
      borderBottom: '1px solid #334155',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      margin: 0,
      fontSize: '22px',
      fontWeight: 600,
      color: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    backBtn: {
      padding: '10px 20px',
      background: 'transparent',
      border: '1px solid #475569',
      borderRadius: '8px',
      color: '#94a3b8',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    main: {
      padding: '30px 40px',
      maxWidth: '900px',
      margin: '0 auto',
    },
    alert: {
      padding: '15px 20px',
      borderRadius: '10px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    alertError: {
      background: '#7f1d1d',
      border: '1px solid #991b1b',
      color: '#fecaca',
    },
    alertSuccess: {
      background: '#14532d',
      border: '1px solid #166534',
      color: '#bbf7d0',
    },
    section: {
      background: '#1e293b',
      borderRadius: '12px',
      border: '1px solid #334155',
      marginBottom: '20px',
      overflow: 'hidden',
    },
    sectionHeader: {
      padding: '15px 20px',
      borderBottom: '1px solid #334155',
      background: '#0f172a',
    },
    sectionTitle: {
      margin: 0,
      fontSize: '16px',
      fontWeight: 600,
      color: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    sectionBody: {
      padding: '20px',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '20px',
    },
    formGroup: {
      marginBottom: '0',
    },
    formGroupFull: {
      gridColumn: '1 / -1',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '13px',
      fontWeight: 600,
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    input: {
      width: '100%',
      padding: '12px 15px',
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: '#f8fafc',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '12px 15px',
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: '#f8fafc',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
    },
    textarea: {
      width: '100%',
      padding: '12px 15px',
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: '#f8fafc',
      fontSize: '14px',
      outline: 'none',
      resize: 'vertical',
      minHeight: '100px',
      boxSizing: 'border-box',
    },
    hint: {
      fontSize: '12px',
      color: '#64748b',
      marginTop: '6px',
    },
    charCount: {
      fontSize: '12px',
      marginTop: '6px',
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
    },
    checkboxInput: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
    },
    typeCards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
    },
    typeCard: {
      padding: '15px',
      background: '#0f172a',
      border: '2px solid #334155',
      borderRadius: '10px',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s',
    },
    typeCardActive: {
      borderColor: '#3b82f6',
      background: '#1e3a5f',
    },
    typeIcon: {
      fontSize: '28px',
      marginBottom: '8px',
    },
    typeName: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#e2e8f0',
    },
    uploadArea: {
      border: '2px dashed #475569',
      borderRadius: '12px',
      padding: '40px 20px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: '#0f172a',
    },
    uploadAreaActive: {
      borderColor: '#3b82f6',
      background: '#1e3a5f',
    },
    uploadIcon: {
      fontSize: '48px',
      marginBottom: '15px',
    },
    uploadText: {
      fontSize: '16px',
      color: '#e2e8f0',
      marginBottom: '8px',
    },
    uploadHint: {
      fontSize: '13px',
      color: '#64748b',
      marginBottom: '15px',
    },
    browseBtn: {
      padding: '10px 24px',
      background: '#3b82f6',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    uploadedFileBox: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '15px 20px',
      background: '#14532d',
      border: '1px solid #166534',
      borderRadius: '10px',
    },
    uploadedFileName: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      color: '#bbf7d0',
    },
    removeFileBtn: {
      padding: '6px 12px',
      background: '#dc2626',
      border: 'none',
      borderRadius: '6px',
      color: 'white',
      fontSize: '12px',
      cursor: 'pointer',
    },
    uploadProgress: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: '30px',
      color: '#94a3b8',
    },
    orDivider: {
      display: 'flex',
      alignItems: 'center',
      margin: '20px 0',
      color: '#64748b',
      fontSize: '13px',
    },
    orLine: {
      flex: 1,
      height: '1px',
      background: '#334155',
    },
    orText: {
      padding: '0 15px',
    },
    competencySearch: {
      position: 'relative',
    },
    competencyDropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '8px',
      marginTop: '5px',
      maxHeight: '200px',
      overflowY: 'auto',
      zIndex: 100,
    },
    competencyItem: {
      padding: '10px 15px',
      cursor: 'pointer',
      borderBottom: '1px solid #334155',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    competencyCode: {
      fontWeight: 600,
      color: '#3b82f6',
      fontSize: '12px',
    },
    competencyTitle: {
      color: '#e2e8f0',
      fontSize: '13px',
    },
    selectedTags: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '10px',
    },
    tag: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      background: '#3b82f6',
      borderRadius: '20px',
      fontSize: '12px',
      color: 'white',
    },
    tagRemove: {
      cursor: 'pointer',
      opacity: 0.8,
    },
    infoBox: {
      padding: '15px',
      background: '#0c4a6e',
      border: '1px solid #0369a1',
      borderRadius: '8px',
      marginBottom: '20px',
    },
    infoTitle: {
      fontWeight: 600,
      color: '#7dd3fc',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    infoText: {
      fontSize: '13px',
      color: '#bae6fd',
      lineHeight: 1.5,
    },
    actions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '15px',
      marginTop: '30px',
    },
    btnCancel: {
      padding: '12px 30px',
      background: 'transparent',
      border: '1px solid #475569',
      borderRadius: '8px',
      color: '#94a3b8',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    btnSubmit: {
      padding: '12px 30px',
      background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    btnDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  };

  const typeOptions = [
    { value: LearningUnitType.BOOK, icon: '📚', label: 'Book' },
    { value: LearningUnitType.VIDEO, icon: '🎥', label: 'Video' },
    { value: LearningUnitType.MCQ, icon: '✅', label: 'MCQ' },
    { value: LearningUnitType.NOTES, icon: '📝', label: 'Notes' },
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>
          <span>📝</span> Create Learning Unit
        </h1>
        <button style={styles.backBtn} onClick={() => navigate('/publisher-admin')}>
          ← Back to Dashboard
        </button>
      </header>

      <main style={styles.main}>
        {error && (
          <div style={{ ...styles.alert, ...styles.alertError }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{ ...styles.alert, ...styles.alertSuccess }}>
            ✅ Learning unit created successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Content Type */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>📦 Content Type</h2>
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.typeCards}>
                {typeOptions.map(opt => (
                  <div
                    key={opt.value}
                    style={{
                      ...styles.typeCard,
                      ...(formData.type === opt.value ? styles.typeCardActive : {}),
                    }}
                    onClick={() => setFormData({ ...formData, type: opt.value })}
                  >
                    <div style={styles.typeIcon}>{opt.icon}</div>
                    <div style={styles.typeName}>{opt.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>📋 Basic Information</h2>
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formGrid}>
                <div style={{ ...styles.formGroup, ...styles.formGroupFull }}>
                  <label style={styles.label}>Title *</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g., Cardiovascular System Anatomy"
                  />
                </div>

                <div style={{ ...styles.formGroup, ...styles.formGroupFull }}>
                  <label style={styles.label}>Description * (min 20 characters)</label>
                  <textarea
                    style={styles.textarea}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    placeholder="Detailed description of the learning content..."
                  />
                  <div style={{
                    ...styles.charCount,
                    color: formData.description.length >= 20 ? '#22c55e' : '#f59e0b'
                  }}>
                    {formData.description.length}/20 characters
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Subject *</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    placeholder="e.g., Anatomy"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Topic *</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    required
                    placeholder="e.g., Cardiovascular System"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Difficulty Level</label>
                  <select
                    style={styles.select}
                    value={formData.difficultyLevel}
                    onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value as DifficultyLevel })}
                  >
                    <option value={DifficultyLevel.BEGINNER}>🟢 Beginner</option>
                    <option value={DifficultyLevel.INTERMEDIATE}>🟡 Intermediate</option>
                    <option value={DifficultyLevel.ADVANCED}>🔴 Advanced</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Duration (minutes)</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) || 30 })}
                    min="1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content Upload */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>📤 Upload Content</h2>
            </div>
            <div style={styles.sectionBody}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                accept={formData.type === LearningUnitType.VIDEO 
                  ? 'video/mp4,video/webm,video/ogg'
                  : formData.type === LearningUnitType.NOTES
                    ? 'application/pdf,text/plain,.doc,.docx'
                    : 'application/pdf,application/epub+zip'
                }
              />
              
              {uploading ? (
                <div style={styles.uploadProgress}>
                  <span style={{ fontSize: '24px' }}>⏳</span>
                  <span>Uploading file...</span>
                </div>
              ) : uploadedFile ? (
                <div style={styles.uploadedFileBox}>
                  <div style={styles.uploadedFileName}>
                    <span style={{ fontSize: '20px' }}>✅</span>
                    <span><strong>{uploadedFile.name}</strong> uploaded successfully</span>
                  </div>
                  <button type="button" style={styles.removeFileBtn} onClick={removeFile}>
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    ...styles.uploadArea,
                    ...(dragActive ? styles.uploadAreaActive : {}),
                  }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={styles.uploadIcon}>
                    {formData.type === LearningUnitType.VIDEO ? '🎬' : 
                     formData.type === LearningUnitType.NOTES ? '📄' : '📚'}
                  </div>
                  <div style={styles.uploadText}>
                    Drag & drop your {formData.type.toLowerCase()} file here
                  </div>
                  <div style={styles.uploadHint}>
                    {formData.type === LearningUnitType.VIDEO 
                      ? 'Supports: MP4, WebM, OGG (max 500MB)'
                      : formData.type === LearningUnitType.NOTES
                        ? 'Supports: PDF, TXT, DOC, DOCX (max 500MB)'
                        : 'Supports: PDF, EPUB (max 500MB)'
                    }
                  </div>
                  <button type="button" style={styles.browseBtn}>
                    Browse Files
                  </button>
                </div>
              )}

              <div style={styles.orDivider}>
                <div style={styles.orLine}></div>
                <span style={styles.orText}>OR enter external URL</span>
                <div style={styles.orLine}></div>
              </div>

              <div style={{ ...styles.formGroup, ...styles.formGroupFull }}>
                <label style={styles.label}>External Content URL</label>
                <input
                  style={styles.input}
                  type="url"
                  value={formData.secureAccessUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, secureAccessUrl: e.target.value });
                    if (uploadedFile) setUploadedFile(null);
                  }}
                  placeholder="https://your-cdn.com/content/file.pdf"
                />
                <div style={styles.hint}>If you already have content hosted externally, paste the URL here</div>
              </div>
            </div>
          </div>

          {/* Content Access */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>🔐 Access Settings</h2>
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Delivery Type</label>
                  <select
                    style={styles.select}
                    value={formData.deliveryType}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value as DeliveryType })}
                  >
                    <option value={DeliveryType.REDIRECT}>🔗 Redirect (new window)</option>
                    <option value={DeliveryType.EMBED}>📐 Embed (iframe)</option>
                    <option value={DeliveryType.STREAM}>📺 Stream (HLS/DASH)</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Session Expiry (minutes)</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={formData.sessionExpiryMinutes}
                    onChange={(e) => setFormData({ ...formData, sessionExpiryMinutes: parseInt(e.target.value) || 30 })}
                    min="5"
                    max="180"
                  />
                </div>

                <div style={{ ...styles.formGroup, ...styles.formGroupFull }}>
                  <label style={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.watermarkEnabled}
                      onChange={(e) => setFormData({ ...formData, watermarkEnabled: e.target.checked })}
                      style={styles.checkboxInput}
                    />
                    <span>🔒 Enable Watermarking</span>
                    <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '10px' }}>
                      (Shows student info on content for security)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Competency Mapping */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>🎯 Competency Mapping</h2>
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.competencySearch}>
                <label style={styles.label}>Search & Select MCI Competencies</label>
                <input
                  style={styles.input}
                  type="text"
                  value={competencySearch}
                  onChange={(e) => {
                    setCompetencySearch(e.target.value);
                    setShowCompetencyDropdown(true);
                  }}
                  onFocus={() => setShowCompetencyDropdown(true)}
                  placeholder="Type to search competencies..."
                />
                {showCompetencyDropdown && competencySearch && filteredCompetencies.length > 0 && (
                  <div style={styles.competencyDropdown}>
                    {filteredCompetencies.map(c => (
                      <div
                        key={c.id}
                        style={{
                          ...styles.competencyItem,
                          background: formData.competencyIds.includes(c.id) ? '#1e3a5f' : 'transparent',
                        }}
                        onClick={() => toggleCompetency(c.id)}
                      >
                        <div>
                          <div style={styles.competencyCode}>{c.code}</div>
                          <div style={styles.competencyTitle}>{c.title}</div>
                        </div>
                        {formData.competencyIds.includes(c.id) && <span>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedCompetencies.length > 0 && (
                <div style={styles.selectedTags}>
                  {selectedCompetencies.map(c => (
                    <span key={c.id} style={styles.tag}>
                      {c.code}
                      <span style={styles.tagRemove} onClick={() => toggleCompetency(c.id)}>×</span>
                    </span>
                  ))}
                </div>
              )}

              <div style={{ ...styles.hint, marginTop: '15px' }}>
                {competencies.length > 0
                  ? `${formData.competencyIds.length} selected from ${competencies.length} available competencies`
                  : 'Loading competencies...'
                }
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.btnCancel}
              onClick={() => navigate('/publisher-admin')}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.btnSubmit,
                ...(loading ? styles.btnDisabled : {}),
              }}
              disabled={loading}
            >
              {loading ? '⏳ Creating...' : '✨ Create Learning Unit'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateLearningUnit;
