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
        await governanceService.updateDepartment(selectedDepartment.id, formData);
        setSuccess('Department updated successfully');
      } else if (modalMode === 'assignHod' && selectedDepartment) {
        if (selectedHodId) {
          await governanceService.assignHod(selectedDepartment.id, selectedHodId);
          setSuccess('HOD assigned successfully');
        } else if (selectedDepartment.hodUserId) {
          await governanceService.removeHod(selectedDepartment.id);
          setSuccess('HOD removed successfully');
        }
      }
      closeModal();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this department?')) return;

    try {
      await governanceService.deleteDepartment(id);
      setSuccess('Department deactivated successfully');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete department');
    }
  };

  // Clear messages after timeout
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (loading) {
    return (
      <div className="management-page">
        <div className="management-page-inner">
          <div className="loading-container">Loading departments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="management-page">
      <div className="management-page-inner">
        {/* Header */}
        <div className="management-header">
          <div className="management-header-left">
            <button className="back-link" onClick={() => navigate('/college-admin')}>
              ← Back to Dashboard
            </button>
            <h1 className="management-title">Department Management</h1>
          </div>
          <button className="action-button primary" onClick={openCreateModal}>
            + Add Department
          </button>
        </div>

        {/* Messages */}
        {error && <div className="alert error">{error} <button onClick={() => setError(null)}>×</button></div>}
        {success && <div className="alert success">{success} <button onClick={() => setSuccess(null)}>×</button></div>}

        {/* Departments Table */}
        <div className="management-table-container">
          <table className="management-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Description</th>
                <th>HOD</th>
                <th>Faculty</th>
                <th>Students</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-row">
                    No departments found. Click "Add Department" to create one.
                  </td>
                </tr>
              ) : (
                departments.map(dept => (
                  <tr key={dept.id}>
                    <td>{dept.name}</td>
                    <td><span className="permission-tag">{dept.code}</span></td>
                    <td>{dept.description || '-'}</td>
                    <td>
                      {dept.hodUser ? (
                        <span className="status-badge active">{dept.hodUser.fullName}</span>
                      ) : (
                        <span style={{color: 'var(--color-text-tertiary)'}}>Not Assigned</span>
                      )}
                    </td>
                    <td>{dept._count?.faculty_assignments || 0}</td>
                    <td>{dept._count?.students || 0}</td>
                    <td>
                      <span className={`status-badge ${dept.status.toLowerCase()}`}>
                        {dept.status}
                      </span>
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                        <button className="action-button" onClick={() => openEditModal(dept)}>
                          Edit
                        </button>
                        <button className="action-button" onClick={() => openAssignHodModal(dept)}>
                          {dept.hodUserId ? 'Change HOD' : 'Assign HOD'}
                        </button>
                        <button 
                          className="action-button"
                          onClick={() => navigate(`/college-admin/faculty?department=${dept.id}`)}
                        >
                          Faculty
                        </button>
                        {dept.status === 'ACTIVE' && (
                          <button 
                            className="action-button" 
                            style={{color: 'var(--color-error)'}}
                            onClick={() => handleDelete(dept.id)}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">
                  {modalMode === 'create' && 'Create Department'}
                  {modalMode === 'edit' && 'Edit Department'}
                  {modalMode === 'assignHod' && 'Assign Head of Department'}
                </h2>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>

              <form onSubmit={handleSubmit}>
                {(modalMode === 'create' || modalMode === 'edit') && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Department Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                        placeholder="e.g., Computer Science"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department Code *</label>
                      <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                        placeholder="e.g., CS"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Brief description of the department"
                        rows={3}
                      />
                    </div>
                  </>
                )}

                {modalMode === 'assignHod' && (
                  <div className="form-group">
                    <label className="form-label">Select HOD</label>
                    <select
                      value={selectedHodId}
                      onChange={(e) => setSelectedHodId(e.target.value)}
                      className="form-select"
                    >
                      <option value="">-- No HOD --</option>
                      {facultyUsers.map(faculty => (
                        <option key={faculty.id} value={faculty.id}>
                          {faculty.fullName} ({faculty.email})
                        </option>
                      ))}
                    </select>
                    <p className="form-hint">
                      Select a faculty member to be the Head of Department
                    </p>
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" onClick={closeModal} className="action-button" disabled={modalLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="action-button primary" disabled={modalLoading}>
                    {modalLoading ? 'Saving...' : 'Save'}
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
