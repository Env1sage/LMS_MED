import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PublisherLayout from '../components/publisher/PublisherLayout';
import BulkMcqUpload from '../components/publisher/BulkMcqUpload';
import mcqService, { Mcq, CreateMcqDto, McqStats } from '../services/mcq.service';
import topicsService, { Topic } from '../services/topics.service';
import FileUploadButton from '../components/publisher/FileUploadButton';
import CompetencySearch from '../components/common/CompetencySearch';
import TopicSearch from '../components/TopicSearch';
import { API_BASE_URL } from '../config/api';
import {
  Search, PlusCircle, Edit2, Trash2, ChevronLeft, ChevronRight,
  BarChart3, Upload, List, X, Check, Eye, Filter, FileQuestion, Image, FileText as FileTextIcon
} from 'lucide-react';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

type TabId = 'list' | 'create' | 'bulk' | 'stats';

const McqManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('list');

  // List state
  const [mcqs, setMcqs] = useState<Mcq[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);

  // Stats state
  const [stats, setStats] = useState<McqStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Create/Edit form state
  const [editingMcq, setEditingMcq] = useState<Mcq | null>(null);
  const [formData, setFormData] = useState<CreateMcqDto>({
    question: '', optionA: '', optionB: '', optionC: '', optionD: '', optionE: '',
    correctAnswer: 'A', subject: '', topic: '', difficultyLevel: 'K',
    bloomsLevel: 'REMEMBER', explanation: '', competencyIds: [], tags: [],
    mcqType: 'NORMAL', questionImage: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [visibleOptions, setVisibleOptions] = useState<string[]>(['A', 'B']);

  // View state
  const [viewingMcq, setViewingMcq] = useState<Mcq | null>(null);

  // Competency & Topic state
  const [availableCompetencies, setAvailableCompetencies] = useState<Array<{
    id: string; code: string; title: string; description: string;
    subject: string; domain?: string; academicLevel?: string;
  }>>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>(undefined);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (activeTab === 'list') loadMcqs();
    if (activeTab === 'stats') loadStats();
  }, [activeTab, page, filterSubject, filterDifficulty]);

  const loadSubjects = async () => {
    try {
      const s = await topicsService.getSubjects();
      setSubjects(s);
    } catch (err) { console.error('Failed to load subjects:', err); }
  };

  const loadMcqs = useCallback(async () => {
    try {
      setListLoading(true);
      const params: any = { page, limit };
      if (searchTerm) params.search = searchTerm;
      if (filterSubject) params.subject = filterSubject;
      if (filterDifficulty) params.difficultyLevel = filterDifficulty;

      const res = await mcqService.getAll(params);
      // MCQ API returns {data, total, page, limit, totalPages} — NOT {data, meta}
      setMcqs(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 0);
    } catch (err) {
      console.error('Failed to load MCQs:', err);
      setMcqs([]);
    } finally {
      setListLoading(false);
    }
  }, [page, limit, searchTerm, filterSubject, filterDifficulty]);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const s = await mcqService.getStats();
      setStats(s);
    } catch (err) { console.error('Failed to load stats:', err); }
    finally { setStatsLoading(false); }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadMcqs();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this MCQ? This cannot be undone.')) return;
    try {
      setActionLoading(id);
      await mcqService.delete(id);
      loadMcqs();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (mcq: Mcq) => {
    setEditingMcq(mcq);
    setFormData({
      question: mcq.question,
      optionA: mcq.optionA,
      optionB: mcq.optionB,
      optionC: mcq.optionC,
      optionD: mcq.optionD,
      optionE: mcq.optionE || '',
      correctAnswer: mcq.correctAnswer,
      subject: mcq.subject,
      topic: mcq.topic || '',
      difficultyLevel: mcq.difficultyLevel,
      bloomsLevel: mcq.bloomsLevel,
      explanation: mcq.explanation || '',
      competencyIds: mcq.competencyIds || [],
      tags: mcq.tags || [],
      mcqType: mcq.mcqType || 'NORMAL',
      questionImage: mcq.questionImage || '',
    });
    // Show options that have content
    const opts = ['A', 'B'];
    if (mcq.optionC) opts.push('C');
    if (mcq.optionD) opts.push('D');
    if (mcq.optionE) opts.push('E');
    setVisibleOptions(opts.length >= 2 ? opts : ['A', 'B']);
    setSelectedTopicId(mcq.topicId || undefined);
    setSelectedSubject(mcq.subject || '');
    setActiveTab('create');
    setFormError('');
    setFormSuccess('');
  };

  const startCreate = () => {
    setEditingMcq(null);
    setFormData({
      question: '', optionA: '', optionB: '', optionC: '', optionD: '', optionE: '',
      correctAnswer: 'A', subject: '', topic: '', difficultyLevel: 'K',
      bloomsLevel: 'REMEMBER', explanation: '', competencyIds: [], tags: [],
      mcqType: 'NORMAL', questionImage: '',
    });
    setVisibleOptions(['A', 'B']);
    setSelectedTopicId(undefined);
    setSelectedSubject('');
    setAvailableCompetencies([]);
    setActiveTab('create');
    setFormError('');
    setFormSuccess('');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.question || !formData.optionA || !formData.optionB) {
      setFormError('Question and at least Options A & B are required');
      return;
    }
    // Validate correctAnswer points to a visible option
    if (!visibleOptions.includes(formData.correctAnswer)) {
      setFormError(`Correct answer "${formData.correctAnswer}" doesn't have a corresponding option`);
      return;
    }
    if (!formData.subject) { setFormError('Subject is required'); return; }

    try {
      setFormSaving(true);
      const dto = { ...formData };
      // Clean up empty optional fields
      if (!dto.optionC) delete (dto as any).optionC;
      if (!dto.optionD) delete (dto as any).optionD;
      if (!dto.optionE) delete (dto as any).optionE;
      if (!dto.explanation) delete (dto as any).explanation;
      if (!dto.topic) delete (dto as any).topic;
      if (!dto.questionImage) delete (dto as any).questionImage;
      if (!dto.mcqType || dto.mcqType === 'NORMAL') delete (dto as any).mcqType;
      if (selectedTopicId) (dto as any).topicId = selectedTopicId;

      if (editingMcq) {
        await mcqService.update(editingMcq.id, dto);
        setFormSuccess('MCQ updated successfully!');
      } else {
        await mcqService.create(dto);
        setFormSuccess('MCQ created successfully!');
      }
      setTimeout(() => {
        setActiveTab('list');
        loadMcqs();
      }, 1000);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save MCQ');
    } finally {
      setFormSaving(false);
    }
  };

  const updateField = (field: keyof CreateMcqDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const diffLabel: Record<string, string> = { K: 'Knows', KH: 'Knows How', S: 'Shows', SH: 'Shows How', P: 'Performs' };
  const bloomsLevels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--bo-border)', fontSize: 14,
    background: 'var(--bo-bg)', color: 'var(--bo-text)',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer',
    appearance: 'none' as const, WebkitAppearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '14px',
    paddingRight: 34,
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: 'var(--bo-text-secondary)', marginBottom: 6,
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'list', label: 'All MCQs', icon: <List size={16} /> },
    { id: 'create', label: editingMcq ? 'Edit MCQ' : 'Create MCQ', icon: <PlusCircle size={16} /> },
    { id: 'bulk', label: 'Bulk Upload', icon: <Upload size={16} /> },
    { id: 'stats', label: 'Statistics', icon: <BarChart3 size={16} /> },
  ];

  return (
    <PublisherLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text)' }}>MCQ Management</h1>
        <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginTop: 4 }}>
          Create, manage, and bulk upload MCQs
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--bo-border)', marginBottom: 20 }}>
        {tabs.map(tab => (
          <button key={tab.id}
            onClick={() => { if (tab.id !== 'create') { setEditingMcq(null); } setActiveTab(tab.id); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--bo-primary)' : 'var(--bo-text-muted)',
              background: 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid var(--bo-primary)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW MODAL */}
      {viewingMcq && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setViewingMcq(null)}>
          <div className="bo-card" style={{ maxWidth: 700, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>MCQ Details</h3>
              <button onClick={() => setViewingMcq(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, lineHeight: 1.5 }}>{viewingMcq.question}</div>
            {['A', 'B', 'C', 'D', 'E'].map(letter => {
              const optVal = (viewingMcq as any)[`option${letter}`];
              if (!optVal) return null;
              const isCorrect = viewingMcq.correctAnswer === letter;
              return (
                <div key={letter} style={{
                  padding: '10px 14px', marginBottom: 6, borderRadius: 8,
                  border: `1px solid ${isCorrect ? '#10B981' : 'var(--bo-border)'}`,
                  background: isCorrect ? '#F0FDF4' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontWeight: 600, color: isCorrect ? '#10B981' : 'var(--bo-text-muted)', width: 20 }}>{letter}.</span>
                  <span>{optVal}</span>
                  {isCorrect && <Check size={16} style={{ color: '#10B981', marginLeft: 'auto' }} />}
                </div>
              );
            })}
            {viewingMcq.explanation && (
              <div style={{ marginTop: 16, padding: 12, background: '#EFF6FF', borderRadius: 8, fontSize: 13, color: '#1E40AF' }}>
                <strong>Explanation:</strong> {viewingMcq.explanation}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16, fontSize: 13 }}>
              <div><span style={{ color: 'var(--bo-text-muted)' }}>Subject:</span> {viewingMcq.subject}</div>
              <div><span style={{ color: 'var(--bo-text-muted)' }}>Topic:</span> {viewingMcq.topic || '—'}</div>
              <div><span style={{ color: 'var(--bo-text-muted)' }}>Difficulty:</span> {viewingMcq.difficultyLevel} — {diffLabel[viewingMcq.difficultyLevel] || viewingMcq.difficultyLevel}</div>
              <div><span style={{ color: 'var(--bo-text-muted)' }}>Bloom's:</span> {viewingMcq.bloomsLevel}</div>
              <div><span style={{ color: 'var(--bo-text-muted)' }}>Status:</span> {viewingMcq.status}</div>
              <div><span style={{ color: 'var(--bo-text-muted)' }}>Verified:</span> {viewingMcq.isVerified ? '✅' : '❌'}</div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="bo-btn bo-btn-outline" onClick={() => { startEdit(viewingMcq); setViewingMcq(null); }}>
                <Edit2 size={14} /> Edit
              </button>
              <button className="bo-btn bo-btn-outline" onClick={() => setViewingMcq(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* LIST TAB */}
      {activeTab === 'list' && (
        <>
          <div className="bo-card" style={{ padding: 16, marginBottom: 16 }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search MCQs..."
                  style={{ ...inputStyle, paddingLeft: 34 }} />
              </div>
              <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setPage(1); }}
                style={{ ...selectStyle, width: 'auto', minWidth: 160 }}>
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterDifficulty} onChange={e => { setFilterDifficulty(e.target.value); setPage(1); }}
                style={{ ...selectStyle, width: 'auto', minWidth: 140 }}>
                <option value="">All Levels</option>
                {Object.entries(diffLabel).map(([k, v]) => <option key={k} value={k}>{k} - {v}</option>)}
              </select>
              <button type="submit" className="bo-btn bo-btn-outline"><Filter size={14} /> Search</button>
              <button type="button" className="bo-btn bo-btn-primary" onClick={startCreate}>
                <PlusCircle size={14} /> New MCQ
              </button>
            </form>
          </div>

          <div className="bo-card" style={{ overflow: 'hidden' }}>
            {listLoading ? (
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
                <div className="loading-title">Loading MCQs</div>
                <div className="loading-bar-track">
                  <div className="loading-bar-fill"></div>
                </div>
              </div>
            ) : mcqs.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
                No MCQs found.
                <button className="bo-btn bo-btn-primary" style={{ marginTop: 12, display: 'block', margin: '12px auto 0' }}
                  onClick={startCreate}><PlusCircle size={14} /> Create MCQ</button>
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bo-bg)', borderBottom: '1px solid var(--bo-border)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Question</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Subject</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Level</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Bloom's</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Verified</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--bo-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mcqs.map(mcq => (
                      <tr key={mcq.id} style={{ borderBottom: '1px solid var(--bo-border)', cursor: 'pointer' }}
                        onClick={() => setViewingMcq(mcq)}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bo-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '12px 14px', maxWidth: 400 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mcq.question}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Answer: {mcq.correctAnswer}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>{mcq.subject}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: 12 }}>{mcq.difficultyLevel}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: 12 }}>{mcq.bloomsLevel}</span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {mcq.isVerified ? <Check size={16} style={{ color: '#10B981' }} /> : <span style={{ color: '#F59E0B' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                            <button title="View" className="bo-btn bo-btn-outline" style={{ padding: '4px 8px' }}
                              onClick={() => setViewingMcq(mcq)}><Eye size={14} /></button>
                            <button title="Edit" className="bo-btn bo-btn-outline" style={{ padding: '4px 8px' }}
                              onClick={() => startEdit(mcq)}><Edit2 size={14} /></button>
                            <button title="Delete" className="bo-btn bo-btn-outline" style={{ padding: '4px 8px', color: 'var(--bo-danger)' }}
                              disabled={actionLoading === mcq.id}
                              onClick={() => handleDelete(mcq.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--bo-border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
                      Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}
                        disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                        const p = start + i;
                        if (p > totalPages) return null;
                        return (
                          <button key={p} className={`bo-btn ${p === page ? 'bo-btn-primary' : 'bo-btn-outline'}`}
                            style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setPage(p)}>{p}</button>
                        );
                      })}
                      <button className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}
                        disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* CREATE/EDIT TAB */}
      {activeTab === 'create' && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {formError && (
            <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 14, marginBottom: 16 }}>{formError}</div>
          )}
          {formSuccess && (
            <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#16A34A', fontSize: 14, marginBottom: 16 }}>{formSuccess}</div>
          )}

          <form onSubmit={handleFormSubmit}>
            {/* MCQ TYPE SELECTOR */}
            <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>MCQ Type</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { value: 'NORMAL', label: 'Normal', icon: <FileQuestion size={20} />, desc: 'Standard text-based MCQ' },
                  { value: 'SCENARIO_BASED', label: 'Scenario Based', icon: <FileTextIcon size={20} />, desc: 'Clinical case / vignette' },
                  { value: 'IMAGE_BASED', label: 'Image Based', icon: <Image size={20} />, desc: 'MCQ with an image' },
                ].map(t => (
                  <div key={t.value}
                    onClick={() => updateField('mcqType', t.value)}
                    style={{
                      padding: '16px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${formData.mcqType === t.value ? 'var(--bo-primary, #c47335)' : 'var(--bo-border)'}`,
                      background: formData.mcqType === t.value ? 'rgba(196, 115, 53, 0.06)' : 'var(--bo-card-bg, #fff)',
                      transition: 'all 0.2s', textAlign: 'center',
                    }}>
                    <div style={{ color: formData.mcqType === t.value ? 'var(--bo-primary)' : 'var(--bo-text-muted)', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                      {t.icon}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: formData.mcqType === t.value ? 'var(--bo-primary)' : 'var(--bo-text)' }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 2 }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* SCENARIO TEXT - only for SCENARIO_BASED */}
            {formData.mcqType === 'SCENARIO_BASED' && (
              <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileTextIcon size={16} style={{ color: 'var(--bo-primary)' }} />
                  Clinical Scenario / Case Vignette *
                </h3>
                <p style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 12 }}>
                  Write the full clinical scenario including patient history, exam findings, lab values, and end with the question.
                </p>

                <textarea style={{ ...inputStyle, minHeight: 140, lineHeight: '1.6' }}
                  value={formData.question}
                  onChange={e => updateField('question', e.target.value)} required
                  placeholder={"A 45-year-old male presents to the emergency department with acute chest pain radiating to the left arm. He has a history of hypertension and diabetes mellitus type 2. On examination, BP is 160/100 mmHg, pulse is 110/min, and ECG shows ST elevation in leads II, III, and aVF.\n\nWhat is the most appropriate next step in management?"} />
              </div>
            )}

            {/* IMAGE UPLOAD - Available for all MCQ types */}
            <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Image size={16} style={{ color: 'var(--bo-primary)' }} />
                {formData.mcqType === 'IMAGE_BASED' ? 'Question Image *' : 'Attach Image (Optional)'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 12 }}>
                {formData.mcqType === 'IMAGE_BASED' 
                  ? 'Upload an image (X-ray, ECG, histopathology slide, etc.) that the question refers to.'
                  : 'Add an X-ray, ECG, lab report, histopathology slide, clinical photograph, or any supporting image for this MCQ.'}
              </p>
              {formData.questionImage ? (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ position: 'relative', display: 'inline-block', borderRadius: 8, overflow: 'hidden', border: '2px solid var(--bo-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <img
                      src={formData.questionImage.startsWith('/uploads/')
                        ? `${API_BASE_URL.replace('/api', '')}/api${formData.questionImage}?token=${localStorage.getItem('accessToken')}`
                        : formData.questionImage}
                      alt="MCQ Image"
                      style={{ maxWidth: '100%', maxHeight: 300, display: 'block' }}
                    />
                    <button type="button"
                      onClick={() => updateField('questionImage', '')}
                      style={{
                        position: 'absolute', top: 8, right: 8, background: 'rgba(220, 38, 38, 0.9)',
                        border: 'none', borderRadius: '50%', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff', transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.9)'}>
                      <X size={16} />
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 8 }}>
                    ✓ Image uploaded successfully. Click X to remove and upload a different image.
                  </p>
                </div>
              ) : (
                <div>
                  <FileUploadButton
                    fileType="image"
                    label={`${formData.mcqType === 'IMAGE_BASED' ? '📤 Upload Question Image (Required)' : '📤 Upload Supporting Image'}`}
                    onUploadComplete={url => updateField('questionImage', url)}
                  />
                  <p style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 8 }}>
                    Accepted formats: JPG, PNG, GIF, WebP • Max size: 10MB
                  </p>
                </div>
              )}
            </div>

            {/* QUESTION TEXT - shown for NORMAL and IMAGE_BASED (scenario has its own textarea above) */}
            {formData.mcqType !== 'SCENARIO_BASED' && (
              <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
                  {formData.mcqType === 'IMAGE_BASED' ? 'Question (about the image above)' : 'Question'}
                </h3>
                <div>
                  <label style={labelStyle}>Question Text *</label>
                  <textarea style={{ ...inputStyle, minHeight: 80 }} value={formData.question}
                    onChange={e => updateField('question', e.target.value)} required
                    placeholder={formData.mcqType === 'IMAGE_BASED'
                      ? 'What does the above image show? / Identify the structure marked with an arrow...'
                      : 'Enter the MCQ question...'} />
                </div>
              </div>
            )}

            <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Options & Answer</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {visibleOptions.map((letter, idx) => (
                  <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 600,
                      background: formData.correctAnswer === letter ? '#10B981' : 'var(--bo-bg)',
                      color: formData.correctAnswer === letter ? '#fff' : 'var(--bo-text-muted)',
                      border: `2px solid ${formData.correctAnswer === letter ? '#10B981' : 'var(--bo-border)'}`,
                      cursor: 'pointer', flexShrink: 0,
                    }} onClick={() => updateField('correctAnswer', letter)}
                       title={`Mark ${letter} as correct answer`}>
                      {letter}
                    </div>
                    <input style={{ ...inputStyle, flex: 1 }}
                      value={(formData as any)[`option${letter}`] || ''}
                      onChange={e => updateField(`option${letter}` as any, e.target.value)}
                      placeholder={`Option ${letter}${idx < 2 ? ' *' : ''}`}
                      required={idx < 2} />
                    {/* Remove button — only for options beyond the first 2 */}
                    {idx >= 2 && (
                      <button type="button" title={`Remove Option ${letter}`}
                        onClick={() => {
                          updateField(`option${letter}` as any, '');
                          setVisibleOptions(prev => prev.filter(l => l !== letter));
                          // If correct answer was on this option, reset to A
                          if (formData.correctAnswer === letter) updateField('correctAnswer', 'A');
                        }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--bo-text-muted)', padding: 4, borderRadius: 4,
                          display: 'flex', alignItems: 'center', flexShrink: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--bo-text-muted)'}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add option button */}
              {visibleOptions.length < 5 && (
                <button type="button"
                  onClick={() => {
                    const allOpts = ['A', 'B', 'C', 'D', 'E'];
                    const next = allOpts.find(l => !visibleOptions.includes(l));
                    if (next) setVisibleOptions(prev => [...prev, next]);
                  }}
                  style={{
                    marginTop: 12, padding: '8px 16px', fontSize: 12, fontWeight: 600,
                    background: 'none', border: '1px dashed var(--bo-border)',
                    borderRadius: 8, cursor: 'pointer', color: 'var(--bo-primary, #c47335)',
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                    justifyContent: 'center', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--bo-primary, #c47335)';
                    e.currentTarget.style.background = 'rgba(196, 115, 53, 0.04)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--bo-border)';
                    e.currentTarget.style.background = 'none';
                  }}>
                  <PlusCircle size={14} /> Add Option {['A','B','C','D','E'].find(l => !visibleOptions.includes(l))}
                </button>
              )}

              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--bo-text-muted)' }}>
                Click the letter circle to mark the correct answer. Current: <strong>{formData.correctAnswer}</strong>
                {visibleOptions.length < 3 && <span style={{ marginLeft: 8, fontStyle: 'italic' }}>• Min 2 options required</span>}
              </div>
            </div>

            {/* Topic & Competency Mapping */}
            <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Topic & Competency Mapping</h3>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Search Topic (from CBME Repository)</label>
                <TopicSearch
                  selectedTopicId={selectedTopicId}
                  selectedSubject={selectedSubject}
                  onTopicSelect={(topic: Topic | null) => {
                    if (topic) {
                      setSelectedTopicId(topic.id);
                      updateField('topic', topic.name);
                      updateField('subject', topic.subject);
                      setSelectedSubject(topic.subject);
                    } else {
                      setSelectedTopicId(undefined);
                      updateField('topic', '');
                    }
                  }}
                  onSubjectSelect={(s: string) => {
                    setSelectedSubject(s);
                    if (s) updateField('subject', s);
                  }}
                  onCompetenciesLoad={(comps) => {
                    setAvailableCompetencies(comps);
                    // Auto-select all loaded competencies
                    updateField('competencyIds', comps.map(c => c.id));
                  }}
                  placeholder="Search topics to auto-fill subject & competencies..."
                />
              </div>
              {availableCompetencies.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <CompetencySearch
                    competencies={availableCompetencies}
                    selectedIds={formData.competencyIds || []}
                    onChange={(ids) => updateField('competencyIds', ids)}
                    label="Map Competencies (auto-loaded from topic)"
                  />
                </div>
              )}
            </div>

            {/* Classification */}
            <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Classification</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Subject *</label>
                  <select
                    style={{ ...selectStyle, borderColor: !formData.subject ? '#F59E0B40' : 'var(--bo-border)' }}
                    value={formData.subject}
                    onChange={e => updateField('subject', e.target.value)}
                    required
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = !formData.subject ? '#F59E0B40' : 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Topic</label>
                  <input style={inputStyle} value={formData.topic || ''}
                    onChange={e => updateField('topic', e.target.value)}
                    placeholder="e.g. Cardiovascular System"
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Difficulty Level (Miller's Pyramid) *</label>
                  <select
                    style={selectStyle}
                    value={formData.difficultyLevel}
                    onChange={e => updateField('difficultyLevel', e.target.value)}
                    required
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {Object.entries(diffLabel).map(([k, v]) => (
                      <option key={k} value={k}>{k} — {v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Bloom's Taxonomy Level *</label>
                  <select
                    style={selectStyle}
                    value={formData.bloomsLevel}
                    onChange={e => updateField('bloomsLevel', e.target.value)}
                    required
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {bloomsLevels.map(bl => <option key={bl} value={bl}>{bl}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Explanation & Tags</h3>
              <div>
                <label style={labelStyle}>Explanation (shown after answer)</label>
                <textarea style={{ ...inputStyle, minHeight: 60 }} value={formData.explanation || ''}
                  onChange={e => updateField('explanation', e.target.value)}
                  placeholder="Why is this the correct answer?" />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>Tags (comma-separated)</label>
                <input style={inputStyle}
                  value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                  onChange={e => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  placeholder="e.g. pharmacology, NEET, cardiology" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="bo-btn bo-btn-outline"
                onClick={() => { setEditingMcq(null); setActiveTab('list'); }}>Cancel</button>
              <button type="submit" className="bo-btn bo-btn-primary" disabled={formSaving}
                style={{ padding: '10px 24px' }}>
                {formSaving ? 'Saving...' : editingMcq ? 'Update MCQ' : 'Create MCQ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BULK UPLOAD TAB */}
      {activeTab === 'bulk' && (
        <div className="bo-card" style={{ overflow: 'hidden' }}>
          <BulkMcqUpload onSuccess={() => { setActiveTab('list'); loadMcqs(); }} />
        </div>
      )}

      {/* STATISTICS TAB */}
      {activeTab === 'stats' && (
        <>
          {statsLoading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
              <div className="bo-spinner" style={{ margin: '0 auto 12px' }} /> Loading statistics...
            </div>
          ) : stats ? (
            <>
              {/* Overview Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <div className="bo-card" style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--bo-primary)' }}>{stats.total}</div>
                  <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginTop: 4 }}>Total MCQs</div>
                </div>
                <div className="bo-card" style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#10B981' }}>{stats.verified}</div>
                  <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginTop: 4 }}>Verified</div>
                </div>
                <div className="bo-card" style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#F59E0B' }}>{stats.unverified}</div>
                  <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginTop: 4 }}>Unverified</div>
                </div>
              </div>

              {/* Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="bo-card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>By Subject</h3>
                  {Object.entries(stats.bySubject || {}).map(([subj, count]) => (
                    <div key={subj} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bo-border)', fontSize: 13 }}>
                      <span>{subj}</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                  {Object.keys(stats.bySubject || {}).length === 0 && (
                    <div style={{ color: 'var(--bo-text-muted)', fontSize: 13 }}>No data</div>
                  )}
                </div>
                <div className="bo-card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>By Difficulty (Miller's Pyramid)</h3>
                  {Object.entries(stats.byDifficulty || {}).map(([level, count]) => (
                    <div key={level} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bo-border)', fontSize: 13 }}>
                      <span>{level} — {diffLabel[level] || level}</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                </div>
                <div className="bo-card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>By Status</h3>
                  {Object.entries(stats.byStatus || {}).map(([status, count]) => (
                    <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bo-border)', fontSize: 13 }}>
                      <span>{status}</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
              Failed to load statistics.
            </div>
          )}
        </>
      )}
    </PublisherLayout>
  );
};

export default McqManagement;
