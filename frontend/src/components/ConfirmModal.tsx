import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import '../styles/bitflow-owner.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="bo-modal-overlay" onClick={onCancel}>
      <div
        className="bo-modal"
        style={{ maxWidth: 460 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: danger ? 'var(--bo-danger-light)' : '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: danger ? 'var(--bo-danger)' : '#D97706',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--bo-text-primary)' }}>{title}</h3>
              <button
                onClick={onCancel}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-text-muted)', padding: 0, marginLeft: 12 }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--bo-text-secondary)', lineHeight: 1.5 }}>{message}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="bo-btn bo-btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={`bo-btn ${danger ? 'bo-btn-danger' : 'bo-btn-primary'}`}
            onClick={() => { onConfirm(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
