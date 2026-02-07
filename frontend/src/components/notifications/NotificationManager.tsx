import React, { useState, useEffect } from 'react';
import governanceService, { 
  Notification, 
  CreateNotificationDto, 
  UpdateNotificationDto,
  Department 
} from '../../services/governance.service';

interface NotificationManagerProps {
  onClose?: () => void;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState<CreateNotificationDto>({
    title: '',
    message: '',
    type: 'ANNOUNCEMENT',
    priority: 'NORMAL',
    audience: 'ALL',
    departmentId: '',
    academicYear: '',
    expiresAt: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notificationsData, departmentsData] = await Promise.all([
        governanceService.getNotifications(),
        governanceService.getDepartments().catch(() => []),
      ]);
      setNotifications(notificationsData);
      setDepartments(departmentsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (editingNotification) {
        await governanceService.updateNotification(editingNotification.id, formData as UpdateNotificationDto);
        setSuccess('Notification updated successfully');
      } else {
        await governanceService.createNotification(formData);
        setSuccess('Notification created successfully');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save notification');
    }
  };

  const handleEdit = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      audience: notification.audience,
      departmentId: notification.departmentId || '',
      academicYear: notification.academicYear || '',
      expiresAt: notification.expiresAt ? notification.expiresAt.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      await governanceService.deleteNotification(id);
      setSuccess('Notification deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  const resetForm = () => {
    setEditingNotification(null);
    setFormData({
      title: '',
      message: '',
      type: 'ANNOUNCEMENT',
      priority: 'NORMAL',
      audience: 'ALL',
      departmentId: '',
      academicYear: '',
      expiresAt: '',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return { bg: '#fee2e2', color: '#dc2626' };
      case 'HIGH': return { bg: '#fef3c7', color: '#d97706' };
      case 'NORMAL': return { bg: '#dbeafe', color: '#2563eb' };
      default: return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT': return '📢';
      case 'SCHEDULE_CHANGE': return '📅';
      case 'ACADEMIC_NOTICE': return '📚';
      case 'SYSTEM_ALERT': return '⚠️';
      default: return '🔔';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading notifications...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🔔 Notification Management</h2>
        <button
          style={styles.createBtn}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Create Notification
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{notifications.length}</span>
          <span style={styles.statLabel}>Total</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{notifications.filter(n => n.isActive).length}</span>
          <span style={styles.statLabel}>Active</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{notifications.filter(n => n.priority === 'URGENT' || n.priority === 'HIGH').length}</span>
          <span style={styles.statLabel}>High Priority</span>
        </div>
      </div>

      <div style={styles.notificationList}>
        {notifications.length === 0 ? (
          <div style={styles.empty}>
            <span style={{ fontSize: '48px' }}>📭</span>
            <p>No notifications created yet</p>
            <button style={styles.createBtn} onClick={() => setShowModal(true)}>
              Create your first notification
            </button>
          </div>
        ) : (
          notifications.map(notification => {
            const priorityStyle = getPriorityColor(notification.priority);
            return (
              <div key={notification.id} style={styles.notificationCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleRow}>
                    <span style={styles.typeIcon}>{getTypeIcon(notification.type)}</span>
                    <h3 style={styles.cardTitle}>{notification.title}</h3>
                    <span
                      style={{
                        ...styles.priorityBadge,
                        backgroundColor: priorityStyle.bg,
                        color: priorityStyle.color,
                      }}
                    >
                      {notification.priority}
                    </span>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: notification.isActive ? '#dcfce7' : '#f3f4f6',
                        color: notification.isActive ? '#166534' : '#6b7280',
                      }}
                    >
                      {notification.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.editBtn} onClick={() => handleEdit(notification)}>
                      ✏️ Edit
                    </button>
                    <button style={styles.deleteBtn} onClick={() => handleDelete(notification.id)}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
                <p style={styles.cardMessage}>{notification.message}</p>
                <div style={styles.cardMeta}>
                  <span>📣 Audience: {notification.audience}</span>
                  <span>🏷️ Type: {notification.type.replace('_', ' ')}</span>
                  {notification.department && (
                    <span>🏢 Dept: {notification.department.name}</span>
                  )}
                  <span>📅 Created: {formatDate(notification.createdAt)}</span>
                  {notification.expiresAt && (
                    <span>⏰ Expires: {formatDate(notification.expiresAt)}</span>
                  )}
                  <span>👁️ Read by: {notification._count?.readReceipts || 0}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingNotification ? 'Edit Notification' : 'Create Notification'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Title *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Notification title"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Message *</label>
                <textarea
                  style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Notification message"
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Type</label>
                  <select
                    style={styles.select}
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="ANNOUNCEMENT">📢 Announcement</option>
                    <option value="SCHEDULE_CHANGE">📅 Schedule Change</option>
                    <option value="ACADEMIC_NOTICE">📚 Academic Notice</option>
                    <option value="SYSTEM_ALERT">⚠️ System Alert</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Priority</label>
                  <select
                    style={styles.select}
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Audience</label>
                  <select
                    style={styles.select}
                    value={formData.audience}
                    onChange={e => setFormData({ ...formData, audience: e.target.value as any })}
                  >
                    <option value="ALL">All Users</option>
                    <option value="FACULTY">Faculty Only</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="DEPARTMENT">Specific Department</option>
                    <option value="BATCH">Specific Batch</option>
                  </select>
                </div>

                {(formData.audience === 'DEPARTMENT' || formData.audience === 'BATCH') && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Department</label>
                    <select
                      style={styles.select}
                      value={formData.departmentId}
                      onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {formData.audience === 'BATCH' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Academic Year</label>
                  <select
                    style={styles.select}
                    value={formData.academicYear}
                    onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                  >
                    <option value="">All Years</option>
                    <option value="YEAR_1">Year 1</option>
                    <option value="YEAR_2">Year 2</option>
                    <option value="YEAR_3_MINOR">Year 3 (Part 1)</option>
                    <option value="YEAR_3_MAJOR">Year 3 (Part 2)</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Expiry Date (optional)</label>
                <input
                  type="date"
                  style={styles.input}
                  value={formData.expiresAt}
                  onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editingNotification ? 'Update' : 'Create'} Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
    color: '#1f2937',
  },
  createBtn: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#6b7280',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  success: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  stats: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#f9fafb',
    padding: '16px 24px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '120px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '4px',
  },
  notificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  typeIcon: {
    fontSize: '20px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
  },
  priorityBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    background: 'transparent',
    border: '1px solid #e5e7eb',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  cardMessage: {
    margin: '0 0 12px 0',
    color: '#4b5563',
    lineHeight: 1.5,
  },
  cardMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    fontSize: '13px',
    color: '#6b7280',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
  },
  formGroup: {
    marginBottom: '16px',
    flex: 1,
  },
  formRow: {
    display: 'flex',
    gap: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  submitBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
};

export default NotificationManager;
