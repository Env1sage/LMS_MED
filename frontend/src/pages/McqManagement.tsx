import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import mcqService, { Mcq, CreateMcqDto } from '../services/mcq.service';
import competencyService from '../services/competency.service';
import { Competency, CompetencyStatus } from '../types';
import BulkMcqUpload from '../components/publisher/BulkMcqUpload';
import CompetencySearch from '../components/common/CompetencySearch';
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
  
  // Form state
  const [formData, setFormData] = useState<CreateMcqDto>({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    optionE: '',
    correctAnswer: 'A',
    explanation: '',
    subject: 'Anatomy',
    topic: '',
    difficultyLevel: 'INTERMEDIATE',
    bloomsLevel: 'UNDERSTAND',
    competencyIds: [],
    tags: [],
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (selectedMcq) {
        await mcqService.update(selectedMcq.id, formData);
        setSuccess('MCQ updated successfully!');
      } else {
        await mcqService.create(formData);
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
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      optionE: '',
      correctAnswer: 'A',
      explanation: '',
      subject: 'Anatomy',
      topic: '',
      difficultyLevel: 'INTERMEDIATE',
      bloomsLevel: 'UNDERSTAND',
      competencyIds: [],
      tags: [],
    });
    setSelectedMcq(null);
  };

  const editMcq = (mcq: Mcq) => {
    setSelectedMcq(mcq);
    setFormData({
      question: mcq.question,
      questionImage: mcq.questionImage,
      optionA: mcq.optionA,
      optionB: mcq.optionB,
      optionC: mcq.optionC,
      optionD: mcq.optionD,
      optionE: mcq.optionE || '',
      correctAnswer: mcq.correctAnswer,
      explanation: mcq.explanation || '',
      subject: mcq.subject,
      topic: mcq.topic,
      difficultyLevel: mcq.difficultyLevel,
      bloomsLevel: mcq.bloomsLevel,
      competencyIds: mcq.competencyIds,
      tags: mcq.tags,
      year: mcq.year,
      source: mcq.source,
    });
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

            <div className="form-group">
              <label>Question *</label>
              <textarea
                required
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                rows={3}
                placeholder="Enter the question..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Subject *</label>
                <select
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                >
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Topic *</label>
                <input
                  type="text"
                  required
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="e.g., Cardiovascular System"
                />
              </div>
            </div>

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

              <div className="form-group">
                <label>Option E (Optional)</label>
                <input
                  type="text"
                  value={formData.optionE}
                  onChange={(e) => setFormData({ ...formData, optionE: e.target.value })}
                />
              </div>

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

            <div className="form-group">
              <label>Explanation</label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={3}
                placeholder="Explain why the answer is correct..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Difficulty Level *</label>
                <select
                  required
                  value={formData.difficultyLevel}
                  onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value })}
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>

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
