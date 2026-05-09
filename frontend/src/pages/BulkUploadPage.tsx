import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublisherLayout from '../components/publisher/PublisherLayout';
import BulkMcqUpload from '../components/publisher/BulkMcqUpload';
import ExcelBulkUpload from '../components/publisher/ExcelBulkUpload';
import { ClipboardList, Table2, ArrowLeft } from 'lucide-react';
import '../styles/bitflow-owner.css';

type TabId = 'mcq' | 'excel';

const BulkUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('mcq');

  const tabs = [
    { id: 'mcq' as const, label: 'MCQ Bulk Upload', icon: <ClipboardList size={16} /> },
    { id: 'excel' as const, label: 'Bulk Upload Content', icon: <Table2 size={16} /> },
  ];

  return (
    <PublisherLayout>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}
            onClick={() => navigate('/publisher-admin')}>
            <ArrowLeft size={16} />
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text)' }}>Bulk Upload Content</h1>
        </div>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          Upload MCQs or bulk-import Books, EPUBs, Videos and Images via Excel templates
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--bo-border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--bo-primary)' : 'var(--bo-text-muted)',
              background: 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid var(--bo-primary)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
        {activeTab === 'mcq' && <BulkMcqUpload />}
        {activeTab === 'excel' && <ExcelBulkUpload />}
      </div>
    </PublisherLayout>
  );
};

export default BulkUploadPage;
