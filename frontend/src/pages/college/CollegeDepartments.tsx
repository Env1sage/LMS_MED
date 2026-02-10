import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import governanceService, { Department, CreateDepartmentDto, UpdateDepartmentDto, Faculty, FacultyAssignment, PermissionSet } from '../../services/governance.service';
import CollegeLayout from '../../components/college/CollegeLayout';
import { Building2, PlusCircle, Edit2, Trash2, UserCog, Users, X, ChevronDown, ChevronUp, Shield, UserMinus, Eye, BookOpen, GraduationCap, FileEdit, Clipboard, BarChart3, UserCheck } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const CollegeDepartments: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<Faculty[]>([]);
  const [permissionSets, setPermissionSets] = useState<PermissionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'assignHod'>('create');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form, setForm] = useState<CreateDepartmentDto>({ name: '', code: '', description: '' });
  const [selectedHodId, setSelectedHodId] = useState('');

  // Expanded department card to show faculty roster
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [deptAssignments, setDeptAssignments] = useState<{ [deptId: string]: FacultyAssignment[] }>({});
  const [loadingAssignments, setLoadingAssignments] = useState<string | null>(null);

  // Permission change modal
  const [showPermModal, setShowPermModal] = useState(false);
  const [permTarget, setPermTarget] = useState<FacultyAssignment | null>(null);
  const [newPermId, setNewPermId] = useState('');

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); } }, [success]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [d, f, p] = await Promise.all([
        governanceService.getDepartments(),
        governanceService.getFacultyUsers(),
        governanceService.getPermissionSets()
      ]);
      setDepartments(d); setFacultyUsers(f); setPermissionSets(p);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  const toggleExpand = async (deptId: string) => {
    if (expandedDept === deptId) { setExpandedDept(null); return; }
    setExpandedDept(deptId);
    if (!deptAssignments[deptId]) {
      setLoadingAssignments(deptId);
      try {
        const assignments = await governanceService.getFacultyByDepartment(deptId);
        setDeptAssignments(prev => ({ ...prev, [deptId]: assignments }));
      } catch (err) { console.error('Failed to load faculty:', err); }
      finally { setLoadingAssignments(null); }
    }
  };

  const refreshDeptAssignments = async (deptId: string) => {
    try {
      const assignments = await governanceService.getFacultyByDepartment(deptId);
      setDeptAssignments(prev => ({ ...prev, [deptId]: assignments }));
    } catch (err) { console.error('Failed to refresh:', err); }
  };

  const openCreate = () => { setModalMode('create'); setForm({ name: '', code: '', description: '' }); setSelectedDept(null); setShowModal(true); };
  const openEdit = (d: Department) => { setModalMode('edit'); setSelectedDept(d); setForm({ name: d.name, code: d.code, description: d.description || '' }); setShowModal(true); };
  const openAssignHod = (d: Department) => { 
    setModalMode('assignHod'); setSelectedDept(d); 
    setSelectedHodId((d as any).hodId || d.hodUserId || ''); 
    setShowModal(true); 
  };
  const closeModal = () => { setShowModal(false); setSelectedDept(null); setForm({ name: '', code: '', description: '' }); setSelectedHodId(''); setModalLoading(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true); setError(null);
    try {
      if (modalMode === 'create') { await governanceService.createDepartment(form); setSuccess('Department created'); }
      else if (modalMode === 'edit' && selectedDept) { await governanceService.updateDepartment(selectedDept.id, form as UpdateDepartmentDto); setSuccess('Department updated'); }
      else if (modalMode === 'assignHod' && selectedDept) { 
        if (selectedHodId) {
          await governanceService.assignHod(selectedDept.id, selectedHodId); 
          setSuccess('HOD assigned successfully');
        } else {
          const currentHodId = (selectedDept as any).hodId || selectedDept.hodUserId;
          if (currentHodId) {
            await governanceService.removeHod(selectedDept.id);
            setSuccess('HOD removed');
          }
        }
      }
      await fetchData(); closeModal();
    } catch (err: any) { setError(err.response?.data?.message || 'Operation failed'); }
    finally { setModalLoading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete department "${name}"?`)) return;
    try { await governanceService.deleteDepartment(id); setSuccess('Department deleted'); await fetchData(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleRemoveFaculty = async (userId: string, departmentId: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from this department?`)) return;
    try {
      await governanceService.removeFacultyAssignment(userId, departmentId);
      setSuccess(`${name} removed from department`);
      await refreshDeptAssignments(departmentId);
      await fetchData();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to remove'); }
  };

  const openPermChange = (assignment: FacultyAssignment) => {
    setPermTarget(assignment);
    setNewPermId(assignment.permissionId || '');
    setShowPermModal(true);
  };

  const handlePermChange = async () => {
    if (!permTarget || !newPermId) return;
    setModalLoading(true);
    try {
      await governanceService.updateFacultyAssignment(permTarget.id, { permissionId: newPermId });
      setSuccess(`Permissions updated for ${permTarget.user?.fullName}`);
      setShowPermModal(false); setPermTarget(null);
      await refreshDeptAssignments(permTarget.departmentId);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
    finally { setModalLoading(false); }
  };

  const getHodInfo = (dept: any) => dept.hod || dept.hodUser;
  const getHodId = (dept: any) => dept.hodId || dept.hodUserId;
  const getFacultyCount = (dept: any) => dept._count?.faculty_assignments || 0;
  const getStudentCount = (dept: any) => dept._count?.student_departments || dept._count?.students || 0;

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block' };

  const permLabelMap: { [key: string]: string } = {
    canViewAnalytics: 'Analytics', canCreateCourse: 'Create', canEditCourse: 'Edit', canDeleteCourse: 'Delete',
    canAssignStudents: 'Students', canGradeStudents: 'Grade', canCreateMcq: 'MCQ', canEditMcq: 'Edit MCQ',
    canDeleteMcq: 'Del MCQ', canPublishCourse: 'Publish',
  };

  return (
    <CollegeLayout>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Department Management</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Manage departments, assign HODs, and view faculty rosters</p>
        </div>
        <button className="bo-btn bo-btn-primary" style={{ background: '#059669' }} onClick={openCreate}>
          <PlusCircle size={14} /> Add Department
        </button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>{error}</span><button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}>×</button></div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

      {loading ? (
        <div className="page-loading-screen" style={{ padding: 60 }}>
          <div className="loading-rings"><div className="loading-ring loading-ring-1"></div><div className="loading-ring loading-ring-2"></div><div className="loading-ring loading-ring-3"></div></div>
          <div className="loading-dots"><div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div></div>
          <div className="loading-title">Loading Departments</div>
          <div className="loading-bar-track"><div className="loading-bar-fill"></div></div>
        </div>
      ) : departments.length === 0 ? (
        <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
          <Building2 size={48} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No Departments</div>
          <div style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginBottom: 16 }}>Create departments to organize your institution</div>
          <button className="bo-btn bo-btn-primary" style={{ background: '#059669' }} onClick={openCreate}><PlusCircle size={14} /> Add Department</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {departments.map(dept => {
            const hodInfo = getHodInfo(dept);
            const hodId = getHodId(dept);
            const isExpanded = expandedDept === dept.id;
            const assignments = deptAssignments[dept.id] || [];
            const isLoadingAssignments = loadingAssignments === dept.id;

            return (
              <div key={dept.id} className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #059669, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={20} color="white" />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{dept.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{dept.code}</div>
                        {dept.description && <p style={{ fontSize: 12, color: 'var(--bo-text-secondary)', marginTop: 4, lineHeight: 1.5, margin: '4px 0 0 0' }}>{dept.description}</p>}
                      </div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: dept.status === 'ACTIVE' ? '#ECFDF5' : '#FEF3C7', color: dept.status === 'ACTIVE' ? '#059669' : '#D97706' }}>
                      {dept.status}
                    </span>
                  </div>

                  {/* HOD + Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div style={{ padding: 10, borderRadius: 8, background: hodInfo ? 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' : 'var(--bo-bg)', border: '1px solid ' + (hodInfo ? '#93C5FD' : 'var(--bo-border)') }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: hodInfo ? '#1D4ED8' : 'var(--bo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <UserCog size={10} /> Head of Department
                      </div>
                      {hodInfo ? (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF' }}>{hodInfo.fullName}</div>
                          <div style={{ fontSize: 11, color: '#3B82F6' }}>{hodInfo.email}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', fontStyle: 'italic' }}>Not assigned</div>
                      )}
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, background: 'var(--bo-bg)', textAlign: 'center', border: '1px solid var(--bo-border)' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#059669' }}>{getFacultyCount(dept)}</div>
                      <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Users size={10} /> Faculty
                      </div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, background: 'var(--bo-bg)', textAlign: 'center', border: '1px solid var(--bo-border)' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#3B82F6' }}>{getStudentCount(dept)}</div>
                      <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <GraduationCap size={10} /> Students
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="bo-btn bo-btn-outline" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => openEdit(dept)}>
                      <Edit2 size={12} /> Edit
                    </button>
                    <button className="bo-btn bo-btn-outline" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => openAssignHod(dept)}>
                      <UserCog size={12} /> {hodId ? 'Change HOD' : 'Assign HOD'}
                    </button>
                    <button className="bo-btn bo-btn-outline" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => navigate('/college-admin/faculty?department=' + dept.id)}>
                      <Users size={12} /> Manage Faculty
                    </button>
                    {dept.status === 'ACTIVE' && (
                      <button className="bo-btn bo-btn-danger" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => handleDelete(dept.id, dept.name)}>
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button 
                      onClick={() => toggleExpand(dept.id)}
                      style={{ 
                        padding: '5px 12px', fontSize: 11, fontWeight: 600,
                        background: isExpanded ? '#059669' : 'transparent', 
                        color: isExpanded ? 'white' : '#059669',
                        border: '1px solid #059669', borderRadius: 6, 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        transition: 'all 0.15s'
                      }}
                    >
                      <Users size={12} /> 
                      {isExpanded ? 'Hide' : 'View'} Faculty Roster
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                </div>

                {/* Expandable Faculty Roster */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--bo-border)', background: '#F8FAFC' }}>
                    <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bo-border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={14} color="#059669" /> Assigned Faculty ({assignments.length})
                      </div>
                      <button className="bo-btn bo-btn-outline" style={{ padding: '4px 10px', fontSize: 10 }}
                        onClick={() => navigate('/college-admin/faculty?department=' + dept.id)}>
                        <PlusCircle size={10} /> Add Faculty
                      </button>
                    </div>

                    {isLoadingAssignments ? (
                      <div style={{ padding: 30, textAlign: 'center', color: 'var(--bo-text-muted)', fontSize: 13 }}>Loading faculty...</div>
                    ) : assignments.length === 0 ? (
                      <div style={{ padding: 30, textAlign: 'center' }}>
                        <Users size={28} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 8 }} />
                        <div style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>No faculty assigned to this department</div>
                        <button className="bo-btn bo-btn-primary" style={{ background: '#059669', marginTop: 10, fontSize: 11 }}
                          onClick={() => navigate('/college-admin/faculty?department=' + dept.id)}>
                          <PlusCircle size={12} /> Assign Faculty
                        </button>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#F1F5F9' }}>
                              {['Faculty', 'Email', 'Permission Set', 'Access Rights', 'Status', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--bo-border)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {assignments.map((a, idx) => (
                              <tr key={a.id} style={{ borderBottom: idx < assignments.length - 1 ? '1px solid var(--bo-border)' : 'none' }}>
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                                      {a.user?.fullName?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{a.user?.fullName || 'N/A'}</div>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 14px', color: 'var(--bo-text-secondary)' }}>{a.user?.email || 'N/A'}</td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0' }}>
                                    {a.permissions?.name || 'N/A'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                    {a.permissions && Object.entries(permLabelMap).map(([key, label]) => {
                                      if (!(a.permissions as any)?.[key]) return null;
                                      return <span key={key} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 500, background: '#EFF6FF', color: '#2563EB' }}>{label}</span>;
                                    })}
                                  </div>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: a.status === 'ACTIVE' ? '#ECFDF5' : a.status === 'ON_LEAVE' ? '#FEF3C7' : '#FEF2F2', color: a.status === 'ACTIVE' ? '#059669' : a.status === 'ON_LEAVE' ? '#D97706' : '#DC2626' }}>
                                    {a.status}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button title="Change Permissions" onClick={() => openPermChange(a)}
                                      style={{ padding: 4, border: '1px solid var(--bo-border)', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#3B82F6' }}>
                                      <Shield size={12} />
                                    </button>
                                    <button title="Remove from Department" onClick={() => handleRemoveFaculty(a.userId, a.departmentId, a.user?.fullName || 'Faculty')}
                                      style={{ padding: 4, border: '1px solid var(--bo-border)', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#EF4444' }}>
                                      <UserMinus size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit / Assign HOD Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeModal}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--bo-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                {modalMode === 'create' ? 'Create Department' : modalMode === 'edit' ? 'Edit Department' : 'Assign Head of Department'}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              {(modalMode === 'create' || modalMode === 'edit') && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Department Name <span style={{ color: '#EF4444' }}>*</span></label>
                    <input type="text" name="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g., Department of Anatomy" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Department Code <span style={{ color: '#EF4444' }}>*</span></label>
                    <input type="text" name="code" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} required placeholder="e.g., ANAT" style={{ ...inputStyle, textTransform: 'uppercase' as const }} />
                    <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Short code (3-5 letters)</span>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Description</label>
                    <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Brief description..." style={{ ...inputStyle, resize: 'vertical' as const }} />
                  </div>
                </>
              )}

              {modalMode === 'assignHod' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Select Head of Department</label>
                  <select value={selectedHodId} onChange={e => setSelectedHodId(e.target.value)} style={inputStyle}>
                    <option value="">-- No HOD / Remove Current --</option>
                    {facultyUsers.map(f => <option key={f.id} value={f.id}>{f.fullName} ({f.email})</option>)}
                  </select>
                  
                  {selectedDept && getHodInfo(selectedDept) && (
                    <div style={{ padding: 10, borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A', marginTop: 12, fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: '#92400E', marginBottom: 4 }}>Current HOD</div>
                      <div style={{ color: '#92400E' }}>{getHodInfo(selectedDept)?.fullName} — {getHodInfo(selectedDept)?.email}</div>
                    </div>
                  )}

                  <div style={{ padding: 10, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', marginTop: 12, fontSize: 12, color: '#1D4ED8' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>HOD Capabilities</div>
                    <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                      <li>View and manage faculty in their department</li>
                      <li>Assign content creation access to faculty</li>
                      <li>Monitor department analytics and progress</li>
                      <li>Manage faculty permissions and work assignments</li>
                    </ul>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="bo-btn bo-btn-outline" onClick={closeModal} disabled={modalLoading}>Cancel</button>
                <button type="submit" className="bo-btn bo-btn-primary" style={{ background: '#059669' }} disabled={modalLoading}>
                  {modalLoading ? 'Saving...' : modalMode === 'create' ? 'Create Department' : modalMode === 'assignHod' ? (selectedHodId ? 'Assign HOD' : 'Remove HOD') : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Permission Modal */}
      {showPermModal && permTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowPermModal(false)}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--bo-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={18} color="#3B82F6" /> Change Permissions
              </h3>
              <button onClick={() => setShowPermModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--bo-bg)', marginBottom: 16, fontSize: 13 }}>
                Faculty: <strong>{permTarget.user?.fullName}</strong>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                  Current: <span style={{ color: '#059669', fontWeight: 600 }}>{permTarget.permissions?.name}</span>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>New Permission Set</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {permissionSets.map(p => (
                    <div key={p.id} onClick={() => setNewPermId(p.id)}
                      style={{ padding: 12, borderRadius: 8, cursor: 'pointer',
                        border: '2px solid ' + (newPermId === p.id ? '#059669' : 'var(--bo-border)'),
                        background: newPermId === p.id ? '#F0FDF4' : 'white', transition: 'all 0.15s'
                      }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {newPermId === p.id && <UserCheck size={14} color="#059669" />} {p.name}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {Object.entries(permLabelMap).map(([key, label]) => {
                          if (!(p as any)[key]) return null;
                          return <span key={key} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 500, background: '#EFF6FF', color: '#2563EB' }}>{label}</span>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="bo-btn bo-btn-outline" onClick={() => setShowPermModal(false)} disabled={modalLoading}>Cancel</button>
                <button className="bo-btn bo-btn-primary" style={{ background: '#059669' }} onClick={handlePermChange} disabled={modalLoading || newPermId === permTarget.permissionId}>
                  {modalLoading ? 'Updating...' : 'Update Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CollegeLayout>
  );
};

export default CollegeDepartments;
