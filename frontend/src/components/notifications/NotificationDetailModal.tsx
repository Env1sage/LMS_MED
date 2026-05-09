import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, AlertTriangle, BookOpen, Megaphone, Clock, ExternalLink, User, Tag } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

export interface NotificationDetail {
  id: string;
  title: string;
  message: string;
  type?: string;
  priority?: string;
  category?: string;
  createdAt: string;
  isRead?: boolean;
  senderName?: string | null;
  actionUrl?: string | null;
  audience?: string | null;
}

interface Props {
  notification: NotificationDetail | null;
  onClose: () => void;
  onMarkRead?: (id: string) => void;
}

const PRIORITY_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  URGENT: { bg: '#FEF2F2', color: '#DC2626', label: 'Urgent' },
  HIGH:   { bg: '#FEF3C7', color: '#D97706', label: 'High' },
  NORMAL: { bg: '#EFF6FF', color: '#2563EB', label: 'Normal' },
  LOW:    { bg: '#F3F4F6', color: '#6B7280', label: 'Low' },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  ANNOUNCEMENT: <Megaphone size={18} />,
  ACADEMIC_NOTICE: <BookOpen size={18} />,
  DEADLINE: <AlertTriangle size={18} />,
  COURSE: <BookOpen size={18} />,
  SYSTEM_ALERT: <AlertTriangle size={18} />,
};

const NotificationDetailModal: React.FC<Props> = ({ notification, onClose, onMarkRead }) => {
  const navigate = useNavigate();
  if (!notification) return null;

  const priority = PRIORITY_CONFIG[notification.priority || 'NORMAL'] || PRIORITY_CONFIG.NORMAL;
  const typeKey = notification.type || notification.category || '';

  const handleOpen = () => {
    if (notification.actionUrl) {
      onClose();
      navigate(notification.actionUrl);
    }
  };

  const handleMarkRead = () => {
    if (onMarkRead && !notification.isRead) {
      onMarkRead(notification.id);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 9000, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 540,
        background: '#fff', borderRadius: 16,
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        zIndex: 9001,
        overflow: 'hidden',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: priority.bg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: priority.color,
          }}>
            {TYPE_ICON[typeKey] || <Bell size={18} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.4 }}>
              {notification.title}
            </h3>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: priority.bg, color: priority.color }}>
                {priority.label}
              </span>
              {(notification.type || notification.category) && (
                <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280' }}>
                  {(notification.type || notification.category || '').replace(/_/g, ' ')}
                </span>
              )}
              {notification.isRead === false && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#DBEAFE', color: '#1D4ED8' }}>
                  Unread
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Message */}
          <div style={{
            fontSize: 14, color: '#374151', lineHeight: 1.7,
            background: '#F9FAFB', borderRadius: 8, padding: '14px 16px',
            marginBottom: 16, whiteSpace: 'pre-wrap',
          }}>
            {notification.message}
          </div>

          {/* Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6B7280' }}>
              <Clock size={14} />
              <span>{formatDate(notification.createdAt)}</span>
            </div>
            {notification.senderName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6B7280' }}>
                <User size={14} />
                <span>Sent by <strong>{notification.senderName}</strong></span>
              </div>
            )}
            {notification.audience && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6B7280' }}>
                <Tag size={14} />
                <span>Audience: <strong>{notification.audience}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #E5E7EB',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          {notification.isRead === false && onMarkRead && (
            <button
              onClick={handleMarkRead}
              style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Mark as Read
            </button>
          )}
          {notification.actionUrl && (
            <button
              onClick={handleOpen}
              style={{
                padding: '9px 18px', borderRadius: 8, border: 'none',
                background: 'var(--bo-accent, #3B82F6)', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <ExternalLink size={14} /> Open
            </button>
          )}
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default NotificationDetailModal;
