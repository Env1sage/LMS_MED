import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService, LearningFlowStep } from '../services/course.service';
import learningUnitService from '../services/learning-unit.service';
import competencyService from '../services/competency.service';
import packagesService from '../services/packages.service';
import { useAuth } from '../context/AuthContext';
import '../styles/FacultyPortal.css';
import '../styles/CreateCourse.css';

const CreateCourse: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [packageInfo, setPackageInfo] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    academicYear: 'YEAR_1',
    competencyIds: [] as string[],
  });

  const [learningFlowSteps, setLearningFlowSteps] = useState<LearningFlowStep[]>([]);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [availableCompetencies, setAvailableCompetencies] = useState<any[]>([]);
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState('ALL');
  const [unitSubjectFilter, setUnitSubjectFilter] = useState('ALL');

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      setResourcesLoading(true);
      setError(null);
      console.log('Loading resources...');
      
      // Load competencies (these are available to all)
      const competencies = await competencyService.getAll({ page: 1, limit: 100 });
      setAvailableCompetencies(competencies.data || []);
      
      // Load learning units based on college's assigned packages
      if (user?.collegeId) {
        const packageContent = await packagesService.getCollegeAvailableContent(user.collegeId);
        console.log('Package content loaded:', packageContent);
        
        if (packageContent.learningUnits && packageContent.learningUnits.length > 0) {
          setAvailableUnits(packageContent.learningUnits);
          setPackageInfo(`Content from ${packageContent.packages.length} assigned package(s): ${packageContent.packages.map(p => p.name).join(', ')}`);
        } else {
          // Fallback to all units if no packages assigned (for demo/dev purposes)
          const units = await learningUnitService.getAll({ page: 1, limit: 100 });
          setAvailableUnits(units.data || []);
          setPackageInfo('Note: No packages assigned to your college. Showing all available content.');
        }
      } else {
        // Fallback for users without college context
        const units = await learningUnitService.getAll({ page: 1, limit: 100 });
        setAvailableUnits(units.data || []);
      }
      
      console.log('Competencies loaded:', competencies.data?.length || 0);
    } catch (err: any) {
      console.error('Failed to load resources', err);
      setError(err.response?.data?.message || 'Failed to load competencies and learning units. Please refresh the page.');
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleAddStep = (unit: any) => {
    const newStep: LearningFlowStep = {
      learningUnitId: unit.id,
      stepOrder: learningFlowSteps.length + 1,
      stepType: unit.type,
      mandatory: true,
      completionCriteria: getDefaultCompletionCriteria(unit.type),
    };
    setLearningFlowSteps([...learningFlowSteps, newStep]);
    setShowUnitSelector(false);
    setUnitSearch('');
  };

  const getDefaultCompletionCriteria = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return { videoMinWatchPercent: 80 };
      case 'BOOK':
        return { bookMinReadDuration: 300 };
      default:
        return {};
    }
  };

  const handleRemoveStep = (index: number) => {
    const updated = learningFlowSteps.filter((_, i) => i !== index);
    // Reorder steps
    updated.forEach((step, i) => {
      step.stepOrder = i + 1;
    });
    setLearningFlowSteps(updated);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === learningFlowSteps.length - 1)
    ) {
      return;
    }

    const updated = [...learningFlowSteps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    
    // Update step orders
    updated.forEach((step, i) => {
      step.stepOrder = i + 1;
    });
    
    setLearningFlowSteps(updated);
  };

  const handleToggleMandatory = (index: number) => {
    const updated = [...learningFlowSteps];
    updated[index].mandatory = !updated[index].mandatory;
    setLearningFlowSteps(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (learningFlowSteps.length === 0) {
      setError('Please add at least one learning unit to the flow');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const course = await courseService.create({
        ...formData,
        learningFlowSteps,
      });
      setSuccess('Course created successfully!');
      setTimeout(() => navigate(`/faculty/courses/${course.id}`), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = availableUnits.filter(unit => {
    // Search filter
    if (unitSearch) {
      const searchLower = unitSearch.toLowerCase();
      const matchesSearch = (
        unit.title.toLowerCase().includes(searchLower) ||
        unit.subject.toLowerCase().includes(searchLower) ||
        unit.topic.toLowerCase().includes(searchLower) ||
        unit.description?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }
    
    // Type filter
    if (unitTypeFilter !== 'ALL' && unit.type !== unitTypeFilter) {
      return false;
    }
    
    // Subject filter
    if (unitSubjectFilter !== 'ALL' && unit.subject !== unitSubjectFilter) {
      return false;
    }
    
    return true;
  });

  // Get unique subjects and types for filters
  const uniqueSubjects = Array.from(new Set(availableUnits.map(u => u.subject))).sort();
  const uniqueTypes = Array.from(new Set(availableUnits.map(u => u.type))).sort();

  const getUnitById = (id: string) => {
    return availableUnits.find(u => u.id === id);
  };

  return (
    <div className="create-course-container">
      <div className="create-course-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/faculty')}>
            ← Back to Dashboard
          </button>
        </div>
        <div className="header-center">
          <h1>Create New Course</h1>
          <p>Design a structured learning journey for your students</p>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {packageInfo && (
        <div className="alert alert-info" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>
          📦 {packageInfo}
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-course-form">
        <div className="form-section">
          <h3>Course Information</h3>
          
          <div className="form-group">
            <label htmlFor="title">Course Title *</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Introduction to Anatomy"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Describe what students will learn in this course..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="academicYear">Academic Year *</label>
            <select
              id="academicYear"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              required
            >
              <option value="YEAR_1">Year 1</option>
              <option value="YEAR_2">Year 2</option>
              <option value="YEAR_3_MINOR">Year 3 (Part 1)</option>
              <option value="YEAR_3_MAJOR">Year 3 (Part 2)</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="competencies">Competencies *</label>
            {resourcesLoading ? (
              <div className="loading-state">Loading competencies...</div>
            ) : availableCompetencies.length === 0 ? (
              <div className="alert alert-warning">
                No competencies available. Please ensure competencies are seeded in the database.
              </div>
            ) : (
              <>
                <select
                  id="competencies"
                  multiple
                  value={formData.competencyIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData({ ...formData, competencyIds: selected });
                  }}
                  style={{ height: '120px' }}
                >
                  {availableCompetencies.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.code} - {comp.title}
                    </option>
                  ))}
                </select>
                <small>Hold Ctrl/Cmd to select multiple competencies ({availableCompetencies.length} available)</small>
              </>
            )}
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Learning Flow Design</h3>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowUnitSelector(true)}
            >
              + Add Learning Unit
            </button>
          </div>

          <div className="info-box">
            <p><strong>💡 Learning Flow:</strong></p>
            <ul>
              <li>Arrange learning units in the order students should complete them</li>
              <li>Mark mandatory steps to enforce blocking (next steps are locked until completed)</li>
              <li>Optional steps can be skipped but are still tracked</li>
            </ul>
          </div>

          {learningFlowSteps.length === 0 ? (
            <div className="empty-flow">
              <p>No learning units added yet. Click "Add Learning Unit" to start building your course flow.</p>
            </div>
          ) : (
            <div className="flow-steps">
              {learningFlowSteps.map((step, index) => {
                const unit = getUnitById(step.learningUnitId);
                if (!unit) return null;

                return (
                  <div key={index} className="flow-step-card">
                    <div className="step-number">{step.stepOrder}</div>
                    <div className="step-content">
                      <div className="step-header">
                        <h4>{unit.title}</h4>
                        <div className="step-badges">
                          <span className={`badge badge-${unit.type.toLowerCase()}`}>
                            {unit.type}
                          </span>
                          {step.mandatory && (
                            <span className="badge badge-mandatory">Mandatory</span>
                          )}
                        </div>
                      </div>
                      <p className="step-meta">
                        {unit.subject} • {unit.topic} • {unit.estimatedDuration} min
                      </p>
                      <div className="step-actions">
                        <button
                          type="button"
                          className="btn-small"
                          onClick={() => handleToggleMandatory(index)}
                        >
                          {step.mandatory ? '🔒 Make Optional' : '🔓 Make Mandatory'}
                        </button>
                        <button
                          type="button"
                          className="btn-small"
                          onClick={() => handleMoveStep(index, 'up')}
                          disabled={index === 0}
                        >
                          ⬆️
                        </button>
                        <button
                          type="button"
                          className="btn-small"
                          onClick={() => handleMoveStep(index, 'down')}
                          disabled={index === learningFlowSteps.length - 1}
                        >
                          ⬇️
                        </button>
                        <button
                          type="button"
                          className="btn-small btn-danger"
                          onClick={() => handleRemoveStep(index)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/faculty')}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Course'}
          </button>
        </div>
      </form>

      {showUnitSelector && (
        <div className="modal-overlay" onClick={() => setShowUnitSelector(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Learning Unit</h3>
              <button className="btn-close" onClick={() => setShowUnitSelector(false)}>
                ×
              </button>
            </div>
            
            {/* Search and Filter Section */}
            <div className="modal-filters">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Search by title, subject, topic..."
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  className="search-input"
                />
                {unitSearch && (
                  <button 
                    className="clear-search"
                    onClick={() => setUnitSearch('')}
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="filter-row">
                <div className="filter-group">
                  <label>Type:</label>
                  <select 
                    value={unitTypeFilter} 
                    onChange={(e) => setUnitTypeFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="ALL">All Types</option>
                    {uniqueTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Subject:</label>
                  <select 
                    value={unitSubjectFilter} 
                    onChange={(e) => setUnitSubjectFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="ALL">All Subjects</option>
                    {uniqueSubjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                
                <button 
                  className="btn-clear-filters"
                  onClick={() => {
                    setUnitSearch('');
                    setUnitTypeFilter('ALL');
                    setUnitSubjectFilter('ALL');
                  }}
                >
                  Clear All
                </button>
              </div>
              
              <div className="results-summary">
                Showing {filteredUnits.length} of {availableUnits.length} learning units
              </div>
            </div>
            
            <div className="modal-body">
              {resourcesLoading ? (
                <div className="loading-state">Loading learning units...</div>
              ) : availableUnits.length === 0 ? (
                <div className="alert alert-warning">
                  No learning units available. Please run the Phase 3 seed to create learning units.
                  <br/><br/>
                  <code>cd backend && npx ts-node prisma/seed-phase3.ts</code>
                </div>
              ) : filteredUnits.length === 0 ? (
                <div className="empty-state">
                  No learning units match your search. Try different keywords.
                  <br/>
                  <small>Total available: {availableUnits.length} learning units</small>
                </div>
              ) : (
                <div className="units-list">
                  {filteredUnits.map(unit => (
                    <div
                      key={unit.id}
                      className="unit-card"
                      onClick={() => handleAddStep(unit)}
                    >
                      <div className="unit-header">
                        <h4>{unit.title}</h4>
                        <span className={`badge badge-${unit.type.toLowerCase()}`}>
                          {unit.type}
                        </span>
                      </div>
                      <p className="unit-meta">
                        {unit.subject} • {unit.topic} • {unit.estimatedDuration} min
                      </p>
                      <p className="unit-description">{unit.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCourse;
