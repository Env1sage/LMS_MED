import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService, AssignCourseData } from '../services/course.service';
import { studentService } from '../services/student.service';
import '../styles/AssignCourse.css';

interface Course {
  id: string;
  title: string;
  description: string;
  academicYear: string;
  status: string;
  learning_flow_steps: any[];
}

interface Student {
  id: string;
  userId: string;
  fullName: string;
  currentAcademicYear: string;
  yearOfAdmission: number;
  status: string;
  users: {
    id: string;
    email: string;
    status: string;
  };
}

const AssignCourse: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assignmentType, setAssignmentType] = useState<'INDIVIDUAL' | 'BATCH'>('BATCH');
  const [dueDate, setDueDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStudents(students);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredStudents(students.filter(student => 
        student.fullName.toLowerCase().includes(term) ||
        student.users.email.toLowerCase().includes(term) ||
        student.currentAcademicYear.toLowerCase().includes(term) ||
        student.yearOfAdmission.toString().includes(term)
      ));
    }
  }, [searchTerm, students]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load course details
      const courseData = await courseService.getById(id!);
      setCourse(courseData);

      if (courseData.status !== 'PUBLISHED') {
        setError('Only published courses can be assigned to students');
        return;
      }

      // Load students from the same academic year using the student service
      const studentsData = await studentService.getAll({
        academicYear: courseData.academicYear,
        page: 1,
        limit: 100
      });
      
      setStudents(studentsData.data || []);
      setFilteredStudents(studentsData.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleSelectStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedStudents.length === 0) {
      alert('Please select at least one student');
      return;
    }

    try {
      const assignData: AssignCourseData = {
        courseId: id!,
        studentIds: selectedStudents,
        assignmentType,
        dueDate: dueDate || undefined
      };

      await courseService.assign(assignData);
      alert(`Course assigned to ${selectedStudents.length} student(s) successfully`);
      navigate('/faculty');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign course');
    }
  };

  if (loading) {
    return <div className="assign-course-container"><div className="loading">Loading...</div></div>;
  }

  if (error) {
    return (
      <div className="assign-course-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/faculty')} className="btn btn-secondary">Back to Dashboard</button>
      </div>
    );
  }

  if (!course) {
    return <div className="assign-course-container"><div className="error-message">Course not found</div></div>;
  }

  return (
    <div className="assign-course-container">
      <div className="assign-course-header">
        <h1>Assign Course to Students</h1>
        <button onClick={() => navigate('/faculty')} className="btn btn-secondary">Cancel</button>
      </div>

      {/* Course Info */}
      <div className="form-section">
        <h2>Course Details</h2>
        <div className="course-info">
          <div className="info-row">
            <span className="label">Course Title:</span>
            <span className="value">{course.title}</span>
          </div>
          <div className="info-row">
            <span className="label">Academic Year:</span>
            <span className="value">{course.academicYear}</span>
          </div>
          <div className="info-row">
            <span className="label">Learning Units:</span>
            <span className="value">{course.learning_flow_steps?.length || 0} units</span>
          </div>
          <div className="info-row">
            <span className="label">Status:</span>
            <span className={`badge badge-${course.status.toLowerCase()}`}>{course.status}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Assignment Options */}
        <div className="form-section">
          <h2>Assignment Options</h2>
          
          <div className="form-group">
            <label>Assignment Type</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="BATCH"
                  checked={assignmentType === 'BATCH'}
                  onChange={(e) => setAssignmentType(e.target.value as 'BATCH')}
                />
                Batch Assignment (All at once)
              </label>
              <label>
                <input
                  type="radio"
                  value="INDIVIDUAL"
                  checked={assignmentType === 'INDIVIDUAL'}
                  onChange={(e) => setAssignmentType(e.target.value as 'INDIVIDUAL')}
                />
                Individual Assignment (One by one)
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dueDate">Due Date (Optional)</label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Student Selection */}
        <div className="form-section">
          <div className="section-header">
            <h2>Select Students</h2>
            <div className="selection-info">
              {selectedStudents.length} of {filteredStudents.length} selected
            </div>
          </div>

          <div className="form-group">
            <input
              type="text"
              placeholder="Search by name, email, or year..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="select-all-row">
            <label>
              <input
                type="checkbox"
                checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                onChange={handleSelectAll}
              />
              Select All
            </label>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              <p>No students found matching your search criteria</p>
            </div>
          ) : (
            <div className="students-table">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>Select</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Academic Year</th>
                    <th>Year of Admission</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleSelectStudent(student.id)}
                        />
                      </td>
                      <td>{student.fullName}</td>
                      <td>{student.users.email}</td>
                      <td>{student.currentAcademicYear.replace('_', ' ')}</td>
                      <td>{student.yearOfAdmission}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/faculty')} className="btn btn-secondary">
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={selectedStudents.length === 0}
          >
            Assign to {selectedStudents.length} Student(s)
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignCourse;
