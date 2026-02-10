import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/FacultyDashboardNew.css';
import './SelfPacedContent.css';
import TopicSearch from '../components/TopicSearch';
import CompetencySearch from '../components/common/CompetencySearch';
import { Topic } from '../services/topics.service';

interface Competency {
  id: string;
  code: string;
  title: string;
  description: string;
  subject: string;
  domain?: string;
}

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

const SelfPacedContentManager: React.FC = () => {
  const [resources, setResources] = useState<SelfPacedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedResource, setSelectedResource] = useState<SelfPacedResource | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resourceType: 'VIDEO',
    content: '',
    subject: '',
    academicYear: '',
    tags: [] as string[],
    topicId: '',
    competencyIds: [] as string[],
  });
  const [file, setFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [availableCompetencies, setAvailableCompetencies] = useState<Competency[]>([]);
  const [topicCompetencies, setTopicCompetencies] = useState<Competency[]>([]);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/self-paced/my-resources`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setResources(response.data);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async (): Promise<string | null> => {
    if (!file) return null;

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/self-paced/upload`,
        uploadFormData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.fileUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let fileUrl = null;
    if (file) {
      fileUrl = await handleFileUpload();
      if (!fileUrl) return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        fileUrl,
      };

      if (selectedResource) {
        await axios.put(
          `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/self-paced/${selectedResource.id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        alert('Resource updated successfully!');
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/self-paced`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        alert('Resource created successfully!');
      }

      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        resourceType: 'VIDEO',
        content: '',
        subject: '',
        academicYear: '',
        tags: [],
        topicId: '',
        competencyIds: [],
      });
      setFile(null);
      setSelectedResource(null);
      setSelectedTopic(null);
      setAvailableCompetencies([]);
      setTopicCompetencies([]);
      fetchResources();
    } catch (error) {
      console.error('Error saving resource:', error);
      alert('Failed to save resource');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this resource?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/self-paced/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('Resource archived successfully!');
      fetchResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Failed to archive resource');
    }
  };

  const handleEdit = (resource: SelfPacedResource) => {
    setSelectedResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description || '',
      resourceType: resource.resourceType,
      content: resource.content || '',
      subject: resource.subject || '',
      academicYear: resource.academicYear || '',
      tags: resource.tags,
      topicId: resource.topicId || '',
      competencyIds: resource.competencyIds || [],
    });
    setShowCreateForm(true);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading resources...</p>
      </div>
    );
  }

  return (
    <div className="faculty-container">
      <div className="faculty-inner">
        <div className="faculty-header">
          <div className="header-left">
            <div className="faculty-icon">📚</div>
            <div className="header-text">
              <h1>Self-Paced Learning Resources</h1>
              <p className="header-subtitle">Create and manage self-paced learning content</p>
            </div>
          </div>
          <div className="header-right">
            <button
              className="btn-primary"
              onClick={() => {
                setShowCreateForm(true);
                setSelectedResource(null);
                setFormData({
                  title: '',
                  description: '',
                  resourceType: 'VIDEO',
                  content: '',
                  subject: '',
                  academicYear: '',
                  tags: [],
                  topicId: '',
                  competencyIds: [],
                });
              }}
            >
              + CREATE RESOURCE
            </button>
          </div>
        </div>

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <h2>{selectedResource ? 'Edit Resource' : 'Create New Resource'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Resource Type *</label>
                  <select
                    value={formData.resourceType}
                    onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                  >
                    <option value="VIDEO">🎥 Video</option>
                    <option value="DOCUMENT">📄 Document</option>
                    <option value="IMAGE">🖼️ Image / Diagram</option>
                    <option value="REFERENCE">📚 Reference Material</option>
                    <option value="PRACTICE">✏️ Practice Exercise</option>
                    <option value="MCQ">✅ MCQ Bank</option>
                    <option value="HANDBOOK">📖 Handbook</option>
                    <option value="CASE_STUDY">🏥 Case Study</option>
                    <option value="PRESENTATION">📊 Presentation</option>
                    <option value="AUDIO">🎵 Audio Recording</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Academic Year</label>
                  <select
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  >
                    <option value="">All Years</option>
                    <option value="YEAR_1">Year 1</option>
                    <option value="YEAR_2">Year 2</option>
                    <option value="YEAR_3_MINOR">Year 3 (Part 1)</option>
                    <option value="YEAR_3_MAJOR">Year 3 (Part 2)</option>
                    <option value="YEAR_4">Year 4</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Subject *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    readOnly
                    className={`subject-input ${selectedTopic ? 'auto-filled' : ''}`}
                    placeholder="← Select a topic to auto-fill subject"
                    style={{ backgroundColor: selectedTopic ? '#e8f5e9' : '#f5f5f5', cursor: 'not-allowed' }}
                  />
                  {selectedTopic && (
                    <small style={{ color: '#4caf50', fontSize: '12px' }}>✓ Auto-filled from topic</small>
                  )}
                </div>

                <div className="form-group" style={{ flex: 2 }}>
                  <label>Topic * (Search & Select from CBME Repository)</label>
                  <TopicSearch
                    selectedTopicId={formData.topicId}
                    selectedSubject={formData.subject}
                    onTopicSelect={(topic) => {
                      if (topic) {
                        setSelectedTopic(topic);
                        setFormData({ 
                          ...formData, 
                          topicId: topic.id,
                          subject: topic.subject 
                        });
                      } else {
                        setSelectedTopic(null);
                        setTopicCompetencies([]);
                        setFormData({ ...formData, topicId: '', subject: '', competencyIds: [] });
                      }
                    }}
                    onSubjectSelect={(subject) => {
                      setFormData({ ...formData, subject: subject || '', topicId: '' });
                      setSelectedTopic(null);
                      setTopicCompetencies([]);
                    }}
                    onCompetenciesLoad={(comps) => {
                      const competencies = comps as Competency[];
                      setTopicCompetencies(competencies);
                      // Auto-select all competencies from the topic
                      if (competencies.length > 0) {
                        setFormData(prev => ({ ...prev, competencyIds: competencies.map(c => c.id) }));
                      }
                    }}
                    required={true}
                    placeholder="Search topics from CBME repository..."
                  />
                  {selectedTopic && (
                    <small style={{ color: '#666', fontSize: '12px' }}>Code: {selectedTopic.code}</small>
                  )}
                </div>
              </div>

              {/* Auto-loaded Competencies from Topic */}
              {topicCompetencies.length > 0 && (
                <div className="form-group" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                  <label style={{ fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>
                    📚 Mapped Competencies (Auto-loaded from Topic) - {topicCompetencies.length} competencies
                  </label>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {topicCompetencies.map(comp => (
                      <div key={comp.id} style={{ 
                        marginBottom: '8px', 
                        padding: '10px', 
                        backgroundColor: 'white', 
                        borderRadius: '5px',
                        border: (formData.competencyIds || []).includes(comp.id) ? '2px solid #4caf50' : '1px solid #ddd'
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={(formData.competencyIds || []).includes(comp.id)}
                            onChange={(e) => {
                              const currentIds = formData.competencyIds || [];
                              if (e.target.checked) {
                                setFormData({ ...formData, competencyIds: [...currentIds, comp.id] });
                              } else {
                                setFormData({ ...formData, competencyIds: currentIds.filter(id => id !== comp.id) });
                              }
                            }}
                            style={{ marginRight: '10px' }}
                          />
                          <span>
                            <strong style={{ color: '#1976d2' }}>{comp.code}</strong> - {comp.title}
                            {comp.domain && <span style={{ marginLeft: '8px', color: '#666', fontSize: '12px' }}>({comp.domain})</span>}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <small style={{ color: '#666', display: 'block', marginTop: '10px' }}>
                    ℹ️ Select competencies this resource will help students develop
                  </small>
                </div>
              )}

              {(formData.resourceType === 'DOCUMENT' || formData.resourceType === 'REFERENCE') && (
                <div className="form-group">
                  <label>Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={10}
                    placeholder="Write your content here..."
                  />
                </div>
              )}

              <div className="form-group">
                <label>
                  Upload File 
                  {formData.resourceType === 'IMAGE' && ' (JPG, PNG, GIF)'}
                  {formData.resourceType === 'VIDEO' && ' (MP4, WebM)'}
                  {formData.resourceType === 'AUDIO' && ' (MP3, WAV)'}
                  {formData.resourceType === 'DOCUMENT' && ' (PDF, DOC, DOCX)'}
                  {formData.resourceType === 'PRESENTATION' && ' (PPT, PPTX, PDF)'}
                </label>
                <input 
                  type="file" 
                  onChange={handleFileChange} 
                  accept={
                    formData.resourceType === 'IMAGE' ? '.jpg,.jpeg,.png,.gif,.webp' :
                    formData.resourceType === 'VIDEO' ? '.mp4,.webm,.mov' :
                    formData.resourceType === 'AUDIO' ? '.mp3,.wav,.ogg' :
                    formData.resourceType === 'PRESENTATION' ? '.ppt,.pptx,.pdf' :
                    '.pdf,.doc,.docx,.mp4,.jpg,.jpeg,.png'
                  }
                />
                {file && <small style={{ display: 'block', marginTop: '5px', color: '#4caf50' }}>✓ Selected: {file.name}</small>}
              </div>

              <div className="form-group">
                <label>Tags</label>
                <div className="tag-input">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                  />
                  <button type="button" onClick={addTag} className="btn btn-sm">
                    Add
                  </button>
                </div>
                <div className="tags-list">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {selectedResource ? 'Update' : 'Create'} Resource
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setSelectedResource(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="resources-grid">
        {resources.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📚</div>
            <h2>No Resources Yet</h2>
            <p>Create your first self-paced learning resource to get started!</p>
            <button
              className="btn-primary-large"
              onClick={() => {
                setShowCreateForm(true);
                setSelectedResource(null);
                setFormData({
                  title: '',
                  description: '',
                  resourceType: 'VIDEO',
                  content: '',
                  subject: '',
                  academicYear: '',
                  tags: [],
                  topicId: '',
                  competencyIds: [],
                });
              }}
            >
              + CREATE RESOURCE
            </button>
          </div>
        ) : (
          resources.map((resource) => (
            <div key={resource.id} className="resource-card">
              <div className="resource-header">
                <span className={`badge badge-${resource.resourceType === 'VIDEO' ? 'success' : resource.resourceType === 'DOCUMENT' ? 'warning' : resource.resourceType === 'MCQ' ? 'info' : 'secondary'}`}>
                  {resource.resourceType}
                </span>
                <div className="resource-actions">
                  <button className="btn-text-small" onClick={() => handleEdit(resource)} title="Edit">
                    ✏️ Edit
                  </button>
                  <button className="btn-text-small" onClick={() => handleDelete(resource.id)} title="Archive">
                    🗑️ Delete
                  </button>
                </div>
              </div>

              <h3>{resource.title}</h3>
              {resource.description && <p className="description">{resource.description}</p>}

              <div className="resource-meta">
                {resource.subject && <span className="meta-item">📚 {resource.subject}</span>}
                {resource.academicYear && <span className="meta-item">🎓 {resource.academicYear}</span>}
                <span className="meta-item">👁️ {resource.viewCount} views</span>
              </div>

              {resource.tags.length > 0 && (
                <div className="tags-list">
                  {resource.tags.map((tag) => (
                    <span key={tag} className="badge badge-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="resource-footer">
                <small>Created {new Date(resource.createdAt).toLocaleDateString()}</small>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
};

export default SelfPacedContentManager;
