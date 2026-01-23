import React, { useState, useRef } from 'react';
import learningUnitService from '../../services/learning-unit.service';

interface BulkLearningUnitUploadProps {
  onSuccess?: () => void;
}

const BulkLearningUnitUpload: React.FC<BulkLearningUnitUploadProps> = ({ onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
    created: any[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const res = await learningUnitService.bulkUploadCsv(file);
      setResult(res);
      if (res.success > 0 && onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `type,title,description,subject,topic,subTopic,difficultyLevel,estimatedDuration,secureAccessUrl,deliveryType,watermarkEnabled,sessionExpiryMinutes,competencyCodes
BOOK,Cardiovascular Anatomy,Comprehensive guide to heart structure and function covering all major components,Anatomy,Cardiovascular System,,INTERMEDIATE,45,https://cdn.example.com/book1.pdf,REDIRECT,true,30,"AN1.1,AN1.2"
VIDEO,Heart Function Video,Educational video explaining how the heart pumps blood through the body,Physiology,Cardiac Function,,BEGINNER,30,https://cdn.example.com/video1.mp4,STREAM,true,60,PY2.1
NOTES,Quick Reference Notes,Summary notes for cardiovascular system review and exam preparation,Anatomy,Cardiovascular System,,INTERMEDIATE,15,https://cdn.example.com/notes1.pdf,EMBED,false,30,`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'learning-units-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      padding: '20px',
    },
    header: {
      marginBottom: '20px',
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#f8fafc',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#94a3b8',
    },
    uploadArea: {
      border: '2px dashed #475569',
      borderRadius: '12px',
      padding: '40px 20px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: '#0f172a',
      marginBottom: '20px',
    },
    uploadAreaActive: {
      borderColor: '#3b82f6',
      background: '#1e3a5f',
    },
    uploadIcon: {
      fontSize: '48px',
      marginBottom: '15px',
    },
    uploadText: {
      fontSize: '16px',
      color: '#e2e8f0',
      marginBottom: '8px',
    },
    uploadHint: {
      fontSize: '13px',
      color: '#64748b',
      marginBottom: '15px',
    },
    btnRow: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
    },
    btn: {
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      border: 'none',
    },
    btnPrimary: {
      background: '#3b82f6',
      color: 'white',
    },
    btnSecondary: {
      background: 'transparent',
      border: '1px solid #475569',
      color: '#94a3b8',
    },
    progress: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: '30px',
      color: '#94a3b8',
    },
    resultBox: {
      padding: '20px',
      borderRadius: '10px',
      marginTop: '20px',
    },
    resultSuccess: {
      background: '#14532d',
      border: '1px solid #166534',
    },
    resultError: {
      background: '#7f1d1d',
      border: '1px solid #991b1b',
    },
    resultMixed: {
      background: '#78350f',
      border: '1px solid #92400e',
    },
    resultTitle: {
      fontSize: '16px',
      fontWeight: 600,
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    resultStats: {
      display: 'flex',
      gap: '20px',
      marginBottom: '15px',
    },
    stat: {
      fontSize: '14px',
    },
    errorList: {
      maxHeight: '150px',
      overflowY: 'auto',
      fontSize: '13px',
      color: '#fca5a5',
      background: 'rgba(0,0,0,0.2)',
      padding: '10px',
      borderRadius: '6px',
      marginTop: '10px',
    },
    createdList: {
      maxHeight: '150px',
      overflowY: 'auto',
      fontSize: '13px',
      color: '#bbf7d0',
      marginTop: '10px',
    },
    templateInfo: {
      background: '#1e293b',
      borderRadius: '10px',
      padding: '15px',
      marginTop: '20px',
    },
    templateTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#f8fafc',
      marginBottom: '10px',
    },
    templateColumns: {
      fontSize: '12px',
      color: '#94a3b8',
      lineHeight: 1.6,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📤 Bulk Upload Learning Units</h3>
        <p style={styles.subtitle}>
          Upload a CSV file to create multiple learning units at once
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".csv"
        onChange={handleFileSelect}
      />

      {uploading ? (
        <div style={styles.progress}>
          <span style={{ fontSize: '24px' }}>⏳</span>
          <span>Processing CSV file...</span>
        </div>
      ) : (
        <div
          style={{
            ...styles.uploadArea,
            ...(dragActive ? styles.uploadAreaActive : {}),
          }}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={styles.uploadIcon}>📄</div>
          <div style={styles.uploadText}>
            Drag & drop your CSV file here
          </div>
          <div style={styles.uploadHint}>
            Supports: CSV files with learning unit data
          </div>
          <div style={styles.btnRow}>
            <button
              type="button"
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Browse Files
            </button>
            <button
              type="button"
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
            >
              📥 Download Template
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ ...styles.resultBox, ...styles.resultError }}>
          <div style={styles.resultTitle}>
            <span>❌</span> Upload Failed
          </div>
          <p style={{ color: '#fecaca', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {result && (
        <div
          style={{
            ...styles.resultBox,
            ...(result.failed === 0 ? styles.resultSuccess : result.success === 0 ? styles.resultError : styles.resultMixed),
          }}
        >
          <div style={styles.resultTitle}>
            <span>{result.failed === 0 ? '✅' : result.success === 0 ? '❌' : '⚠️'}</span>
            Upload Complete
          </div>
          <div style={styles.resultStats}>
            <span style={{ ...styles.stat, color: '#22c55e' }}>✓ {result.success} successful</span>
            <span style={{ ...styles.stat, color: '#ef4444' }}>✗ {result.failed} failed</span>
          </div>
          
          {result.created.length > 0 && (
            <div style={styles.createdList}>
              <strong>Created:</strong>
              {result.created.map((item, i) => (
                <div key={i}>• {item.title} ({item.type})</div>
              ))}
            </div>
          )}
          
          {result.errors.length > 0 && (
            <div style={styles.errorList}>
              <strong>Errors:</strong>
              {result.errors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={styles.templateInfo}>
        <div style={styles.templateTitle}>📋 CSV Template Columns</div>
        <div style={styles.templateColumns}>
          <strong>Required:</strong> type, title, description (min 20 chars), subject, topic, secureAccessUrl<br />
          <strong>Optional:</strong> subTopic, difficultyLevel (BEGINNER|INTERMEDIATE|ADVANCED), estimatedDuration, deliveryType (REDIRECT|EMBED|STREAM), watermarkEnabled (true|false), sessionExpiryMinutes, competencyIds (comma-separated)<br />
          <strong>Types:</strong> BOOK, VIDEO, MCQ, NOTES
        </div>
      </div>
    </div>
  );
};

export default BulkLearningUnitUpload;
