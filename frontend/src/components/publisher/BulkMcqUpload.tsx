import React, { useState, useRef } from 'react';
import mcqService from '../../services/mcq.service';

interface BulkUploadResult {
  success: number;
  failed: number;
  errors: string[];
}

interface BulkMcqUploadProps {
  onSuccess?: () => void;
}

const BulkMcqUpload: React.FC<BulkMcqUploadProps> = ({ onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }
    setFile(selectedFile);
    setError('');
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const data = await mcqService.bulkUpload(file);
      setResult(data);
      setFile(null);
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (data.success > 0 && onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `question,optionA,optionB,optionC,optionD,optionE,correctAnswer,subject,topic,mcqType,difficultyLevel,bloomsLevel,competencyCodes,tags,year,source
"What is the normal heart rate?","60-100 bpm","40-60 bpm","100-120 bpm","120-140 bpm","","A","Physiology","Cardiovascular System","NORMAL","K","REMEMBER","PY2.1,PY2.2","cardiology,vitals","2024","NEET PG"
"A 45-year-old patient presents with chest pain. ECG shows ST elevation. What is the diagnosis?","Myocardial Infarction","Angina","Pericarditis","Aortic Dissection","","A","Medicine","Cardiovascular System","SCENARIO_BASED","KH","APPLY","IM3.1,IM3.2","cardiology,emergency","2024","AIIMS"
"Identify the structure marked in the image","Liver","Spleen","Kidney","Pancreas","","B","Anatomy","Abdominal Organs","IMAGE_BASED","S","REMEMBER","AN45.1","radiology,anatomy","2024","NEET PG"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcq_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
    templateInfo: {
      background: '#1e293b',
      borderRadius: '10px',
      padding: '15px',
      marginBottom: '20px',
    },
    templateTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#f8fafc',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    templateList: {
      fontSize: '13px',
      color: '#94a3b8',
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    templateItem: {
      marginBottom: '6px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
    },
    downloadBtn: {
      marginTop: '12px',
      padding: '8px 16px',
      background: 'transparent',
      border: '1px solid #3b82f6',
      borderRadius: '6px',
      color: '#3b82f6',
      fontSize: '13px',
      cursor: 'pointer',
    },
    fileInfo: {
      background: '#1e293b',
      borderRadius: '8px',
      padding: '12px 15px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fileName: {
      color: '#e2e8f0',
      fontSize: '14px',
    },
    fileSize: {
      color: '#64748b',
      fontSize: '12px',
    },
    removeBtn: {
      background: 'transparent',
      border: 'none',
      color: '#ef4444',
      cursor: 'pointer',
      fontSize: '18px',
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
      background: '#1e293b',
      border: '1px solid #334155',
    },
    resultTitle: {
      fontSize: '16px',
      fontWeight: 600,
      marginBottom: '15px',
      color: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    resultStats: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
      marginBottom: '15px',
    },
    statCard: {
      padding: '15px',
      borderRadius: '8px',
      textAlign: 'center',
    },
    statSuccess: {
      background: 'rgba(34, 197, 94, 0.1)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
    },
    statError: {
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
    statValue: {
      fontSize: '28px',
      fontWeight: 700,
    },
    statLabel: {
      fontSize: '12px',
      marginTop: '4px',
    },
    errorList: {
      maxHeight: '150px',
      overflowY: 'auto',
      fontSize: '13px',
      color: '#fca5a5',
      background: 'rgba(0,0,0,0.2)',
      padding: '12px',
      borderRadius: '6px',
      marginTop: '15px',
    },
    errorItem: {
      marginBottom: '6px',
      display: 'flex',
      gap: '6px',
    },
    alert: {
      padding: '12px 15px',
      borderRadius: '8px',
      marginBottom: '20px',
      background: '#7f1d1d',
      border: '1px solid #991b1b',
      color: '#fecaca',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    progress: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: '30px',
      color: '#94a3b8',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📤 Bulk MCQ Upload</h3>
        <p style={styles.subtitle}>Upload multiple MCQs at once using a CSV file</p>
      </div>

      {/* CSV Format Instructions */}
      <div style={styles.templateInfo}>
        <div style={styles.templateTitle}>
          📋 CSV Format Requirements
        </div>
        <ul style={styles.templateList}>
          <li style={styles.templateItem}>
            <span>•</span>
            <span><strong>Required:</strong> question, optionA, optionB, optionC, optionD, correctAnswer, subject, topic</span>
          </li>
          <li style={styles.templateItem}>
            <span>•</span>
            <span><strong>Optional:</strong> optionE, mcqType, difficultyLevel, bloomsLevel, competencyCodes, tags, year, source</span>
          </li>
          <li style={styles.templateItem}>
            <span>•</span>
            <span><strong>correctAnswer:</strong> Must be A, B, C, D, or E</span>
          </li>
          <li style={styles.templateItem}>
            <span>•</span>
            <span><strong>mcqType:</strong> NORMAL, SCENARIO_BASED, IMAGE_BASED</span>
          </li>
          <li style={styles.templateItem}>
            <span>•</span>
            <span><strong>difficultyLevel (Miller's Pyramid):</strong> K (Knows), KH (Knows How), S (Shows), SH (Shows How), P (Performs)</span>
          </li>
          <li style={styles.templateItem}>
            <span>•</span>
            <span><strong>competencyCodes:</strong> Comma-separated competency codes (e.g., "PY2.1,PY2.2")</span>
          </li>
        </ul>
        <button style={styles.downloadBtn} onClick={downloadTemplate}>
          ⬇️ Download CSV Template
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.alert}>
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {/* Upload Area */}
      {!file && !uploading && (
        <div
          style={{
            ...styles.uploadArea,
            ...(dragActive ? styles.uploadAreaActive : {}),
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={styles.uploadIcon}>📁</div>
          <p style={styles.uploadText}>Drag & Drop your CSV file here</p>
          <p style={styles.uploadHint}>or click to browse</p>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* File Selected */}
      {file && !uploading && (
        <>
          <div style={styles.fileInfo}>
            <div>
              <div style={styles.fileName}>📄 {file.name}</div>
              <div style={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</div>
            </div>
            <button
              style={styles.removeBtn}
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              ✕
            </button>
          </div>
          <div style={styles.btnRow}>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={handleUpload}
            >
              📤 Upload MCQs
            </button>
            <button
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Uploading State */}
      {uploading && (
        <div style={styles.progress}>
          <span>⏳</span>
          <span>Uploading and processing MCQs...</span>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div
          style={{
            ...styles.resultBox,
            ...(result.failed === 0 ? styles.resultSuccess : result.success === 0 ? styles.resultError : styles.resultMixed),
          }}
        >
          <div style={styles.resultTitle}>
            {result.failed === 0 ? '✅' : result.success === 0 ? '❌' : '⚠️'}
            Upload Complete
          </div>
          <div style={styles.resultStats}>
            <div style={{ ...styles.statCard, ...styles.statSuccess }}>
              <div style={{ ...styles.statValue, color: '#22c55e' }}>{result.success}</div>
              <div style={{ ...styles.statLabel, color: '#86efac' }}>Successful</div>
            </div>
            <div style={{ ...styles.statCard, ...styles.statError }}>
              <div style={{ ...styles.statValue, color: '#ef4444' }}>{result.failed}</div>
              <div style={{ ...styles.statLabel, color: '#fca5a5' }}>Failed</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div style={styles.errorList}>
              <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '8px' }}>
                Errors:
              </strong>
              {result.errors.slice(0, 10).map((err, idx) => (
                <div key={idx} style={styles.errorItem}>
                  <span>•</span>
                  <span>{err}</span>
                </div>
              ))}
              {result.errors.length > 10 && (
                <div style={{ marginTop: '8px', color: '#94a3b8' }}>
                  ... and {result.errors.length - 10} more errors
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkMcqUpload;
