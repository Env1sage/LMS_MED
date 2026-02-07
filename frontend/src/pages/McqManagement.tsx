import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mcqService, { Mcq, CreateMcqDto } from '../services/mcq.service';
import competencyService from '../services/competency.service';
import { Competency, CompetencyStatus } from '../types';
import BulkMcqUpload from '../components/publisher/BulkMcqUpload';
import CompetencySearch from '../components/common/CompetencySearch';
import TopicSearch from '../components/TopicSearch';
import { Topic } from '../services/topics.service';
import '../styles/McqManagement.css';
import '../styles/PublisherAdmin.css';

const McqManagement: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'list' | 'create' | 'bulk' | 'stats'>('list');
  const [mcqs, setMcqs] = useState<Mcq[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMcq, setSelectedMcq] = useState<Mcq | null>(null);
  
  // Image upload states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingExplanationImage, setUploadingExplanationImage] = useState(false);
  const [uploadingScenarioImage, setUploadingScenarioImage] = useState(false);
  const questionImageRef = useRef<HTMLInputElement>(null);
  const explanationImageRef = useRef<HTMLInputElement>(null);
  const scenarioImageRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<CreateMcqDto>({
    question: '',
    questionImage: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    optionE: '',
    correctAnswer: 'A',
    explanation: '',
    explanationImage: '',
    subject: 'Anatomy',
    topic: '',
    topicId: '',
    mcqType: 'NORMAL',
    difficultyLevel: 'K',
    bloomsLevel: 'UNDERSTAND',
    competencyIds: [],
    tags: [],
  });

  // Clinical scenario for SCENARIO_BASED MCQs
  const [clinicalScenario, setClinicalScenario] = useState('');
  const [scenarioImage, setScenarioImage] = useState('');

  // State for optional fields visibility
  const [showOptionalFields, setShowOptionalFields] = useState({
    optionE: false,
    tags: false,
    explanationImage: false,
    references: false,
  });

  // References field (optional)
  const [references, setReferences] = useState('');

  // Selected topic from CBME repository
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  
  // Auto-loaded competencies from selected topic
  const [topicCompetencies, setTopicCompetencies] = useState<Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    domain: string;
  }>>([]);

  // Filter state
  const [filters, setFilters] = useState({
    subject: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mcqsData, comps, statsData] = await Promise.all([
        mcqService.getAll({ limit: 100 }),
        competencyService.getAll({ status: CompetencyStatus.ACTIVE, limit: 5000 }),
        mcqService.getStats(),
      ]);
      setMcqs(mcqsData.data || []);
      setCompetencies(comps.data || []);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Image upload handler
  const handleImageUpload = async (file: File, type: 'question' | 'explanation' | 'scenario') => {
    if (type === 'question') {
      setUploadingImage(true);
    } else if (type === 'explanation') {
      setUploadingExplanationImage(true);
    } else {
      setUploadingScenarioImage(true);
    }
    
    try {
      const result = await mcqService.uploadImage(file);
      const fullUrl = result.url.startsWith('http') 
        ? result.url 
        : `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${result.url}`;
      
      if (type === 'question') {
        setFormData({ ...formData, questionImage: fullUrl });
      } else if (type === 'explanation') {
        setFormData({ ...formData, explanationImage: fullUrl });
      } else {
        setScenarioImage(fullUrl);
      }
      setSuccess(`Image uploaded successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      if (type === 'question') {
        setUploadingImage(false);
      } else if (type === 'explanation') {
        setUploadingExplanationImage(false);
      } else {
        setUploadingScenarioImage(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Mandatory Topic validation per CBME spec
    if (!formData.topicId) {
      setError('Topic selection is mandatory. Please search and select a topic from the CBME repository.');
      setLoading(false);
      return;
    }

    // Mandatory Competency validation per CBME spec
    if (!formData.competencyIds || formData.competencyIds.length === 0) {
      setError('At least one competency mapping is required. Please select competencies for this MCQ.');
      setLoading(false);
      return;
    }

    // Validation for SCENARIO_BASED MCQs
    if (formData.mcqType === 'SCENARIO_BASED' && !clinicalScenario.trim()) {
      setError('Clinical scenario is required for Scenario-based MCQs.');
      setLoading(false);
      return;
    }

    // Validation for IMAGE_BASED MCQs
    if (formData.mcqType === 'IMAGE_BASED' && !formData.questionImage) {
      setError('Question image is required for Image-based MCQs.');
      setLoading(false);
      return;
    }

    try {
      // Prepare the data - prepend clinical scenario if SCENARIO_BASED
      const submitData = { ...formData };
      if (formData.mcqType === 'SCENARIO_BASED' && clinicalScenario.trim()) {
        let scenarioContent = `**Clinical Scenario:**\n${clinicalScenario.trim()}`;
        if (scenarioImage) {
          scenarioContent += `\n\n![Scenario Image](${scenarioImage})`;
        }
        submitData.question = `${scenarioContent}\n\n**Question:**\n${formData.question}`;
        // Also store the scenario image in questionImage if no other image
        if (scenarioImage && !submitData.questionImage) {
          submitData.questionImage = scenarioImage;
        }
      }

      if (selectedMcq) {
        await mcqService.update(selectedMcq.id, submitData);
        setSuccess('MCQ updated successfully!');
      } else {
        await mcqService.create(submitData);
        setSuccess('MCQ created successfully!');
      }
      
      resetForm();
      setTab('list');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save MCQ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this MCQ?')) return;
    
    try {
      await mcqService.delete(id);
      setSuccess('MCQ deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete MCQ');
    }
  };

  const handleVerify = async (id: string, approve: boolean) => {
    try {
      await mcqService.verify(id, approve);
      setSuccess(`MCQ ${approve ? 'approved' : 'rejected'} successfully`);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify MCQ');
    }
  };

  const resetForm = () => {
    setFormData({
      question: '',
      questionImage: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      optionE: '',
      correctAnswer: 'A',
      explanation: '',
      explanationImage: '',
      subject: 'Anatomy',
      topic: '',
      topicId: '',
      mcqType: 'NORMAL',
      difficultyLevel: 'K',
      bloomsLevel: 'UNDERSTAND',
      competencyIds: [],
      tags: [],
    });
    setClinicalScenario('');
    setScenarioImage('');
    setSelectedMcq(null);
    setSelectedTopic(null);
  };

  const editMcq = (mcq: Mcq) => {
    setSelectedMcq(mcq);
    
    // Extract clinical scenario if it exists in the question (for SCENARIO_BASED MCQs)
    let questionText = mcq.question;
    let scenario = '';
    if (mcq.mcqType === 'SCENARIO_BASED' && mcq.question.includes('**Clinical Scenario:**')) {
      const parts = mcq.question.split('**Question:**');
      if (parts.length === 2) {
        scenario = parts[0].replace('**Clinical Scenario:**', '').trim();
        questionText = parts[1].trim();
      }
    }
    setClinicalScenario(scenario);
    
    setFormData({
      question: questionText,
      questionImage: mcq.questionImage,
      explanationImage: mcq.explanationImage,
      optionA: mcq.optionA,
      optionB: mcq.optionB,
      optionC: mcq.optionC,
      optionD: mcq.optionD,
      optionE: mcq.optionE || '',
      correctAnswer: mcq.correctAnswer,
      explanation: mcq.explanation || '',
      subject: mcq.subject,
      topic: mcq.topic || '',
      topicId: mcq.topicId || '',
      mcqType: mcq.mcqType || 'NORMAL',
      difficultyLevel: mcq.difficultyLevel,
      bloomsLevel: mcq.bloomsLevel,
      competencyIds: mcq.competencyIds,
      tags: mcq.tags,
      year: mcq.year,
      source: mcq.source,
    });
    setSelectedTopic(null); // Will be loaded if topicId exists
    setTab('create');
  };

  const filteredMcqs = mcqs.filter(mcq => {
    if (filters.subject && mcq.subject !== filters.subject) return false;
    if (filters.status && mcq.status !== filters.status) return false;
    if (filters.search && !mcq.question.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const subjects = ['Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology', 
                   'Microbiology', 'Forensic Medicine', 'Community Medicine', 'General Medicine',
                   'General Surgery', 'Pediatrics', 'Obstetrics & Gynaecology', 'Orthopedics',
                   'Ophthalmology', 'ENT', 'Psychiatry', 'Dermatology & Leprosy'];

  return (
    <div className="mcq-management">
      <div className="dashboard-header">
        <div>
          <h1>✅ MCQ Management</h1>
          <p>Create and manage Multiple Choice Questions</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/publisher-admin')} className="btn-secondary">
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="tabs">
        <button
          className={tab === 'list' ? 'tab active' : 'tab'}
          onClick={() => { setTab('list'); resetForm(); }}
        >
          MCQ List ({mcqs.length})
        </button>
        <button
          className={tab === 'create' ? 'tab active' : 'tab'}
          onClick={() => { setTab('create'); resetForm(); }}
        >
          {selectedMcq ? 'Edit MCQ' : '+ Create New'}
        </button>
        <button
          className={tab === 'bulk' ? 'tab active' : 'tab'}
          onClick={() => { setTab('bulk'); resetForm(); }}
        >
          📤 Bulk Upload
        </button>
        <button
          className={tab === 'stats' ? 'tab active' : 'tab'}
          onClick={() => setTab('stats')}
        >
          Statistics
        </button>
      </div>

      {tab === 'list' && (
        <div className="tab-content">
          <div className="filters">
            <input
              type="text"
              placeholder="Search questions..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="search-input"
            />
            <select
              value={filters.subject}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
            >
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="mcq-list">
            {filteredMcqs.map((mcq) => (
              <div key={mcq.id} className="mcq-card">
                <div className="mcq-header">
                  <span className="subject-badge">{mcq.subject}</span>
                  <span className={`status-badge status-${mcq.status.toLowerCase()}`}>
                    {mcq.status}
                  </span>
                  {mcq.isVerified && <span className="verified-badge">✓ Verified</span>}
                </div>
                
                <div className="mcq-question">
                  <strong>Q:</strong> {mcq.question}
                </div>

                <div className="mcq-options">
                  <div className={mcq.correctAnswer === 'A' ? 'option correct' : 'option'}>
                    A. {mcq.optionA}
                  </div>
                  <div className={mcq.correctAnswer === 'B' ? 'option correct' : 'option'}>
                    B. {mcq.optionB}
                  </div>
                  <div className={mcq.correctAnswer === 'C' ? 'option correct' : 'option'}>
                    C. {mcq.optionC}
                  </div>
                  <div className={mcq.correctAnswer === 'D' ? 'option correct' : 'option'}>
                    D. {mcq.optionD}
                  </div>
                  {mcq.optionE && (
                    <div className={mcq.correctAnswer === 'E' ? 'option correct' : 'option'}>
                      E. {mcq.optionE}
                    </div>
                  )}
                </div>

                <div className="mcq-meta">
                  <span>📚 {mcq.topic}</span>
                  <span>📊 {mcq.difficultyLevel}</span>
                  <span>🎯 {mcq.competencyIds.length} competencies</span>
                </div>

                <div className="mcq-actions">
                  <button onClick={() => editMcq(mcq)} className="btn-primary">
                    ✏️ Edit
                  </button>
                  {!mcq.isVerified && (
                    <>
                      <button onClick={() => handleVerify(mcq.id, true)} className="btn-success">
                        ✓ Approve
                      </button>
                      <button onClick={() => handleVerify(mcq.id, false)} className="btn-warning">
                        ✗ Reject
                      </button>
                    </>
                  )}
                  <button onClick={() => handleDelete(mcq.id)} className="btn-danger">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}

            {filteredMcqs.length === 0 && (
              <div className="empty-state">
                <p>No MCQs found. Create your first MCQ!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'bulk' && (
        <div className="tab-content">
          <BulkMcqUpload onSuccess={() => { loadData(); setTab('list'); }} />
        </div>
      )}

      {tab === 'create' && (
        <div className="tab-content">
          <form onSubmit={handleSubmit} className="mcq-form">
            <h3>{selectedMcq ? 'Edit MCQ' : 'Create New MCQ'}</h3>

            {/* Clinical Scenario for SCENARIO_BASED MCQs */}
            {formData.mcqType === 'SCENARIO_BASED' && (
              <div className="form-group scenario-section">
                <label>📋 Clinical Scenario / Case Vignette *</label>
                <textarea
                  required
                  value={clinicalScenario}
                  onChange={(e) => setClinicalScenario(e.target.value)}
                  rows={6}
                  placeholder="Enter the clinical scenario...&#10;&#10;Example: A 45-year-old male presents to the emergency department with sudden onset of severe chest pain radiating to the left arm. He has a history of hypertension and diabetes mellitus type 2. On examination, he appears diaphoretic and anxious. His vital signs show BP 160/100 mmHg, HR 110/min, RR 22/min..."
                  className="scenario-textarea"
                />
                <small className="help-text">Describe the patient presentation, history, examination findings, and any relevant investigations.</small>
                
                {/* Scenario Image Upload - for clinical images, X-rays, ECGs etc. */}
                <div className="scenario-image-section" style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <label style={{ fontWeight: 600, marginBottom: '10px', display: 'block' }}>🖼️ Scenario Image (Optional - for X-rays, ECGs, lab reports, etc.)</label>
                  <div className="image-upload-container">
                    <input
                      type="file"
                      ref={scenarioImageRef}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleImageUpload(e.target.files[0], 'scenario');
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="btn-upload"
                      onClick={() => scenarioImageRef.current?.click()}
                      disabled={uploadingScenarioImage}
                      style={{ marginRight: '10px' }}
                    >
                      {uploadingScenarioImage ? '⏳ Uploading...' : '📤 Upload Scenario Image'}
                    </button>
                    
                    <span style={{ color: '#666', margin: '0 10px' }}>OR</span>
                    
                    <input
                      type="url"
                      value={scenarioImage}
                      onChange={(e) => setScenarioImage(e.target.value)}
                      placeholder="Enter image URL"
                      className="image-url-input"
                      style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                  
                  {scenarioImage && (
                    <div className="image-preview" style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                      <img 
                        src={scenarioImage} 
                        alt="Scenario" 
                        style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px', border: '1px solid #ddd' }}
                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} 
                      />
                      <button 
                        type="button" 
                        className="btn-remove-image"
                        onClick={() => setScenarioImage('')}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <small className="help-text" style={{ display: 'block', marginTop: '8px' }}>
                    Add clinical images relevant to the scenario (e.g., chest X-ray, ECG, lab reports, CT scan)
                  </small>
                </div>
              </div>
            )}

            {/* Image Upload for IMAGE_BASED MCQs */}
            {formData.mcqType === 'IMAGE_BASED' && (
              <div className="form-group image-section">
                <label>🖼️ Question Image * <span className="required-note">(Upload file OR enter URL)</span></label>
                <div className="image-upload-container">
                  {/* File Upload Option */}
                  <div className="upload-option">
                    <input
                      type="file"
                      ref={questionImageRef}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleImageUpload(e.target.files[0], 'question');
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="btn-upload"
                      onClick={() => questionImageRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? '⏳ Uploading...' : '📤 Upload Image File'}
                    </button>
                  </div>
                  
                  <div className="or-divider">OR</div>
                  
                  {/* URL Input Option */}
                  <input
                    type="url"
                    value={formData.questionImage || ''}
                    onChange={(e) => setFormData({ ...formData, questionImage: e.target.value })}
                    placeholder="Enter image URL (e.g., https://example.com/xray.jpg)"
                    className="image-url-input"
                  />
                  
                  {/* Image Preview */}
                  {formData.questionImage && (
                    <div className="image-preview">
                      <img 
                        src={formData.questionImage} 
                        alt="Question" 
                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} 
                      />
                      <button 
                        type="button" 
                        className="btn-remove-image"
                        onClick={() => setFormData({ ...formData, questionImage: '' })}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  )}
                </div>
                <small className="help-text">
                  Supported formats: JPG, PNG, GIF, WebP (max 10MB). 
                  Examples: X-ray, CT scan, MRI, histopathology slides, ECG, clinical photos.
                </small>
              </div>
            )}

            <div className="form-group">
              <label>Question *</label>
              <textarea
                required
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                rows={3}
                placeholder={formData.mcqType === 'SCENARIO_BASED' 
                  ? "Based on the scenario above, what is the most likely diagnosis?" 
                  : formData.mcqType === 'IMAGE_BASED'
                  ? "What abnormality is shown in the image above?"
                  : "Enter the question..."}
              />
            </div>

            {/* Subject and Topic Selection Row */}
            <div className="form-row subject-topic-row">
              {/* Subject Field - Auto-fills when topic is selected */}
              <div className="form-group subject-field">
                <label>Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  readOnly
                  className={`subject-input ${selectedTopic ? 'auto-filled' : ''}`}
                  placeholder="← Select a topic to auto-fill subject"
                />
                {selectedTopic && (
                  <small className="auto-fill-indicator">✓ Auto-filled from topic</small>
                )}
              </div>

              {/* Topic Selection */}
              <div className="form-group topic-field">
                <label>Topic * (Search & Select)</label>
                <TopicSearch
                  selectedTopicId={formData.topicId}
                  selectedSubject={formData.subject}
                  onTopicSelect={(topic) => {
                    if (topic) {
                      setSelectedTopic(topic);
                      setFormData({ 
                        ...formData, 
                        topicId: topic.id, 
                        topic: topic.name,
                        subject: topic.subject 
                      });
                    } else {
                      setSelectedTopic(null);
                      setTopicCompetencies([]);
                      setFormData({ ...formData, topicId: '', topic: '', subject: 'Anatomy', competencyIds: [] });
                    }
                  }}
                  onSubjectSelect={(subject) => {
                    // When subject filter changes in TopicSearch, update formData
                    setFormData({ ...formData, subject: subject || 'Anatomy', topicId: '', topic: '' });
                    setSelectedTopic(null);
                    setTopicCompetencies([]);
                  }}
                  onCompetenciesLoad={(comps) => {
                    setTopicCompetencies(comps);
                    // Auto-select all competencies from the topic
                    if (comps.length > 0) {
                      setFormData(prev => ({ ...prev, competencyIds: comps.map(c => c.id) }));
                    }
                  }}
                  required={true}
                  placeholder="Search topics from CBME repository..."
                />
                {selectedTopic && (
                  <small className="topic-code">Code: {selectedTopic.code}</small>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>MCQ Type *</label>
                <select
                  required
                  value={formData.mcqType || 'NORMAL'}
                  onChange={(e) => setFormData({ ...formData, mcqType: e.target.value })}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="SCENARIO_BASED">Scenario-based</option>
                  <option value="IMAGE_BASED">Image-based</option>
                </select>
              </div>

              <div className="form-group">
                <label>Competency Level (Miller's Pyramid) *</label>
                <select
                  required
                  value={formData.difficultyLevel}
                  onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value })}
                >
                  <option value="K">K - Knows</option>
                  <option value="KH">KH - Knows How</option>
                  <option value="S">S - Shows</option>
                  <option value="SH">SH - Shows How</option>
                  <option value="P">P - Performs</option>
                </select>
              </div>
            </div>

            {/* Auto-loaded Competencies from Topic */}
            {topicCompetencies.length > 0 && (
              <div className="form-group competency-auto-load">
                <label>📚 Mapped Competencies (Auto-loaded from Topic)</label>
                <div className="competency-list">
                  {topicCompetencies.map(comp => (
                    <div key={comp.id} className="competency-item">
                      <input
                        type="checkbox"
                        id={`comp-${comp.id}`}
                        checked={(formData.competencyIds || []).includes(comp.id)}
                        onChange={(e) => {
                          const currentIds = formData.competencyIds || [];
                          if (e.target.checked) {
                            setFormData({ ...formData, competencyIds: [...currentIds, comp.id] });
                          } else {
                            setFormData({ ...formData, competencyIds: currentIds.filter(id => id !== comp.id) });
                          }
                        }}
                      />
                      <label htmlFor={`comp-${comp.id}`}>
                        <strong>{comp.code}</strong> - {comp.title}
                        <span className="comp-domain">({comp.domain})</span>
                      </label>
                    </div>
                  ))}
                </div>
                <small className="help-text">At least one competency mapping is required.</small>
              </div>
            )}

            <div className="options-section">
              <h4>Options</h4>
              <div className="form-group">
                <label>Option A *</label>
                <input
                  type="text"
                  required
                  value={formData.optionA}
                  onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Option B *</label>
                <input
                  type="text"
                  required
                  value={formData.optionB}
                  onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Option C *</label>
                <input
                  type="text"
                  required
                  value={formData.optionC}
                  onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Option D *</label>
                <input
                  type="text"
                  required
                  value={formData.optionD}
                  onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                />
              </div>

              {/* Option E - shown via "+ Add Field" */}
              {showOptionalFields.optionE && (
                <div className="form-group optional-field">
                  <label>Option E (Optional)</label>
                  <input
                    type="text"
                    value={formData.optionE}
                    onChange={(e) => setFormData({ ...formData, optionE: e.target.value })}
                  />
                  <button 
                    type="button" 
                    className="btn-remove-field"
                    onClick={() => {
                      setShowOptionalFields(prev => ({ ...prev, optionE: false }));
                      setFormData({ ...formData, optionE: '' });
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="form-group">
                <label>Correct Answer *</label>
                <select
                  required
                  value={formData.correctAnswer}
                  onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  {formData.optionE && <option value="E">E</option>}
                </select>
              </div>
            </div>

            {/* + Add Field Button for Optional Fields */}
            <div className="add-field-section">
              <span className="add-field-label">Optional Fields:</span>
              <div className="add-field-buttons">
                {!showOptionalFields.optionE && (
                  <button 
                    type="button" 
                    className="btn-add-field"
                    onClick={() => setShowOptionalFields(prev => ({ ...prev, optionE: true }))}
                  >
                    + Option E
                  </button>
                )}
                {!showOptionalFields.tags && (
                  <button 
                    type="button" 
                    className="btn-add-field"
                    onClick={() => setShowOptionalFields(prev => ({ ...prev, tags: true }))}
                  >
                    + Tags
                  </button>
                )}
                {!showOptionalFields.references && (
                  <button 
                    type="button" 
                    className="btn-add-field"
                    onClick={() => setShowOptionalFields(prev => ({ ...prev, references: true }))}
                  >
                    + References
                  </button>
                )}
                {formData.mcqType !== 'IMAGE_BASED' && !showOptionalFields.explanationImage && (
                  <button 
                    type="button" 
                    className="btn-add-field"
                    onClick={() => setShowOptionalFields(prev => ({ ...prev, explanationImage: true }))}
                  >
                    + Explanation Image
                  </button>
                )}
              </div>
            </div>

            {/* Tags Field - shown via "+ Add Field" */}
            {showOptionalFields.tags && (
              <div className="form-group optional-field">
                <label>🏷️ Tags (comma-separated)</label>
                <div className="field-with-remove">
                  <input
                    type="text"
                    value={(formData.tags || []).join(', ')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                    })}
                    placeholder="e.g., cardiology, high-yield, exam-important"
                  />
                  <button 
                    type="button" 
                    className="btn-remove-field"
                    onClick={() => {
                      setShowOptionalFields(prev => ({ ...prev, tags: false }));
                      setFormData({ ...formData, tags: [] });
                    }}
                  >
                    ✕
                  </button>
                </div>
                <small className="help-text">Add tags to help categorize and search MCQs</small>
              </div>
            )}

            {/* References Field - shown via "+ Add Field" */}
            {showOptionalFields.references && (
              <div className="form-group optional-field">
                <label>📚 References</label>
                <div className="field-with-remove">
                  <textarea
                    value={references}
                    onChange={(e) => setReferences(e.target.value)}
                    rows={2}
                    placeholder="e.g., Harrison's Principles of Internal Medicine, 21st Edition, Chapter 25"
                  />
                  <button 
                    type="button" 
                    className="btn-remove-field"
                    onClick={() => {
                      setShowOptionalFields(prev => ({ ...prev, references: false }));
                      setReferences('');
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Explanation</label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={3}
                placeholder="Explain why the answer is correct..."
              />
            </div>

            {/* Explanation Image (optional) - for IMAGE_BASED or when manually added */}
            {(formData.mcqType === 'IMAGE_BASED' || showOptionalFields.explanationImage) && (
              <div className="form-group explanation-image-section optional-field">
                <label>📎 Explanation Image (Optional - for annotated diagrams)</label>
                <div className="image-upload-container small">
                  {/* File Upload Option */}
                  <input
                    type="file"
                    ref={explanationImageRef}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleImageUpload(e.target.files[0], 'explanation');
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn-upload small"
                    onClick={() => explanationImageRef.current?.click()}
                    disabled={uploadingExplanationImage}
                  >
                    {uploadingExplanationImage ? '⏳ Uploading...' : '📤 Upload'}
                  </button>
                  
                  <span className="or-text">or</span>
                  
                  <input
                    type="url"
                    value={formData.explanationImage || ''}
                    onChange={(e) => setFormData({ ...formData, explanationImage: e.target.value })}
                    placeholder="Enter explanation image URL"
                    className="image-url-input"
                  />
                </div>
                {formData.explanationImage && (
                  <div className="image-preview small">
                    <img 
                      src={formData.explanationImage} 
                      alt="Explanation" 
                      onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} 
                    />
                    <button 
                      type="button" 
                      className="btn-remove-image small"
                      onClick={() => setFormData({ ...formData, explanationImage: '' })}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Bloom's Taxonomy Level *</label>
              <select
                required
                value={formData.bloomsLevel}
                onChange={(e) => setFormData({ ...formData, bloomsLevel: e.target.value })}
              >
                <option value="REMEMBER">Remember</option>
                <option value="UNDERSTAND">Understand</option>
                <option value="APPLY">Apply</option>
                <option value="ANALYZE">Analyze</option>
                <option value="EVALUATE">Evaluate</option>
                <option value="CREATE">Create</option>
              </select>
            </div>

            <div className="form-group">
              <CompetencySearch
                competencies={competencies}
                selectedIds={formData.competencyIds || []}
                onChange={(selectedIds) => setFormData({ ...formData, competencyIds: selectedIds })}
                label="MCI Competencies"
                placeholder="Search by code or description..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : selectedMcq ? 'Update MCQ' : 'Create MCQ'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'stats' && stats && (
        <div className="tab-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total MCQs</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">MCQ Sets</div>
              <div className="stat-value">{stats.mcqSets || Math.ceil(stats.total / 50)}</div>
              <small style={{ color: '#666', fontSize: '11px' }}>~50 MCQs per set</small>
            </div>
            <div className="stat-card">
              <div className="stat-label">✓ Verified</div>
              <div className="stat-value success">{stats.verified}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">⏳ Pending</div>
              <div className="stat-value warning">{stats.unverified}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Published</div>
              <div className="stat-value">{stats.byStatus.PUBLISHED || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">📷 Image-based</div>
              <div className="stat-value">{stats.byType?.IMAGE_BASED || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">📋 Scenario-based</div>
              <div className="stat-value">{stats.byType?.SCENARIO_BASED || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">📝 Normal</div>
              <div className="stat-value">{stats.byType?.NORMAL || stats.total - (stats.byType?.IMAGE_BASED || 0) - (stats.byType?.SCENARIO_BASED || 0)}</div>
            </div>
          </div>

          <div className="stats-section">
            <h3>By Subject</h3>
            <div className="stats-list">
              {Object.entries(stats.bySubject).map(([subject, count]) => (
                <div key={subject} className="stats-item">
                  <span>{subject}</span>
                  <span className="count">{count as number}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="stats-section">
            <h3>By Difficulty</h3>
            <div className="stats-list">
              {Object.entries(stats.byDifficulty).map(([level, count]) => (
                <div key={level} className="stats-item">
                  <span>{level}</span>
                  <span className="count">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default McqManagement;
