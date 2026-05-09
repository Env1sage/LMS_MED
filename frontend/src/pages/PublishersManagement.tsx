import React, { useEffect, useState } from 'react';
import { Building2, Plus, Search, X, Eye, EyeOff, Edit, CheckCircle, XCircle, Mail, Trash2 } from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';
import { formatDate } from '../utils/dateUtils';

interface Publisher {
  id: string;
  name: string;
  code?: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  taluka?: string;
  pincode?: string;
  description?: string;
  logoUrl?: string;
  status: string;
  contractStartDate?: string;
  contractExpiryDate?: string;
  contractEndDate?: string;
  createdAt: string;
}

const PublishersManagement: React.FC = () => {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<Publisher | null>(null);
  const [viewPublisher, setViewPublisher] = useState<Publisher | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [form, setForm] = useState({
    name: '', code: '', contactEmail: '', contactPhone: '', website: '',
    address: '', city: '', state: '', taluka: '', pincode: '', description: '',
    contractStartDate: '', contractExpiryDate: '',
    adminEmail: '', adminPassword: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [renewModal, setRenewModal] = useState<{ open: boolean; publisherId: string; name: string; currentEnd: string }>({ open: false, publisherId: '', name: '', currentEnd: '' });
  const [renewDate, setRenewDate] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; danger?: boolean }>({ open: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => { fetchPublishers(); }, []);

  const fetchPublishers = async () => {
    try {
      setLoading(true);
      const [res] = await Promise.all([
        apiService.get('/bitflow-owner/publishers'),
        new Promise(r => setTimeout(r, 800))
      ]);
      const pubs = res.data?.publishers || res.data || [];
      setPublishers(Array.isArray(pubs) ? pubs : []);
    } catch (err) {
      console.error('Error fetching publishers:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPublisher(null);
    setForm({ name: '', code: '', contactEmail: '', contactPhone: '', website: '', address: '', city: '', state: '', taluka: '', pincode: '', description: '', contractStartDate: '', contractExpiryDate: '', adminEmail: '', adminPassword: '' });
    setLogoFile(null);
    setLogoPreview('');
    setError('');
    setFieldErrors({});
    setShowModal(true);
  };

  const openEditModal = (pub: Publisher) => {
    setEditingPublisher(pub);
    setForm({
      name: pub.name, code: pub.code || '', contactEmail: pub.contactEmail, contactPhone: pub.contactPhone || '',
      website: pub.website || '', address: pub.address || '', city: pub.city || '', state: pub.state || '',
      taluka: pub.taluka || '', pincode: pub.pincode || '', description: pub.description || '',
      contractStartDate: (pub.contractStartDate || '').split('T')[0],
      contractExpiryDate: (pub.contractExpiryDate || pub.contractEndDate || '').split('T')[0],
      adminEmail: '', adminPassword: ''
    });
    setLogoFile(null);
    setLogoPreview((pub as any).logoUrl || '');
    setError('');
    setFieldErrors({});
    setShowModal(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo file must be under 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        setError('Logo must be a JPG, PNG, WebP, or GIF image');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const uploadLogo = async (): Promise<string | undefined> => {
    if (!logoFile) return undefined;
    try {
      const formData = new FormData();
      formData.append('file', logoFile);
      const res = await apiService.post('/bitflow-owner/upload-logo', formData);
      return res.data.url;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Logo upload failed. Publisher will be saved without a logo.';
      setError(msg);
      return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Collect all validation errors simultaneously
    const errs: Record<string, string> = {};
    if (!form.name) errs.name = 'Publisher name is required';
    if (!form.code) errs.code = 'Publisher code is required';
    else if (!/^[A-Z0-9_]{2,20}$/.test(form.code)) errs.code = 'Code must be 2-20 uppercase letters, numbers, or underscores';
    if (!form.contactEmail) errs.contactEmail = 'Contact email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) errs.contactEmail = 'Invalid email address';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError('Please fix the highlighted fields below.');
      return;
    }
    setFieldErrors({});
    setError('');
    try {
      setSaving(true);
      const logoUrl = await uploadLogo();
      if (editingPublisher) {
        const updatePayload: any = {
          name: form.name, contactEmail: form.contactEmail, contactPhone: form.contactPhone || undefined,
          website: form.website || undefined, address: form.address || undefined,
          city: form.city || undefined, state: form.state || undefined,
          taluka: form.taluka || undefined, pincode: form.pincode || undefined,
          description: form.description || undefined,
          contractEndDate: form.contractExpiryDate || undefined,
          contractStartDate: form.contractStartDate || undefined,
        };
        if (logoUrl) updatePayload.logoUrl = logoUrl;
        if (form.adminEmail) updatePayload.adminEmail = form.adminEmail;
        if (form.adminPassword) updatePayload.adminPassword = form.adminPassword;
        await apiService.put(`/bitflow-owner/publishers/${editingPublisher.id}`, updatePayload);
        setSuccessMsg('Publisher updated successfully');
      } else {
        const pubPayload = {
          name: form.name, code: form.code, contactEmail: form.contactEmail, contactPhone: form.contactPhone || undefined,
          website: form.website || undefined, address: form.address || undefined,
          city: form.city || undefined, state: form.state || undefined,
          taluka: form.taluka || undefined, pincode: form.pincode || undefined,
          description: form.description || undefined,
          contractEndDate: form.contractExpiryDate || undefined,
          contractStartDate: form.contractStartDate || undefined,
          logoUrl: logoUrl || undefined,
          adminEmail: form.adminEmail || form.contactEmail,
          adminPassword: form.adminPassword || undefined,
        };
        const createRes = await apiService.post('/bitflow-owner/publishers', pubPayload);
        const adminEmail = createRes.data?.createdAccounts?.admin?.email || pubPayload.adminEmail;
        setSuccessMsg(`Publisher created! Admin credentials sent to ${adminEmail}`);
      }
      setShowModal(false);
      fetchPublishers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiService.patch(`/bitflow-owner/publishers/${id}/status`, { status });
      setSuccessMsg(`Publisher ${status.toLowerCase()} successfully`);
      fetchPublishers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleResendCredentials = async (id: string) => {
    try {
      await apiService.post(`/bitflow-owner/publishers/${id}/resend-credentials`);
      setSuccessMsg('Credentials resent successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend credentials');
      setTimeout(() => setError(''), 3000);
    }
  };

  const openRenewModal = (pub: Publisher) => {
    const endStr = pub.contractEndDate || pub.contractExpiryDate || '';
    const currentEnd = endStr ? new Date(endStr).toISOString().split('T')[0] : '';
    setRenewDate(currentEnd);
    setRenewModal({ open: true, publisherId: pub.id, name: pub.name, currentEnd });
  };

  const handleRenewConfirm = async () => {
    if (!renewDate) { setError('Please select a date'); setTimeout(() => setError(''), 3000); return; }
    try {
      await apiService.post(`/bitflow-owner/publishers/${renewModal.publisherId}/renew`, { newEndDate: renewDate });
      setSuccessMsg(`Contract renewed to ${formatDate(renewDate)}`);
      setRenewModal({ open: false, publisherId: '', name: '', currentEnd: '' });
      fetchPublishers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to renew contract');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeletePublisher = async (id: string, name: string) => {
    setConfirmModal({
      open: true,
      title: 'Delete Publisher',
      message: `Are you sure you want to delete "${name}"? This will deactivate all associated users and packages. This action cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
        try {
          await apiService.delete(`/bitflow-owner/publishers/${id}`);
          setSuccessMsg(`Publisher "${name}" deleted successfully`);
          fetchPublishers();
          setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to delete publisher');
          setTimeout(() => setError(''), 3000);
        }
      },
    });
  };

  const filtered = publishers.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <MainLayout loading={loading} loadingMessage="Loading Publishers">
      <div className="bo-page">
        {/* Header */}
        <div className="bo-page-header">
          <div>
            <h1 className="bo-page-title">Publishers</h1>
            <p className="bo-page-subtitle">Manage content publishers and their access</p>
          </div>
          <button className="bo-btn bo-btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> Add Publisher
          </button>
        </div>

        {/* Alerts */}
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
            <input
              placeholder="Search publishers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="bo-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{filtered.length} publisher{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="bo-card">
          {filtered.length === 0 ? (
            <div className="bo-empty">
              <Building2 size={44} className="bo-empty-icon" />
              <h3>{searchTerm || statusFilter !== 'ALL' ? 'No matching publishers' : 'No Publishers Yet'}</h3>
              <p>{searchTerm ? 'Try a different search term' : 'Create your first publisher to get started'}</p>
              {!searchTerm && <button className="bo-btn bo-btn-primary" onClick={openCreateModal}><Plus size={16} /> Add Publisher</button>}
            </div>
          ) : (
            <div className="bo-table-wrap">
              <table className="bo-table">
                <thead>
                  <tr>
                    <th>Publisher</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Contract Period</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((pub) => (
                    <tr key={pub.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {pub.logoUrl ? (
                            <img src={pub.logoUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--bo-border)', background: '#f8faff', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>{pub.name?.[0]?.toUpperCase()}</div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600 }}>{pub.name}</div>
                            {pub.website && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{pub.website}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>{pub.contactEmail}</div>
                        {pub.contactPhone && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{pub.contactPhone}</div>}
                      </td>
                      <td>
                        <span className={`bo-badge ${pub.status === 'ACTIVE' ? 'bo-badge-success' : pub.status === 'SUSPENDED' ? 'bo-badge-danger' : 'bo-badge-warning'}`}>
                          {pub.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>
                        {pub.contractStartDate ? <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{formatDate(pub.contractStartDate)}</div> : null}
                        {(pub.contractEndDate || pub.contractExpiryDate) ? formatDate((pub.contractEndDate || pub.contractExpiryDate)!) : '—'}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>
                        {formatDate(pub.createdAt)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="View" onClick={() => setViewPublisher(pub)}><Eye size={15} /></button>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="Edit" onClick={() => openEditModal(pub)}><Edit size={15} /></button>
                          {pub.status === 'ACTIVE' ? (
                            <button className="bo-btn bo-btn-danger bo-btn-sm" style={{ minWidth: 95, display: 'inline-flex', justifyContent: 'center' }} onClick={() => handleStatusChange(pub.id, 'SUSPENDED')}>Don't Allow</button>
                          ) : (
                            <button className="bo-btn bo-btn-success bo-btn-sm" style={{ minWidth: 95, display: 'inline-flex', justifyContent: 'center' }} onClick={() => handleStatusChange(pub.id, 'ACTIVE')}>Allow</button>
                          )}
                          <button className="bo-btn bo-btn-primary bo-btn-sm" title="Renew Contract" onClick={() => openRenewModal(pub)}>Renew</button>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="Resend Credentials" onClick={() => handleResendCredentials(pub.id)}><Mail size={15} /></button>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="Delete Publisher" style={{ color: 'var(--bo-danger)' }} onClick={() => handleDeletePublisher(pub.id, pub.name)}><Trash2 size={15} /></button>
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
            <div className="bo-modal" onClick={(e) => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title">{editingPublisher ? 'Edit Publisher' : 'Create Publisher'}</h3>
                <button className="bo-modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="bo-modal-body">
                  {error && (
                    <div style={{ padding: '10px 14px', background: 'var(--bo-danger-light)', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--bo-danger)', marginBottom: 16, fontSize: 13 }}>
                      {error}
                    </div>
                  )}
                  <div className="bo-form-group">
                    <label className="bo-form-label">Publisher Name *</label>
                    <input
                      className="bo-form-input"
                      style={fieldErrors.name ? { borderColor: 'var(--bo-danger)', background: '#FEF2F2' } : {}}
                      value={form.name}
                      onChange={(e) => { setForm({ ...form, name: e.target.value }); if (fieldErrors.name) setFieldErrors(prev => { const n = {...prev}; delete n.name; return n; }); }}
                      placeholder="Enter publisher name"
                    />
                    {fieldErrors.name && <div style={{ fontSize: 11, color: 'var(--bo-danger)', marginTop: 3 }}>{fieldErrors.name}</div>}
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Publisher Code *</label>
                    <input
                      className="bo-form-input"
                      style={fieldErrors.code ? { borderColor: 'var(--bo-danger)', background: '#FEF2F2' } : {}}
                      value={form.code}
                      onChange={(e) => { setForm({ ...form, code: e.target.value.toUpperCase() }); if (fieldErrors.code) setFieldErrors(prev => { const n = {...prev}; delete n.code; return n; }); }}
                      placeholder="e.g., ELSEVIER, SPRINGER"
                      maxLength={20}
                    />
                    {fieldErrors.code
                      ? <div style={{ fontSize: 11, color: 'var(--bo-danger)', marginTop: 3 }}>{fieldErrors.code}</div>
                      : <div style={{ fontSize: '11px', color: 'var(--bo-text-muted)', marginTop: '4px' }}>2-20 uppercase letters, numbers, or underscores</div>}
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contact Email *</label>
                      <input
                        className="bo-form-input"
                        style={fieldErrors.contactEmail ? { borderColor: 'var(--bo-danger)', background: '#FEF2F2' } : {}}
                        type="email"
                        value={form.contactEmail}
                        onChange={(e) => { setForm({ ...form, contactEmail: e.target.value }); if (fieldErrors.contactEmail) setFieldErrors(prev => { const n = {...prev}; delete n.contactEmail; return n; }); }}
                        placeholder="email@example.com"
                      />
                      {fieldErrors.contactEmail && <div style={{ fontSize: 11, color: 'var(--bo-danger)', marginTop: 3 }}>{fieldErrors.contactEmail}</div>}
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contact Phone</label>
                      <input className="bo-form-input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
                    </div>
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Website</label>
                    <input className="bo-form-input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contract Start Date</label>
                      <input className="bo-form-input" type="date" value={form.contractStartDate} onChange={(e) => setForm({ ...form, contractStartDate: e.target.value })} />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contract End Date</label>
                      <input className="bo-form-input" type="date" value={form.contractExpiryDate} onChange={(e) => setForm({ ...form, contractExpiryDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Address</label>
                    <input className="bo-form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Publisher address" />
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">City</label>
                      <input className="bo-form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g., Mumbai" />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">State</label>
                      <input className="bo-form-input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="e.g., Maharashtra" />
                    </div>
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Taluka</label>
                      <input className="bo-form-input" value={form.taluka} onChange={(e) => setForm({ ...form, taluka: e.target.value })} placeholder="e.g., Mumbai City" />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">Pincode</label>
                      <input className="bo-form-input" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="e.g., 400001" maxLength={6} />
                    </div>
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Description</label>
                    <textarea className="bo-form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the publisher" />
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Publisher Logo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {logoPreview && (
                        <img src={logoPreview} alt="Logo preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--bo-border)' }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleLogoChange}
                          style={{ fontSize: 13 }}
                        />
                        <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 4 }}>JPG, PNG, WebP or GIF. Max 5MB.</div>
                      </div>
                    </div>
                  </div>
                  {!editingPublisher && (
                    <>
                      <div style={{ padding: '12px 14px', background: 'var(--bo-accent-light)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--bo-accent)' }}>
                        📧 Login credentials will be sent to the admin email below. If left blank, the contact email above will be used.
                      </div>
                      <div className="bo-form-row">
                        <div className="bo-form-group">
                          <label className="bo-form-label">Admin Login Email</label>
                          <input className="bo-form-input" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder={form.contactEmail || 'Same as contact email'} />
                        </div>
                        <div className="bo-form-group">
                          <label className="bo-form-label">Admin Password</label>
                          <div style={{ position: 'relative' }}>
                            <input className="bo-form-input" type={showAdminPassword ? 'text' : 'password'} value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Leave blank to auto-generate" style={{ paddingRight: 36 }} />
                            <button type="button" onClick={() => setShowAdminPassword(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}>{showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {editingPublisher && (
                    <>
                      <div style={{ borderTop: '1px solid var(--bo-border)', marginTop: 16, paddingTop: 16 }}>
                        <div style={{ padding: '12px 14px', background: 'var(--bo-accent-light)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--bo-accent)' }}>
                          🔑 Optionally update the publisher admin's login credentials. Leave blank to keep unchanged.
                        </div>
                        <div className="bo-form-row">
                          <div className="bo-form-group">
                            <label className="bo-form-label">New Admin Login Email</label>
                            <input className="bo-form-input" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="Leave blank to keep current" />
                          </div>
                          <div className="bo-form-group">
                            <label className="bo-form-label">New Admin Password</label>
                            <div style={{ position: 'relative' }}>
                              <input className="bo-form-input" type={showAdminPassword ? 'text' : 'password'} value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Leave blank to keep current" style={{ paddingRight: 36 }} />
                              <button type="button" onClick={() => setShowAdminPassword(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}>{showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="bo-modal-footer">
                  <button type="button" className="bo-btn bo-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="bo-btn bo-btn-primary" disabled={saving}>
                    {saving ? <><div className="bo-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</> : editingPublisher ? 'Update Publisher' : 'Create Publisher'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewPublisher && (
          <div className="bo-modal-overlay" onClick={() => setViewPublisher(null)}>
            <div className="bo-modal" onClick={(e) => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title">Publisher Details</h3>
                <button className="bo-modal-close" onClick={() => setViewPublisher(null)}><X size={20} /></button>
              </div>
              <div className="bo-modal-body">
                <div style={{ display: 'grid', gap: 16 }}>
                  <div><label className="bo-form-label">Name</label><div style={{ fontSize: 14 }}>{viewPublisher.name}</div></div>
                  <div className="bo-form-row">
                    <div><label className="bo-form-label">Email</label><div style={{ fontSize: 14 }}>{viewPublisher.contactEmail}</div></div>
                    <div><label className="bo-form-label">Phone</label><div style={{ fontSize: 14 }}>{viewPublisher.contactPhone || '—'}</div></div>
                  </div>
                  <div className="bo-form-row">
                    <div><label className="bo-form-label">Status</label><div><span className={`bo-badge ${viewPublisher.status === 'ACTIVE' ? 'bo-badge-success' : 'bo-badge-warning'}`}>{viewPublisher.status}</span></div></div>
                    <div><label className="bo-form-label">Created</label><div style={{ fontSize: 14 }}>{formatDate(viewPublisher.createdAt)}</div></div>
                  </div>
                  {viewPublisher.website && <div><label className="bo-form-label">Website</label><div style={{ fontSize: 14 }}>{viewPublisher.website}</div></div>}
                  {viewPublisher.address && <div><label className="bo-form-label">Address</label><div style={{ fontSize: 14 }}>{viewPublisher.address}</div></div>}
                  {(viewPublisher.city || viewPublisher.state || viewPublisher.taluka || viewPublisher.pincode) && (
                    <div className="bo-form-row">
                      {viewPublisher.city && <div><label className="bo-form-label">City</label><div style={{ fontSize: 14 }}>{viewPublisher.city}</div></div>}
                      {viewPublisher.state && <div><label className="bo-form-label">State</label><div style={{ fontSize: 14 }}>{viewPublisher.state}</div></div>}
                      {viewPublisher.taluka && <div><label className="bo-form-label">Taluka</label><div style={{ fontSize: 14 }}>{viewPublisher.taluka}</div></div>}
                      {viewPublisher.pincode && <div><label className="bo-form-label">Pincode</label><div style={{ fontSize: 14 }}>{viewPublisher.pincode}</div></div>}
                    </div>
                  )}
                  {viewPublisher.description && <div><label className="bo-form-label">Description</label><div style={{ fontSize: 14 }}>{viewPublisher.description}</div></div>}
                  {(viewPublisher.contractStartDate || viewPublisher.contractExpiryDate) && (
                    <div className="bo-form-row">
                      {viewPublisher.contractStartDate && <div><label className="bo-form-label">Contract Start</label><div style={{ fontSize: 14 }}>{formatDate(viewPublisher.contractStartDate)}</div></div>}
                      {viewPublisher.contractExpiryDate && <div><label className="bo-form-label">Contract End</label><div style={{ fontSize: 14 }}>{formatDate(viewPublisher.contractExpiryDate)}</div></div>}
                    </div>
                  )}
                </div>
              </div>
              <div className="bo-modal-footer">
                <button className="bo-btn bo-btn-secondary" onClick={() => { setViewPublisher(null); openEditModal(viewPublisher); }}>
                  <Edit size={15} /> Edit
                </button>
                <button className="bo-btn bo-btn-secondary" onClick={() => setViewPublisher(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Renew Contract Modal */}
        {renewModal.open && (
          <div className="bo-modal-overlay" onClick={() => setRenewModal({ open: false, publisherId: '', name: '', currentEnd: '' })}>
            <div className="bo-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3>Renew Contract</h3>
                <button className="bo-modal-close" onClick={() => setRenewModal({ open: false, publisherId: '', name: '', currentEnd: '' })}><X size={18} /></button>
              </div>
              <div className="bo-modal-body">
                <p style={{ marginBottom: 16 }}>Renew contract for <strong>{renewModal.name}</strong></p>
                {renewModal.currentEnd && (
                  <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--bo-text-muted)' }}>
                    Current expiry: <strong style={{ color: 'var(--bo-text-primary)' }}>{formatDate(renewModal.currentEnd)}</strong>
                  </p>
                )}
                <div className="bo-form-group">
                  <label className="bo-form-label">New Contract End Date</label>
                  <input
                    type="date"
                    className="bo-form-input"
                    value={renewDate}
                    onChange={e => setRenewDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="bo-modal-footer">
                <button className="bo-btn bo-btn-secondary" onClick={() => setRenewModal({ open: false, publisherId: '', name: '', currentEnd: '' })}>Cancel</button>
                <button className="bo-btn bo-btn-primary" onClick={handleRenewConfirm}>Renew</button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmModal.open}
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          confirmLabel="Confirm"
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(m => ({ ...m, open: false }))}
        />
      </div>
    </MainLayout>
  );
};

export default PublishersManagement;
