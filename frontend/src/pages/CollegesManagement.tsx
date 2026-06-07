import React, { useEffect, useState } from 'react';
import { GraduationCap, Plus, Search, X, Eye, EyeOff, Edit, CheckCircle, XCircle, Users, Package, Trash2, Mail, Building2 } from 'lucide-react';
import apiService from '../services/api.service';
import MainLayout from '../components/MainLayout';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';
import { formatDate } from '../utils/dateUtils';

interface College {
  id: string;
  name: string;
  code?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  taluka?: string;
  pincode?: string;
  logoUrl?: string;
  maxStudents?: number;
  licenseType?: string;
  status: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  createdAt: string;
  _count?: { students: number };
  studentCount?: number;
  userCount?: number;
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignCollege, setBulkAssignCollege] = useState<College | null>(null);
  const [publishers, setPublishers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; danger?: boolean }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [resendModal, setResendModal] = useState<{ open: boolean; collegeId: string; collegeName: string } | null>(null);
  const [resendingSending, setResendingSending] = useState(false);
  const [resendModalError, setResendModalError] = useState('');

  const [form, setForm] = useState({
    name: '', code: '', contactEmail: '', contactPhone: '', address: '', city: '', state: '', taluka: '', pincode: '', logoUrl: '',
    maxStudents: '500', maxTeachers: '0', licenseType: 'STANDARD',
    subscriptionStartDate: '', subscriptionEndDate: '',
    // IT Admin account
    adminEmail: '', adminName: '', adminPassword: '',
    // Dean account (contactEmail field in API)
    deanEmail: '', deanName: '', deanPassword: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showDeanPassword, setShowDeanPassword] = useState(false);

  useEffect(() => { fetchColleges(); fetchAssignments(); fetchPublishersAndPackages(); }, []);

  const fetchPublishersAndPackages = async () => {
    try {
      const [pubsRes, pkgsRes] = await Promise.all([
        apiService.get('/bitflow-owner/publishers'),
        apiService.get('/packages')
      ]);
      setPublishers(pubsRes.data?.publishers || pubsRes.data || []);
      setPackages(Array.isArray(pkgsRes.data) ? pkgsRes.data : pkgsRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching publishers/packages:', err);
    }
  };

  const openBulkAssignModal = (college: College) => {
    setBulkAssignCollege(college);
    setShowBulkAssignModal(true);
  };

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
    setConfirmModal({
      open: true,
      title: 'Remove Package Assignment',
      message: 'Are you sure you want to remove this package assignment? This cannot be undone.',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
        try {
          await apiService.delete(`/packages/assignments/${assignmentId}`);
          setSuccessMsg('Package assignment removed successfully');
          fetchAssignments();
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to remove assignment');
          setTimeout(() => setError(''), 3000);
        }
      },
    });
  };

  const openCreateModal = () => {
    setEditingCollege(null);
    setForm({ name: '', code: '', contactEmail: '', contactPhone: '', address: '', city: '', state: '', taluka: '', pincode: '', logoUrl: '', maxStudents: '500', maxTeachers: '0', licenseType: 'STANDARD', subscriptionStartDate: '', subscriptionEndDate: '', adminEmail: '', adminName: '', adminPassword: '', deanEmail: '', deanName: '', deanPassword: '' });
    setLogoFile(null);
    setLogoPreview('');
    setError('');
    setFieldErrors({});
    setShowModal(true);
  };

  const openEditModal = async (col: College) => {
    setEditingCollege(col);
    setLogoFile(null);
    setLogoPreview(col.logoUrl || '');
    setError('');
    setFieldErrors({});
    // Set basic fields immediately so modal opens fast
    setForm({
      name: col.name, code: col.code || '', contactEmail: col.contactEmail, contactPhone: col.contactPhone || '',
      address: col.address || '', city: col.city || '', state: col.state || '', taluka: col.taluka || '', pincode: col.pincode || '', logoUrl: col.logoUrl || '',
      maxStudents: col.maxStudents?.toString() || '',
      maxTeachers: '0',
      licenseType: col.licenseType || 'STANDARD',
      subscriptionStartDate: col.subscriptionStartDate ? col.subscriptionStartDate.split('T')[0] : '',
      subscriptionEndDate: col.subscriptionEndDate ? col.subscriptionEndDate.split('T')[0] : '',
      adminEmail: '', adminName: '', adminPassword: '',
      deanEmail: '', deanName: '', deanPassword: '',
    });
    setShowModal(true);
    // Fetch existing Dean and IT Admin user data to pre-fill
    try {
      const details = await apiService.get(`/bitflow-owner/colleges/${col.id}`) as any;
      setForm(prev => ({
        ...prev,
        deanEmail: details.deanEmail || '',
        deanName: details.deanName || '',
        adminEmail: details.adminEmail || '',
        adminName: details.adminName || '',
      }));
    } catch (_) {}
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
    if (!logoFile) return form.logoUrl || undefined;
    try {
      const formData = new FormData();
      formData.append('file', logoFile);
      formData.append('type', 'logo');
      const res = await apiService.post('/bitflow-owner/upload-logo', formData);
      return res.data.url;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Logo upload failed. College will be saved without a logo.';
      setError(msg);
      return form.logoUrl || undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Collect all validation errors simultaneously
    const errs: Record<string, string> = {};
    if (!form.name) errs.name = 'College name is required';
    if (!form.contactEmail) errs.contactEmail = 'Contact email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) errs.contactEmail = 'Invalid email address';
    if (!form.contactPhone) errs.contactPhone = 'Contact phone is required';
    else if (!/^[+\d\s\-()]{7,20}$/.test(form.contactPhone)) errs.contactPhone = 'Enter a valid phone number';
    if (!editingCollege && !form.code) errs.code = 'College code is required';
    else if (!editingCollege && !/^[A-Z0-9_]{2,20}$/.test(form.code)) errs.code = 'Code must be 2-20 uppercase letters, numbers, or underscores';
    if (!form.subscriptionStartDate) errs.subscriptionStartDate = 'Contract start date is required';
    if (!form.subscriptionEndDate) errs.subscriptionEndDate = 'Contract end date is required';
    if (form.subscriptionStartDate && form.subscriptionEndDate && form.subscriptionEndDate <= form.subscriptionStartDate)
      errs.subscriptionEndDate = 'End date must be after start date';
    if (!editingCollege && form.adminEmail && form.adminEmail === form.contactEmail) errs.adminEmail = 'Admin email must be different from the owner (contact) email';
    if (!editingCollege && form.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) errs.adminEmail = 'Invalid admin email address';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError('Please fix the highlighted fields below.');
      return;
    }
    setFieldErrors({});
    try {
      setSaving(true);
      setError('');
      const logoUrl = await uploadLogo();
      const payload: any = {
        name: form.name, contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined, address: form.address || undefined,
        city: form.city || undefined, state: form.state || undefined, taluka: form.taluka || undefined,
        pincode: form.pincode || undefined, logoUrl: logoUrl || undefined,
        maxStudents: ((parseInt(form.maxStudents) || 0) + (parseInt(form.maxTeachers) || 0)) || undefined,
        licenseType: form.licenseType,
        subscriptionStartDate: form.subscriptionStartDate || undefined,
        subscriptionEndDate: form.subscriptionEndDate || undefined,
      };
      if (editingCollege) {
        if (form.adminName) payload.adminName = form.adminName;
        if (form.adminEmail) payload.adminEmail = form.adminEmail;
        if (form.adminPassword) payload.adminPassword = form.adminPassword;
        if (form.deanName) payload.deanName = form.deanName;
        if (form.deanEmail) payload.deanEmail = form.deanEmail;
        if (form.deanPassword) payload.deanPassword = form.deanPassword;
        await apiService.put(`/bitflow-owner/colleges/${editingCollege.id}`, payload);
        setSuccessMsg('College updated successfully');
      } else {
        payload.code = form.code;
        // Dean account (contactEmail in API = dean login)
        payload.contactEmail = form.deanEmail;
        payload.ownerName = form.deanName || form.name + ' Dean';
        payload.ownerPassword = form.deanPassword || undefined;
        // IT Admin account
        payload.adminEmail = form.adminEmail || undefined;
        payload.adminName = form.adminName || form.name + ' Admin';
        payload.adminPassword = form.adminPassword || undefined;
        const createRes = await apiService.post('/bitflow-owner/colleges', payload);
        const deanLogin = createRes.data?.createdAccounts?.owner?.email || form.deanEmail;
        const adminLogin = createRes.data?.createdAccounts?.admin?.email || payload.adminEmail;
        setSuccessMsg(`College created! Dean login: ${deanLogin} · IT Admin login: ${adminLogin}`);
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

  const handleDeleteCollege = async (id: string, name: string) => {
    setConfirmModal({
      open: true,
      title: 'Delete College',
      message: `Are you sure you want to delete "${name}"? This will deactivate all associated users, students, and package assignments. This action cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
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
      },
    });
  };

  const handleResendCredentials = async (id: string, role: 'IT_ADMIN' | 'DEAN') => {
    await apiService.post(`/bitflow-owner/colleges/${id}/resend-credentials`, { role });
  };

  const handleResendConfirm = async (target: 'IT_ADMIN' | 'DEAN' | 'BOTH') => {
    if (!resendModal) return;
    setResendingSending(true);
    setResendModalError('');
    try {
      const { collegeId } = resendModal;
      if (target === 'BOTH') {
        // Send both independently — if Dean doesn't exist, still send IT Admin
        let itAdminOk = false, deanOk = false, deanErr = '';
        try { await handleResendCredentials(collegeId, 'IT_ADMIN'); itAdminOk = true; } catch {}
        try { await handleResendCredentials(collegeId, 'DEAN'); deanOk = true; } catch (e: any) {
          deanErr = e.response?.data?.message || 'No Dean account found';
        }
        if (itAdminOk && deanOk) {
          setSuccessMsg('Credentials sent to IT Admin and College Dean');
          setResendModal(null);
          setTimeout(() => setSuccessMsg(''), 3000);
        } else if (itAdminOk && !deanOk) {
          setResendModalError(`IT Admin credentials sent. Dean: ${deanErr}. Create a Dean account first to send Dean credentials.`);
        } else {
          setResendModalError('Failed to send credentials. Please try again.');
        }
      } else {
        await handleResendCredentials(collegeId, target);
        setSuccessMsg(`Credentials sent to ${target === 'IT_ADMIN' ? 'IT Admin' : 'College Dean'}`);
        setResendModal(null);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err: any) {
      setResendModalError(err.response?.data?.message || 'Failed to resend credentials');
    } finally {
      setResendingSending(false);
    }
  };

  const handleBulkAssignAllPackages = async (collegeId: string) => {
    setConfirmModal({
      open: true,
      title: 'Assign All Packages',
      message: 'This will assign ALL active packages to this college. Continue?',
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
        try {
          setSaving(true);
          const activePackages = packages.filter(p => p.status === 'ACTIVE');
          const startDate = new Date().toISOString().split('T')[0];
          const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const results = await Promise.allSettled(
            activePackages.map(pkg =>
              apiService.post('/packages/assignments', { collegeId, packageId: pkg.id, startDate, endDate, status: 'ACTIVE' })
            )
          );
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          const errorCount = results.filter(r => r.status === 'rejected').length;
          setSuccessMsg(`Successfully assigned ${successCount} packages${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
          setShowBulkAssignModal(false);
          fetchAssignments();
          setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
          setError('Failed to assign packages');
          setTimeout(() => setError(''), 3000);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleBulkAssignByPublisher = async (collegeId: string, publisherId: string) => {
    const publisher = publishers.find(p => p.id === publisherId);
    setConfirmModal({
      open: true,
      title: 'Assign Publisher Packages',
      message: `Assign all packages from "${publisher?.name}" to this college?`,
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
        try {
          setSaving(true);
          const publisherPackages = packages.filter(p => p.publisherId === publisherId && p.status === 'ACTIVE');
          const startDate = new Date().toISOString().split('T')[0];
          const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const results = await Promise.allSettled(
            publisherPackages.map(pkg =>
              apiService.post('/packages/assignments', { collegeId, packageId: pkg.id, startDate, endDate, status: 'ACTIVE' })
            )
          );
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          const errorCount = results.filter(r => r.status === 'rejected').length;
          setSuccessMsg(`Successfully assigned ${successCount} packages from ${publisher?.name}${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
          fetchAssignments();
          setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
          setError('Failed to assign publisher packages');
          setTimeout(() => setError(''), 3000);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleAssignSinglePackage = async (collegeId: string, packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    try {
      setSaving(true);
      await apiService.post('/packages/assignments', {
        collegeId,
        packageId,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'ACTIVE'
      });
      setSuccessMsg(`Successfully assigned package: ${pkg?.name}`);
      fetchAssignments();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign package');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const filtered = colleges.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contactEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStudentCount = (col: College) => col.studentCount ?? col.userCount ?? col._count?.students ?? 0;

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
                    <th>Accounts</th>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {col.logoUrl ? (
                            <img src={col.logoUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--bo-border)', background: '#f8faff', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>{col.name?.[0]?.toUpperCase()}</div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600 }}>{col.name}</div>
                            {col.address && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{col.address}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>{col.contactEmail}</div>
                        {col.contactPhone && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{col.contactPhone}</div>}
                      </td>
                      <td>
                        {(() => {
                          const used = getStudentCount(col);
                          const max = col.maxStudents;
                          const color = max ? (used / max >= 1 ? '#EF4444' : used / max >= 0.8 ? '#F59E0B' : '#10B981') : 'var(--bo-text-secondary)';
                          return <span style={{ fontWeight: 600, color, fontSize: 13 }}>{used}{max ? ` / ${max}` : ''}</span>;
                        })()}
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
                        {col.subscriptionEndDate ? formatDate(col.subscriptionEndDate) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="View" onClick={() => setViewCollege(col)}><Eye size={15} /></button>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="Edit" onClick={() => openEditModal(col)}><Edit size={15} /></button>
                          {col.status === 'ACTIVE' ? (
                            <button className="bo-btn bo-btn-danger bo-btn-sm" style={{ minWidth: 95, display: 'inline-flex', justifyContent: 'center' }} onClick={() => handleStatusChange(col.id, 'SUSPENDED')}>Don't Allow</button>
                          ) : (
                            <button className="bo-btn bo-btn-success bo-btn-sm" style={{ minWidth: 95, display: 'inline-flex', justifyContent: 'center' }} onClick={() => handleStatusChange(col.id, 'ACTIVE')}>Allow</button>
                          )}
                          <button className="bo-btn bo-btn-primary bo-btn-sm" title="Assign Content" onClick={() => openBulkAssignModal(col)}>Assign</button>
                          <button className="bo-btn bo-btn-ghost bo-btn-sm" title="Resend Credentials" onClick={() => setResendModal({ open: true, collegeId: col.id, collegeName: col.name })}><Mail size={15} /></button>
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
                  <div className="bo-form-row">
                    <div className="bo-form-group" style={{ flex: 2 }}>
                      <label className="bo-form-label">College Name *</label>
                      <input
                        className="bo-form-input"
                        style={fieldErrors.name ? { borderColor: 'var(--bo-danger)', background: '#FEF2F2' } : {}}
                        value={form.name}
                        onChange={e => { setForm({ ...form, name: e.target.value }); if (fieldErrors.name) setFieldErrors(prev => { const n = {...prev}; delete n.name; return n; }); }}
                        placeholder="Enter college name"
                      />
                      {fieldErrors.name && <div style={{ fontSize: 11, color: 'var(--bo-danger)', marginTop: 3 }}>{fieldErrors.name}</div>}
                    </div>
                    {!editingCollege && (
                      <div className="bo-form-group" style={{ flex: 1 }}>
                        <label className="bo-form-label">College Code *</label>
                        <input
                          className="bo-form-input"
                          style={fieldErrors.code ? { borderColor: 'var(--bo-danger)', background: '#FEF2F2' } : {}}
                          value={form.code}
                          onChange={e => { setForm({ ...form, code: e.target.value.toUpperCase() }); if (fieldErrors.code) setFieldErrors(prev => { const n = {...prev}; delete n.code; return n; }); }}
                          placeholder="e.g., AIIMS_DEL"
                          maxLength={20}
                        />
                        {fieldErrors.code
                          ? <div style={{ fontSize: 11, color: 'var(--bo-danger)', marginTop: 3 }}>{fieldErrors.code}</div>
                          : <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginTop: 4 }}>Uppercase letters, numbers, underscores</div>}
                      </div>
                    )}
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contact Email *</label>
                      <input
                        className="bo-form-input"
                        style={fieldErrors.contactEmail ? { borderColor: 'var(--bo-danger)', background: '#FEF2F2' } : {}}
                        type="email"
                        value={form.contactEmail}
                        onChange={e => { setForm({ ...form, contactEmail: e.target.value }); if (fieldErrors.contactEmail) setFieldErrors(prev => { const n = {...prev}; delete n.contactEmail; return n; }); }}
                        placeholder="email@college.edu"
                      />
                      {fieldErrors.contactEmail && <div style={{ fontSize: 11, color: 'var(--bo-danger)', marginTop: 3 }}>{fieldErrors.contactEmail}</div>}
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contact Phone *</label>
                      <input
                        className="bo-form-input"
                        style={fieldErrors.contactPhone ? { borderColor: 'var(--bo-danger)', background: '#FEF2F2' } : {}}
                        value={form.contactPhone}
                        onChange={e => { setForm({ ...form, contactPhone: e.target.value }); if (fieldErrors.contactPhone) setFieldErrors(prev => { const n = {...prev}; delete n.contactPhone; return n; }); }}
                        placeholder="+91 XXXXX XXXXX"
                      />
                      {fieldErrors.contactPhone && <div style={{ fontSize: 11, color: 'var(--bo-danger)', marginTop: 3 }}>{fieldErrors.contactPhone}</div>}
                    </div>
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">Address</label>
                    <input className="bo-form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="College address" />
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">City</label>
                      <input className="bo-form-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g., Mumbai" />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">State</label>
                      <input className="bo-form-input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="e.g., Maharashtra" />
                    </div>
                  </div>
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Taluka</label>
                      <input className="bo-form-input" value={form.taluka} onChange={e => setForm({ ...form, taluka: e.target.value })} placeholder="e.g., Mumbai City" />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">Pincode</label>
                      <input className="bo-form-input" type="text" maxLength={6} pattern="[0-9]{6}" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="400001" />
                    </div>
                  </div>
                  <div className="bo-form-group">
                    <label className="bo-form-label">College Logo</label>
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
                  <div className="bo-form-row">
                    <div className="bo-form-group">
                      <label className="bo-form-label">Max Students</label>
                      <input className="bo-form-input" type="number" min="0" value={form.maxStudents} onChange={e => setForm({ ...form, maxStudents: e.target.value })} placeholder="500" />
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">Max Teachers (Faculty)</label>
                      <input className="bo-form-input" type="number" min="0" value={form.maxTeachers} onChange={e => setForm({ ...form, maxTeachers: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: -8, marginBottom: 4, padding: '6px 10px', background: '#F8FAFC', borderRadius: 6, border: '1px solid #E5E7EB' }}>
                    Total accounts = {(parseInt(form.maxStudents) || 0) + (parseInt(form.maxTeachers) || 0)}
                    <span style={{ marginLeft: 8, color: '#94A3B8', fontSize: 11 }}>({form.maxStudents || 0} students + {form.maxTeachers || 0} teachers)</span>
                  </div>
                  <div className="bo-form-row">
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
                      <label className="bo-form-label">Contract Start Date *</label>
                      <input
                        className="bo-form-input"
                        style={fieldErrors.subscriptionStartDate ? { borderColor: 'var(--bo-danger)', background: '#FEF2F2' } : {}}
                        type="date"
                        value={form.subscriptionStartDate}
                        onChange={e => { setForm({ ...form, subscriptionStartDate: e.target.value }); if (fieldErrors.subscriptionStartDate) setFieldErrors(prev => { const n = {...prev}; delete n.subscriptionStartDate; return n; }); }}
                      />
                      {fieldErrors.subscriptionStartDate && <div style={{ fontSize: 11, color: 'var(--bo-danger)', marginTop: 3 }}>{fieldErrors.subscriptionStartDate}</div>}
                    </div>
                    <div className="bo-form-group">
                      <label className="bo-form-label">Contract End Date *</label>
                      <input
                        className="bo-form-input"
                        style={fieldErrors.subscriptionEndDate ? { borderColor: 'var(--bo-danger)', background: '#FEF2F2' } : {}}
                        type="date"
                        value={form.subscriptionEndDate}
                        onChange={e => { setForm({ ...form, subscriptionEndDate: e.target.value }); if (fieldErrors.subscriptionEndDate) setFieldErrors(prev => { const n = {...prev}; delete n.subscriptionEndDate; return n; }); }}
                      />
                      {fieldErrors.subscriptionEndDate && <div style={{ fontSize: 11, color: 'var(--bo-danger)', marginTop: 3 }}>{fieldErrors.subscriptionEndDate}</div>}
                    </div>
                  </div>
                  {editingCollege && (
                    <>
                      {/* ── Edit Dean Account ── */}
                      <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)', borderRadius: 10, marginBottom: 12, border: '1px solid #FDE68A', marginTop: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>🎓</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#92400E' }}>Dean Account</span>
                          <span style={{ fontSize: 11, background: '#F59E0B', color: '#fff', borderRadius: 4, padding: '1px 7px', marginLeft: 4 }}>Optional Update</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.5 }}>Leave fields blank to keep the current Dean credentials unchanged.</div>
                      </div>
                      <div className="bo-form-row">
                        <div className="bo-form-group">
                          <label className="bo-form-label">Dean Name</label>
                          <input className="bo-form-input" value={form.deanName} onChange={e => setForm({ ...form, deanName: e.target.value })} placeholder="Leave blank to keep current" />
                        </div>
                        <div className="bo-form-group">
                          <label className="bo-form-label">Dean Login Email</label>
                          <input className="bo-form-input" type="email" value={form.deanEmail} onChange={e => setForm({ ...form, deanEmail: e.target.value })} placeholder="Leave blank to keep current" />
                        </div>
                      </div>
                      <div className="bo-form-group">
                        <label className="bo-form-label">New Dean Password <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>(leave blank = no change)</span></label>
                        <div style={{ position: 'relative' }}>
                          <input className="bo-form-input" type={showDeanPassword ? 'text' : 'password'} value={form.deanPassword} onChange={e => setForm({ ...form, deanPassword: e.target.value })} placeholder="Leave blank to keep current" style={{ paddingRight: 36 }} />
                          <button type="button" onClick={() => setShowDeanPassword(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}>{showDeanPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        </div>
                      </div>
                      {/* ── Edit Admin Account ── */}
                      <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 100%)', borderRadius: 10, marginBottom: 12, border: '1px solid #C7D2FE', marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>🔐</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#3730A3' }}>IT Admin Account</span>
                          <span style={{ fontSize: 11, background: '#6366F1', color: '#fff', borderRadius: 4, padding: '1px 7px', marginLeft: 4 }}>Optional Update</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>Leave fields blank to keep the current IT Admin credentials unchanged.</div>
                      </div>
                      <div className="bo-form-row">
                        <div className="bo-form-group">
                          <label className="bo-form-label">IT Admin Name</label>
                          <input className="bo-form-input" value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })} placeholder="Leave blank to keep current" />
                        </div>
                        <div className="bo-form-group">
                          <label className="bo-form-label">IT Admin Login Email</label>
                          <input className="bo-form-input" type="email" value={form.adminEmail} onChange={e => { setForm({ ...form, adminEmail: e.target.value }); if (fieldErrors.adminEmail) setFieldErrors(prev => { const n = {...prev}; delete n.adminEmail; return n; }); }} placeholder="Leave blank to keep current" style={fieldErrors.adminEmail ? { borderColor: 'var(--bo-danger)', background: '#FEF2F2' } : {}} />
                          {fieldErrors.adminEmail && <div style={{ fontSize: 11, color: 'var(--bo-danger)', marginTop: 3 }}>{fieldErrors.adminEmail}</div>}
                        </div>
                      </div>
                      <div className="bo-form-group">
                        <label className="bo-form-label">New IT Admin Password <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>(leave blank = no change)</span></label>
                        <div style={{ position: 'relative' }}>
                          <input className="bo-form-input" type={showAdminPassword ? 'text' : 'password'} value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} placeholder="Leave blank to keep current" style={{ paddingRight: 36 }} />
                          <button type="button" onClick={() => setShowAdminPassword(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}>{showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        </div>
                      </div>
                    </>
                  )}
                  {!editingCollege && (
                    <>
                      {/* ── College Dean Account ── */}
                      <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)', borderRadius: 10, marginBottom: 12, border: '1px solid #FDE68A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>🎓</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#92400E' }}>College Dean Account</span>
                          <span style={{ fontSize: 11, background: '#F59E0B', color: '#fff', borderRadius: 4, padding: '1px 7px', marginLeft: 4 }}>Login Access</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.5 }}>
                          Dean gets full college portal access. Enter the Dean's email — this becomes their login.
                        </div>
                      </div>
                      <div className="bo-form-row">
                        <div className="bo-form-group">
                          <label className="bo-form-label">Dean Name</label>
                          <input className="bo-form-input" value={form.deanName} onChange={e => setForm({ ...form, deanName: e.target.value })} placeholder={form.name ? 'Dean - ' + form.name : 'Dean Name'} />
                        </div>
                        <div className="bo-form-group">
                          <label className="bo-form-label">Dean Email <span style={{ fontSize: 11, color: '#DC2626' }}>*</span></label>
                          <input className="bo-form-input" type="email" required value={form.deanEmail} onChange={e => setForm({ ...form, deanEmail: e.target.value })} placeholder="dean@college.edu" />
                        </div>
                      </div>
                      <div className="bo-form-group">
                        <label className="bo-form-label">Dean Password <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>(leave blank to auto-generate)</span></label>
                        <div style={{ position: 'relative' }}>
                          <input className="bo-form-input" type={showDeanPassword ? 'text' : 'password'} value={form.deanPassword} onChange={e => setForm({ ...form, deanPassword: e.target.value })} placeholder="Leave blank to auto-generate" style={{ paddingRight: 36 }} />
                          <button type="button" onClick={() => setShowDeanPassword(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}>{showDeanPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        </div>
                      </div>

                      {/* ── IT Admin Account ── */}
                      <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 100%)', borderRadius: 10, marginBottom: 12, border: '1px solid #C7D2FE', marginTop: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>🔐</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#3730A3' }}>IT Admin Account</span>
                          <span style={{ fontSize: 11, background: '#6366F1', color: '#fff', borderRadius: 4, padding: '1px 7px', marginLeft: 4 }}>Login Access</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
                          IT Admin manages users and college settings. Must use a different email from Dean. If left blank, auto-generated as <code>admin@{'{collegeCode}'}.edu.in</code>.
                        </div>
                      </div>
                      <div className="bo-form-row">
                        <div className="bo-form-group">
                          <label className="bo-form-label">IT Admin Name</label>
                          <input className="bo-form-input" value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })} placeholder={form.name ? form.name + ' Admin' : 'Admin Name'} />
                        </div>
                        <div className="bo-form-group">
                          <label className="bo-form-label">IT Admin Email <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>(optional)</span></label>
                          <input className="bo-form-input" type="email" value={form.adminEmail} onChange={e => { setForm({ ...form, adminEmail: e.target.value }); if (fieldErrors.adminEmail) setFieldErrors(prev => { const n = {...prev}; delete n.adminEmail; return n; }); }} placeholder={form.code ? `admin@${form.code.toLowerCase()}.edu.in` : 'Leave blank to auto-generate'} style={fieldErrors.adminEmail ? { borderColor: 'var(--bo-danger)', background: '#FEF2F2' } : {}} />
                          {fieldErrors.adminEmail && <div style={{ fontSize: 11, color: 'var(--bo-danger)', marginTop: 3 }}>{fieldErrors.adminEmail}</div>}
                        </div>
                      </div>
                      <div className="bo-form-group">
                        <label className="bo-form-label">IT Admin Password <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>(leave blank to auto-generate)</span></label>
                        <div style={{ position: 'relative' }}>
                          <input className="bo-form-input" type={showAdminPassword ? 'text' : 'password'} value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} placeholder="Leave blank to auto-generate" style={{ paddingRight: 36 }} />
                          <button type="button" onClick={() => setShowAdminPassword(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}>{showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
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
                    <div>
                      <label className="bo-form-label">Account Limits</label>
                      <div style={{ fontSize: 14 }}>
                        {(() => {
                          const used = getStudentCount(viewCollege);
                          const max = viewCollege.maxStudents;
                          const color = max ? (used / max >= 1 ? '#EF4444' : used / max >= 0.8 ? '#F59E0B' : '#10B981') : 'var(--bo-text-secondary)';
                          return <span>Used: <strong style={{ color }}>{used}{max ? ` / ${max} total` : ' (no limit)'}</strong></span>;
                        })()}
                      </div>
                    </div>
                    <div><label className="bo-form-label">Created</label><div style={{ fontSize: 14 }}>{formatDate(viewCollege.createdAt)}</div></div>
                  </div>
                  {viewCollege.address && <div><label className="bo-form-label">Address</label><div style={{ fontSize: 14 }}>{viewCollege.address}</div></div>}
                  <div className="bo-form-row">
                    <div><label className="bo-form-label">Subscription Start</label><div style={{ fontSize: 14 }}>{viewCollege.subscriptionStartDate ? formatDate(viewCollege.subscriptionStartDate) : '—'}</div></div>
                    <div><label className="bo-form-label">Subscription End</label><div style={{ fontSize: 14 }}>{viewCollege.subscriptionEndDate ? formatDate(viewCollege.subscriptionEndDate) : '—'}</div></div>
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
                                      {p.startDate ? formatDate(p.startDate) : '—'} → {endDate ? formatDate(endDate) : 'No end date'}
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

        {/* Bulk Assignment Modal */}
        {showBulkAssignModal && bulkAssignCollege && (
          <div className="bo-modal-overlay" onClick={() => setShowBulkAssignModal(false)}>
            <div className="bo-modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title">Assign Content to {bulkAssignCollege.name}</h3>
                <button className="bo-modal-close" onClick={() => setShowBulkAssignModal(false)}><X size={20} /></button>
              </div>
              <div className="bo-modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Assign All Packages */}
                  <div style={{ 
                    padding: 16, 
                    border: '2px solid #E5E7EB', 
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #667eea10, #764ba210)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Package size={20} style={{ color: '#667eea' }} />
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Assign All Packages</h4>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 12 }}>
                      Assign all active packages from all publishers to this college
                    </p>
                    <button 
                      className="bo-btn bo-btn-primary bo-btn-sm" 
                      onClick={() => handleBulkAssignAllPackages(bulkAssignCollege.id)}
                      style={{ width: '100%' }}
                    >
                      <Package size={15} /> Assign All Packages ({packages.filter(p => p.status === 'ACTIVE').length})
                    </button>
                  </div>

                  {/* Assign by Publisher */}
                  <div style={{ 
                    padding: 16, 
                    border: '2px solid #E5E7EB', 
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #f093fb10, #f5576c10)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Building2 size={20} style={{ color: '#f093fb' }} />
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Assign by Publisher</h4>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 12 }}>
                      Select a publisher to assign all their packages and content
                    </p>
                    <select 
                      className="bo-form-input" 
                      style={{ marginBottom: 12 }}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkAssignByPublisher(bulkAssignCollege.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">Select a publisher...</option>
                      {publishers.filter(p => p.status === 'ACTIVE').map(pub => (
                        <option key={pub.id} value={pub.id}>
                          {pub.name} ({packages.filter(pkg => pkg.publisherId === pub.id && pkg.status === 'ACTIVE').length} packages)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assign Individual Packages */}
                  <div style={{ 
                    padding: 16, 
                    border: '2px solid #E5E7EB', 
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #4facfe10, #00f2fe10)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <CheckCircle size={20} style={{ color: '#4facfe' }} />
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Assign Individual Package</h4>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 12 }}>
                      Select individual packages to assign
                    </p>
                    <select 
                      className="bo-form-input"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignSinglePackage(bulkAssignCollege.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">Select a package...</option>
                      {packages.filter(p => p.status === 'ACTIVE').map(pkg => {
                        const pub = publishers.find(p => p.id === pkg.publisherId);
                        return (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} - {pub?.name || 'Unknown Publisher'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                </div>
              </div>
              <div className="bo-modal-footer">
                <button className="bo-btn bo-btn-secondary" onClick={() => setShowBulkAssignModal(false)}>Close</button>
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

        {/* Resend Credentials Modal */}
        {resendModal?.open && (
          <div className="bo-modal-overlay" onClick={() => { if (!resendingSending) { setResendModal(null); setResendModalError(''); } }}>
            <div className="bo-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mail size={18} style={{ color: 'var(--bo-primary)' }} /> Resend Credentials
                </h3>
                <button className="bo-modal-close" onClick={() => { if (!resendingSending) { setResendModal(null); setResendModalError(''); } }}><X size={20} /></button>
              </div>
              <div className="bo-modal-body">
                {resendModalError && (
                  <div style={{ padding: '10px 14px', background: '#FEF3C7', color: '#92400E', borderRadius: 8, marginBottom: 16, fontSize: 13, border: '1px solid #FDE68A', lineHeight: 1.5 }}>
                    ⚠️ {resendModalError}
                  </div>
                )}
                <p style={{ marginBottom: 20, color: 'var(--bo-text-secondary)', fontSize: 14 }}>
                  Send login credentials for <strong>{resendModal.collegeName}</strong> to:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    className="bo-btn bo-btn-secondary"
                    style={{ justifyContent: 'flex-start', gap: 12, padding: '14px 16px', textAlign: 'left' }}
                    onClick={() => handleResendConfirm('IT_ADMIN')}
                    disabled={resendingSending}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Mail size={17} style={{ color: '#2563EB' }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bo-text-primary)' }}>IT Admin</div>
                      <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>College Admin account credentials</div>
                    </div>
                  </button>
                  <button
                    className="bo-btn bo-btn-secondary"
                    style={{ justifyContent: 'flex-start', gap: 12, padding: '14px 16px', textAlign: 'left' }}
                    onClick={() => handleResendConfirm('DEAN')}
                    disabled={resendingSending}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Mail size={17} style={{ color: '#16A34A' }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bo-text-primary)' }}>College Dean</div>
                      <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>Dean account credentials</div>
                    </div>
                  </button>
                  <button
                    className="bo-btn bo-btn-primary"
                    style={{ justifyContent: 'flex-start', gap: 12, padding: '14px 16px', textAlign: 'left' }}
                    onClick={() => handleResendConfirm('BOTH')}
                    disabled={resendingSending}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Mail size={17} style={{ color: '#fff' }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Both (IT Admin + Dean)</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>Send to both accounts at once</div>
                    </div>
                  </button>
                </div>
              </div>
              <div className="bo-modal-footer">
                <button className="bo-btn bo-btn-secondary" onClick={() => { setResendModal(null); setResendModalError(''); }} disabled={resendingSending}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CollegesManagement;
