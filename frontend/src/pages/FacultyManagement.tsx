import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import governanceService, {
  Department,
  Faculty,
  FacultyAssignment,
  PermissionSet,
  CreateFacultyDto,
  CreateFacultyAssignmentDto
} from '../services/governance.service';
import '../styles/CollegeAdminNew.css';

const FacultyManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const departmentIdFilter = searchParams.get('department');

  const [facultyUsers, setFacultyUsers] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissionSets, setPermissionSets] = useState<PermissionSet[]>([]);
  const [facultyAssignments, setFacultyAssignments] = useState<FacultyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter state
  const [selectedDepartment, setSelectedDepartment] = useState<string>(departmentIdFilter || '');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<FacultyAssignment | null>(null);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadResult, setBulkUploadResult] = useState<any>(null);

  // Create Faculty Form
  const [createForm, setCreateForm] = useState<CreateFacultyDto>({
    email: '',
    fullName: '',
    departmentId: '',
    permissionSetId: ''
  });

  // Assign Form
  const [assignForm, setAssignForm] = useState<CreateFacultyAssignmentDto>({
    userId: '',
    departmentId: '',
    permissionId: ''
  });

  // Created faculty credentials
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchAssignmentsByDepartment(selectedDepartment);
    }
  }, [selectedDepartment]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [facultyData, deptData, permData] = await Promise.all([
        governanceService.getFacultyUsers(),
        governanceService.getDepartments(),
        governanceService.getPermissionSets()
      ]);
      setFacultyUsers(facultyData);
      setDepartments(deptData);
      setPermissionSets(permData);

      // If no permission sets exist, offer to create defaults
      if (permData.length === 0) {
        if (window.confirm('No permission sets found. Would you like to create default permission sets?')) {
          await governanceService.initializeDefaultPermissions();
          const newPermData = await governanceService.getPermissionSets();
          setPermissionSets(newPermData);
          setSuccess('Default permission sets created successfully');
        }
      }

      // Fetch assignments if department filter is set
      if (departmentIdFilter) {
        await fetchAssignmentsByDepartment(departmentIdFilter);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentsByDepartment = async (deptId: string) => {
    try {
      const assignments = await governanceService.getFacultyByDepartment(deptId);
      setFacultyAssignments(assignments);
    } catch (err: any) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  // Create Faculty Modal
  const openCreateModal = () => {
    setCreateForm({
      email: '',
      fullName: '',
      departmentId: selectedDepartment || (departments[0]?.id || ''),
      permissionSetId: permissionSets[0]?.id || ''
    });
    setShowCreateModal(true);
    setCreatedCredentials(null);
  };

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setError(null);

    try {
      const result = await governanceService.createFacultyUser(createForm);
      setCreatedCredentials({
        email: result.user.email,
        password: result.tempPassword
      });
      setSuccess('Faculty member created successfully');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create faculty');
    } finally {
      setModalLoading(false);
    }
  };

  // Assign Faculty Modal
  const openAssignModal = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setAssignForm({
      userId: faculty.id,
      departmentId: selectedDepartment || (departments[0]?.id || ''),
      permissionId: permissionSets[0]?.id || ''
    });
    setShowAssignModal(true);
  };

  const handleAssignFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setError(null);

    try {
      await governanceService.createFacultyAssignment(assignForm);
      setSuccess('Faculty assigned to department successfully');
      setShowAssignModal(false);
      fetchData();
      if (selectedDepartment) {
        fetchAssignmentsByDepartment(selectedDepartment);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign faculty');
    } finally {
      setModalLoading(false);
    }
  };

  // Update Assignment Permission
  const openPermissionModal = (assignment: FacultyAssignment) => {
    setSelectedAssignment(assignment);
    setShowPermissionModal(true);
  };

  const handleUpdatePermission = async (newPermissionId: string) => {
    if (!selectedAssignment) return;
    setModalLoading(true);

    try {
      await governanceService.updateFacultyAssignment(selectedAssignment.id, {
        permissionId: newPermissionId
      });
      setSuccess('Permissions updated successfully');
      setShowPermissionModal(false);
      if (selectedDepartment) {
        fetchAssignmentsByDepartment(selectedDepartment);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update permissions');
    } finally {
      setModalLoading(false);
    }
  };

  // Remove Assignment
  const handleRemoveAssignment = async (userId: string, departmentId: string) => {
    if (!window.confirm('Are you sure you want to remove this faculty from the department?')) return;

    try {
      await governanceService.removeFacultyAssignment(userId, departmentId);
      setSuccess('Faculty removed from department successfully');
      if (selectedDepartment) {
        fetchAssignmentsByDepartment(selectedDepartment);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove faculty');
    }
  };

  // Delete Faculty User Permanently
  const handleDeleteFaculty = async (userId: string, fullName: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE faculty "${fullName}"? This action cannot be undone!`)) return;

    try {
      await governanceService.deleteFacultyUser(userId);
      setSuccess('Faculty user deleted successfully');
      fetchData();
      if (selectedDepartment) {
        fetchAssignmentsByDepartment(selectedDepartment);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete faculty user');
    }
  };

  // Bulk Upload
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUploadFile) {
      setError('Please select a CSV file');
      return;
    }

    setModalLoading(true);
    setError(null);

    try {
      const result = await governanceService.bulkUploadFaculty(bulkUploadFile);
      setBulkUploadResult(result);
      let message = `Bulk upload complete!\n\n✅ Created: ${result.success}\n❌ Failed: ${result.failed}`;
      if (result.emailsSent > 0) {
        message += `\n📧 Emails sent: ${result.emailsSent}`;
      }
      setSuccess(message.replace(/\n/g, ' | '));
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process CSV file');
    } finally {
      setModalLoading(false);
    }
  };

  const downloadFacultyTemplate = () => {
    const csv = 'fullName,email,departmentCode,permissionSetName\nJohn Smith,john.smith@college.edu,CS,Full Access\nJane Doe,jane.doe@college.edu,MATH,Read Only';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'faculty_upload_template.csv';
    a.click();
  };

  // Clear messages
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
          <div className="loading-container">Loading faculty data...</div>
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
            <h1 className="management-title">Faculty Management</h1>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="action-button" onClick={() => setShowBulkUploadModal(true)}>
              📤 Bulk Upload
            </button>
            <button className="action-button primary" onClick={openCreateModal}>
              + Add Faculty
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && <div className="alert error">{error} <button onClick={() => setError(null)}>×</button></div>}
        {success && <div className="alert success">{success} <button onClick={() => setSuccess(null)}>×</button></div>}

        {/* Department Filter */}
        <div className="filter-section">
          <label className="filter-label">Filter by Department:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="filter-select"
          >
            <option value="">All Faculty</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>
        </div>

        {/* Faculty Table */}
        {selectedDepartment ? (
          // Show department assignments
          <div className="management-section">
            <h2 className="section-title">
              Faculty in {departments.find(d => d.id === selectedDepartment)?.name}
            </h2>
            <div className="management-table-container">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Permission Set</th>
                    <th>Subjects</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-row">
                        No faculty assigned to this department
                      </td>
                    </tr>
                  ) : (
                    facultyAssignments.map(assignment => (
                      <tr key={assignment.id}>
                        <td>{assignment.user?.fullName || 'N/A'}</td>
                        <td>{assignment.user?.email || 'N/A'}</td>
                        <td>
                          <span className="permission-tag">
                            {assignment.permissions?.name || 'N/A'}
                          </span>
                        </td>
                        <td>
                          {assignment.subjects?.length > 0 
                            ? assignment.subjects.join(', ')
                            : <span style={{color: 'var(--color-text-tertiary)'}}>None</span>
                          }
                        </td>
                        <td>
                          <span className={`status-badge ${assignment.status.toLowerCase()}`}>
                            {assignment.status}
                          </span>
                        </td>
                        <td>
                          <div style={{display: 'flex', gap: '8px'}}>
                            <button
                              className="action-button"
                              onClick={() => openPermissionModal(assignment)}
                            >
                              Permissions
                            </button>
                            <button
                              className="action-button"
                              style={{color: 'var(--color-error)'}}
                              onClick={() => handleRemoveAssignment(
                                assignment.userId,
                                assignment.departmentId
                              )}
                            >
                              Remove
                            </button>
                            <button
                              className="action-button"
                              style={{color: '#dc3545', fontWeight: 'bold'}}
                              onClick={() => handleDeleteFaculty(
                                assignment.userId,
                                assignment.user?.fullName || 'Unknown'
                              )}
                              title="Delete Permanently"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Show all faculty users
          <div className="management-section">
            <h2 className="section-title">All Faculty Members</h2>
            <div className="management-table-container">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-row">
                        No faculty members found. Click "Add Faculty" to create one.
                      </td>
                    </tr>
                  ) : (
                    facultyUsers.map(faculty => (
                      <tr key={faculty.id}>
                        <td>{faculty.fullName}</td>
                        <td>{faculty.email}</td>
                        <td>
                          <span className={`status-badge ${faculty.status.toLowerCase()}`}>
                            {faculty.status}
                          </span>
                        </td>
                        <td>
                          {faculty.lastLoginAt
                            ? new Date(faculty.lastLoginAt).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td>
                          <div style={{display: 'flex', gap: '8px'}}>
                            <button
                              className="action-button"
                              onClick={() => openAssignModal(faculty)}
                            >
                              Assign to Dept
                            </button>
                            <button
                              className="action-button"
                              style={{color: '#dc3545', fontWeight: 'bold'}}
                              onClick={() => handleDeleteFaculty(faculty.id, faculty.fullName)}
                              title="Delete Permanently"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Permission Sets Section */}
        <div className="management-section">
          <h2 className="section-title">Permission Sets</h2>
          <div className="cards-grid">
            {permissionSets.map(perm => (
              <div key={perm.id} className="management-card">
                <h3 className="card-title">{perm.name}</h3>
                <p className="card-description">{perm.description || 'No description'}</p>
                <div className="card-permissions">
                  {perm.canViewAnalytics && <span className="permission-tag">View Analytics</span>}
                  {perm.canAssignStudents && <span className="permission-tag">Assign Students</span>}
                  {perm.canCreateCourse && <span className="permission-tag">Create Course</span>}
                  {perm.canEditCourse && <span className="permission-tag">Edit Course</span>}
                  {perm.canGradeStudents && <span className="permission-tag">Grade Students</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Faculty Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              {createdCredentials ? (
                <>
                  <div className="modal-header">
                    <h2 className="modal-title">Faculty Created Successfully!</h2>
                    <button className="modal-close" onClick={() => { setShowCreateModal(false); setCreatedCredentials(null); }}>×</button>
                  </div>
                  <div className="credentials-box">
                    <h4>Login Credentials</h4>
                    <div className="credentials-item">
                      <label>Email:</label>
                      <code>{createdCredentials.email}</code>
                    </div>
                    <div className="credentials-item">
                      <label>Password:</label>
                      <code>{createdCredentials.password}</code>
                    </div>
                    <p className="form-hint" style={{marginTop: '16px', color: 'var(--color-error)'}}>
                      ⚠️ Please save these credentials. The password cannot be retrieved later.
                    </p>
                  </div>
                  <div className="form-actions">
                    <button
                      className="action-button primary"
                      onClick={() => { setShowCreateModal(false); setCreatedCredentials(null); }}
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="modal-header">
                    <h2 className="modal-title">Add New Faculty</h2>
                    <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                  </div>
                  <form onSubmit={handleCreateFaculty}>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        value={createForm.fullName}
                        onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                        required
                        className="form-input"
                        placeholder="Dr. John Smith"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        required
                        className="form-input"
                        placeholder="john.smith@college.edu"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department *</label>
                      <select
                        value={createForm.departmentId}
                        onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}
                        required
                        className="form-select"
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Permission Set *</label>
                      <select
                        value={createForm.permissionSetId}
                        onChange={(e) => setCreateForm({ ...createForm, permissionSetId: e.target.value })}
                        required
                        className="form-select"
                      >
                        <option value="">Select Permissions</option>
                        {permissionSets.map(perm => (
                          <option key={perm.id} value={perm.id}>{perm.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="action-button" onClick={() => setShowCreateModal(false)} disabled={modalLoading}>
                        Cancel
                      </button>
                      <button type="submit" className="action-button primary" disabled={modalLoading}>
                        {modalLoading ? 'Creating...' : 'Create Faculty'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* Assign Faculty Modal */}
        {showAssignModal && selectedFaculty && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">Assign Faculty to Department</h2>
                <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
              </div>
              <p style={{marginBottom: '16px'}}>Assigning: <strong>{selectedFaculty.fullName}</strong></p>
              <form onSubmit={handleAssignFaculty}>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    value={assignForm.departmentId}
                    onChange={(e) => setAssignForm({ ...assignForm, departmentId: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Permission Set *</label>
                  <select
                    value={assignForm.permissionId}
                    onChange={(e) => setAssignForm({ ...assignForm, permissionId: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="">Select Permissions</option>
                    {permissionSets.map(perm => (
                      <option key={perm.id} value={perm.id}>{perm.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="action-button" onClick={() => setShowAssignModal(false)} disabled={modalLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="action-button primary" disabled={modalLoading}>
                    {modalLoading ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Permission Modal */}
        {showPermissionModal && selectedAssignment && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">Change Permission Set</h2>
                <button className="modal-close" onClick={() => setShowPermissionModal(false)}>×</button>
              </div>
              <p>Faculty: <strong>{selectedAssignment.user?.fullName}</strong></p>
              <p style={{marginBottom: '16px'}}>Current: <span className="permission-tag">{selectedAssignment.permissions?.name}</span></p>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {permissionSets.map(perm => (
                  <button
                    key={perm.id}
                    className={`action-button ${perm.id === selectedAssignment.permissionId ? 'primary' : ''}`}
                    onClick={() => handleUpdatePermission(perm.id)}
                    disabled={modalLoading}
                    style={{width: '100%'}}
                  >
                    {perm.name}
                  </button>
                ))}
              </div>
              <div className="form-actions">
                <button className="action-button" onClick={() => setShowPermissionModal(false)} disabled={modalLoading}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Upload Modal */}
        {showBulkUploadModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">📤 Bulk Upload Faculty</h2>
                <button className="modal-close" onClick={() => { setShowBulkUploadModal(false); setBulkUploadFile(null); setBulkUploadResult(null); }}>×</button>
              </div>
              
              <form onSubmit={handleBulkUpload}>
                <div className="form-group">
                  <label className="form-label">CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
                    className="form-input"
                    required
                  />
                  <small className="form-hint">
                    Required columns: fullName, email, departmentCode, permissionSetName
                  </small>
                </div>

                <button
                  type="button"
                  className="action-button"
                  onClick={downloadFacultyTemplate}
                  style={{ marginBottom: '1rem' }}
                >
                  📥 Download CSV Template
                </button>

                {bulkUploadResult && (
                  <div className="bulk-result-summary" style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                    <p>✅ Created: {bulkUploadResult.success}</p>
                    <p>❌ Failed: {bulkUploadResult.failed}</p>
                    <p>📧 Emails sent: {bulkUploadResult.emailsSent}</p>
                    {bulkUploadResult.errors?.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <strong>Errors:</strong>
                        <ul style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          {bulkUploadResult.errors.slice(0, 5).map((err: any, idx: number) => (
                            <li key={idx}>Row {err.row}: {err.error}</li>
                          ))}
                          {bulkUploadResult.errors.length > 5 && (
                            <li>...and {bulkUploadResult.errors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="action-button" onClick={() => { setShowBulkUploadModal(false); setBulkUploadFile(null); setBulkUploadResult(null); }} disabled={modalLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="action-button primary" disabled={modalLoading || !bulkUploadFile}>
                    {modalLoading ? 'Uploading...' : 'Upload & Create Faculty'}
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

export default FacultyManagement;
