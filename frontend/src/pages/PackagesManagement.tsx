import React, { useEffect, useState } from 'react';
import { Package, Plus, Search, X, Eye, Edit, CheckCircle, XCircle, Trash2, Link2, ChevronDown } from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

interface Publisher {
  id: string;
  name: string;
  code?: string;
}

interface PackageItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  subjects: string[];
  contentTypes: string[];
  publisherId: string;
  publisher?: Publisher;
  createdAt: string;
  updatedAt?: string;
  _count?: { college_packages: number };
}

interface College {
  id: string;
  name: string;
  status: string;
}

interface Assignment {
  id: string;
  packageId: string;
  collegeId: string;
  startDate: string;
  endDate?: string;
  status: string;
  college?: College;
  package?: PackageItem & { publisher?: Publisher };
  createdAt?: string;
}

const PackagesManagement: React.FC = () => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackageItem | null>(null);
  const [viewPkg, setViewPkg] = useState<PackageItem | null>(null);
  const [assigningPkg, setAssigningPkg] = useState<PackageItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'packages' | 'assignments'>('packages');

  const [form, setForm] = useState({
    name: '', description: '', publisherId: '',
    subjects: [] as string[], contentTypes: [] as string[], status: 'ACTIVE'
  });

  const [subjectsDropdownOpen, setSubjectsDropdownOpen] = useState(false);
  const [contentTypesDropdownOpen, setContentTypesDropdownOpen] = useState(false);

  const AVAILABLE_SUBJECTS = [
    'Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Microbiology',
    'Pharmacology', 'Medicine', 'Surgery', 'Forensic Medicine',
    'Community Medicine', 'Ophthalmology', 'ENT', 'Obstetrics & Gynaecology',
    'Paediatrics', 'Orthopaedics', 'Dermatology', 'Psychiatry', 'Radiology', 'Anaesthesia'
  ];

  const AVAILABLE_CONTENT_TYPES = [
    { value: 'BOOK', label: 'Books' },
    { value: 'VIDEO', label: 'Videos' },
    { value: 'MCQ', label: 'MCQs' },
    { value: 'NOTES', label: 'Notes' },
  ];

  const toggleSubject = (subject: string) => {
    setForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const toggleContentType = (type: string) => {
    setForm(prev => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(type)
        ? prev.contentTypes.filter(t => t !== type)
        : [...prev.contentTypes, type]
    }));
  };

  const [assignForm, setAssignForm] = useState({
    collegeId: '', startDate: '', endDate: ''
  });

  useEffect(() => {
    fetchPackages();
    fetchPublishers();
    fetchColleges();
    fetchAssignments();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const [res] = await Promise.all([
        apiService.get('/packages'),
        new Promise(r => setTimeout(r, 800))
      ]);
      const pkgs = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.packages || [];
      setPackages(pkgs);
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublishers = async () => {
    try {
      const res = await apiService.get('/bitflow-owner/publishers');
      const pubs = res.data?.publishers || res.data?.data || res.data || [];
      setPublishers(Array.isArray(pubs) ? pubs : []);
    } catch (err) {
      console.error('Error fetching publishers:', err);
    }
  };

  const fetchColleges = async () => {
    try {
      const res = await apiService.get('/bitflow-owner/colleges');
      const cols = res.data?.colleges || res.data?.data || res.data || [];
      setColleges(Array.isArray(cols) ? cols : []);
    } catch (err) {
      console.error('Error fetching colleges:', err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await apiService.get('/packages/assignments/all');
      const items = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.assignments || [];
      setAssignments(items);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  };

  const openCreateModal = () => {
    setEditingPkg(null);
    setForm({ name: '', description: '', publisherId: '', subjects: [], contentTypes: [], status: 'ACTIVE' });
    setError('');
    setShowCreateModal(true);
  };

  const openEditModal = (pkg: PackageItem) => {
    setEditingPkg(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description || '',
      publisherId: pkg.publisherId,
      subjects: pkg.subjects || [],
      contentTypes: pkg.contentTypes || [],
      status: pkg.status
    });
    setError('');
    setShowCreateModal(true);
  };

  const openAssignModal = (pkg: PackageItem) => {
    setAssigningPkg(pkg);
    setAssignForm({ collegeId: '', startDate: new Date().toISOString().split('T')[0], endDate: '' });
    setError('');
    setShowAssignModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.publisherId) {
      setError('Name and publisher are required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const payload: any = {
        name: form.name,
        description: form.description || undefined,
        publisherId: form.publisherId,
        subjects: form.subjects.length > 0 ? form.subjects : [],
        contentTypes: form.contentTypes.length > 0 ? form.contentTypes : [],
        status: form.status,
      };

      if (editingPkg) {
        await apiService.put(`/packages/${editingPkg.id}`, payload);
        setSuccessMsg('Package updated successfully');
      } else {
        await apiService.post('/packages', payload);
        setSuccessMsg('Package created successfully');
      }
      setShowCreateModal(false);
      fetchPackages();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.collegeId || !assigningPkg) {
      setError('Please select a college');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await apiService.post('/packages/assignments', {
        packageId: assigningPkg.id,
        collegeId: assignForm.collegeId,
        startDate: assignForm.startDate || new Date().toISOString(),
        endDate: assignForm.endDate || undefined,
      });
      setSuccessMsg(`Package assigned to college successfully`);
      setShowAssignModal(false);
      fetchPackages();
      fetchAssignments();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Assignment failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this package?')) return;
    try {
      await apiService.delete(`/packages/${id}`);
      setSuccessMsg('Package deactivated');
      fetchPackages();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!window.confirm('Remove this package assignment?')) return;
    try {
      await apiService.delete(`/packages/assignments/${id}`);
      setSuccessMsg('Assignment removed');
      fetchAssignments();
      fetchPackages();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove assignment');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filtered = packages.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.publisher?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <MainLayout loading={loading} loadingMessage="Loading Packages">
      <div className="bo-page">
        <div className="bo-page-header">
          <div>
            <h1 className="bo-page-title">Packages</h1>
            <p className="bo-page-subtitle">Manage content packages and college assignments</p>
          </div>
          <button className="bo-btn bo-btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> Create Package
          </button>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div style={{ padding: '12px 16px', background: 'var(--bo-success-light)', border: '1px solid #A7F3D0', borderRadius: 8, color: 'var(--bo-success)', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
            <CheckCircle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> {successMsg}
          </div>
        )}
        {error && !showCreateModal && !showAssignModal && (
          <div style={{ padding: '12px 16px', background: 'var(--bo-danger-light)', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--bo-danger)', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
            <XCircle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> {error}
          </div>
        )}

        {/* Stats */}
        <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
          <div className="bo-stat-card">
            <div className="bo-stat-icon" style={{ background: 'var(--bo-accent-light)', color: 'var(--bo-accent)' }}><Package size={20} /></div>
            <div className="bo-stat-value">{packages.length}</div>
            <div className="bo-stat-label">Total Packages</div>
          </div>
          <div className="bo-stat-card">
            <div className="bo-stat-icon" style={{ background: 'var(--bo-success-light)', color: 'var(--bo-success)' }}><CheckCircle size={20} /></div>
            <div className="bo-stat-value">{packages.filter(p => p.status === 'ACTIVE').length}</div>
            <div className="bo-stat-label">Active</div>
          </div>
          <div className="bo-stat-card">
            <div className="bo-stat-icon" style={{ background: '#EDE9FE', color: '#8B5CF6' }}><Link2 size={20} /></div>
            <div className="bo-stat-value">{assignments.length}</div>
            <div className="bo-stat-label">Assignments</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bo-tabs" style={{ marginBottom: 20 }}>
          <button className={`bo-tab ${activeTab === 'packages' ? 'bo-tab-active' : ''}`} onClick={() => setActiveTab('packages')}>
            <Package size={16} /> Packages ({packages.length})
          </button>
          <button className={`bo-tab ${activeTab === 'assignments' ? 'bo-tab-active' : ''}`} onClick={() => setActiveTab('assignments')}>
            <Link2 size={16} /> Assignments ({assignments.length})
          </button>
        </div>

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <>
            <div className="bo-filters">
              <div className="bo-search-bar" style={{ flex: 1, maxWidth: 360 }}>
                <Search size={16} className="bo-search-icon" />
                <input placeholder="Search packages..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <select className="bo-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{filtered.length} package{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="bo-card">
              {filtered.length === 0 ? (
                <div className="bo-empty">
                  <Package size={44} className="bo-empty-icon" />
                  <h3>{searchTerm ? 'No matching packages' : 'No Packages Yet'}</h3>
                  <p>{searchTerm ? 'Try different search terms' : 'Create your first package to get started'}</p>
                  {!searchTerm && <button className="bo-btn bo-btn-primary" onClick={openCreateModal}><Plus size={16} /> Create Package</button>}
                </div>
              ) : (
                <div className="bo-table-wrap">
                  <table className="bo-table">
                    <thead>
                      <tr>
                        <th>Package</th>
                        <th>Publisher</th>
                        <th>Subjects</th>
                        <th>Status</th>
                        <th>Colleges</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(pkg => (
                        <tr key={pkg.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{pkg.name}</div>
                            {pkg.description && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg.description}</div>}
                          </td>
                          <td style={{ fontSize: 13 }}>{pkg.publisher?.name || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {(pkg.subjects || []).slice(0, 3).map((s, i) => (
                                <span key={i} className="bo-badge bo-badge-info" style={{ fontSize: 11 }}>{s}</span>
                              ))}
                              {(pkg.subjects || []).length > 3 && <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>+{pkg.subjects.length - 3}</span>}
                            </div>
                          </td>
                          <td>
                            <span className={`bo-badge ${pkg.status === 'ACTIVE' ? 'bo-badge-success' : 'bo-badge-warning'}`}>{pkg.status}</span>
                          </td>
                          <td style={{ fontSize: 14, textAlign: 'center' }}>{pkg._count?.college_packages ?? 0}</td>
                          <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{new Date(pkg.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="bo-btn bo-btn-ghost bo-btn-sm" title="View" onClick={() => setViewPkg(pkg)}><Eye size={15} /></button>
                              <button className="bo-btn bo-btn-ghost bo-btn-sm" title="Edit" onClick={() => openEditModal(pkg)}><Edit size={15} /></button>
                              <button className="bo-btn bo-btn-primary bo-btn-sm" title="Assign to College" onClick={() => openAssignModal(pkg)}><Link2 size={14} /> Assign</button>
                              <button className="bo-btn bo-btn-ghost bo-btn-sm" title="Delete" onClick={() => handleDelete(pkg.id)}><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="bo-card">
            {assignments.length === 0 ? (
              <div className="bo-empty">
                <Link2 size={44} className="bo-empty-icon" />
                <h3>No Assignments</h3>
                <p>Assign packages to colleges from the Packages tab</p>
              </div>
            ) : (
              <div className="bo-table-wrap">
                <table className="bo-table">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Publisher</th>
                      <th>College</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => {
                      const now = new Date();
                      const endDate = a.endDate ? new Date(a.endDate) : null;
                      const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                      const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;
                      const isExpired = daysRemaining !== null && daysRemaining <= 0;

                      return (
                      <tr key={a.id} style={isExpired ? { background: '#FEF2F2' } : isExpiringSoon ? { background: '#FFFBEB' } : {}}>
                        <td style={{ fontWeight: 600, fontSize: 14 }}>{a.package?.name || a.packageId}</td>
                        <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{a.package?.publisher?.name || '—'}</td>
                        <td style={{ fontSize: 14 }}>{a.college?.name || a.collegeId}</td>
                        <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{a.startDate ? new Date(a.startDate).toLocaleDateString() : '—'}</td>
                        <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{a.endDate ? new Date(a.endDate).toLocaleDateString() : 'No end date'}</td>
                        <td>
                          {endDate === null ? (
                            <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Perpetual</span>
                          ) : isExpired ? (
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bo-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              Expired {Math.abs(daysRemaining!)}d ago
                            </span>
                          ) : isExpiringSoon ? (
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {daysRemaining}d remaining
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--bo-success)' }}>
                              ✓ {daysRemaining}d remaining
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`bo-badge ${a.status === 'ACTIVE' ? 'bo-badge-success' : a.status === 'EXPIRED' ? 'bo-badge-danger' : 'bo-badge-warning'}`}>{a.status}</span>
                        </td>
                        <td>
                          <button className="bo-btn bo-btn-danger bo-btn-sm" onClick={() => handleRemoveAssignment(a.id)}>Remove</button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Package Modal */}
        {showCreateModal && (
          <div className="bo-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="bo-modal" onClick={e => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title">{editingPkg ? 'Edit Package' : 'Create Package'}</h3>
                <button className="bo-modal-close" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="bo-modal-body">
                  {error && (
                    <div style={{ padding: '10px 14px', background: 'var(--bo-danger-light)', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--bo-danger)', marginBottom: 16, fontSize: 13 }}>{error}</div>
                  )}
                  <div className="bo-form-group">
                    <label className="bo-form-label">Package Name *</label>
                    <input className="bo-form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Premium Medical Package" required />
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Publisher *</label>
                    <select className="bo-form-select" value={form.publisherId} onChange={e => setForm({ ...form, publisherId: e.target.value })} required>
                      <option value="">Select Publisher</option>
                      {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Description</label>
                    <textarea className="bo-form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of what this package includes" />
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Subjects</label>
                    <div style={{ position: 'relative' }}>
                      <div
                        className="bo-form-input"
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 42, flexWrap: 'wrap', gap: 4, paddingRight: 32 }}
                        onClick={() => { setSubjectsDropdownOpen(!subjectsDropdownOpen); setContentTypesDropdownOpen(false); }}
                      >
                        {form.subjects.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {form.subjects.map(s => (
                              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bo-accent-light)', color: 'var(--bo-accent)', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                                {s}
                                <X size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={e => { e.stopPropagation(); toggleSubject(s); }} />
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--bo-text-muted)', fontSize: 13 }}>Select subjects...</span>
                        )}
                        <ChevronDown size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
                      </div>
                      {subjectsDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--bo-border)', borderRadius: 8, boxShadow: 'var(--bo-shadow-md)', zIndex: 50, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                          {AVAILABLE_SUBJECTS.map(s => (
                            <div key={s} onClick={() => toggleSubject(s)}
                              style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: form.subjects.includes(s) ? 'var(--bo-accent-light)' : 'transparent', transition: 'background 0.15s' }}
                              onMouseEnter={e => { if (!form.subjects.includes(s)) (e.target as HTMLElement).style.background = '#F3F4F6'; }}
                              onMouseLeave={e => { if (!form.subjects.includes(s)) (e.target as HTMLElement).style.background = 'transparent'; }}
                            >
                              <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${form.subjects.includes(s) ? 'var(--bo-accent)' : '#D1D5DB'}`, background: form.subjects.includes(s) ? 'var(--bo-accent)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {form.subjects.includes(s) && <CheckCircle size={10} style={{ color: '#fff' }} />}
                              </div>
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Content Types</label>
                    <div style={{ position: 'relative' }}>
                      <div
                        className="bo-form-input"
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 42, flexWrap: 'wrap', gap: 4, paddingRight: 32 }}
                        onClick={() => { setContentTypesDropdownOpen(!contentTypesDropdownOpen); setSubjectsDropdownOpen(false); }}
                      >
                        {form.contentTypes.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {form.contentTypes.map(t => (
                              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EDE9FE', color: '#7C3AED', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                                {AVAILABLE_CONTENT_TYPES.find(ct => ct.value === t)?.label || t}
                                <X size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={e => { e.stopPropagation(); toggleContentType(t); }} />
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--bo-text-muted)', fontSize: 13 }}>Select content types...</span>
                        )}
                        <ChevronDown size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
                      </div>
                      {contentTypesDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--bo-border)', borderRadius: 8, boxShadow: 'var(--bo-shadow-md)', zIndex: 50, marginTop: 4 }}>
                          {AVAILABLE_CONTENT_TYPES.map(ct => (
                            <div key={ct.value} onClick={() => toggleContentType(ct.value)}
                              style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: form.contentTypes.includes(ct.value) ? '#EDE9FE' : 'transparent', transition: 'background 0.15s' }}
                              onMouseEnter={e => { if (!form.contentTypes.includes(ct.value)) (e.target as HTMLElement).style.background = '#F3F4F6'; }}
                              onMouseLeave={e => { if (!form.contentTypes.includes(ct.value)) (e.target as HTMLElement).style.background = 'transparent'; }}
                            >
                              <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${form.contentTypes.includes(ct.value) ? '#7C3AED' : '#D1D5DB'}`, background: form.contentTypes.includes(ct.value) ? '#7C3AED' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {form.contentTypes.includes(ct.value) && <CheckCircle size={10} style={{ color: '#fff' }} />}
                              </div>
                              {ct.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Status</label>
                    <select className="bo-form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="bo-modal-footer">
                  <button type="button" className="bo-btn bo-btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="bo-btn bo-btn-primary" disabled={saving}>
                    {saving ? <><div className="bo-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</> : editingPkg ? 'Update Package' : 'Create Package'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign to College Modal */}
        {showAssignModal && assigningPkg && (
          <div className="bo-modal-overlay" onClick={() => setShowAssignModal(false)}>
            <div className="bo-modal" onClick={e => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title">Assign Package to College</h3>
                <button className="bo-modal-close" onClick={() => setShowAssignModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleAssign}>
                <div className="bo-modal-body">
                  {error && (
                    <div style={{ padding: '10px 14px', background: 'var(--bo-danger-light)', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--bo-danger)', marginBottom: 16, fontSize: 13 }}>{error}</div>
                  )}
                  <div style={{ padding: '12px 14px', background: 'var(--bo-accent-light)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--bo-accent)' }}>
                    Assigning: <strong>{assigningPkg.name}</strong> by {assigningPkg.publisher?.name}
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">College *</label>
                    <select className="bo-form-select" value={assignForm.collegeId} onChange={e => setAssignForm({ ...assignForm, collegeId: e.target.value })} required>
                      <option value="">Select College</option>
                      {colleges.filter(c => c.status === 'ACTIVE').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Start Date *</label>
                      <input className="bo-form-input" type="date" value={assignForm.startDate} onChange={e => setAssignForm({ ...assignForm, startDate: e.target.value })} required />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">End Date</label>
                      <input className="bo-form-input" type="date" value={assignForm.endDate} onChange={e => setAssignForm({ ...assignForm, endDate: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="bo-modal-footer">
                  <button type="button" className="bo-btn bo-btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                  <button type="submit" className="bo-btn bo-btn-primary" disabled={saving}>
                    {saving ? <><div className="bo-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Assigning...</> : 'Assign Package'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewPkg && (
          <div className="bo-modal-overlay" onClick={() => setViewPkg(null)}>
            <div className="bo-modal" onClick={e => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title">Package Details</h3>
                <button className="bo-modal-close" onClick={() => setViewPkg(null)}><X size={20} /></button>
              </div>
              <div className="bo-modal-body">
                <div style={{ display: 'grid', gap: 16 }}>
                  <div><label className="bo-form-label">Name</label><div style={{ fontSize: 14, fontWeight: 600 }}>{viewPkg.name}</div></div>
                  <div className="bo-form-row">
                    <div><label className="bo-form-label">Publisher</label><div style={{ fontSize: 14 }}>{viewPkg.publisher?.name || '—'}</div></div>
                    <div><label className="bo-form-label">Status</label><div><span className={`bo-badge ${viewPkg.status === 'ACTIVE' ? 'bo-badge-success' : 'bo-badge-warning'}`}>{viewPkg.status}</span></div></div>
                  </div>
                  {viewPkg.description && <div><label className="bo-form-label">Description</label><div style={{ fontSize: 14 }}>{viewPkg.description}</div></div>}
                  <div><label className="bo-form-label">Subjects</label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {(viewPkg.subjects || []).length > 0 ? viewPkg.subjects.map((s, i) => (
                        <span key={i} className="bo-badge bo-badge-info">{s}</span>
                      )) : <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>No subjects specified</span>}
                    </div>
                  </div>
                  {(viewPkg.contentTypes || []).length > 0 && (
                    <div><label className="bo-form-label">Content Types</label>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {viewPkg.contentTypes.map((t, i) => <span key={i} className="bo-badge bo-badge-default">{t}</span>)}
                      </div>
                    </div>
                  )}
                  <div className="bo-form-row">
                    <div><label className="bo-form-label">Colleges Assigned</label><div style={{ fontSize: 14 }}>{viewPkg._count?.college_packages ?? 0}</div></div>
                    <div><label className="bo-form-label">Created</label><div style={{ fontSize: 14 }}>{new Date(viewPkg.createdAt).toLocaleDateString()}</div></div>
                  </div>
                </div>
              </div>
              <div className="bo-modal-footer">
                <button className="bo-btn bo-btn-primary" onClick={() => { const p = viewPkg; setViewPkg(null); openAssignModal(p); }}>
                  <Link2 size={15} /> Assign to College
                </button>
                <button className="bo-btn bo-btn-secondary" onClick={() => { const p = viewPkg; setViewPkg(null); openEditModal(p); }}>
                  <Edit size={15} /> Edit
                </button>
                <button className="bo-btn bo-btn-secondary" onClick={() => setViewPkg(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PackagesManagement;
