import React, { useState } from 'react';
import PublisherLayout from '../components/publisher/PublisherLayout';
import BulkContentUpload from '../components/publisher/BulkContentUpload';
import BulkMcqUpload from '../components/publisher/BulkMcqUpload';
import { BookOpen, ClipboardList } from 'lucide-react';
import '../styles/bitflow-owner.css';

type TabId = 'content' | 'mcq';

const BulkUploadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('content');

  const tabs = [
    { id: 'content' as const, label: 'E-Books & Videos', icon: <BookOpen size={16} /> },
    { id: 'mcq' as const, label: 'MCQs', icon: <ClipboardList size={16} /> },
  ];

  return (
    <PublisherLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text)' }}>Bulk Upload</h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          Upload multiple E-Books, Videos, or MCQs at once
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
        {activeTab === 'content' && <BulkContentUpload />}
        {activeTab === 'mcq' && <BulkMcqUpload />}
      </div>
    </PublisherLayout>
  );
};

export default BulkUploadPage;
