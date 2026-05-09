import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import governanceService, { 
  Department, 
  CreateDepartmentDto, 
  UpdateDepartmentDto,
  Faculty 
} from '../services/governance.service';
import '../styles/CollegeAdminNew.css';

const DepartmentManagement: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'assignHod'>('create');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateDepartmentDto>({
    name: '',
    code: '',
    description: ''
  });
  const [selectedHodId, setSelectedHodId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptData, facultyData] = await Promise.all([
        governanceService.getDepartments(),
        governanceService.getFacultyUsers()
      ]);
      setDepartments(deptData);
      setFacultyUsers(facultyData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ name: '', code: '', description: '' });
    setSelectedDepartment(null);
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setModalMode('edit');
    setSelectedDepartment(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || ''
    });
    setShowModal(true);
  };

  const openAssignHodModal = (dept: Department) => {
    setModalMode('assignHod');
    setSelectedDepartment(dept);
    setSelectedHodId(dept.hodUserId || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDepartment(null);
    setFormData({ name: '', code: '', description: '' });
    setSelectedHodId('');
    setModalLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setError(null);

    try {
      if (modalMode === 'create') {
        await governanceService.createDepartment(formData);
        setSuccess('Department created successfully');
      } else if (modalMode === 'edit' && selectedDepartment) {
        const updateData: UpdateDepartmentDto = {
          name: formData.name,
          code: formData.code,
          description: formData.description
        };
        await governanceService.updateDepartment(selectedDepartment.id, updateData);
        setSuccess('Department updated successfully');
      } else if (modalMode === 'assignHod' && selectedDepartment) {
        await governanceService.assignHod(selectedDepartment.id, selectedHodId || '');
        setSuccess('HOD assigned successfully');
      }
      await fetchData();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeactivate = async (deptId: string) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await governanceService.deleteDepartment(deptId);
      setSuccess('Department deleted successfully');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete department');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-inner">
          <div className="loading"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-inner">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-title">
            <div className="medical-icon-wrapper">🏛️</div>
            <div className="header-text">
              <h1>Department Management</h1>
              <p className="subtitle">Organize and manage academic departments</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline" onClick={() => navigate('/college-admin')}>
              ← Back to Dashboard
            </button>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + Add Department
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-danger">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            {success}
            <button onClick={() => setSuccess(null)}>×</button>
          </div>
        )}

        {/* Departments Grid */}
        {departments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏛️</div>
            <h3 className="empty-state-title">No Departments</h3>
            <p className="empty-state-text">Create departments to organize your institution</p>
            <button className="btn btn-primary mt-3" onClick={openCreateModal}>
              + Add Department
            </button>
          </div>
        ) : (
          <div className="departments-grid">
            {departments.map((dept) => (
              <div key={dept.id} className="department-card">
                <div className="department-header">
                  <div>
                    <h3 className="department-name">{dept.name}</h3>
                    <p className="department-code">{dept.code}</p>
                    {dept.description && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                        {dept.description}
                      </p>
                    )}
                  </div>
                  <div className="department-icon">🏛️</div>
                </div>

                {/* HOD Info */}
                <div style={{ margin: '1rem 0', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                    Head of Department
                  </div>
                  {dept.hodUser ? (
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                      {dept.hodUser.fullName}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Not Assigned</div>
                  )}
                </div>

                {/* Stats */}
                <div className="department-stats">
                  <div className="dept-stat">
                    <div className="dept-stat-value">{dept._count?.faculty_assignments || 0}</div>
                    <div className="dept-stat-label">Faculty</div>
                  </div>
                  <div className="dept-stat">
                    <div className="dept-stat-value">{dept._count?.students || 0}</div>
                    <div className="dept-stat-label">Students</div>
                  </div>
                </div>

                {/* Status */}
                <div style={{ marginTop: '1rem' }}>
                  <span className={`badge badge-${dept.status === 'ACTIVE' ? 'success' : 'warning'}`}>
                    {dept.status}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => openEditModal(dept)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-outline" onClick={() => openAssignHodModal(dept)}>
                    {dept.hodUserId ? 'Change HOD' : 'Assign HOD'}
                  </button>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/college-admin/faculty?department=${dept.id}`)}
                  >
                    Faculty
                  </button>
                  {dept.status === 'ACTIVE' && (
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeactivate(dept.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {modalMode === 'create' && '➕ Create Department'}
                  {modalMode === 'edit' && '✏️ Edit Department'}
                  {modalMode === 'assignHod' && '👤 Assign Head of Department'}
                </h2>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>

              <form onSubmit={handleSubmit}>
                {(modalMode === 'create' || modalMode === 'edit') && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Department Name <span className="required">*</span></label>
                      <input
                        type="text"
                        name="name"
                        className="form-input"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Department of Anatomy"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department Code <span className="required">*</span></label>
                      <input
                        type="text"
                        name="code"
                        className="form-input"
                        value={formData.code}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., ANAT"
                        style={{ textTransform: 'uppercase' }}
                      />
                      <small className="form-help-text">Short code for the department (usually 3-5 letters)</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea
                        name="description"
                        className="form-textarea"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Brief description of the department and its focus areas..."
                        rows={4}
                      />
                    </div>
                  </>
                )}

                {modalMode === 'assignHod' && (
                  <div className="form-group">
                    <label className="form-label">Select Head of Department</label>
                    <select
                      className="form-select"
                      value={selectedHodId}
                      onChange={(e) => setSelectedHodId(e.target.value)}
                    >
                      <option value="">-- No HOD / Remove Current --</option>
                      {facultyUsers.map(faculty => (
                        <option key={faculty.id} value={faculty.id}>
                          {faculty.fullName} ({faculty.email})
                        </option>
                      ))}
                    </select>
                    <div className="info-box" style={{ marginTop: '1rem' }}>
                      <p className="info-box-text">
                        The HOD will have administrative oversight of this department and its faculty members.
                      </p>
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={modalLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                    {modalLoading ? 'Saving...' : modalMode === 'create' ? 'Create Department' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentManagement;
