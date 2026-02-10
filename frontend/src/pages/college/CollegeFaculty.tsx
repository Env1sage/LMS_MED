import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import governanceService, { Department, Faculty, FacultyAssignment, PermissionSet, CreateFacultyDto, CreateFacultyAssignmentDto } from '../../services/governance.service';
import CollegeLayout from '../../components/college/CollegeLayout';
import { UserCog, PlusCircle, Search, Trash2, Upload, Download, X, Shield, UserPlus, Copy, Check, ChevronDown, ChevronUp, Building2, UserMinus, UserCheck } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const CollegeFaculty: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deptFilter = searchParams.get('department');

  const [facultyUsers, setFacultyUsers] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissionSets, setPermissionSets] = useState<PermissionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState(deptFilter || '');

  // Expanded faculty row to show department assignments
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);
  const [facultyAssignments, setFacultyAssignments] = useState<{ [userId: string]: FacultyAssignment[] }>({});
  const [loadingAssignments, setLoadingAssignments] = useState<string | null>(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResult, setBulkResult] = useState<any>(null);

  // Permission change
  const [permTarget, setPermTarget] = useState<FacultyAssignment | null>(null);
  const [newPermId, setNewPermId] = useState('');

  const [createForm, setCreateForm] = useState<CreateFacultyDto>({ email: '', fullName: '', departmentId: '', permissionSetId: '' });
  const [assignForm, setAssignForm] = useState<CreateFacultyAssignmentDto>({ userId: '', departmentId: '', permissionId: '' });
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); } }, [success]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [f, d, p] = await Promise.all([governanceService.getFacultyUsers(), governanceService.getDepartments(), governanceService.getPermissionSets()]);
      setFacultyUsers(f); setDepartments(d); setPermissionSets(p);
      if (p.length === 0) {
        if (window.confirm('No permission sets found. Create defaults?')) {
          await governanceService.initializeDefaultPermissions();
          const np = await governanceService.getPermissionSets();
          setPermissionSets(np);
          setSuccess('Default permission sets created');
        }
      }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  const toggleExpandFaculty = async (userId: string) => {
    if (expandedFaculty === userId) { setExpandedFaculty(null); return; }
    setExpandedFaculty(userId);
    if (!facultyAssignments[userId]) {
      setLoadingAssignments(userId);
      try {
        const assignments = await governanceService.getFacultyAssignments(userId);
        setFacultyAssignments(prev => ({ ...prev, [userId]: assignments }));
      } catch (err) { console.error('Failed to load assignments:', err); setFacultyAssignments(prev => ({ ...prev, [userId]: [] })); }
      finally { setLoadingAssignments(null); }
    }
  };

  const refreshFacultyAssignments = async (userId: string) => {
    try {
      const assignments = await governanceService.getFacultyAssignments(userId);
      setFacultyAssignments(prev => ({ ...prev, [userId]: assignments }));
    } catch (err) { console.error('Failed to refresh:', err); }
  };

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true); setError(null);
    try {
      const result = await governanceService.createFacultyUser(createForm);
      setCredentials({ email: result.user?.email || createForm.email, password: result.tempPassword });
      await fetchData();
      setSuccess('Faculty created successfully');
      setCreateForm({ email: '', fullName: '', departmentId: '', permissionSetId: '' });
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
    finally { setModalLoading(false); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true); setError(null);
    try {
      await governanceService.createFacultyAssignment(assignForm);
      setSuccess('Faculty assigned to department');
      setShowAssign(false);
      if (expandedFaculty === assignForm.userId) await refreshFacultyAssignments(assignForm.userId);
      await fetchData();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
    finally { setModalLoading(false); }
  };

  const handleRemoveAssignment = async (userId: string, departmentId: string, deptName: string, facultyName: string) => {
    if (!window.confirm(`Remove "${facultyName}" from "${deptName}"?`)) return;
    try {
      await governanceService.removeFacultyAssignment(userId, departmentId);
      setSuccess(`${facultyName} removed from ${deptName}`);
      await refreshFacultyAssignments(userId);
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
      setSuccess(`Permissions updated for ${permTarget.user?.fullName || 'faculty'}`);
      setShowPermModal(false);
      if (expandedFaculty) await refreshFacultyAssignments(expandedFaculty);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
    finally { setModalLoading(false); setPermTarget(null); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? This will remove all their department assignments.`)) return;
    try { await governanceService.deleteFacultyUser(id); setSuccess('Faculty deleted'); await fetchData(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) return;
    setModalLoading(true); setError(null);
    try {
      const result = await governanceService.bulkUploadFaculty(bulkFile);
      setBulkResult(result); setSuccess(`Created ${result.success} faculty members`); await fetchData();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
    finally { setModalLoading(false); }
  };

  const downloadTemplate = () => {
    const csv = 'fullName,email,departmentCode,permissionSetName\nDr. John Smith,john@college.edu,ANAT,Full Access';
    const b = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'faculty_template.csv'; a.click();
  };

  const filtered = facultyUsers.filter(f => f.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || f.email.toLowerCase().includes(searchTerm.toLowerCase()));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4, display: 'block' };

  const copyCredentials = () => {
    if (credentials) navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

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
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Faculty Management</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>{facultyUsers.length} faculty members across {departments.length} departments</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bo-btn bo-btn-outline" onClick={() => setShowBulk(true)}><Upload size={14} /> Bulk Upload</button>
          <button className="bo-btn bo-btn-primary" style={{ background: '#059669' }} onClick={() => setShowCreate(true)}><PlusCircle size={14} /> Add Faculty</button>
        </div>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>{error}</span><button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}>×</button></div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

      {/* Filters */}
      <div className="bo-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
            <input type="text" placeholder="Search faculty by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 34 }} />
          </div>
          <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 180 }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bo-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        {loading ? (
          <div className="page-loading-screen" style={{ padding: 40 }}>
            <div className="loading-rings"><div className="loading-ring loading-ring-1"></div><div className="loading-ring loading-ring-2"></div><div className="loading-ring loading-ring-3"></div></div>
            <div className="loading-dots"><div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div></div>
            <div className="loading-title">Loading Faculty</div>
            <div className="loading-bar-track"><div className="loading-bar-fill"></div></div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <UserCog size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 500 }}>No faculty found</div>
            <div style={{ color: 'var(--bo-text-muted)', fontSize: 12, marginTop: 4 }}>Add faculty members to get started</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bo-bg)', borderBottom: '1px solid var(--bo-border)' }}>
                {['', 'Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h || 'expand'} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', width: h === '' ? 36 : 'auto' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const isExpanded = expandedFaculty === f.id;
                const assignments = facultyAssignments[f.id] || [];
                const isLoadingAsgn = loadingAssignments === f.id;

                return (
                  <React.Fragment key={f.id}>
                    <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--bo-border)', background: isExpanded ? '#F0FDF4' : 'transparent', transition: 'background 0.15s' }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--bo-bg)'; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}>
                      <td style={{ padding: '10px 8px 10px 14px', width: 36 }}>
                        <button onClick={() => toggleExpandFaculty(f.id)}
                          style={{ padding: 3, border: '1px solid var(--bo-border)', borderRadius: 5, background: isExpanded ? '#059669' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', color: isExpanded ? 'white' : 'var(--bo-text-muted)', transition: 'all 0.15s' }}>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                            {f.fullName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div style={{ fontWeight: 600 }}>{f.fullName}</div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--bo-text-secondary)' }}>{f.email}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: f.role === 'COLLEGE_HOD' ? '#EFF6FF' : '#F5F3FF', color: f.role === 'COLLEGE_HOD' ? '#1D4ED8' : '#7C3AED' }}>
                          {f.role === 'COLLEGE_HOD' ? 'HOD' : 'Faculty'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: f.status === 'ACTIVE' ? '#ECFDF5' : '#FEF3C7', color: f.status === 'ACTIVE' ? '#059669' : '#D97706' }}>
                          {f.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--bo-text-muted)', fontSize: 12 }}>{f.lastLoginAt ? new Date(f.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button title="Assign to Department" onClick={() => { setSelectedFaculty(f); setAssignForm({ userId: f.id, departmentId: '', permissionId: '' }); setShowAssign(true); }}
                            style={{ padding: 5, border: '1px solid var(--bo-border)', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', color: '#3B82F6' }}>
                            <UserPlus size={14} />
                          </button>
                          <button title="Delete Faculty" onClick={() => handleDelete(f.id, f.fullName)}
                            style={{ padding: 5, border: '1px solid var(--bo-border)', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', color: '#EF4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Assignments Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0, background: '#F8FAFC', borderBottom: '1px solid var(--bo-border)' }}>
                          <div style={{ padding: '12px 20px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--bo-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Building2 size={13} color="#059669" /> Department Assignments
                              </div>
                              <button className="bo-btn bo-btn-outline" style={{ padding: '3px 8px', fontSize: 10 }}
                                onClick={() => { setSelectedFaculty(f); setAssignForm({ userId: f.id, departmentId: '', permissionId: '' }); setShowAssign(true); }}>
                                <PlusCircle size={10} /> Add to Department
                              </button>
                            </div>

                            {isLoadingAsgn ? (
                              <div style={{ padding: 16, textAlign: 'center', color: 'var(--bo-text-muted)', fontSize: 12 }}>Loading assignments...</div>
                            ) : assignments.length === 0 ? (
                              <div style={{ padding: 16, textAlign: 'center', background: 'white', borderRadius: 8, border: '1px solid var(--bo-border)' }}>
                                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 8 }}>Not assigned to any department</div>
                                <button className="bo-btn bo-btn-primary" style={{ background: '#059669', fontSize: 10, padding: '4px 10px' }}
                                  onClick={() => { setSelectedFaculty(f); setAssignForm({ userId: f.id, departmentId: '', permissionId: '' }); setShowAssign(true); }}>
                                  <UserPlus size={10} /> Assign Now
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {assignments.map(a => (
                                  <div key={a.id} style={{ background: 'white', borderRadius: 8, border: '1px solid var(--bo-border)', padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #059669, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Building2 size={16} color="white" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.department?.name || 'Unknown Dept'}</div>
                                      <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontFamily: 'monospace' }}>{a.department?.code || ''}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0' }}>
                                        {a.permissions?.name || 'No Perms'}
                                      </span>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'flex-end' }}>
                                        {a.permissions && Object.entries(permLabelMap).map(([key, label]) => {
                                          if (!(a.permissions as any)?.[key]) return null;
                                          return <span key={key} style={{ padding: '1px 5px', borderRadius: 3, fontSize: 8, fontWeight: 500, background: '#EFF6FF', color: '#2563EB' }}>{label}</span>;
                                        })}
                                      </div>
                                    </div>
                                    <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: a.status === 'ACTIVE' ? '#ECFDF5' : a.status === 'ON_LEAVE' ? '#FEF3C7' : '#FEF2F2', color: a.status === 'ACTIVE' ? '#059669' : a.status === 'ON_LEAVE' ? '#D97706' : '#DC2626' }}>
                                      {a.status}
                                    </span>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button title="Change Permissions" onClick={() => openPermChange(a)}
                                        style={{ padding: 4, border: '1px solid var(--bo-border)', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#3B82F6' }}>
                                        <Shield size={12} />
                                      </button>
                                      <button title="Remove from Department" onClick={() => handleRemoveAssignment(a.userId, a.departmentId, a.department?.name || 'Dept', f.fullName)}
                                        style={{ padding: 4, border: '1px solid var(--bo-border)', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#EF4444' }}>
                                        <UserMinus size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Permission Sets */}
      {permissionSets.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color="#059669" /> Permission Sets
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {permissionSets.map(p => (
              <div key={p.id} className="bo-card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 10 }}>{p.description || 'No description'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {Object.entries(permLabelMap).map(([key, label]) => {
                    if (!(p as any)[key]) return null;
                    return <span key={key} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: '#EFF6FF', color: '#2563EB' }}>{label}</span>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create Faculty Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => !credentials && setShowCreate(false)}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--bo-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{credentials ? 'Faculty Created!' : 'Add Faculty'}</h3>
              <button onClick={() => { setShowCreate(false); setCredentials(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)' }}><X size={18} /></button>
            </div>

            {credentials ? (
              <div style={{ padding: 20 }}>
                <div style={{ padding: 16, borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10, color: '#059669' }}>Login Credentials</div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Email:</div>
                    <code style={{ fontSize: 13, background: 'white', padding: '4px 8px', borderRadius: 4, display: 'block', marginTop: 2 }}>{credentials.email}</code>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Password:</div>
                    <code style={{ fontSize: 13, background: 'white', padding: '4px 8px', borderRadius: 4, display: 'block', marginTop: 2 }}>{credentials.password}</code>
                  </div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', marginBottom: 16 }}>
                  ⚠️ Save these credentials. The password cannot be retrieved later.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="bo-btn bo-btn-outline" style={{ flex: 1 }} onClick={copyCredentials}>
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button className="bo-btn bo-btn-primary" style={{ flex: 1, background: '#059669' }} onClick={() => { setShowCreate(false); setCredentials(null); }}>Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateFaculty} style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Full Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input type="text" value={createForm.fullName} onChange={e => setCreateForm(p => ({ ...p, fullName: e.target.value }))} required placeholder="Dr. John Smith" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Email <span style={{ color: '#EF4444' }}>*</span></label>
                  <input type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} required placeholder="john@college.edu" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Department <span style={{ color: '#EF4444' }}>*</span></label>
                  <select value={createForm.departmentId} onChange={e => setCreateForm(p => ({ ...p, departmentId: e.target.value }))} required style={inputStyle}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Permission Set <span style={{ color: '#EF4444' }}>*</span></label>
                  <select value={createForm.permissionSetId} onChange={e => setCreateForm(p => ({ ...p, permissionSetId: e.target.value }))} required style={inputStyle}>
                    <option value="">Select Permissions</option>
                    {permissionSets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" className="bo-btn bo-btn-outline" onClick={() => setShowCreate(false)} disabled={modalLoading}>Cancel</button>
                  <button type="submit" className="bo-btn bo-btn-primary" style={{ background: '#059669' }} disabled={modalLoading}>{modalLoading ? 'Creating...' : 'Create Faculty'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && selectedFaculty && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAssign(false)}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--bo-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Assign to Department</h3>
              <button onClick={() => setShowAssign(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAssign} style={{ padding: 20 }}>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--bo-bg)', marginBottom: 16, fontSize: 13 }}>
                Assigning: <strong>{selectedFaculty.fullName}</strong>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Department <span style={{ color: '#EF4444' }}>*</span></label>
                <select value={assignForm.departmentId} onChange={e => setAssignForm(p => ({ ...p, departmentId: e.target.value }))} required style={inputStyle}>
                  <option value="">Select</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Permission Set <span style={{ color: '#EF4444' }}>*</span></label>
                <select value={assignForm.permissionId} onChange={e => setAssignForm(p => ({ ...p, permissionId: e.target.value }))} required style={inputStyle}>
                  <option value="">Select</option>
                  {permissionSets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="bo-btn bo-btn-outline" onClick={() => setShowAssign(false)} disabled={modalLoading}>Cancel</button>
                <button type="submit" className="bo-btn bo-btn-primary" style={{ background: '#059669' }} disabled={modalLoading}>{modalLoading ? 'Assigning...' : 'Assign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulk && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => { setShowBulk(false); setBulkFile(null); setBulkResult(null); }}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--bo-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Bulk Upload Faculty</h3>
              <button onClick={() => { setShowBulk(false); setBulkFile(null); setBulkResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleBulkUpload} style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>CSV File <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="file" accept=".csv" onChange={e => setBulkFile(e.target.files?.[0] || null)} style={inputStyle} required />
                <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Required: fullName, email, departmentCode, permissionSetName</span>
              </div>
              <button type="button" className="bo-btn bo-btn-outline" onClick={downloadTemplate} style={{ width: '100%', marginBottom: 16 }}>
                <Download size={14} /> Download Template
              </button>
              {bulkResult && (
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--bo-bg)', border: '1px solid var(--bo-border)', marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                    <div><div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>{bulkResult.success}</div><div style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>Created</div></div>
                    <div><div style={{ fontSize: 20, fontWeight: 700, color: '#DC2626' }}>{bulkResult.failed}</div><div style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>Failed</div></div>
                    <div><div style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>{bulkResult.emailsSent || 0}</div><div style={{ fontSize: 10, color: 'var(--bo-text-muted)' }}>Emailed</div></div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="bo-btn bo-btn-outline" onClick={() => { setShowBulk(false); setBulkFile(null); setBulkResult(null); }}>Close</button>
                <button type="submit" className="bo-btn bo-btn-primary" style={{ background: '#059669' }} disabled={modalLoading || !bulkFile}>{modalLoading ? 'Uploading...' : 'Upload'}</button>
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
                  Department: <strong>{permTarget.department?.name}</strong> • Current: <span style={{ color: '#059669', fontWeight: 600 }}>{permTarget.permissions?.name}</span>
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

export default CollegeFaculty;
