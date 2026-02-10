import React, { useState, useEffect } from 'react';
import packagesService, { Package, PackageAssignment, CreatePackageDto } from '../services/packages.service';
import './PackageManagement.css';

interface PackageManagementProps {
  publishers: Array<{ id: string; name: string; code: string }>;
  colleges: Array<{ id: string; name: string; code: string }>;
  onClose?: () => void;
}

const PackageManagement: React.FC<PackageManagementProps> = ({ publishers, colleges, onClose }) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [assignments, setAssignments] = useState<PackageAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'packages' | 'assignments'>('packages');
  
  // Create Package Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePackageDto>({
    publisherId: '',
    name: '',
    description: '',
    subjects: [],
    contentTypes: [],
    status: 'ACTIVE',
  });

  // Assign Package Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    packageId: '',
    collegeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const subjects = [
    'Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology',
    'Microbiology', 'Forensic Medicine', 'Community Medicine', 'General Medicine',
    'General Surgery', 'Pediatrics', 'Obstetrics & Gynaecology', 'Orthopedics',
    'Ophthalmology', 'ENT', 'Psychiatry', 'Dermatology & Leprosy'
  ];

  const contentTypes = ['BOOK', 'VIDEO', 'MCQ'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pkgs, assigns] = await Promise.all([
        packagesService.getAll(),
        packagesService.getAllAssignments(),
      ]);
      setPackages(pkgs);
      setAssignments(assigns);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await packagesService.create(createForm);
      setSuccess('Package created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        publisherId: '',
        name: '',
        description: '',
        subjects: [],
        contentTypes: [],
        status: 'ACTIVE',
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create package');
    }
  };

  const handleAssignPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await packagesService.assignToCollege({
        packageId: assignForm.packageId,
        collegeId: assignForm.collegeId,
        startDate: assignForm.startDate,
        endDate: assignForm.endDate || undefined,
      });
      setSuccess('Package assigned successfully!');
      setShowAssignModal(false);
      setAssignForm({
        packageId: '',
        collegeId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign package');
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      await packagesService.delete(id);
      setSuccess('Package deleted');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete package');
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!window.confirm('Remove this package assignment?')) return;
    try {
      await packagesService.removeAssignment(id);
      setSuccess('Assignment removed');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove assignment');
    }
  };

  const toggleSubject = (subject: string) => {
    setCreateForm(prev => ({
      ...prev,
      subjects: prev.subjects?.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...(prev.subjects || []), subject],
    }));
  };

  const toggleContentType = (type: string) => {
    setCreateForm(prev => ({
      ...prev,
      contentTypes: prev.contentTypes?.includes(type)
        ? prev.contentTypes.filter(t => t !== type)
        : [...(prev.contentTypes || []), type],
    }));
  };

  if (loading) {
    return (
      <div className="package-management">
        <div className="loading">Loading packages...</div>
      </div>
    );
  }

  return (
    <div className="package-management">
      <div className="pm-header">
        <h2>Package Management</h2>
        <div className="pm-actions">
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create Package
          </button>
          <button className="btn-success" onClick={() => setShowAssignModal(true)}>
            Assign to College
          </button>
          {onClose && (
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="pm-tabs">
        <button 
          className={`tab ${activeTab === 'packages' ? 'active' : ''}`}
          onClick={() => setActiveTab('packages')}
        >
          Packages ({packages.length})
        </button>
        <button 
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments ({assignments.length})
        </button>
      </div>

      {activeTab === 'packages' && (
        <div className="packages-table">
          <table>
            <thead>
              <tr>
                <th>Package Name</th>
                <th>Publisher</th>
                <th>Subjects</th>
                <th>Content Types</th>
                <th>Colleges Assigned</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No packages created yet. Click "Create Package" to add one.
                  </td>
                </tr>
              ) : (
                packages.map(pkg => (
                  <tr key={pkg.id}>
                    <td className="pkg-name">
                      <strong>{pkg.name}</strong>
                      {pkg.description && <span className="pkg-desc">{pkg.description}</span>}
                    </td>
                    <td>{pkg.publisher?.name || 'N/A'}</td>
                    <td>
                      <div className="tags">
                        {pkg.subjects?.slice(0, 3).map(s => (
                          <span key={s} className="tag subject">{s}</span>
                        ))}
                        {pkg.subjects && pkg.subjects.length > 3 && (
                          <span className="tag more">+{pkg.subjects.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="tags">
                        {pkg.contentTypes?.map(t => (
                          <span key={t} className="tag content-type">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="center">{pkg._count?.college_packages || 0}</td>
                    <td>
                      <span className={`status-badge ${pkg.status.toLowerCase()}`}>
                        {pkg.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-sm btn-danger"
                        onClick={() => handleDeletePackage(pkg.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="assignments-table">
          <table>
            <thead>
              <tr>
                <th>College</th>
                <th>Package</th>
                <th>Publisher</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No package assignments yet. Click "Assign to College" to add one.
                  </td>
                </tr>
              ) : (
                assignments.map(assign => (
                  <tr key={assign.id}>
                    <td>
                      <strong>{assign.college?.name || 'N/A'}</strong>
                      <span className="code">{assign.college?.code}</span>
                    </td>
                    <td>{assign.package?.name || 'N/A'}</td>
                    <td>{assign.package?.publisher?.name || 'N/A'}</td>
                    <td>{new Date(assign.startDate).toLocaleDateString()}</td>
                    <td>{assign.endDate ? new Date(assign.endDate).toLocaleDateString() : 'No end date'}</td>
                    <td>
                      <span className={`status-badge ${assign.status.toLowerCase()}`}>
                        {assign.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-sm btn-danger"
                        onClick={() => handleRemoveAssignment(assign.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Package Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Package</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreatePackage}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Publisher *</label>
                  <select
                    value={createForm.publisherId}
                    onChange={(e) => setCreateForm({ ...createForm, publisherId: e.target.value })}
                    required
                  >
                    <option value="">Select Publisher</option>
                    {publishers.map(pub => (
                      <option key={pub.id} value={pub.id}>{pub.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Package Name *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g., Premium Anatomy Bundle"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Package description..."
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label>Subjects</label>
                  <div className="checkbox-grid">
                    {subjects.map(subject => (
                      <label key={subject} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={createForm.subjects?.includes(subject) || false}
                          onChange={() => toggleSubject(subject)}
                        />
                        {subject}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Content Types</label>
                  <div className="checkbox-grid cols-4">
                    {contentTypes.map(type => (
                      <label key={type} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={createForm.contentTypes?.includes(type) || false}
                          onChange={() => toggleContentType(type)}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Package Modal */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Assign Package to College</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <form onSubmit={handleAssignPackage}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Package *</label>
                  <select
                    value={assignForm.packageId}
                    onChange={(e) => setAssignForm({ ...assignForm, packageId: e.target.value })}
                    required
                  >
                    <option value="">Select Package</option>
                    {packages.filter(p => p.status === 'ACTIVE').map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.publisher?.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>College *</label>
                  <select
                    value={assignForm.collegeId}
                    onChange={(e) => setAssignForm({ ...assignForm, collegeId: e.target.value })}
                    required
                  >
                    <option value="">Select College</option>
                    {colleges.map(col => (
                      <option key={col.id} value={col.id}>{col.name} ({col.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={assignForm.startDate}
                      onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date (Optional)</label>
                    <input
                      type="date"
                      value={assignForm.endDate}
                      onChange={(e) => setAssignForm({ ...assignForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Assign Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageManagement;
