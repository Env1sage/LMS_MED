import React, { useEffect, useState, useMemo } from 'react';
import { Package, Plus, Search, X, Eye, Edit, CheckCircle, XCircle, Trash2, Link2, ChevronDown, Users, GraduationCap, BookOpen, Video, FileText, List, Filter } from 'lucide-react';
import apiService from '../services/api.service';
import { packagesService } from '../services/packages.service';
import MainLayout from '../components/MainLayout';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';
import { formatDate } from '../utils/dateUtils';

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

interface TeacherAssignment {
  id: string;
  title: string;
  description?: string;
  status: string;
  totalMarks: number;
  passingMarks: number;
  dueDate?: string;
  startDate?: string;
  createdAt: string;
  faculty: {
    id: string;
    name: string;
    email: string;
  };
  college: {
    id: string;
    name: string;
    code: string;
  };
  course: {
    id: string;
    title: string;
    academicYear?: string;
  };
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
  avgScore?: number;
}

const PackagesManagement: React.FC = () => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [contentTypeFilter, setContentTypeFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackageItem | null>(null);
  const [viewPkg, setViewPkg] = useState<PackageItem | null>(null);
  const [viewCollegesPkg, setViewCollegesPkg] = useState<PackageItem | null>(null);
  const [viewPkgContents, setViewPkgContents] = useState<{ total: number; learningUnits: any[]; package?: any } | null>(null);
  const [viewPkgContentsLoading, setViewPkgContentsLoading] = useState(false);
  const [viewContentSearch, setViewContentSearch] = useState('');
  const [viewContentTypeFilter, setViewContentTypeFilter] = useState('ALL');
  const [assigningPkg, setAssigningPkg] = useState<PackageItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; danger?: boolean }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [activeTab, setActiveTab] = useState<'packages' | 'assignments'>('packages');
  const [assignmentView, setAssignmentView] = useState<'package' | 'teacher'>('package');
  // Package assignment filters
  const [assignSearchTerm, setAssignSearchTerm] = useState('');
  const [assignCollegeFilter, setAssignCollegeFilter] = useState('ALL');
  const [assignPublisherFilter, setAssignPublisherFilter] = useState('ALL');
  const [assignStatusFilter, setAssignStatusFilter] = useState('ALL');
  const [assignExpiryFilter, setAssignExpiryFilter] = useState('ALL');
  // Teacher assignment filters
  const [taSearchTerm, setTaSearchTerm] = useState('');
  const [taCollegeFilter, setTaCollegeFilter] = useState('ALL');
  const [taStatusFilter, setTaStatusFilter] = useState('ALL');
  const [taSubmissionFilter, setTaSubmissionFilter] = useState('ALL');

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
    collegeIds: [] as string[], startDate: '', endDate: '', collegeSearch: ''
  });

  useEffect(() => {
    fetchPackages();
    fetchPublishers();
    fetchColleges();
    fetchAssignments();
    fetchTeacherAssignments();
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

  const fetchTeacherAssignments = async () => {
    try {
      const res = await apiService.get('/bitflow-owner/teacher-assignments');
      const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setTeacherAssignments(items);
    } catch (err) {
      console.error('Error fetching teacher assignments:', err);
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
    setAssignForm({ collegeIds: [], startDate: new Date().toISOString().split('T')[0], endDate: '', collegeSearch: '' });
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
    if (assignForm.collegeIds.length === 0 || !assigningPkg) {
      setError('Please select at least one college');
      return;
    }
    try {
      setSaving(true);
      setError('');
      let successCount = 0;
      let failCount = 0;
      for (const collegeId of assignForm.collegeIds) {
        try {
          await apiService.post('/packages/assignments', {
            packageId: assigningPkg.id,
            collegeId,
            startDate: assignForm.startDate || new Date().toISOString(),
            endDate: assignForm.endDate || undefined,
          });
          successCount++;
        } catch (err: any) {
          failCount++;
          console.error(`Assignment failed for college ${collegeId}:`, err);
        }
      }
      if (successCount > 0) {
        setSuccessMsg(`Package assigned to ${successCount} college${successCount > 1 ? 's' : ''} successfully${failCount > 0 ? ` (${failCount} failed)` : ''}`);
      } else {
        setError('All assignments failed');
      }
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
    setConfirmModal({
      open: true,
      title: 'Deactivate Package',
      message: 'Are you sure you want to deactivate this package?',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
        try {
          await apiService.delete(`/packages/${id}`);
          setSuccessMsg('Package deactivated');
          fetchPackages();
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to delete');
          setTimeout(() => setError(''), 3000);
        }
      },
    });
  };

  const handleRemoveAssignment = async (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Remove Assignment',
      message: 'Remove this package assignment?',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
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
      },
    });
  };

  const openViewModal = async (pkg: PackageItem) => {
    setViewPkg(pkg);
    setViewPkgContents(null);
    setViewContentSearch('');
    setViewContentTypeFilter('ALL');
    setViewPkgContentsLoading(true);
    try {
      const res = await packagesService.getPackageContent(pkg.id);
      setViewPkgContents(res);
    } catch (e) {
      setViewPkgContents({ total: 0, learningUnits: [] });
    } finally {
      setViewPkgContentsLoading(false);
    }
  };

  const filtered = packages.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.publisher?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchSubject = subjectFilter === 'ALL' || (p.subjects || []).includes(subjectFilter);
    const matchContentType = contentTypeFilter === 'ALL' || (p.contentTypes || []).includes(contentTypeFilter);
    return matchSearch && matchStatus && matchSubject && matchContentType;
  });

  const allSubjects = useMemo(() => Array.from(new Set(packages.flatMap(p => p.subjects || []))).sort(), [packages]);
  const allContentTypes = useMemo(() => Array.from(new Set(packages.flatMap(p => p.contentTypes || []))).sort(), [packages]);

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
            <Link2 size={16} /> Assignments ({assignments.length + teacherAssignments.length})
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
              {allSubjects.length > 0 && (
                <select className="bo-filter-select" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
                  <option value="ALL">All Subjects</option>
                  {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {allContentTypes.length > 0 && (
                <select className="bo-filter-select" value={contentTypeFilter} onChange={e => setContentTypeFilter(e.target.value)}>
                  <option value="ALL">All Types</option>
                  {allContentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
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
                        <th>Type of Content</th>
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
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                              {(pkg.contentTypes || []).length > 0 ? (
                                (pkg.contentTypes || []).map((t, i) => (
                                  <span key={i} className="bo-badge bo-badge-info" style={{ fontSize: 11 }}>{t}</span>
                                ))
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>—</span>
                              )}
                            </div>
                            {(() => {
                              const assignedCount = assignments.filter(a => a.packageId === pkg.id && a.college).length;
                              return (
                                <button
                                  className="bo-btn bo-btn-ghost bo-btn-sm"
                                  style={{ marginTop: 4, fontSize: 11, padding: '2px 8px' }}
                                  onClick={() => setViewCollegesPkg(pkg)}
                                  title="View assigned colleges"
                                >
                                  <Users size={12} /> {assignedCount} college{assignedCount !== 1 ? 's' : ''}
                                </button>
                              );
                            })()}
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{formatDate(pkg.createdAt)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="bo-btn bo-btn-ghost bo-btn-sm" title="View Contents" onClick={() => openViewModal(pkg)}><Eye size={15} /></button>
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

        {/* Assignments Tab (combined) */}
        {activeTab === 'assignments' && (() => {
          // Filtered package assignments
          const now = new Date();
          const filteredAssignments = assignments.filter(a => {
            const matchSearch = !assignSearchTerm ||
              (a.package?.name || '').toLowerCase().includes(assignSearchTerm.toLowerCase()) ||
              (a.college?.name || '').toLowerCase().includes(assignSearchTerm.toLowerCase());
            const matchCollege = assignCollegeFilter === 'ALL' || a.collegeId === assignCollegeFilter;
            const matchPublisher = assignPublisherFilter === 'ALL' || a.package?.publisher?.name === assignPublisherFilter || a.package?.publisherId === assignPublisherFilter;
            const matchStatus = assignStatusFilter === 'ALL' || a.status === assignStatusFilter;
            const endDate = a.endDate ? new Date(a.endDate) : null;
            const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / 86400000) : null;
            const matchExpiry = assignExpiryFilter === 'ALL' ||
              (assignExpiryFilter === 'expired' && daysLeft !== null && daysLeft <= 0) ||
              (assignExpiryFilter === 'expiring' && daysLeft !== null && daysLeft > 0 && daysLeft <= 30) ||
              (assignExpiryFilter === 'active' && (daysLeft === null || daysLeft > 30)) ||
              (assignExpiryFilter === 'perpetual' && endDate === null);
            return matchSearch && matchCollege && matchPublisher && matchStatus && matchExpiry;
          });

          // Filtered teacher assignments
          const filteredTeacher = teacherAssignments.filter(ta => {
            const matchSearch = !taSearchTerm ||
              ta.title.toLowerCase().includes(taSearchTerm.toLowerCase()) ||
              ta.faculty.name.toLowerCase().includes(taSearchTerm.toLowerCase()) ||
              ta.college.name.toLowerCase().includes(taSearchTerm.toLowerCase());
            const matchCollege = taCollegeFilter === 'ALL' || ta.college.id === taCollegeFilter || ta.college.name === taCollegeFilter;
            const matchStatus = taStatusFilter === 'ALL' || ta.status === taStatusFilter;
            const dueDate = ta.dueDate ? new Date(ta.dueDate) : null;
            const matchSubmission = taSubmissionFilter === 'ALL' ||
              (taSubmissionFilter === 'overdue' && dueDate && dueDate < now) ||
              (taSubmissionFilter === 'pending' && ta.submittedCount < ta.totalStudents) ||
              (taSubmissionFilter === 'complete' && ta.submittedCount >= ta.totalStudents);
            return matchSearch && matchCollege && matchStatus && matchSubmission;
          });

          const assignPublishers = Array.from(new Set(assignments.map(a => a.package?.publisher?.name).filter(Boolean)));
          const assignColleges = Array.from(new Set(assignments.map(a => a.collegeId).filter(Boolean)))
            .map(id => assignments.find(a => a.collegeId === id)?.college)
            .filter(Boolean) as College[];
          const taColleges = Array.from(new Map(teacherAssignments.map(ta => [ta.college.id, ta.college])).values());

          return (
            <>
              {/* Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', background: 'var(--bo-bg)', border: '1px solid var(--bo-border)', borderRadius: 8, padding: 4, gap: 4 }}>
                  <button
                    onClick={() => setAssignmentView('package')}
                    style={{ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                      background: assignmentView === 'package' ? 'var(--bo-accent)' : 'transparent',
                      color: assignmentView === 'package' ? '#fff' : 'var(--bo-text-secondary)' }}
                  >
                    <Link2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Package Assignments ({filteredAssignments.length})
                  </button>
                  <button
                    onClick={() => setAssignmentView('teacher')}
                    style={{ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                      background: assignmentView === 'teacher' ? 'var(--bo-accent)' : 'transparent',
                      color: assignmentView === 'teacher' ? '#fff' : 'var(--bo-text-secondary)' }}
                  >
                    <GraduationCap size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Teacher Assignments ({filteredTeacher.length})
                  </button>
                </div>
              </div>

              {/* Package Assignments */}
              {assignmentView === 'package' && (
                <>
                  <div className="bo-filters" style={{ marginBottom: 16 }}>
                    <div className="bo-search-bar" style={{ flex: 1, maxWidth: 300 }}>
                      <Search size={16} className="bo-search-icon" />
                      <input placeholder="Search package or college..." value={assignSearchTerm} onChange={e => setAssignSearchTerm(e.target.value)} />
                    </div>
                    <select className="bo-filter-select" value={assignPublisherFilter} onChange={e => setAssignPublisherFilter(e.target.value)}>
                      <option value="ALL">All Publishers</option>
                      {assignPublishers.map(p => <option key={p} value={p!}>{p}</option>)}
                    </select>
                    <select className="bo-filter-select" value={assignCollegeFilter} onChange={e => setAssignCollegeFilter(e.target.value)}>
                      <option value="ALL">All Colleges</option>
                      {assignColleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="bo-filter-select" value={assignStatusFilter} onChange={e => setAssignStatusFilter(e.target.value)}>
                      <option value="ALL">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="EXPIRED">Expired</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                    <select className="bo-filter-select" value={assignExpiryFilter} onChange={e => setAssignExpiryFilter(e.target.value)}>
                      <option value="ALL">All Expiry</option>
                      <option value="active">Active (&gt;30d)</option>
                      <option value="expiring">Expiring Soon</option>
                      <option value="expired">Expired</option>
                      <option value="perpetual">No End Date</option>
                    </select>
                    <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{filteredAssignments.length} result{filteredAssignments.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="bo-card">
                    {filteredAssignments.length === 0 ? (
                      <div className="bo-empty">
                        <Link2 size={44} className="bo-empty-icon" />
                        <h3>No Assignments Found</h3>
                        <p>Try adjusting the filters or assign packages to colleges from the Packages tab</p>
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
                            {filteredAssignments.map(a => {
                              const endDate = a.endDate ? new Date(a.endDate) : null;
                              const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / 86400000) : null;
                              const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;
                              const isExpired = daysRemaining !== null && daysRemaining <= 0;
                              return (
                                <tr key={a.id} style={isExpired ? { background: '#FEF2F2' } : isExpiringSoon ? { background: '#FFFBEB' } : {}}>
                                  <td style={{ fontWeight: 600, fontSize: 14 }}>{a.package?.name || a.packageId}</td>
                                  <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{a.package?.publisher?.name || '—'}</td>
                                  <td style={{ fontSize: 14 }}>{a.college?.name || a.collegeId}</td>
                                  <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{a.startDate ? formatDate(a.startDate) : '—'}</td>
                                  <td style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>{a.endDate ? formatDate(a.endDate) : 'No end date'}</td>
                                  <td>
                                    {endDate === null ? (
                                      <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Perpetual</span>
                                    ) : isExpired ? (
                                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bo-danger)' }}>Expired {Math.abs(daysRemaining!)}d ago</span>
                                    ) : isExpiringSoon ? (
                                      <span style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>{daysRemaining}d remaining</span>
                                    ) : (
                                      <span style={{ fontSize: 12, color: 'var(--bo-success)' }}>✓ {daysRemaining}d remaining</span>
                                    )}
                                  </td>
                                  <td><span className={`bo-badge ${a.status === 'ACTIVE' ? 'bo-badge-success' : a.status === 'EXPIRED' ? 'bo-badge-danger' : 'bo-badge-warning'}`}>{a.status}</span></td>
                                  <td><button className="bo-btn bo-btn-danger" style={{ padding: '5px 12px', fontSize: 12, lineHeight: 1 }} onClick={() => handleRemoveAssignment(a.id)}>Remove</button></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Teacher Assignments */}
              {assignmentView === 'teacher' && (
                <>
                  <div className="bo-filters" style={{ marginBottom: 16 }}>
                    <div className="bo-search-bar" style={{ flex: 1, maxWidth: 300 }}>
                      <Search size={16} className="bo-search-icon" />
                      <input placeholder="Search title, teacher, college..." value={taSearchTerm} onChange={e => setTaSearchTerm(e.target.value)} />
                    </div>
                    <select className="bo-filter-select" value={taCollegeFilter} onChange={e => setTaCollegeFilter(e.target.value)}>
                      <option value="ALL">All Colleges</option>
                      {taColleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="bo-filter-select" value={taStatusFilter} onChange={e => setTaStatusFilter(e.target.value)}>
                      <option value="ALL">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                    <select className="bo-filter-select" value={taSubmissionFilter} onChange={e => setTaSubmissionFilter(e.target.value)}>
                      <option value="ALL">All Submissions</option>
                      <option value="complete">Fully Submitted</option>
                      <option value="pending">Pending Submissions</option>
                      <option value="overdue">Overdue</option>
                    </select>
                    <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{filteredTeacher.length} result{filteredTeacher.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="bo-card">
                    {filteredTeacher.length === 0 ? (
                      <div className="bo-empty">
                        <GraduationCap size={44} className="bo-empty-icon" />
                        <h3>No Teacher Assignments Found</h3>
                        <p>Try adjusting the filters</p>
                      </div>
                    ) : (
                      <div className="bo-table-wrap">
                        <table className="bo-table">
                          <thead>
                            <tr>
                              <th>Assignment</th>
                              <th>Teacher</th>
                              <th>College</th>
                              <th>Course</th>
                              <th>Students</th>
                              <th>Submitted</th>
                              <th>Avg Score</th>
                              <th>Due Date</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTeacher.map(ta => {
                              const dueDate = ta.dueDate ? new Date(ta.dueDate) : null;
                              const isOverdue = dueDate && dueDate < now;
                              return (
                                <tr key={ta.id} style={isOverdue ? { background: '#FEF2F2' } : {}}>
                                  <td>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ta.title}</div>
                                    {ta.description && <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ta.description}</div>}
                                  </td>
                                  <td>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{ta.faculty.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{ta.faculty.email}</div>
                                  </td>
                                  <td style={{ fontSize: 13 }}>{ta.college.name}</td>
                                  <td>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{ta.course.title}</div>
                                    {ta.course.academicYear && <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>Year {ta.course.academicYear}</div>}
                                  </td>
                                  <td style={{ textAlign: 'center', fontSize: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><Users size={14} style={{ color: 'var(--bo-accent)' }} />{ta.totalStudents}</div>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: 13, fontWeight: 500, color: ta.submittedCount === ta.totalStudents ? 'var(--bo-success)' : 'var(--bo-text-secondary)' }}>{ta.submittedCount} / {ta.totalStudents}</span>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {ta.avgScore !== null && ta.avgScore !== undefined ? (
                                      <span style={{ fontSize: 13, fontWeight: 600, color: ta.avgScore >= 60 ? 'var(--bo-success)' : ta.avgScore >= 40 ? '#F59E0B' : 'var(--bo-danger)' }}>{ta.avgScore.toFixed(1)}%</span>
                                    ) : <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>—</span>}
                                  </td>
                                  <td style={{ fontSize: 13, color: isOverdue ? 'var(--bo-danger)' : 'var(--bo-text-secondary)' }}>
                                    {dueDate ? <>{formatDate(dueDate)}{isOverdue && <div style={{ fontSize: 11, fontWeight: 600 }}>Overdue</div>}</> : <span style={{ color: 'var(--bo-text-muted)' }}>No due date</span>}
                                  </td>
                                  <td><span className={`bo-badge ${ta.status === 'ACTIVE' ? 'bo-badge-success' : 'bo-badge-warning'}`}>{ta.status}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          );
        })()}

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
                <h3 className="bo-modal-title">Assign Package to Colleges</h3>
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
                    <label className="bo-form-label">Colleges * <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}>({assignForm.collegeIds.length} selected)</span></label>
                    {/* Select All / Deselect All */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <button
                        type="button"
                        style={{ padding: '4px 10px', fontSize: '11px', border: '1px solid #D1D5DB', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#F0FDF4', color: '#16A34A', fontWeight: 600 }}
                        onClick={() => setAssignForm(prev => ({ ...prev, collegeIds: colleges.filter(c => c.status === 'ACTIVE').map(c => c.id) }))}
                      >
                        <CheckCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Select All
                      </button>
                      <button
                        type="button"
                        style={{ padding: '4px 10px', fontSize: '11px', border: '1px solid #D1D5DB', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: 600 }}
                        onClick={() => setAssignForm(prev => ({ ...prev, collegeIds: [] }))}
                      >
                        <XCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Deselect All
                      </button>
                    </div>
                    {/* Search colleges */}
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                      <input
                        className="bo-form-input"
                        type="text"
                        placeholder="Search colleges..."
                        value={assignForm.collegeSearch}
                        onChange={e => setAssignForm(prev => ({ ...prev, collegeSearch: e.target.value }))}
                        style={{ paddingLeft: '32px', fontSize: '13px' }}
                      />
                    </div>
                    {/* Checkbox list */}
                    <div style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '4px',
                    }}>
                      {colleges
                        .filter(c => c.status === 'ACTIVE')
                        .filter(c => !assignForm.collegeSearch || c.name.toLowerCase().includes(assignForm.collegeSearch.toLowerCase()))
                        .map(c => (
                          <label
                            key={c.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              cursor: 'pointer',
                              borderRadius: '6px',
                              backgroundColor: assignForm.collegeIds.includes(c.id) ? '#EFF6FF' : 'transparent',
                              transition: 'background-color 0.15s',
                              fontSize: '13px',
                              color: '#374151',
                            }}
                            onMouseEnter={e => { if (!assignForm.collegeIds.includes(c.id)) (e.currentTarget.style.backgroundColor = '#F9FAFB'); }}
                            onMouseLeave={e => { if (!assignForm.collegeIds.includes(c.id)) (e.currentTarget.style.backgroundColor = 'transparent'); }}
                          >
                            <input
                              type="checkbox"
                              checked={assignForm.collegeIds.includes(c.id)}
                              onChange={() => {
                                setAssignForm(prev => ({
                                  ...prev,
                                  collegeIds: prev.collegeIds.includes(c.id)
                                    ? prev.collegeIds.filter(id => id !== c.id)
                                    : [...prev.collegeIds, c.id]
                                }));
                              }}
                              style={{ accentColor: '#3B82F6', width: '16px', height: '16px' }}
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      {colleges.filter(c => c.status === 'ACTIVE').filter(c => !assignForm.collegeSearch || c.name.toLowerCase().includes(assignForm.collegeSearch.toLowerCase())).length === 0 && (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>No colleges found</div>
                      )}
                    </div>
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
                  <button type="submit" className="bo-btn bo-btn-primary" disabled={saving || assignForm.collegeIds.length === 0}>
                    {saving ? <><div className="bo-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Assigning...</> : `Assign to ${assignForm.collegeIds.length} College${assignForm.collegeIds.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewPkg && (
          <div className="bo-modal-overlay" onClick={() => { setViewPkg(null); setViewPkgContents(null); }}>
            <div className="bo-modal" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title">Package Details</h3>
                <button className="bo-modal-close" onClick={() => { setViewPkg(null); setViewPkgContents(null); }}><X size={20} /></button>
              </div>
              <div className="bo-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div><label className="bo-form-label">Name</label><div style={{ fontSize: 14, fontWeight: 600 }}>{viewPkg.name}</div></div>
                  <div className="bo-form-row">
                    <div><label className="bo-form-label">Publisher</label><div style={{ fontSize: 14 }}>{viewPkg.publisher?.name || '—'}</div></div>
                    <div><label className="bo-form-label">Status</label><div><span className={`bo-badge ${viewPkg.status === 'ACTIVE' ? 'bo-badge-success' : 'bo-badge-warning'}`}>{viewPkg.status}</span></div></div>
                  </div>
                  {viewPkg.description && <div><label className="bo-form-label">Description</label><div style={{ fontSize: 14 }}>{viewPkg.description}</div></div>}
                  <div><label className="bo-form-label">Subjects</label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {(viewPkg.subjects || []).length > 0 ? viewPkg.subjects.map((s: string, i: number) => (
                        <span key={i} className="bo-badge bo-badge-info">{s}</span>
                      )) : <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>No subjects specified</span>}
                    </div>
                  </div>
                  {(viewPkg.contentTypes || []).length > 0 && (
                    <div><label className="bo-form-label">Content Types</label>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {viewPkg.contentTypes.map((t: string, i: number) => <span key={i} className="bo-badge bo-badge-default">{t}</span>)}
                      </div>
                    </div>
                  )}
                  <div className="bo-form-row">
                    <div>
                      <label className="bo-form-label">Colleges Assigned</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                        <span style={{ fontSize: 14 }}>{viewPkg._count?.college_packages ?? 0}</span>
                        {(viewPkg._count?.college_packages ?? 0) > 0 && (
                          <button
                            onClick={() => { setViewCollegesPkg(viewPkg); }}
                            style={{
                              fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--bo-accent)',
                              background: 'var(--bo-accent-light, #ede9fe)', color: 'var(--bo-accent)', cursor: 'pointer', fontWeight: 600
                            }}
                          >
                            View Colleges
                          </button>
                        )}
                      </div>
                    </div>
                    <div><label className="bo-form-label">Created</label><div style={{ fontSize: 14 }}>{formatDate(viewPkg.createdAt)}</div></div>
                  </div>
                </div>

                {/* Content Preview Section */}
                <div style={{ marginTop: 24, borderTop: '1px solid var(--bo-border)', paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--bo-text)' }}>
                      <List size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      Package Contents
                      {viewPkgContents && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--bo-text-muted)', fontWeight: 400 }}>({viewPkgContents.total} items)</span>}
                    </h4>
                  </div>
                  {viewPkgContentsLoading && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--bo-text-muted)', fontSize: 13 }}>Loading contents…</div>
                  )}
                  {!viewPkgContentsLoading && viewPkgContents && (
                    <>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        <div className="bo-search-bar" style={{ flex: 1, minWidth: 180 }}>
                          <Search size={14} className="bo-search-icon" />
                          <input placeholder="Search by title or subject…" value={viewContentSearch} onChange={e => setViewContentSearch(e.target.value)} />
                        </div>
                        <select className="bo-filter-select" value={viewContentTypeFilter} onChange={e => setViewContentTypeFilter(e.target.value)} style={{ minWidth: 130 }}>
                          <option value="ALL">All Types</option>
                          {Array.from(new Set(viewPkgContents.learningUnits.map((u: any) => u.type))).sort().map((t: any) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      {(() => {
                        const units = viewPkgContents.learningUnits.filter((u: any) => {
                          const q = viewContentSearch.toLowerCase();
                          const matchSearch = !q || u.title.toLowerCase().includes(q) || (u.subject || '').toLowerCase().includes(q);
                          const matchType = viewContentTypeFilter === 'ALL' || u.type === viewContentTypeFilter;
                          return matchSearch && matchType;
                        });
                        if (units.length === 0) return <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'var(--bo-text-muted)' }}>No matching content found.</div>;
                        return (
                          <div style={{ overflowX: 'auto' }}>
                            <table className="bo-table" style={{ width: '100%', fontSize: 13 }}>
                              <thead>
                                <tr>
                                  <th>Type</th>
                                  <th>Title</th>
                                  <th>Subject</th>
                                  <th>Topic</th>
                                  <th>Duration</th>
                                  <th>Difficulty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {units.map((u: any) => (
                                  <tr key={u.id}>
                                    <td><span className="bo-badge bo-badge-default" style={{ fontSize: 11 }}>{u.type}</span></td>
                                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.title}>{u.title}</td>
                                    <td>{u.subject || '—'}</td>
                                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.topic || ''}>{u.topic || '—'}</td>
                                    <td>{u.estimatedDuration ? `${u.estimatedDuration} min` : '—'}</td>
                                    <td>{u.difficultyLevel || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </>
                  )}
                  {!viewPkgContentsLoading && !viewPkgContents && (
                    <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'var(--bo-text-muted)' }}>Unable to load contents.</div>
                  )}
                </div>
              </div>
              <div className="bo-modal-footer">
                <button className="bo-btn bo-btn-primary" onClick={() => { const p = viewPkg; setViewPkg(null); setViewPkgContents(null); openAssignModal(p); }}>
                  <Link2 size={15} /> Assign to College
                </button>
                <button className="bo-btn bo-btn-secondary" onClick={() => { const p = viewPkg; setViewPkg(null); setViewPkgContents(null); openEditModal(p); }}>
                  <Edit size={15} /> Edit
                </button>
                <button className="bo-btn bo-btn-secondary" onClick={() => { setViewPkg(null); setViewPkgContents(null); }}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* View Colleges Modal */}
        {viewCollegesPkg && (
          <div className="bo-modal-overlay" onClick={() => setViewCollegesPkg(null)}>
            <div className="bo-modal" onClick={e => e.stopPropagation()}>
              <div className="bo-modal-header">
                <h3 className="bo-modal-title">Colleges assigned to: {viewCollegesPkg.name}</h3>
                <button className="bo-modal-close" onClick={() => setViewCollegesPkg(null)}><X size={20} /></button>
              </div>
              <div className="bo-modal-body">
                {(() => {
                  const assignedColleges = assignments.filter(a => a.packageId === viewCollegesPkg.id && a.college);
                  if (assignedColleges.length === 0) return (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--bo-text-muted)' }}>
                      <Users size={36} style={{ marginBottom: 8, opacity: 0.4 }} />
                      <div>No colleges assigned to this package yet.</div>
                    </div>
                  );
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {assignedColleges.map(a => {
                        const now = new Date();
                        const endDate = a.endDate ? new Date(a.endDate) : null;
                        const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                        const isExpired = daysRemaining !== null && daysRemaining <= 0;
                        const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;
                        return (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--bo-border)', borderRadius: 8, background: isExpired ? '#FEF2F2' : '#FAFAFA' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{a.college!.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginTop: 2 }}>
                                {a.startDate ? formatDate(a.startDate) : '—'} → {a.endDate ? formatDate(a.endDate) : 'No end date'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={`bo-badge ${a.status === 'ACTIVE' ? 'bo-badge-success' : 'bo-badge-danger'}`}>{a.status}</span>
                              {isExpired && <span style={{ fontSize: 11, color: 'var(--bo-danger)', fontWeight: 600 }}>Expired</span>}
                              {isExpiringSoon && !isExpired && <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>{daysRemaining}d left</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              <div className="bo-modal-footer">
                <button className="bo-btn bo-btn-primary" onClick={() => { const p = viewCollegesPkg; setViewCollegesPkg(null); openAssignModal(p!); }}>
                  <Link2 size={15} /> Assign More
                </button>
                <button className="bo-btn bo-btn-secondary" onClick={() => setViewCollegesPkg(null)}>Close</button>
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

export default PackagesManagement;
