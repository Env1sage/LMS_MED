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
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
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

      if (permData.length === 0) {
        if (window.confirm('No permission sets found. Would you like to create default permission sets?')) {
          await governanceService.initializeDefaultPermissions();
          const newPermData = await governanceService.getPermissionSets();
          setPermissionSets(newPermData);
          setSuccess('Default permission sets created successfully');
        }
      }

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
      const data = await governanceService.getFacultyAssignments(deptId);
      setFacultyAssignments(data);
    } catch (err: any) {
      setError('Failed to fetch faculty assignments');
    }
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
      await fetchData();
      setSuccess('Faculty created successfully');
      setCreateForm({ email: '', fullName: '', departmentId: '', permissionSetId: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create faculty');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAssignFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setError(null);
    try {
      await governanceService.createFacultyAssignment(assignForm);
      setSuccess('Faculty assigned successfully');
      setShowAssignModal(false);
      setSelectedFaculty(null);
      await fetchData();
      if (assignForm.departmentId) {
        await fetchAssignmentsByDepartment(assignForm.departmentId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign faculty');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteFaculty = async (facultyId: string, name: string) => {
    if (!window.confirm(`Permanently delete faculty "${name}"? This cannot be undone!`)) return;
    try {
      await governanceService.deleteFacultyUser(facultyId);
      setSuccess('Faculty deleted successfully');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete faculty');
    }
  };

  const openAssignModal = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setAssignForm({ userId: faculty.id, departmentId: '', permissionId: '' });
    setShowAssignModal(true);
  };

  const openProfileModal = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setShowProfileModal(true);
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUploadFile) return;

    setModalLoading(true);
    setError(null);
    try {
      const result = await governanceService.bulkUploadFaculty(bulkUploadFile);
      setBulkUploadResult(result);
      setSuccess(`Successfully created ${result.success} faculty members`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload faculty');
    } finally {
      setModalLoading(false);
    }
  };

  const downloadFacultyTemplate = () => {
    const csvContent = 'fullName,email,departmentCode,permissionSetName\n' +
      'Dr. John Smith,john.smith@college.edu,CS,Full Access\n' +
      'Dr. Jane Doe,jane.doe@college.edu,MATH,Course Manager';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'faculty_template.csv';
    a.click();
  };

  const filteredFaculty = facultyUsers.filter(f =>
    f.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="medical-icon-wrapper">👨‍🏫</div>
            <div className="header-text">
              <h1>Faculty Management</h1>
              <p className="subtitle">Manage faculty members and assignments</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline" onClick={() => navigate('/college-admin')}>
              ← Back to Dashboard
            </button>
            <button className="btn btn-secondary" onClick={() => setShowBulkUploadModal(true)}>
              📤 Bulk Upload
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              + Add Faculty
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

        {/* Faculty Table */}
        <div className="table-container">
          <div className="table-header">
            <h3 className="table-title">All Faculty Members</h3>
            <div className="table-filters">
              <div className="filter-group">
                <label>Search</label>
                <input
                  type="text"
                  className="search-box"
                  placeholder="Search faculty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Department</label>
                <select
                  className="filter-select"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredFaculty.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👨‍🏫</div>
              <h3 className="empty-state-title">No Faculty Found</h3>
              <p className="empty-state-text">Add your first faculty member to get started</p>
              <button className="btn btn-primary mt-3" onClick={() => setShowCreateModal(true)}>
                + Add Faculty
              </button>
            </div>
          ) : (
            <table className="data-table">
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
                {filteredFaculty.map((faculty) => (
                  <tr key={faculty.id} onClick={() => openProfileModal(faculty)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{faculty.fullName}</td>
                    <td>{faculty.email}</td>
                    <td>
                      <span className={`badge badge-${faculty.status === 'ACTIVE' ? 'success' : 'warning'}`}>
                        {faculty.status}
                      </span>
                    </td>
                    <td>
                      {faculty.lastLoginAt
                        ? new Date(faculty.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => openAssignModal(faculty)}>
                          Assign to Dept
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteFaculty(faculty.id, faculty.fullName)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Permission Sets */}
        <div className="card mt-3">
          <div className="card-header">
            <h3 className="card-title">
              <span className="icon">🔐</span>
              Permission Sets
            </h3>
          </div>
          <div className="departments-grid">
            {permissionSets.map(perm => (
              <div key={perm.id} className="department-card">
                <div className="department-header">
                  <div>
                    <h3 className="department-name">{perm.name}</h3>
                    <p className="department-code">{perm.description || 'No description'}</p>
                  </div>
                  <div className="department-icon">🔐</div>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {perm.canViewAnalytics && <span className="badge badge-info">View Analytics</span>}
                  {perm.canAssignStudents && <span className="badge badge-success">Assign Students</span>}
                  {perm.canCreateCourse && <span className="badge badge-primary">Create Course</span>}
                  {perm.canEditCourse && <span className="badge badge-warning">Edit Course</span>}
                  {perm.canGradeStudents && <span className="badge badge-success">Grade Students</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty Profile Modal */}
        {showProfileModal && selectedFaculty && (
          <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
            <div className="modal-content" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Faculty Profile</h2>
                <button className="modal-close" onClick={() => setShowProfileModal(false)}>×</button>
              </div>

              {/* Profile Header */}
              <div style={{ textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '0 auto 1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  {selectedFaculty.fullName.charAt(0).toUpperCase()}
                </div>
                <h2 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.75rem' }}>{selectedFaculty.fullName}</h2>
                <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1rem' }}>{selectedFaculty.email}</p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <span className={`badge badge-${selectedFaculty.status === 'ACTIVE' ? 'success' : 'warning'}`} style={{ background: 'white', color: selectedFaculty.status === 'ACTIVE' ? '#10b981' : '#f59e0b' }}>
                    {selectedFaculty.status}
                  </span>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card primary">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Content Created</h4>
                      <div className="stat-value">127</div>
                      <div className="stat-label">Learning Units</div>
                    </div>
                    <div className="stat-icon">📚</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Assessments</h4>
                      <div className="stat-value">45</div>
                      <div className="stat-label">This Semester</div>
                    </div>
                    <div className="stat-icon">✅</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Rating</h4>
                      <div className="stat-value">4.7</div>
                      <div className="stat-label">Student Feedback</div>
                    </div>
                    <div className="stat-icon">⭐</div>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-header">
                    <div className="stat-content">
                      <h4>Students</h4>
                      <div className="stat-value">234</div>
                      <div className="stat-label">Total Enrolled</div>
                    </div>
                    <div className="stat-icon">👥</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3 className="card-title">Recent Activity</h3>
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Created new learning unit "Cardiovascular System"</span>
                    <span style={{ color: 'var(--gray-500)' }}>2 days ago</span>
                  </div>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Graded Assessment: Midterm Exam</span>
                    <span style={{ color: 'var(--gray-500)' }}>5 days ago</span>
                  </div>
                  <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Updated course materials</span>
                    <span style={{ color: 'var(--gray-500)' }}>1 week ago</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => alert('Edit profile functionality coming soon')}>
                  ✏️ Edit Profile
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => alert('View analytics functionality coming soon')}>
                  📊 View Full Analytics
                </button>
                <button className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Faculty Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => !createdCredentials && setShowCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              {createdCredentials ? (
                <>
                  <div className="modal-header">
                    <h2 className="modal-title">✅ Faculty Created Successfully!</h2>
                    <button className="modal-close" onClick={() => { setShowCreateModal(false); setCreatedCredentials(null); }}>×</button>
                  </div>
                  <div className="info-box success">
                    <h4 className="info-box-title">Login Credentials</h4>
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Email:</label>
                        <code style={{ background: 'var(--gray-100)', padding: '0.5rem', borderRadius: '0.375rem', display: 'block' }}>
                          {createdCredentials.email}
                        </code>
                      </div>
                      <div>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Temporary Password:</label>
                        <code style={{ background: 'var(--gray-100)', padding: '0.5rem', borderRadius: '0.375rem', display: 'block' }}>
                          {createdCredentials.password}
                        </code>
                      </div>
                    </div>
                  </div>
                  <div className="info-box danger">
                    <p className="info-box-text">⚠️ Please save these credentials. The password cannot be retrieved later.</p>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setShowCreateModal(false); setCreatedCredentials(null); }}>
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
                      <label className="form-label">Full Name <span className="required">*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        value={createForm.fullName}
                        onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                        required
                        placeholder="Dr. John Smith"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email <span className="required">*</span></label>
                      <input
                        type="email"
                        className="form-input"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        required
                        placeholder="john.smith@college.edu"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department <span className="required">*</span></label>
                      <select
                        className="form-select"
                        value={createForm.departmentId}
                        onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Permission Set <span className="required">*</span></label>
                      <select
                        className="form-select"
                        value={createForm.permissionSetId}
                        onChange={(e) => setCreateForm({ ...createForm, permissionSetId: e.target.value })}
                        required
                      >
                        <option value="">Select Permissions</option>
                        {permissionSets.map(perm => (
                          <option key={perm.id} value={perm.id}>{perm.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={modalLoading}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={modalLoading}>
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
          <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Assign Faculty to Department</h2>
                <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
              </div>
              <p style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: '0.5rem' }}>
                Assigning: <strong>{selectedFaculty.fullName}</strong>
              </p>
              <form onSubmit={handleAssignFaculty}>
                <div className="form-group">
                  <label className="form-label">Department <span className="required">*</span></label>
                  <select
                    className="form-select"
                    value={assignForm.departmentId}
                    onChange={(e) => setAssignForm({ ...assignForm, departmentId: e.target.value })}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Permission Set <span className="required">*</span></label>
                  <select
                    className="form-select"
                    value={assignForm.permissionId}
                    onChange={(e) => setAssignForm({ ...assignForm, permissionId: e.target.value })}
                    required
                  >
                    <option value="">Select Permissions</option>
                    {permissionSets.map(perm => (
                      <option key={perm.id} value={perm.id}>{perm.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)} disabled={modalLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                    {modalLoading ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Upload Modal */}
        {showBulkUploadModal && (
          <div className="modal-overlay" onClick={() => { setShowBulkUploadModal(false); setBulkUploadFile(null); setBulkUploadResult(null); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">📤 Bulk Upload Faculty</h2>
                <button className="modal-close" onClick={() => { setShowBulkUploadModal(false); setBulkUploadFile(null); setBulkUploadResult(null); }}>×</button>
              </div>

              <form onSubmit={handleBulkUpload}>
                <div className="form-group">
                  <label className="form-label">CSV File <span className="required">*</span></label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
                    className="form-input"
                    required
                  />
                  <small className="form-help-text">
                    Required columns: fullName, email, departmentCode, permissionSetName
                  </small>
                </div>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={downloadFacultyTemplate}
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  📥 Download CSV Template
                </button>

                {bulkUploadResult && (
                  <div className="results-card">
                    <div className="results-summary">
                      <div className="result-stat">
                        <div className="result-stat-value success">{bulkUploadResult.success}</div>
                        <div className="result-stat-label">Created</div>
                      </div>
                      <div className="result-stat">
                        <div className="result-stat-value danger">{bulkUploadResult.failed}</div>
                        <div className="result-stat-label">Failed</div>
                      </div>
                      <div className="result-stat">
                        <div className="result-stat-value primary">{bulkUploadResult.emailsSent}</div>
                        <div className="result-stat-label">Emails Sent</div>
                      </div>
                    </div>
                    {bulkUploadResult.errors?.length > 0 && (
                      <div className="info-box danger">
                        <h4 className="info-box-title">Errors</h4>
                        <ul style={{ fontSize: '0.875rem', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
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
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowBulkUploadModal(false); setBulkUploadFile(null); setBulkUploadResult(null); }} disabled={modalLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={modalLoading || !bulkUploadFile}>
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
