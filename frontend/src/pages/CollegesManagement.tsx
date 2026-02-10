import React, { useEffect, useState } from 'react';
import { GraduationCap, Plus, Search, X, Eye, Edit, CheckCircle, XCircle, Users, Package, Trash2, Mail } from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';
import '../styles/loading-screen.css';

interface College {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  maxStudents?: number;
  licenseType?: string;
  status: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  createdAt: string;
  _count?: { students: number };
  studentCount?: number;
}

interface CollegePackage {
  id: string;
  collegeId: string;
  packageId: string;
  status: string;
  startDate?: string;
  endDate?: string;
  package?: { id: string; name: string; publisherId?: string };
}

const CollegesManagement: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegePackages, setCollegePackages] = useState<Map<string, CollegePackage[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [viewCollege, setViewCollege] = useState<College | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [form, setForm] = useState({
    name: '', contactEmail: '', contactPhone: '', address: '',
    maxStudents: '', licenseType: 'STANDARD',
    subscriptionStartDate: '', subscriptionEndDate: '',
    adminEmail: '', adminName: '', adminPassword: ''
  });

  useEffect(() => { fetchColleges(); fetchAssignments(); }, []);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const [res] = await Promise.all([
        apiService.get('/bitflow-owner/colleges'),
        new Promise(r => setTimeout(r, 800))
      ]);
      const cols = res.data?.colleges || res.data || [];
      setColleges(Array.isArray(cols) ? cols : []);
    } catch (err) {
      console.error('Error fetching colleges:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await apiService.get('/packages/assignments/all');
      const items: CollegePackage[] = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const map = new Map<string, CollegePackage[]>();
      items.forEach(a => {
        if (!map.has(a.collegeId)) map.set(a.collegeId, []);
        map.get(a.collegeId)!.push(a);
      });
      setCollegePackages(map);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  };

  const getCollegePackagesSummary = (collegeId: string) => {
    const pkgs = collegePackages.get(collegeId) || [];
    const active = pkgs.filter(p => p.status === 'ACTIVE');
    const expiringSoon = active.filter(p => {
      if (!p.endDate) return false;
      const days = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 30;
    });
    return { all: pkgs, active, expiringSoon };
  };

  const handleAssignmentStatusChange = async (assignmentId: string, newStatus: string) => {
    try {
      await apiService.put(`/packages/assignments/${assignmentId}`, { status: newStatus });
      setSuccessMsg(`Package assignment ${newStatus.toLowerCase()} successfully`);
      fetchAssignments();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update assignment');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to remove this package assignment? This cannot be undone.')) return;
    try {
      await apiService.delete(`/packages/assignments/${assignmentId}`);
      setSuccessMsg('Package assignment removed successfully');
      fetchAssignments();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove assignment');
      setTimeout(() => setError(''), 3000);
    }
  };

  const openCreateModal = () => {
    setEditingCollege(null);
    setForm({ name: '', contactEmail: '', contactPhone: '', address: '', maxStudents: '', licenseType: 'STANDARD', subscriptionStartDate: '', subscriptionEndDate: '', adminEmail: '', adminName: '', adminPassword: '' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (col: College) => {
    setEditingCollege(col);
    setForm({
      name: col.name, contactEmail: col.contactEmail, contactPhone: col.contactPhone || '',
      address: col.address || '', maxStudents: col.maxStudents?.toString() || '',
      licenseType: col.licenseType || 'STANDARD',
      subscriptionStartDate: col.subscriptionStartDate ? col.subscriptionStartDate.split('T')[0] : '',
      subscriptionEndDate: col.subscriptionEndDate ? col.subscriptionEndDate.split('T')[0] : '',
      adminEmail: '', adminName: '', adminPassword: ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.contactEmail) {
      setError('Name and contact email are required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const payload: any = {
        name: form.name, contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined, address: form.address || undefined,
        maxStudents: form.maxStudents ? parseInt(form.maxStudents) : undefined,
        licenseType: form.licenseType,
        subscriptionStartDate: form.subscriptionStartDate || undefined,
        subscriptionEndDate: form.subscriptionEndDate || undefined,
      };
      if (editingCollege) {
        await apiService.put(`/bitflow-owner/colleges/${editingCollege.id}`, payload);
        setSuccessMsg('College updated successfully');
      } else {
        payload.adminEmail = form.adminEmail || form.contactEmail;
        payload.adminName = form.adminName || form.name + ' Admin';
        payload.adminPassword = form.adminPassword || 'College@123';
        await apiService.post('/bitflow-owner/colleges', payload);
        setSuccessMsg('College created! IT Admin and Dean accounts have been set up.');
      }
      setShowModal(false);
      fetchColleges();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiService.patch(`/bitflow-owner/colleges/${id}/status`, { status });
      setSuccessMsg(`College ${status.toLowerCase()} successfully`);
      fetchColleges();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRenew = async (id: string) => {
    try {
      await apiService.post(`/bitflow-owner/colleges/${id}/renew`);
      setSuccessMsg('Subscription renewed successfully');
      fetchColleges();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to renew subscription');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteCollege = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will deactivate all associated users, students, and package assignments. This action cannot be undone.`)) return;
    try {
      await apiService.delete(`/bitflow-owner/colleges/${id}`);
      setSuccessMsg(`College "${name}" deleted successfully`);
      fetchColleges();
      fetchAssignments();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete college');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleResendCredentials = async (id: string, role: 'IT_ADMIN' | 'DEAN') => {
    try {
      await apiService.post(`/bitflow-owner/colleges/${id}/resend-credentials`, { role });
      setSuccessMsg(`Credentials for ${role.replace('_', ' ')} resent successfully`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend credentials');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filtered = colleges.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStudentCount = (col: College) => col._count?.students ?? col.studentCount ?? 0;

  return (
    <MainLayout loading={loading} loadingMessage="Loading Colleges">
      <div className="bo-page">
        <div className="bo-page-header">
          <div>
            <h1 className="bo-page-title">Colleges</h1>
            <p className="bo-page-subtitle">Manage colleges and their subscriptions</p>
          </div>
          <button className="bo-btn bo-btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> Add College
          </button>
        </div>

        {successMsg && (
          <div style={{ padding: '12px 16px', background: 'var(--bo-success-light)', border: '1px solid #A7F3D0', borderRadius: 8, color: 'var(--bo-success)', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
            <CheckCircle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> {successMsg}
          </div>
        )}
        {error && !showModal && (
          <div style={{ padding: '12px 16px', background: 'var(--bo-danger-light)', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--bo-danger)', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
            <XCircle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> {error}
          </div>
        )}

        {/* Filters */}
        <div className="bo-filters">
          <div className="bo-search-bar" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={16} className="bo-search-icon" />
            <input placeholder="Search colleges..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="bo-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{filtered.length} college{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="bo-card">
          {filtered.length === 0 ? (
            <div className="bo-empty">
              <GraduationCap size={44} className="bo-empty-icon" />
              <h3>{searchTerm || statusFilter !== 'ALL' ? 'No matching colleges' : 'No Colleges Yet'}</h3>
              <p>{searchTerm ? 'Try a different search' : 'Create your first college to get started'}</p>
              {!searchTerm && <button className="bo-btn bo-btn-primary" onClick={openCreateModal}><Plus size={16} /> Add College</button>}
            </div>
          ) : (
            <div className="bo-table-wrap">
              <table className="bo-table">
                <thead>
                  <tr>
                    <th>College</th>
                    <th>Contact</th>
                    <th>Students</th>
                    <th>License</th>
                    <th>Status</th>
                    <th>Subscription End</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(col => (
                    <tr key={col.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{col.name}</div>
                        {col.address && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{col.address}</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>{col.contactEmail}</div>
                        {col.contactPhone && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{col.contactPhone}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                          <Users size={14} style={{ color: 'var(--bo-accent)' }} />
                          {getStudentCount(col)}{col.maxStudents ? ` / ${col.maxStudents}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className="bo-badge bo-badge-info">{col.licenseType || 'STANDARD'}</span>
                      </td>
                      <td>
                        <span className={`bo-badge ${col.status === 'ACTIVE' ? 'bo-badge-success' : col.status === 'SUSPENDED' ? 'bo-badge-danger' : 'bo-badge-warning'}`}>
                          {col.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>
                        {col.subscriptionEndDate ? new Date(col.subscriptionEndDate).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="View" onClick={() => setViewCollege(col)}><Eye size={15} /></button>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="Edit" onClick={() => openEditModal(col)}><Edit size={15} /></button>
                          {col.status === 'ACTIVE' ? (
                            <button className="bo-btn bo-btn-danger bo-btn-sm" onClick={() => handleStatusChange(col.id, 'SUSPENDED')}>Suspend</button>
                          ) : (
                            <button className="bo-btn bo-btn-success bo-btn-sm" onClick={() => handleStatusChange(col.id, 'ACTIVE')}>Activate</button>
                          )}
                          <button className="bo-btn bo-btn-primary bo-btn-sm" title="Renew Subscription" onClick={() => handleRenew(col.id)}>Renew</button>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="Resend IT Admin Credentials" onClick={() => handleResendCredentials(col.id, 'IT_ADMIN')}><Mail size={15} /></button>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="Delete College" style={{ color: 'var(--bo-danger)' }} onClick={() => handleDeleteCollege(col.id, col.name)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="bo-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="bo-modal" onClick={e => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title">{editingCollege ? 'Edit College' : 'Create College'}</h3>
                <button className="bo-modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="bo-modal-body">
                  {error && (
                    <div style={{ padding: '10px 14px', background: 'var(--bo-danger-light)', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--bo-danger)', marginBottom: 16, fontSize: 13 }}>{error}</div>
                  )}
                  <div className="bo-form-group">
                    <label className="bo-form-label">College Name *</label>
                    <input className="bo-form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter college name" required />
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contact Email *</label>
                      <input className="bo-form-input" type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} placeholder="email@college.edu" required />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contact Phone</label>
                      <input className="bo-form-input" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
                    </div>
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Address</label>
                    <input className="bo-form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="College address" />
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Max Students</label>
                      <input className="bo-form-input" type="number" value={form.maxStudents} onChange={e => setForm({ ...form, maxStudents: e.target.value })} placeholder="500" />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">License Type</label>
                      <select className="bo-form-select" value={form.licenseType} onChange={e => setForm({ ...form, licenseType: e.target.value })}>
                        <option value="STANDARD">Standard</option>
                        <option value="PREMIUM">Premium</option>
                        <option value="ENTERPRISE">Enterprise</option>
                        <option value="TRIAL">Trial</option>
                      </select>
                    </div>
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Subscription Start</label>
                      <input className="bo-form-input" type="date" value={form.subscriptionStartDate} onChange={e => setForm({ ...form, subscriptionStartDate: e.target.value })} />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">Subscription End</label>
                      <input className="bo-form-input" type="date" value={form.subscriptionEndDate} onChange={e => setForm({ ...form, subscriptionEndDate: e.target.value })} />
                    </div>
                  </div>
                  {!editingCollege && (
                    <>
                      <div style={{ padding: '12px 14px', background: 'var(--bo-accent-light)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--bo-accent)' }}>
                        An IT Admin and Dean account will be auto-created for this college.
                      </div>
                      <div className="bo-form-row">
                        <div className="bo-form-group">
                          <label className="bo-form-label">Admin Name</label>
                          <input className="bo-form-input" value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })} placeholder={form.name ? form.name + ' Admin' : 'Admin Name'} />
                        </div>
                        <div className="bo-form-group">
                          <label className="bo-form-label">Admin Email</label>
                          <input className="bo-form-input" type="email" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} placeholder={form.contactEmail || 'admin@college.edu'} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="bo-modal-footer">
                  <button type="button" className="bo-btn bo-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="bo-btn bo-btn-primary" disabled={saving}>
                    {saving ? <><div className="bo-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</> : editingCollege ? 'Update College' : 'Create College'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewCollege && (
          <div className="bo-modal-overlay" onClick={() => setViewCollege(null)}>
            <div className="bo-modal" onClick={e => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title">College Details</h3>
                <button className="bo-modal-close" onClick={() => setViewCollege(null)}><X size={20} /></button>
              </div>
              <div className="bo-modal-body">
                <div style={{ display: 'grid', gap: 16 }}>
                  <div><label className="bo-form-label">Name</label><div style={{ fontSize: 14 }}>{viewCollege.name}</div></div>
                  <div className="bo-form-row">
                    <div><label className="bo-form-label">Email</label><div style={{ fontSize: 14 }}>{viewCollege.contactEmail}</div></div>
                    <div><label className="bo-form-label">Phone</label><div style={{ fontSize: 14 }}>{viewCollege.contactPhone || '—'}</div></div>
                  </div>
                  <div className="bo-form-row">
                    <div><label className="bo-form-label">Status</label><div><span className={`bo-badge ${viewCollege.status === 'ACTIVE' ? 'bo-badge-success' : 'bo-badge-warning'}`}>{viewCollege.status}</span></div></div>
                    <div><label className="bo-form-label">License</label><div><span className="bo-badge bo-badge-info">{viewCollege.licenseType || 'STANDARD'}</span></div></div>
                  </div>
                  <div className="bo-form-row">
                    <div><label className="bo-form-label">Students</label><div style={{ fontSize: 14 }}>{getStudentCount(viewCollege)}{viewCollege.maxStudents ? ` / ${viewCollege.maxStudents}` : ''}</div></div>
                    <div><label className="bo-form-label">Created</label><div style={{ fontSize: 14 }}>{new Date(viewCollege.createdAt).toLocaleDateString()}</div></div>
                  </div>
                  {viewCollege.address && <div><label className="bo-form-label">Address</label><div style={{ fontSize: 14 }}>{viewCollege.address}</div></div>}
                  <div className="bo-form-row">
                    <div><label className="bo-form-label">Subscription Start</label><div style={{ fontSize: 14 }}>{viewCollege.subscriptionStartDate ? new Date(viewCollege.subscriptionStartDate).toLocaleDateString() : '—'}</div></div>
                    <div><label className="bo-form-label">Subscription End</label><div style={{ fontSize: 14 }}>{viewCollege.subscriptionEndDate ? new Date(viewCollege.subscriptionEndDate).toLocaleDateString() : '—'}</div></div>
                  </div>

                  {/* Assigned Packages */}
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                    <label className="bo-form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <Package size={15} style={{ color: '#8B5CF6' }} /> Assigned Packages
                    </label>
                    {(() => {
                      const pkgInfo = getCollegePackagesSummary(viewCollege.id);
                      if (pkgInfo.all.length === 0) {
                        return <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', padding: '10px 0' }}>No packages assigned to this college</div>;
                      }
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {pkgInfo.all.map(p => {
                            const endDate = p.endDate ? new Date(p.endDate) : null;
                            const daysLeft = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                            const isExpired = daysLeft !== null && daysLeft <= 0;
                            const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
                            return (
                              <div key={p.id} style={{
                                padding: '10px 12px', borderRadius: 8, fontSize: 13,
                                background: isExpired ? '#FEF2F2' : isExpiringSoon ? '#FFFBEB' : '#F9FAFB',
                                border: `1px solid ${isExpired ? '#FECACA' : isExpiringSoon ? '#FDE68A' : '#E5E7EB'}`
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.package?.name || 'Unknown Package'}</div>
                                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                                      {p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'} → {endDate ? endDate.toLocaleDateString() : 'No end date'}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {daysLeft !== null && (
                                      <span style={{
                                        fontSize: 11, fontWeight: 600,
                                        color: isExpired ? 'var(--bo-danger)' : isExpiringSoon ? '#F59E0B' : 'var(--bo-success)'
                                      }}>
                                        {isExpired ? `Expired ${Math.abs(daysLeft!)}d ago` : `${daysLeft}d left`}
                                      </span>
                                    )}
                                    <span className={`bo-badge ${p.status === 'ACTIVE' ? 'bo-badge-success' : p.status === 'EXPIRED' ? 'bo-badge-danger' : 'bo-badge-warning'}`} style={{ fontSize: 10 }}>
                                      {p.status}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 8, borderTop: '1px solid #E5E7EB', paddingTop: 8 }}>
                                  {p.status === 'ACTIVE' ? (
                                    <button className="bo-btn bo-btn-danger bo-btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}
                                      onClick={() => handleAssignmentStatusChange(p.id, 'CANCELLED')}>
                                      <XCircle size={12} /> Deactivate
                                    </button>
                                  ) : (
                                    <button className="bo-btn bo-btn-success bo-btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}
                                      onClick={() => handleAssignmentStatusChange(p.id, 'ACTIVE')}>
                                      <CheckCircle size={12} /> Activate
                                    </button>
                                  )}
                                  <button className="bo-btn bo-btn-ghost bo-btn-sm" style={{ fontSize: 11, padding: '3px 10px', color: 'var(--bo-danger)' }}
                                    onClick={() => handleDeleteAssignment(p.id)}>
                                    <Trash2 size={12} /> Remove
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="bo-modal-footer">
                <button className="bo-btn bo-btn-secondary" onClick={() => { const c = viewCollege; setViewCollege(null); openEditModal(c); }}>
                  <Edit size={15} /> Edit
                </button>
                <button className="bo-btn bo-btn-secondary" onClick={() => setViewCollege(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CollegesManagement;
