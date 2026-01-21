import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService } from '../services/course.service';
import '../styles/CourseDetails.css';

interface Course {
  id: string;
  title: string;
  description: string;
  academicYear: string;
  status: string;
  createdAt: string;
  learning_flow_steps: Array<{
    id: string;
    stepOrder: number;
    stepType: string;
    mandatory: boolean;
    completionCriteria: any;
    learning_units: {
      id: string;
      title: string;
      description: string;
      contentType: string;
    };
  }>;
  course_competencies: Array<{
    competencies: {
      id: string;
      title: string;
      description: string;
    };
  }>;
  _count: {
    courseAssignments: number;
  };
}

const CourseDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    loadCourse();
  }, [id]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getById(id!);
      setCourse(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this course? Published courses cannot have their learning flow modified.')) {
      return;
    }

    try {
      await courseService.publish(id!);
      alert('Course published successfully');
      loadCourse();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish course');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      await courseService.delete(id!);
      alert('Course deleted successfully');
      navigate('/faculty');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete course');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClass = status === 'PUBLISHED' ? 'success' : status === 'DRAFT' ? 'warning' : 'secondary';
    return <span className={`badge badge-${statusClass}`}>{status}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCompletionCriteriaText = (criteria: any, stepType: string) => {
    if (!criteria) return 'Default criteria';
    
    switch (stepType) {
      case 'VIDEO':
        return criteria.minCompletionPercentage 
          ? `Watch ${criteria.minCompletionPercentage}% of video` 
          : 'Watch video';
      case 'BOOK':
        return criteria.minTimeSeconds 
          ? `Read for ${Math.floor(criteria.minTimeSeconds / 60)} minutes` 
          : 'Complete reading';
      case 'NOTES':
        return criteria.minCompletionPercentage 
          ? `Read ${criteria.minCompletionPercentage}% of notes` 
          : 'Read notes';
      case 'MCQ':
        return criteria.minScore 
          ? `Score at least ${criteria.minScore}%` 
          : 'Complete quiz';
      default:
        return 'Complete unit';
    }
  };

  if (loading) {
    return <div className="course-details-container"><div className="loading">Loading...</div></div>;
  }

  if (error) {
    return (
      <div className="course-details-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/faculty')} className="btn btn-secondary">Back to Dashboard</button>
      </div>
    );
  }

  if (!course) {
    return <div className="course-details-container"><div className="error-message">Course not found</div></div>;
  }

  return (
    <div className="course-details-container">
      <div className="course-details-header">
        <h1>Course Details</h1>
        <button onClick={() => navigate('/faculty')} className="btn btn-secondary">Back to Dashboard</button>
      </div>

      {/* Course Overview */}
      <div className="details-section">
        <div className="section-title">
          <h2>{course.title}</h2>
          {getStatusBadge(course.status)}
        </div>
        
        <div className="course-meta">
          <div className="meta-item">
            <span className="label">Academic Year:</span>
            <span className="value">{course.academicYear}</span>
          </div>
          <div className="meta-item">
            <span className="label">Created:</span>
            <span className="value">{formatDate(course.createdAt)}</span>
          </div>
          <div className="meta-item">
            <span className="label">Learning Units:</span>
            <span className="value">{course.learning_flow_steps?.length || 0}</span>
          </div>
          <div className="meta-item">
            <span className="label">Assignments:</span>
            <span className="value">{course._count?.courseAssignments || 0}</span>
          </div>
        </div>

        {course.description && (
          <div className="course-description">
            <h3>Description</h3>
            <p>{course.description}</p>
          </div>
        )}
      </div>

      {/* Competencies */}
      {course.course_competencies && course.course_competencies.length > 0 && (
        <div className="details-section">
          <h2>Competencies</h2>
          <div className="competencies-list">
            {course.course_competencies.map((cc) => (
              <div key={cc.competencies.id} className="competency-card">
                <h3>{cc.competencies.title}</h3>
                <p>{cc.competencies.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Flow */}
      <div className="details-section">
        <h2>Learning Flow ({course.learning_flow_steps?.length || 0} steps)</h2>
        
        {!course.learning_flow_steps || course.learning_flow_steps.length === 0 ? (
          <div className="empty-state">
            <p>No learning flow defined yet</p>
          </div>
        ) : (
          <div className="flow-timeline">
            {course.learning_flow_steps.map((step, index) => (
              <div key={step.id} className="flow-step">
                <div className="step-indicator">
                  <div className="step-number">{step.stepOrder}</div>
                  {index < course.learning_flow_steps.length - 1 && <div className="step-connector"></div>}
                </div>
                <div className="step-details">
                  <div className="step-header">
                    <h3>{step.learning_units.title}</h3>
                    <div className="step-badges">
                      <span className={`badge badge-${step.stepType.toLowerCase()}`}>{step.stepType}</span>
                      {step.mandatory && <span className="badge badge-mandatory">MANDATORY</span>}
                    </div>
                  </div>
                  <p className="step-description">{step.learning_units.description}</p>
                  <p className="step-criteria">
                    <strong>Completion Criteria:</strong> {getCompletionCriteriaText(step.completionCriteria, step.stepType)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="details-actions">
        {course.status === 'DRAFT' && (
          <>
            <button 
              onClick={() => navigate(`/faculty/edit-course/${course.id}`)} 
              className="btn btn-primary"
            >
              ✏️ Edit Course
            </button>
            <button 
              onClick={handlePublish} 
              className="btn btn-primary"
              disabled={!course.learning_flow_steps || course.learning_flow_steps.length === 0}
            >
              🚀 Publish Course
            </button>
          </>
        )}
        
        {course.status === 'PUBLISHED' && (
          <>
            <button 
              onClick={() => navigate(`/faculty/assign-course/${course.id}`)} 
              className="btn btn-primary"
            >
              👥 Assign to Students
            </button>
            <button 
              onClick={() => navigate(`/faculty/courses/${course.id}/analytics`)} 
              className="btn btn-primary"
            >
              📊 View Analytics
            </button>
          </>
        )}

        {course.status === 'DRAFT' && (!course._count?.courseAssignments || course._count.courseAssignments === 0) && (
          <button 
            onClick={handleDelete} 
            className="btn btn-danger"
          >
            🗑️ Delete Course
          </button>
        )}
      </div>
    </div>
  );
};

export default CourseDetails;
