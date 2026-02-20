import React, { useEffect, useState } from 'react';
import { Building2, Plus, Search, X, Eye, Edit, CheckCircle, XCircle, Mail, Trash2 } from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

interface Publisher {
  id: string;
  name: string;
  code?: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  description?: string;
  status: string;
  contractExpiryDate?: string;
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
  const [successMsg, setSuccessMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [form, setForm] = useState({
    name: '', code: '', contactEmail: '', contactPhone: '', website: '',
    address: '', description: '', contractExpiryDate: '',
    adminEmail: '', adminPassword: ''
  });

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
    setForm({ name: '', code: '', contactEmail: '', contactPhone: '', website: '', address: '', description: '', contractExpiryDate: '', adminEmail: '', adminPassword: '' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (pub: Publisher) => {
    setEditingPublisher(pub);
    setForm({
      name: pub.name, code: pub.code || '', contactEmail: pub.contactEmail, contactPhone: pub.contactPhone || '',
      website: pub.website || '', address: pub.address || '', description: pub.description || '',
      contractExpiryDate: pub.contractExpiryDate ? pub.contractExpiryDate.split('T')[0] : '',
      adminEmail: '', adminPassword: ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.contactEmail) {
      setError('Name, code, and contact email are required');
      return;
    }
    if (!/^[A-Z0-9_]{2,20}$/.test(form.code)) {
      setError('Code must be 2-20 uppercase letters, numbers, or underscores');
      return;
    }
    try {
      setSaving(true);
      setError('');
      if (editingPublisher) {
        await apiService.put(`/bitflow-owner/publishers/${editingPublisher.id}`, {
          name: form.name, contactEmail: form.contactEmail, contactPhone: form.contactPhone || undefined,
          website: form.website || undefined, address: form.address || undefined,
          description: form.description || undefined,
          contractExpiryDate: form.contractExpiryDate || undefined,
        });
        setSuccessMsg('Publisher updated successfully');
      } else {
        await apiService.post('/bitflow-owner/publishers', {
          name: form.name, code: form.code, contactEmail: form.contactEmail, contactPhone: form.contactPhone || undefined,
          website: form.website || undefined, address: form.address || undefined,
          description: form.description || undefined,
          contractExpiryDate: form.contractExpiryDate || undefined,
          adminEmail: form.adminEmail || form.contactEmail,
          adminPassword: form.adminPassword || 'Publisher@123',
        });
        setSuccessMsg('Publisher created successfully! Admin credentials have been set.');
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

  const handleRenew = async (id: string) => {
    try {
      await apiService.post(`/bitflow-owner/publishers/${id}/renew`);
      setSuccessMsg('Contract renewed successfully');
      fetchPublishers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to renew contract');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeletePublisher = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will deactivate all associated users and packages. This action cannot be undone.`)) return;
    try {
      await apiService.delete(`/bitflow-owner/publishers/${id}`);
      setSuccessMsg(`Publisher "${name}" deleted successfully`);
      fetchPublishers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete publisher');
      setTimeout(() => setError(''), 3000);
    }
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
                    <th>Contract Expiry</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((pub) => (
                    <tr key={pub.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{pub.name}</div>
                        {pub.website && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{pub.website}</div>}
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
                        {pub.contractExpiryDate ? new Date(pub.contractExpiryDate).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>
                        {new Date(pub.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="View" onClick={() => setViewPublisher(pub)}><Eye size={15} /></button>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="Edit" onClick={() => openEditModal(pub)}><Edit size={15} /></button>
                          {pub.status === 'ACTIVE' ? (
                            <button className="bo-btn bo-btn-danger bo-btn-sm" onClick={() => handleStatusChange(pub.id, 'SUSPENDED')}>Don't Allow</button>
                          ) : (
                            <button className="bo-btn bo-btn-success bo-btn-sm" onClick={() => handleStatusChange(pub.id, 'ACTIVE')}>Allow</button>
                          )}
                          <button className="bo-btn bo-btn-primary bo-btn-sm" title="Renew Contract" onClick={() => handleRenew(pub.id)}>Renew</button>
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
                    <input className="bo-form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter publisher name" required />
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Publisher Code *</label>
                    <input 
                      className="bo-form-input" 
                      value={form.code} 
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} 
                      placeholder="e.g., ELSEVIER, SPRINGER" 
                      maxLength={20}
                      pattern="[A-Z0-9_]{2,20}"
                      title="2-20 uppercase letters, numbers, or underscores"
                      required 
                    />
                    <div style={{ fontSize: '11px', color: 'var(--bo-text-muted)', marginTop: '4px' }}>2-20 uppercase letters, numbers, or underscores</div>
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contact Email *</label>
                      <input className="bo-form-input" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="email@example.com" required />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contact Phone</label>
                      <input className="bo-form-input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
                    </div>
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Website</label>
                      <input className="bo-form-input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contract Expiry Date</label>
                      <input className="bo-form-input" type="date" value={form.contractExpiryDate} onChange={(e) => setForm({ ...form, contractExpiryDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Address</label>
                    <input className="bo-form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Publisher address" />
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Description</label>
                    <textarea className="bo-form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the publisher" />
                  </div>
                  {!editingPublisher && (
                    <>
                      <div style={{ padding: '12px 14px', background: 'var(--bo-accent-light)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--bo-accent)' }}>
                        Admin credentials will be created for the publisher portal. You can customize them below or use defaults.
                      </div>
                      <div className="bo-form-row">
                        <div className="bo-form-group">
                          <label className="bo-form-label">Admin Email</label>
                          <input className="bo-form-input" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder={form.contactEmail || 'Same as contact email'} />
                        </div>
                        <div className="bo-form-group">
                          <label className="bo-form-label">Admin Password</label>
                          <input className="bo-form-input" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Default: Publisher@123" />
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
                    <div><label className="bo-form-label">Created</label><div style={{ fontSize: 14 }}>{new Date(viewPublisher.createdAt).toLocaleDateString()}</div></div>
                  </div>
                  {viewPublisher.website && <div><label className="bo-form-label">Website</label><div style={{ fontSize: 14 }}>{viewPublisher.website}</div></div>}
                  {viewPublisher.address && <div><label className="bo-form-label">Address</label><div style={{ fontSize: 14 }}>{viewPublisher.address}</div></div>}
                  {viewPublisher.description && <div><label className="bo-form-label">Description</label><div style={{ fontSize: 14 }}>{viewPublisher.description}</div></div>}
                  {viewPublisher.contractExpiryDate && <div><label className="bo-form-label">Contract Expiry</label><div style={{ fontSize: 14 }}>{new Date(viewPublisher.contractExpiryDate).toLocaleDateString()}</div></div>}
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
      </div>
    </MainLayout>
  );
};

export default PublishersManagement;
