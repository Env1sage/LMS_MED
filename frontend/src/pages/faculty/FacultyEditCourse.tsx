import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { courseService, LearningFlowStep, UpdateCourseData } from '../../services/course.service';
import learningUnitService from '../../services/learning-unit.service';
import competencyService from '../../services/competency.service';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Lock, Unlock, Search, X } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';

const FacultyEditCourse: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [courseStatus, setCourseStatus] = useState('');

  const [formData, setFormData] = useState({ title: '', description: '', academicYear: '', competencyIds: [] as string[] });
  const [steps, setSteps] = useState<LearningFlowStep[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [course, unitsRes, compsRes] = await Promise.all([
        courseService.getById(id!),
        learningUnitService.getAll({ page: 1, limit: 1000 }),
        competencyService.getAll({ page: 1, limit: 1000 }),
      ]);

      setCourseStatus(course.status);
      setFormData({
        title: course.title,
        description: course.description || '',
        academicYear: course.academicYear,
        competencyIds: (course.course_competencies || []).map((cc: any) => String(cc.competencies?.id || cc.competency?.id)),
      });

      const flowSteps: LearningFlowStep[] = (course.learning_flow_steps || []).map((s: any) => ({
        learningUnitId: s.learning_units?.id || s.learningUnit?.id,
        stepOrder: s.stepOrder,
        stepType: s.stepType,
        mandatory: s.mandatory,
        completionCriteria: s.completionCriteria,
      }));
      setSteps(flowSteps);
      setUnits(unitsRes.data || []);
      setCompetencies(compsRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCriteria = (type: string) => {
    if (type === 'VIDEO') return { videoMinWatchPercent: 80 };
    if (type === 'BOOK') return { bookMinReadDuration: 300 };
    return {};
  };

  const addStep = (unit: any) => {
    setSteps([...steps, {
      learningUnitId: unit.id,
      stepOrder: steps.length + 1,
      stepType: unit.type,
      mandatory: true,
      completionCriteria: getDefaultCriteria(unit.type),
    }]);
    setShowSelector(false);
  };

  const removeStep = (idx: number) => {
    const updated = steps.filter((_, i) => i !== idx);
    updated.forEach((s, i) => { s.stepOrder = i + 1; });
    setSteps(updated);
  };

  const moveStep = (idx: number, dir: 'up' | 'down') => {
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === steps.length - 1)) return;
    const updated = [...steps];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    updated.forEach((s, i) => { s.stepOrder = i + 1; });
    setSteps(updated);
  };

  const toggleMandatory = (idx: number) => {
    const updated = [...steps];
    updated[idx].mandatory = !updated[idx].mandatory;
    setSteps(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (courseStatus === 'PUBLISHED') { alert('Cannot modify published courses'); return; }
    if (steps.length === 0) { setError('Add at least one learning unit'); return; }
    try {
      setSaving(true);
      const updateData: UpdateCourseData = { ...formData, learningFlowSteps: steps };
      await courseService.update(id!, updateData);
      alert('Course updated successfully!');
      navigate('/faculty/courses');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  const getUnit = (uid: string) => units.find(u => u.id === uid);

  const getCompetencyNames = (ids: string[] | undefined) => {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => {
      const comp = competencies.find((c: any) => c.id === id);
      return comp ? (comp.code ? `${comp.code} - ${comp.title}` : comp.title) : null;
    }).filter(Boolean);
  };

  const normalizeType = (type: string) => type === 'NOTES' ? 'MCQ' : type;
  const getDisplayType = (type: string) => { const t = normalizeType(type); return t === 'BOOK' ? 'E-Book' : t; };

  const filteredUnits = units.filter(u => !unitSearch || u.title?.toLowerCase().includes(unitSearch.toLowerCase()) || u.subject?.toLowerCase().includes(unitSearch.toLowerCase()));

  if (loading) return (
    <FacultyLayout>
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
        <div className="loading-title">Loading Course Editor...</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </FacultyLayout>
  );

  if (courseStatus === 'PUBLISHED') {
    return (
      <FacultyLayout>
        <div className="bo-card" style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--bo-text-primary)' }}>Cannot Edit Published Course</h2>
          <p style={{ color: 'var(--bo-text-secondary)', marginBottom: 20 }}>Published courses cannot have their learning flow modified.</p>
          <button className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/courses')}>Back to Courses</button>
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/faculty/courses')} style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}><ArrowLeft size={18} /></button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>Edit Course</h1>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>Modify course details and learning flow</p>
        </div>
      </div>

      {error && <div style={{ padding: 12, background: '#FEE2E2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px', color: 'var(--bo-text-primary)' }}>Course Information</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 6 }}>Course Title *</label>
            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 6 }}>Description</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 6 }}>Academic Year</label>
              <select value={formData.academicYear} onChange={e => setFormData({ ...formData, academicYear: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                <option value="YEAR_1">Year 1</option>
                <option value="YEAR_2">Year 2</option>
                <option value="YEAR_3_MINOR">Year 3 (Part 1)</option>
                <option value="YEAR_3_MAJOR">Year 3 (Part 2)</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 6 }}>Competencies</label>
              <select multiple value={formData.competencyIds} onChange={e => setFormData({ ...formData, competencyIds: Array.from(e.target.selectedOptions, o => o.value) })} style={{ width: '100%', height: 100, padding: 6, border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13 }}>
                {competencies.map(c => <option key={c.id} value={c.id}>{c.code || ''} - {c.title}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Learning Flow */}
        <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Learning Flow Design</h3>
            <button type="button" className="bo-btn bo-btn-primary" style={{ background: ACCENT, borderColor: ACCENT }} onClick={() => setShowSelector(true)}>
              <Plus size={16} /> Add Unit
            </button>
          </div>

          {steps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>No units added</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {steps.map((step, idx) => {
                const unit = getUnit(step.learningUnitId);
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--bo-bg)', borderRadius: 8, border: '1px solid var(--bo-border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{step.stepOrder}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{unit?.title || 'Unknown Unit'}</div>
                      <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#E5E7EB' }}>{getDisplayType(step.stepType)}</span>
                        {step.mandatory && <span style={{ marginLeft: 4, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#FEE2E2', color: '#DC2626' }}>REQUIRED</span>}
                      </div>
                      {unit?.competencyIds?.length > 0 && (
                        <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {getCompetencyNames(unit.competencyIds).slice(0, 2).map((name: any, ci: number) => (
                            <span key={ci} style={{ padding: '1px 6px', borderRadius: 4, fontSize: 9, background: '#ECFDF5', color: '#065F46' }}>{name}</span>
                          ))}
                          {unit.competencyIds.length > 2 && <span style={{ fontSize: 9, color: 'var(--bo-text-muted)' }}>+{unit.competencyIds.length - 2} more</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={() => toggleMandatory(idx)} style={{ padding: 6, border: '1px solid var(--bo-border)', borderRadius: 6, background: '#fff', cursor: 'pointer', color: step.mandatory ? '#DC2626' : '#10B981' }}>
                        {step.mandatory ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                      <button type="button" onClick={() => moveStep(idx, 'up')} disabled={idx === 0} style={{ padding: 6, border: '1px solid var(--bo-border)', borderRadius: 6, background: '#fff', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}><ChevronUp size={14} /></button>
                      <button type="button" onClick={() => moveStep(idx, 'down')} disabled={idx === steps.length - 1} style={{ padding: 6, border: '1px solid var(--bo-border)', borderRadius: 6, background: '#fff', cursor: 'pointer', opacity: idx === steps.length - 1 ? 0.3 : 1 }}><ChevronDown size={14} /></button>
                      <button type="button" onClick={() => removeStep(idx)} style={{ padding: 6, border: '1px solid #FCA5A5', borderRadius: 6, background: '#FEE2E2', cursor: 'pointer', color: '#DC2626' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/courses')}>Cancel</button>
          <button type="submit" className="bo-btn bo-btn-primary" style={{ background: ACCENT, borderColor: ACCENT }} disabled={saving}>{saving ? 'Saving...' : 'Update Course'}</button>
        </div>
      </form>

      {/* Modal */}
      {showSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowSelector(false)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '90%', maxWidth: 600, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bo-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Select Learning Unit</h3>
              <button onClick={() => setShowSelector(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--bo-border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
                <input placeholder="Search..." value={unitSearch} onChange={e => setUnitSearch(e.target.value)} style={{ width: '100%', padding: '8px 10px 8px 34px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {filteredUnits.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--bo-text-muted)' }}>No units found</p>
              ) : filteredUnits.map(u => (
                <div key={u.id} onClick={() => addStep(u)} style={{ padding: 12, border: '1px solid var(--bo-border)', borderRadius: 8, cursor: 'pointer', marginBottom: 8, transition: 'border-color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bo-border)')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{u.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>{u.subject} · {u.topic} · {u.estimatedDuration}min</div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: normalizeType(u.type) === 'VIDEO' ? '#DBEAFE' : normalizeType(u.type) === 'BOOK' ? '#FEF3C7' : normalizeType(u.type) === 'MCQ' ? '#F5F3FF' : '#E5E7EB', color: normalizeType(u.type) === 'VIDEO' ? '#1D4ED8' : normalizeType(u.type) === 'BOOK' ? '#92400E' : normalizeType(u.type) === 'MCQ' ? '#6D28D9' : '#374151' }}>
                      {getDisplayType(u.type)}
                    </span>
                  </div>
                  {u.competencyIds?.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>📋 Competencies:</span>
                      {getCompetencyNames(u.competencyIds).slice(0, 3).map((name: any, ci: number) => (
                        <span key={ci} style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, background: '#ECFDF5', color: '#065F46' }}>{name}</span>
                      ))}
                      {u.competencyIds.length > 3 && <span style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>+{u.competencyIds.length - 3} more</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </FacultyLayout>
  );
};

export default FacultyEditCourse;
