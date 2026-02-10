import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { courseService, LearningFlowStep } from '../../services/course.service';
import competencyService from '../../services/competency.service';
import packagesService from '../../services/packages.service';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Lock, Unlock, Search, X } from 'lucide-react';
import '../../styles/bitflow-owner.css';

const ACCENT = '#7C3AED';

const FacultyCreateCourse: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [packageInfo, setPackageInfo] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    academicYear: 'YEAR_1',
    competencyIds: [] as string[],
  });

  const [steps, setSteps] = useState<LearningFlowStep[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState('ALL');

  useEffect(() => { loadResources(); }, []);

  const loadResources = async () => {
    try {
      setResourcesLoading(true);
      const comps = await competencyService.getAll({ page: 1, limit: 500 });
      setCompetencies(comps.data || []);

      if (user?.collegeId) {
        try {
          const pkg = await packagesService.getCollegeAvailableContent(user.collegeId);
          if (pkg.learningUnits?.length > 0) {
            setUnits(pkg.learningUnits);
            setPackageInfo(`Content from ${pkg.packages.length} package(s): ${pkg.packages.map((p: any) => p.name).join(', ')}`);
          } else {
            setUnits([]);
            setPackageInfo('No packages assigned to your college yet. Please contact your college admin.');
          }
        } catch {
          setUnits([]);
          setPackageInfo('Unable to load content packages. Please contact your college admin.');
        }
      } else {
        setUnits([]);
        setPackageInfo('No college associated with your account.');
      }
    } catch (err: any) {
      setError('Failed to load resources. Please refresh.');
    } finally {
      setResourcesLoading(false);
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
    setUnitSearch('');
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
    if (steps.length === 0) { setError('Add at least one learning unit'); return; }
    try {
      setLoading(true);
      setError('');
      const course = await courseService.create({ ...formData, learningFlowSteps: steps });
      setSuccess('Course created successfully!');
      setTimeout(() => navigate(`/faculty/courses/${course.id}`), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  const getUnit = (id: string) => units.find(u => u.id === id);

  const getCompetencyNames = (ids: string[] | undefined) => {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => {
      const comp = competencies.find((c: any) => c.id === id);
      return comp ? (comp.code ? `${comp.code} - ${comp.title}` : comp.title) : null;
    }).filter(Boolean);
  };

  // Normalize type: NOTES→MCQ, BOOK→E-Book for display
  const normalizeType = (type: string) => type === 'NOTES' ? 'MCQ' : type;
  const getDisplayType = (type: string) => {
    const t = normalizeType(type);
    return t === 'BOOK' ? 'E-Book' : t;
  };

  const filteredUnits = units.filter(u => {
    if (unitTypeFilter !== 'ALL' && normalizeType(u.type) !== unitTypeFilter) return false;
    if (unitSearch) {
      const s = unitSearch.toLowerCase();
      return u.title?.toLowerCase().includes(s) || u.subject?.toLowerCase().includes(s) || u.topic?.toLowerCase().includes(s);
    }
    return true;
  });

  const uniqueTypes = units.map(u => normalizeType(u.type)).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).sort();

  return (
    <FacultyLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/faculty/courses')} style={{ padding: 8, border: '1px solid var(--bo-border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>Create New Course</h1>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>Design a structured learning journey</p>
        </div>
      </div>

      {error && <div style={{ padding: 12, background: '#FEE2E2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>{error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button></div>}
      {success && <div style={{ padding: 12, background: '#D1FAE5', color: '#065F46', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>✅ {success}</div>}
      {packageInfo && <div style={{ padding: 12, background: '#DBEAFE', color: '#1E40AF', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>📦 {packageInfo}</div>}

      <form onSubmit={handleSubmit}>
        {/* Course Info */}
        <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px', color: 'var(--bo-text-primary)' }}>Course Information</h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 6 }}>Course Title *</label>
            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="e.g., Introduction to Anatomy" style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 6 }}>Description</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="What students will learn..." style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 6 }}>Academic Year *</label>
              <select value={formData.academicYear} onChange={e => setFormData({ ...formData, academicYear: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' }}>
                <option value="YEAR_1">Year 1</option>
                <option value="YEAR_2">Year 2</option>
                <option value="YEAR_3_MINOR">Year 3 (Part 1)</option>
                <option value="YEAR_3_MAJOR">Year 3 (Part 2)</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--bo-text-secondary)', marginBottom: 6 }}>Competencies</label>
              {resourcesLoading ? (
                <p style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>Loading...</p>
              ) : (
                <select multiple value={formData.competencyIds} onChange={e => {
                  const selected = Array.from(e.target.selectedOptions, o => o.value);
                  setFormData({ ...formData, competencyIds: selected });
                }} style={{ width: '100%', padding: '6px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, height: 100 }}>
                  {competencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.title}</option>)}
                </select>
              )}
              <small style={{ color: 'var(--bo-text-muted)', fontSize: 11 }}>Ctrl/Cmd + click for multiple</small>
            </div>
          </div>
        </div>

        {/* Learning Flow */}
        <div className="bo-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--bo-text-primary)' }}>Learning Flow Design</h3>
            <button type="button" className="bo-btn bo-btn-primary" style={{ background: ACCENT, borderColor: ACCENT }} onClick={() => setShowSelector(true)}>
              <Plus size={16} /> Add Learning Unit
            </button>
          </div>

          <div style={{ padding: 12, background: '#F5F3FF', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#5B21B6' }}>
            💡 <strong>Tip:</strong> Arrange units in order. Mandatory steps block progress until completed.
          </div>

          {steps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>
              <Plus size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No units added yet. Click "Add Learning Unit" to begin.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {steps.map((step, idx) => {
                const unit = getUnit(step.learningUnitId);
                if (!unit) return null;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--bo-bg)', borderRadius: 8, border: '1px solid var(--bo-border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {step.stepOrder}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bo-text-primary)' }}>{unit.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                        {unit.subject} · {unit.topic} · {unit.estimatedDuration}min
                        <span style={{ marginLeft: 8, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: normalizeType(unit.type) === 'VIDEO' ? '#DBEAFE' : normalizeType(unit.type) === 'BOOK' ? '#FEF3C7' : normalizeType(unit.type) === 'MCQ' ? '#F5F3FF' : '#E5E7EB', color: normalizeType(unit.type) === 'VIDEO' ? '#1D4ED8' : normalizeType(unit.type) === 'BOOK' ? '#92400E' : normalizeType(unit.type) === 'MCQ' ? '#6D28D9' : '#374151' }}>
                          {getDisplayType(unit.type)}
                        </span>
                        {step.mandatory && <span style={{ marginLeft: 4, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#FEE2E2', color: '#DC2626' }}>REQUIRED</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={() => toggleMandatory(idx)} title={step.mandatory ? 'Make Optional' : 'Make Mandatory'} style={{ padding: 6, border: '1px solid var(--bo-border)', borderRadius: 6, background: '#fff', cursor: 'pointer', color: step.mandatory ? '#DC2626' : '#10B981' }}>
                        {step.mandatory ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                      <button type="button" onClick={() => moveStep(idx, 'up')} disabled={idx === 0} style={{ padding: 6, border: '1px solid var(--bo-border)', borderRadius: 6, background: '#fff', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" onClick={() => moveStep(idx, 'down')} disabled={idx === steps.length - 1} style={{ padding: 6, border: '1px solid var(--bo-border)', borderRadius: 6, background: '#fff', cursor: 'pointer', opacity: idx === steps.length - 1 ? 0.3 : 1 }}>
                        <ChevronDown size={14} />
                      </button>
                      <button type="button" onClick={() => removeStep(idx)} style={{ padding: 6, border: '1px solid #FCA5A5', borderRadius: 6, background: '#FEE2E2', cursor: 'pointer', color: '#DC2626' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="bo-btn bo-btn-outline" onClick={() => navigate('/faculty/courses')}>Cancel</button>
          <button type="submit" className="bo-btn bo-btn-primary" style={{ background: ACCENT, borderColor: ACCENT }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Course'}
          </button>
        </div>
      </form>

      {/* Unit Selector Modal */}
      {showSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowSelector(false)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '90%', maxWidth: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bo-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Select Learning Unit</h3>
              <button onClick={() => setShowSelector(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--bo-border)', display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
                <input type="text" placeholder="Search units..." value={unitSearch} onChange={e => setUnitSearch(e.target.value)} style={{ width: '100%', padding: '8px 10px 8px 34px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
              </div>
              <select value={unitTypeFilter} onChange={e => setUnitTypeFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                <option value="ALL">All Types</option>
                {uniqueTypes.map(t => <option key={t} value={t}>{t === 'BOOK' ? 'E-Book' : t}</option>)}
              </select>
            </div>
            <div style={{ padding: '12px 24px', fontSize: 12, color: 'var(--bo-text-muted)', borderBottom: '1px solid var(--bo-border)' }}>
              Showing {filteredUnits.length} of {units.length} units
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {resourcesLoading ? (
                <div className="bo-loading"><div className="bo-spinner" /></div>
              ) : filteredUnits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>No units match your search</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {filteredUnits.map(u => (
                    <div key={u.id} onClick={() => addStep(u)} style={{ padding: 14, border: '1px solid var(--bo-border)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bo-border)')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bo-text-primary)' }}>{u.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>{u.subject} · {u.topic} · {u.estimatedDuration}min</div>
                        </div>
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: normalizeType(u.type) === 'VIDEO' ? '#DBEAFE' : normalizeType(u.type) === 'BOOK' ? '#FEF3C7' : normalizeType(u.type) === 'MCQ' ? '#F5F3FF' : '#E5E7EB', color: normalizeType(u.type) === 'VIDEO' ? '#1D4ED8' : normalizeType(u.type) === 'BOOK' ? '#92400E' : normalizeType(u.type) === 'MCQ' ? '#6D28D9' : '#374151' }}>
                          {getDisplayType(u.type)}
                        </span>
                      </div>
                      {u.description && <p style={{ fontSize: 12, color: 'var(--bo-text-secondary)', margin: '6px 0 0', lineHeight: 1.4 }}>{u.description.substring(0, 100)}</p>}
                      {/* Publisher-assigned Competencies */}
                      {u.competencyIds?.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
              )}
            </div>
          </div>
        </div>
      )}
    </FacultyLayout>
  );
};

export default FacultyCreateCourse;
