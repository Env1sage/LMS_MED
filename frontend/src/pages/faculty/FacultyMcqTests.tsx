import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import apiService from '../../services/api.service';
import { API_BASE_URL } from '../../config/api';
import { ArrowLeft, FileText, Plus, Trash2, Upload, CheckCircle, Search, X, ClipboardList } from 'lucide-react';
import '../../styles/bitflow-owner.css';

const ACCENT = '#7C3AED';

interface MCQ {
  id: string; question: string; optionA: string; optionB: string; optionC?: string; optionD?: string;
  correctAnswer: string; explanation?: string; subject: string; topic?: string; difficultyLevel: string;
  createdAt: string; status: string;
}

interface Test {
  id: string; title: string; type: string; status: string; totalQuestions: number; totalMarks: number;
  durationMinutes: number; createdAt: string; course?: { id: string; title: string };
  _count?: { questions: number; assignments: number; attempts: number };
}

const FacultyMcqTests: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'mcqs' | 'tests' | 'upload'>('mcqs');
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Create MCQ form
  const [showMcqForm, setShowMcqForm] = useState(false);
  const [mcqForm, setMcqForm] = useState({ question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', explanation: '', subject: '', topic: '', difficultyLevel: 'K' });

  // Create Test form
  const [showTestForm, setShowTestForm] = useState(false);
  const [testForm, setTestForm] = useState({ title: '', description: '', type: 'SCHEDULED_TEST', subject: '', durationMinutes: 60, totalMarks: 0, passingMarks: 0, shuffleQuestions: true, negativeMarkingEnabled: false, negativeMarkPerQuestion: 0 });

  // Add questions modal
  const [showAddQuestions, setShowAddQuestions] = useState<string | null>(null);
  const [availableMcqs, setAvailableMcqs] = useState<MCQ[]>([]);
  const [selectedMcqIds, setSelectedMcqIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, [tab]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'mcqs') {
        const res = await apiService.get<MCQ[]>('/faculty/tests/mcqs/my');
        setMcqs(res.data || []);
      } else if (tab === 'tests') {
        const res = await apiService.get<Test[]>('/faculty/tests');
        setTests(res.data || []);
      }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, [tab]);

  const handleCreateMcq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.post('/faculty/tests/mcqs', mcqForm);
      setSuccess('MCQ created'); setShowMcqForm(false);
      setMcqForm({ question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', explanation: '', subject: '', topic: '', difficultyLevel: 'K' });
      loadData();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.post('/faculty/tests', testForm);
      setSuccess('Test created'); setShowTestForm(false);
      setTestForm({ title: '', description: '', type: 'SCHEDULED_TEST', subject: '', durationMinutes: 60, totalMarks: 0, passingMarks: 0, shuffleQuestions: true, negativeMarkingEnabled: false, negativeMarkPerQuestion: 0 });
      loadData();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE_URL}/faculty/tests/mcqs/bulk-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setSuccess(`Uploaded ${data.uploaded} MCQs`);
      setTab('mcqs');
      loadData();
    } catch (err: any) { setError(err.message || 'Upload failed'); }
    e.target.value = '';
  };

  const openAddQuestions = async (testId: string) => {
    setShowAddQuestions(testId);
    try {
      const [myRes, availRes] = await Promise.all([
        apiService.get<MCQ[]>('/faculty/tests/mcqs/my'),
        apiService.get<MCQ[]>('/faculty/tests/mcqs/available').catch(() => ({ data: [] })),
      ]);
      setAvailableMcqs([...(myRes.data || []), ...(availRes.data || [])]);
    } catch { setAvailableMcqs([]); }
  };

  const handleAddQuestions = async () => {
    if (!showAddQuestions || selectedMcqIds.size === 0) return;
    try {
      await apiService.post(`/faculty/tests/${showAddQuestions}/questions`, { mcqIds: Array.from(selectedMcqIds), marks: 1 });
      setSuccess('Questions added'); setShowAddQuestions(null); setSelectedMcqIds(new Set()); loadData();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handlePublishTest = async (testId: string) => {
    try {
      await apiService.post(`/faculty/tests/${testId}/publish`, {});
      setSuccess('Test published'); loadData();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!window.confirm('Delete this test?')) return;
    try {
      await apiService.delete(`/faculty/tests/${testId}`);
      setSuccess('Test deleted'); loadData();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block' };

  const filteredMcqs = mcqs.filter(m => m.question.toLowerCase().includes(search.toLowerCase()) || m.subject.toLowerCase().includes(search.toLowerCase()));

  return (
    <FacultyLayout>
      <button
        onClick={() => navigate('/faculty')}
        className="bo-btn bo-btn-outline"
        style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>MCQs & Test Series</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Create MCQs, build test series, and manage assessments</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'mcqs' && <button className="bo-btn bo-btn-primary" style={{ background: ACCENT }} onClick={() => setShowMcqForm(true)}><Plus size={14} /> New MCQ</button>}
          {tab === 'tests' && <button className="bo-btn bo-btn-primary" style={{ background: ACCENT }} onClick={() => setShowTestForm(true)}><Plus size={14} /> New Test</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--bo-border)' }}>
        {[{ key: 'mcqs', label: 'My MCQs', icon: <FileText size={14} /> }, { key: 'tests', label: 'Test Series', icon: <ClipboardList size={14} /> }, { key: 'upload', label: 'Bulk Upload', icon: <Upload size={14} /> }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: '10px 20px', border: 'none', borderBottom: tab === t.key ? `2px solid ${ACCENT}` : '2px solid transparent', background: 'none', cursor: 'pointer', fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? ACCENT : 'var(--bo-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: -2 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}>×</button></div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

      {/* MCQs Tab */}
      {tab === 'mcqs' && (
        <>
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--bo-text-muted)' }} />
            <input type="text" placeholder="Search MCQs..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div> : filteredMcqs.length === 0 ? (
            <div className="bo-card" style={{ textAlign: 'center', padding: 60 }}>
              <FileText size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 500 }}>No MCQs yet</div>
              <div style={{ color: 'var(--bo-text-muted)', fontSize: 12, marginTop: 4 }}>Create individual MCQs or bulk upload via CSV</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {filteredMcqs.map(m => (
                <div key={m.id} className="bo-card" style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{m.question}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, background: m.correctAnswer === 'A' ? '#D1FAE5' : '#F3F4F6' }}>A: {m.optionA}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 4, background: m.correctAnswer === 'B' ? '#D1FAE5' : '#F3F4F6' }}>B: {m.optionB}</span>
                        {m.optionC && <span style={{ padding: '2px 8px', borderRadius: 4, background: m.correctAnswer === 'C' ? '#D1FAE5' : '#F3F4F6' }}>C: {m.optionC}</span>}
                        {m.optionD && <span style={{ padding: '2px 8px', borderRadius: 4, background: m.correctAnswer === 'D' ? '#D1FAE5' : '#F3F4F6' }}>D: {m.optionD}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: '#EDE9FE', color: ACCENT }}>{m.subject}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, background: '#F3F4F6' }}>{m.difficultyLevel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tests Tab */}
      {tab === 'tests' && (
        loading ? <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div> : tests.length === 0 ? (
          <div className="bo-card" style={{ textAlign: 'center', padding: 60 }}>
            <ClipboardList size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 500 }}>No test series yet</div>
            <div style={{ color: 'var(--bo-text-muted)', fontSize: 12, marginTop: 4 }}>Create a test and add MCQs to build a test series</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {tests.map(t => (
              <div key={t.id} className="bo-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: t.status === 'ACTIVE' ? '#D1FAE5' : t.status === 'DRAFT' ? '#FEF3C7' : '#F3F4F6', color: t.status === 'ACTIVE' ? '#065F46' : t.status === 'DRAFT' ? '#92400E' : '#6B7280' }}>{t.status}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, background: '#EDE9FE', color: ACCENT }}>{t.type.replace(/_/g, ' ')}</span>
                    </div>
                    {t.course && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Course: {t.course.title}</div>}
                    <div style={{ fontSize: 12, color: 'var(--bo-text-secondary)', display: 'flex', gap: 16 }}>
                      <span>{t._count?.questions || t.totalQuestions} questions</span>
                      <span>{t.totalMarks} marks</span>
                      <span>{t.durationMinutes} min</span>
                      <span>{t._count?.assignments || 0} assigned</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="bo-btn bo-btn-outline" style={{ fontSize: 11, padding: '6px 10px' }} onClick={() => openAddQuestions(t.id)}>
                      <Plus size={12} /> Add MCQs
                    </button>
                    {t.status === 'DRAFT' && (
                      <button className="bo-btn bo-btn-primary" style={{ fontSize: 11, padding: '6px 10px', background: '#10B981' }} onClick={() => handlePublishTest(t.id)}>
                        <CheckCircle size={12} /> Publish
                      </button>
                    )}
                    <button onClick={() => handleDeleteTest(t.id)} style={{ padding: '6px 8px', border: '1px solid var(--bo-border)', borderRadius: 6, background: 'white', cursor: 'pointer', color: '#EF4444' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Bulk Upload Tab */}
      {tab === 'upload' && (
        <div className="bo-card" style={{ padding: 40, textAlign: 'center' }}>
          <Upload size={48} style={{ color: ACCENT, opacity: 0.5, marginBottom: 16 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Bulk Upload MCQs</h3>
          <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Upload a CSV file with columns: question, optionA, optionB, optionC, optionD, correctAnswer, explanation, subject, topic, difficultyLevel
          </p>
          <label className="bo-btn bo-btn-primary" style={{ background: ACCENT, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Upload size={14} /> Choose CSV File
            <input type="file" accept=".csv" onChange={handleBulkUpload} style={{ display: 'none' }} />
          </label>
          <div style={{ marginTop: 24, padding: 16, background: '#F9FAFB', borderRadius: 8, textAlign: 'left', maxWidth: 600, margin: '24px auto 0' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>CSV Template:</div>
            <code style={{ fontSize: 11, color: 'var(--bo-text-secondary)', whiteSpace: 'pre-wrap' }}>
              question,optionA,optionB,optionC,optionD,correctAnswer,explanation,subject,topic,difficultyLevel{'\n'}
              "What is the normal heart rate?","60-100 bpm","120-160 bpm","30-50 bpm","200-250 bpm","A","Normal resting heart rate","Physiology","Cardiovascular","K"
            </code>
          </div>
        </div>
      )}

      {/* Create MCQ Modal */}
      {showMcqForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowMcqForm(false)}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--bo-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Create MCQ</h3>
              <button onClick={() => setShowMcqForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateMcq} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Question *</label>
                <textarea value={mcqForm.question} onChange={e => setMcqForm(p => ({ ...p, question: e.target.value }))} required rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div><label style={labelStyle}>Option A *</label><input value={mcqForm.optionA} onChange={e => setMcqForm(p => ({ ...p, optionA: e.target.value }))} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Option B *</label><input value={mcqForm.optionB} onChange={e => setMcqForm(p => ({ ...p, optionB: e.target.value }))} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Option C</label><input value={mcqForm.optionC} onChange={e => setMcqForm(p => ({ ...p, optionC: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Option D</label><input value={mcqForm.optionD} onChange={e => setMcqForm(p => ({ ...p, optionD: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Correct Answer *</label>
                  <select value={mcqForm.correctAnswer} onChange={e => setMcqForm(p => ({ ...p, correctAnswer: e.target.value }))} style={inputStyle}>
                    <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Subject *</label>
                  <input value={mcqForm.subject} onChange={e => setMcqForm(p => ({ ...p, subject: e.target.value }))} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Difficulty</label>
                  <select value={mcqForm.difficultyLevel} onChange={e => setMcqForm(p => ({ ...p, difficultyLevel: e.target.value }))} style={inputStyle}>
                    <option value="K">Knowledge (K)</option><option value="KH">Know How (KH)</option><option value="S">Shows How (S)</option><option value="SH">Shows (SH)</option><option value="P">Performance (P)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Explanation</label>
                <textarea value={mcqForm.explanation} onChange={e => setMcqForm(p => ({ ...p, explanation: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="bo-btn bo-btn-outline" onClick={() => setShowMcqForm(false)}>Cancel</button>
                <button type="submit" className="bo-btn bo-btn-primary" style={{ background: ACCENT }}>Create MCQ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Test Modal */}
      {showTestForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowTestForm(false)}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 550, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--bo-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Create Test Series</h3>
              <button onClick={() => setShowTestForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTest} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Title *</label>
                <input value={testForm.title} onChange={e => setTestForm(p => ({ ...p, title: e.target.value }))} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description</label>
                <textarea value={testForm.description} onChange={e => setTestForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={testForm.type} onChange={e => setTestForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                    <option value="SCHEDULED_TEST">Scheduled Test</option>
                    <option value="PRACTICE_TEST">Practice Test</option>
                    <option value="QUIZ">Quiz</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Subject</label>
                  <input value={testForm.subject} onChange={e => setTestForm(p => ({ ...p, subject: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Duration (min)</label>
                  <input type="number" value={testForm.durationMinutes} onChange={e => setTestForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Total Marks</label>
                  <input type="number" value={testForm.totalMarks} onChange={e => setTestForm(p => ({ ...p, totalMarks: Number(e.target.value) }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Passing Marks</label>
                  <input type="number" value={testForm.passingMarks} onChange={e => setTestForm(p => ({ ...p, passingMarks: Number(e.target.value) }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={testForm.shuffleQuestions} onChange={e => setTestForm(p => ({ ...p, shuffleQuestions: e.target.checked }))} /> Shuffle Questions
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={testForm.negativeMarkingEnabled} onChange={e => setTestForm(p => ({ ...p, negativeMarkingEnabled: e.target.checked }))} /> Negative Marking
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="bo-btn bo-btn-outline" onClick={() => setShowTestForm(false)}>Cancel</button>
                <button type="submit" className="bo-btn bo-btn-primary" style={{ background: ACCENT }}>Create Test</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Questions Modal */}
      {showAddQuestions && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => { setShowAddQuestions(null); setSelectedMcqIds(new Set()); }}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 700, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--bo-border)', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Select MCQs ({selectedMcqIds.size} selected)</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="bo-btn bo-btn-primary" style={{ background: ACCENT, fontSize: 12 }} onClick={handleAddQuestions} disabled={selectedMcqIds.size === 0}>
                  Add Selected
                </button>
                <button onClick={() => { setShowAddQuestions(null); setSelectedMcqIds(new Set()); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              {availableMcqs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>No MCQs available. Create some first.</div>
              ) : availableMcqs.map(m => (
                <label key={m.id} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: selectedMcqIds.has(m.id) ? `${ACCENT}08` : 'transparent', border: `1px solid ${selectedMcqIds.has(m.id) ? ACCENT : 'var(--bo-border)'}` }}>
                  <input type="checkbox" checked={selectedMcqIds.has(m.id)}
                    onChange={e => { const next = new Set(selectedMcqIds); e.target.checked ? next.add(m.id) : next.delete(m.id); setSelectedMcqIds(next); }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.question}</div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                      {m.subject} · {m.difficultyLevel} · Answer: {m.correctAnswer}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </FacultyLayout>
  );
};

export default FacultyMcqTests;
