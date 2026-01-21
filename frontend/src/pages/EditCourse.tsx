import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService, LearningFlowStep, UpdateCourseData } from '../services/course.service';
import competencyService from '../services/competency.service';
import learningUnitService from '../services/learning-unit.service';
import { Competency } from '../types';
import '../styles/CreateCourse.css';

interface LearningUnit {
  id: string;
  title: string;
  type: string;
  description: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  academicYear: string;
  status: string;
  learningFlowSteps: Array<{
    id: string;
    stepOrder: number;
    stepType: string;
    mandatory: boolean;
    completionCriteria: any;
    learningUnit: LearningUnit;
  }>;
  courseCompetencies: Array<{
    competency: Competency;
  }>;
}

const EditCourse: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    academicYear: '',
    competencyIds: [] as string[]
  });
  
  const [learningFlowSteps, setLearningFlowSteps] = useState<LearningFlowStep[]>([]);
  const [availableUnits, setAvailableUnits] = useState<LearningUnit[]>([]);
  const [availableCompetencies, setAvailableCompetencies] = useState<Competency[]>([]);
  const [showUnitSelector, setShowUnitSelector] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load course details
      const courseData = await courseService.getById(id!);
      setCourse(courseData);

      // Populate form
      setFormData({
        title: courseData.title,
        description: courseData.description || '',
        academicYear: courseData.academicYear,
        competencyIds: courseData.course_competencies.map((cc: any) => String(cc.competencies.id))
      });

      // Convert course flow steps to editable format
      const flowSteps: LearningFlowStep[] = courseData.learning_flow_steps.map((step: any) => ({
        learningUnitId: step.learning_units.id,
        stepOrder: step.stepOrder,
        stepType: step.stepType,
        mandatory: step.mandatory,
        completionCriteria: step.completionCriteria
      }));
      setLearningFlowSteps(flowSteps);

      // Load available units and competencies
      const [units, competencies] = await Promise.all([
        learningUnitService.getAll({ page: 1, limit: 1000 }),
        competencyService.getAll({ page: 1, limit: 1000 })
      ]);

      setAvailableUnits(units.data);
      setAvailableCompetencies(competencies.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCompetencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, competencyIds: selectedOptions }));
  };

  const getDefaultCompletionCriteria = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return { videoMinWatchPercent: 80 };
      case 'BOOK':
        return { bookMinReadDuration: 300 };
      case 'NOTES':
        return { requiredScrollPercent: 90 };
      case 'MCQ':
        return {};
      default:
        return {};
    }
  };

  const handleAddStep = (unit: LearningUnit) => {
    const newStep: LearningFlowStep = {
      learningUnitId: unit.id,
      stepOrder: learningFlowSteps.length + 1,
      stepType: unit.type as 'BOOK' | 'VIDEO' | 'MCQ' | 'NOTES',
      mandatory: true,
      completionCriteria: getDefaultCompletionCriteria(unit.type)
    };
    setLearningFlowSteps([...learningFlowSteps, newStep]);
    setShowUnitSelector(false);
  };

  const handleRemoveStep = (index: number) => {
    const updatedSteps = learningFlowSteps.filter((_, i) => i !== index);
    // Renumber steps
    updatedSteps.forEach((step, i) => {
      step.stepOrder = i + 1;
    });
    setLearningFlowSteps(updatedSteps);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === learningFlowSteps.length - 1)
    ) {
      return;
    }

    const updatedSteps = [...learningFlowSteps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updatedSteps[index], updatedSteps[targetIndex]] = [updatedSteps[targetIndex], updatedSteps[index]];
    
    // Renumber steps
    updatedSteps.forEach((step, i) => {
      step.stepOrder = i + 1;
    });
    
    setLearningFlowSteps(updatedSteps);
  };

  const handleToggleMandatory = (index: number) => {
    const updatedSteps = [...learningFlowSteps];
    updatedSteps[index].mandatory = !updatedSteps[index].mandatory;
    setLearningFlowSteps(updatedSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (course?.status === 'PUBLISHED') {
      alert('Cannot modify learning flow of published courses');
      return;
    }

    if (learningFlowSteps.length === 0) {
      alert('Please add at least one learning unit to the flow');
      return;
    }

    try {
      const updateData: UpdateCourseData = {
        title: formData.title,
        description: formData.description,
        academicYear: formData.academicYear,
        competencyIds: formData.competencyIds,
        learningFlowSteps: learningFlowSteps
      };

      await courseService.update(id!, updateData);
      alert('Course updated successfully');
      navigate('/faculty');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update course');
    }
  };

  const getUnitDetails = (unitId: string) => {
    return availableUnits.find(u => u.id === unitId);
  };

  if (loading) {
    return <div className="create-course-container"><div className="loading">Loading...</div></div>;
  }

  if (error) {
    return (
      <div className="create-course-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/faculty')} className="btn btn-secondary">Back to Dashboard</button>
      </div>
    );
  }

  if (course?.status === 'PUBLISHED') {
    return (
      <div className="create-course-container">
        <div className="form-section">
          <h2>Cannot Edit Published Course</h2>
          <p>Published courses cannot have their learning flow modified. You can only update basic information like title and description.</p>
          <button onClick={() => navigate('/faculty')} className="btn btn-secondary">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="create-course-container">
      <div className="create-course-header">
        <h1>Edit Course</h1>
        <button onClick={() => navigate('/faculty')} className="btn btn-secondary">Cancel</button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Course Information Section */}
        <div className="form-section">
          <h2>Course Information</h2>
          
          <div className="form-group">
            <label htmlFor="title">Course Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="academicYear">Academic Year *</label>
            <select
              id="academicYear"
              name="academicYear"
              value={formData.academicYear}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Academic Year</option>
              <option value="2024-25">2024-25</option>
              <option value="2025-26">2025-26</option>
              <option value="2026-27">2026-27</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="competencies">Competencies (Optional)</label>
            <select
              id="competencies"
              multiple
              value={formData.competencyIds.map(String)}
              onChange={handleCompetencyChange}
              size={5}
            >
              {availableCompetencies.map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.title}
                </option>
              ))}
            </select>
            <small>Hold Ctrl/Cmd to select multiple</small>
          </div>
        </div>

        {/* Learning Flow Design Section */}
        <div className="form-section">
          <div className="section-header">
            <h2>Learning Flow Design</h2>
            <button
              type="button"
              onClick={() => setShowUnitSelector(true)}
              className="btn btn-primary"
            >
              + Add Learning Unit
            </button>
          </div>

          {course?.status === 'PUBLISHED' && (
            <div className="info-box">
              <strong>Note:</strong> Learning flow cannot be modified for published courses.
            </div>
          )}

          {learningFlowSteps.length === 0 ? (
            <div className="empty-state">
              <p>No learning units added yet. Click "Add Learning Unit" to start building your course flow.</p>
            </div>
          ) : (
            <div className="flow-steps">
              {learningFlowSteps.map((step, index) => {
                const unit = getUnitDetails(step.learningUnitId);
                if (!unit) return null;

                return (
                  <div key={index} className="flow-step-card">
                    <div className="step-number">{step.stepOrder}</div>
                    <div className="step-content">
                      <h3>{unit.title}</h3>
                      <p>{unit.description}</p>
                      <div className="step-badges">
                        <span className={`badge badge-${step.stepType.toLowerCase()}`}>{step.stepType}</span>
                        {step.mandatory && <span className="badge badge-mandatory">MANDATORY</span>}
                      </div>
                    </div>
                    <div className="step-actions">
                      <button
                        type="button"
                        onClick={() => handleToggleMandatory(index)}
                        className="btn btn-small"
                        title={step.mandatory ? 'Make Optional' : 'Make Mandatory'}
                      >
                        {step.mandatory ? '🔒' : '🔓'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(index, 'up')}
                        className="btn btn-small"
                        disabled={index === 0}
                      >
                        ⬆️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(index, 'down')}
                        className="btn btn-small"
                        disabled={index === learningFlowSteps.length - 1}
                      >
                        ⬇️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(index)}
                        className="btn btn-small btn-danger"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/faculty')} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Update Course
          </button>
        </div>
      </form>

      {/* Unit Selector Modal */}
      {showUnitSelector && (
        <div className="modal-overlay" onClick={() => setShowUnitSelector(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select Learning Unit</h2>
              <button onClick={() => setShowUnitSelector(false)} className="close-button">×</button>
            </div>
            <div className="modal-body">
              <div className="unit-grid">
                {availableUnits.map(unit => (
                  <div
                    key={unit.id}
                    className="unit-card"
                    onClick={() => handleAddStep(unit)}
                  >
                    <h3>{unit.title}</h3>
                    <p>{unit.description}</p>
                    <span className={`badge badge-${unit.type.toLowerCase()}`}>{unit.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditCourse;
