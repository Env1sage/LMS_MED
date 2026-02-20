import React, { useState, useRef, useEffect } from 'react';
import mcqService from '../../services/mcq.service';
import topicsService from '../../services/topics.service';
import { Topic } from '../../services/topics.service';
import TopicSearch from '../TopicSearch';
import CompetencySearch from '../common/CompetencySearch';
import FileUploadButton from './FileUploadButton';
import {
  Upload, X, Download, Plus, Trash2, FileText,
  AlertCircle, CheckCircle2, ChevronDown, Image as ImageIcon
} from 'lucide-react';

interface BulkUploadResult {
  success: number;
  failed: number;
  errors: string[];
}

interface McqRow {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctAnswer: string;
  subject: string;
  topic: string;
  mcqType: string;
  difficultyLevel: string;
  bloomsLevel: string;
  competencyCodes: string;
  tags: string;
  year: string;
  source: string;
  questionImage?: string; // Image URL for scenario/image-based MCQs
  expanded: boolean;
}

interface BulkMcqUploadProps {
  onSuccess?: () => void;
}

const BulkMcqUpload: React.FC<BulkMcqUploadProps> = ({ onSuccess }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear - i));

  const createEmptyRow = (): McqRow => ({
    id: crypto.randomUUID(),
    question: '', optionA: '', optionB: '', optionC: '', optionD: '', optionE: '',
    correctAnswer: 'A', subject: '', topic: '', mcqType: 'NORMAL',
    difficultyLevel: 'K', bloomsLevel: 'REMEMBER',
    competencyCodes: '', tags: '', year: String(currentYear), source: '', questionImage: '',
    expanded: true,
  });

  const [mode, setMode] = useState<'form' | 'csv'>('form');
  const [rows, setRows] = useState<McqRow[]>([createEmptyRow()]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-row competency tracking (keyed by row.id)
  const [rowCompetencies, setRowCompetencies] = useState<Record<string, Array<{
    id: string; code: string; title: string; description: string;
    subject: string; domain?: string; academicLevel?: string;
  }>>>({}); 
  const [rowSelectedCompIds, setRowSelectedCompIds] = useState<Record<string, string[]>>({});
  const [rowTopicIds, setRowTopicIds] = useState<Record<string, string | undefined>>({});
  const [rowTopicSubjects, setRowTopicSubjects] = useState<Record<string, string>>({});

  const diffLevels = [
    { value: 'K', label: 'K — Knows' },
    { value: 'KH', label: 'KH — Knows How' },
    { value: 'S', label: 'S — Shows' },
    { value: 'SH', label: 'SH — Shows How' },
    { value: 'P', label: 'P — Performs' },
  ];

  const bloomsLevels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
  const mcqTypes = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'SCENARIO_BASED', label: 'Scenario Based' },
    { value: 'IMAGE_BASED', label: 'Image Based' },
  ];
  const answers = ['A', 'B', 'C', 'D', 'E'];

  const sourceOptions = [
    'NEET PG', 'NEET UG', 'AIIMS', 'JIPMER', 'INI-CET', 'FMGE',
    'USMLE Step 1', 'USMLE Step 2', 'USMLE Step 3', 'PLAB',
    'NBE', 'DNB', 'State PG', 'University Exam', 'Self-authored',
    'Textbook', 'Journal', 'Other',
  ];

  const tagOptions = [
    'Cardiology', 'Neurology', 'Gastroenterology', 'Pulmonology', 'Nephrology',
    'Endocrinology', 'Hematology', 'Oncology', 'Rheumatology', 'Dermatology',
    'Orthopedics', 'Ophthalmology', 'ENT', 'Psychiatry', 'Pediatrics',
    'Obstetrics', 'Gynecology', 'Surgery', 'Radiology', 'Anesthesia',
    'Emergency Medicine', 'Forensic Medicine', 'Community Medicine',
    'Pharmacology', 'Pathology', 'Microbiology', 'Biochemistry',
    'Anatomy', 'Physiology', 'High Yield', 'Clinical', 'Basic Science',
    'NEET', 'USMLE', 'AIIMS', 'Must Know', 'Frequently Asked',
  ];

  const competencyCodeOptions = [
    // Anatomy
    'AN1.1', 'AN1.2', 'AN2.1', 'AN2.2', 'AN3.1', 'AN3.2', 'AN4.1', 'AN4.2', 'AN5.1',
    // Physiology
    'PY1.1', 'PY1.2', 'PY2.1', 'PY2.2', 'PY3.1', 'PY3.2', 'PY4.1', 'PY5.1',
    // Biochemistry
    'BC1.1', 'BC1.2', 'BC2.1', 'BC2.2', 'BC3.1', 'BC3.2', 'BC4.1', 'BC5.1',
    // Pathology
    'PA1.1', 'PA1.2', 'PA2.1', 'PA2.2', 'PA3.1', 'PA3.2', 'PA4.1', 'PA5.1',
    // Pharmacology
    'PH1.1', 'PH1.2', 'PH2.1', 'PH2.2', 'PH3.1', 'PH3.2', 'PH4.1', 'PH5.1',
    // Microbiology
    'MI1.1', 'MI1.2', 'MI2.1', 'MI2.2', 'MI3.1', 'MI3.2', 'MI4.1', 'MI5.1',
    // Forensic Medicine
    'FM1.1', 'FM1.2', 'FM2.1', 'FM2.2', 'FM3.1', 'FM3.2', 'FM4.1', 'FM5.1',
    // Internal Medicine
    'IM1.1', 'IM1.2', 'IM2.1', 'IM2.2', 'IM3.1', 'IM3.2', 'IM4.1', 'IM5.1',
    // Surgery
    'SU1.1', 'SU1.2', 'SU2.1', 'SU2.2', 'SU3.1', 'SU3.2', 'SU4.1', 'SU5.1',
    // Obstetrics & Gynecology
    'OG1.1', 'OG1.2', 'OG2.1', 'OG2.2', 'OG3.1', 'OG3.2', 'OG4.1', 'OG5.1',
    // Pediatrics
    'PE1.1', 'PE1.2', 'PE2.1', 'PE2.2', 'PE3.1', 'PE3.2', 'PE4.1', 'PE5.1',
    // Ophthalmology
    'OP1.1', 'OP1.2', 'OP2.1', 'OP2.2', 'OP3.1', 'OP3.2', 'OP4.1', 'OP5.1',
    // ENT
    'EN1.1', 'EN1.2', 'EN2.1', 'EN2.2', 'EN3.1', 'EN3.2', 'EN4.1', 'EN5.1',
    // Orthopedics
    'OR1.1', 'OR1.2', 'OR2.1', 'OR2.2', 'OR3.1', 'OR3.2', 'OR4.1', 'OR5.1',
    // Psychiatry
    'PS1.1', 'PS1.2', 'PS2.1', 'PS2.2', 'PS3.1', 'PS3.2', 'PS4.1', 'PS5.1',
    // Community Medicine
    'CM1.1', 'CM1.2', 'CM2.1', 'CM2.2', 'CM3.1', 'CM3.2', 'CM4.1', 'CM5.1',
    // Dermatology
    'DR1.1', 'DR1.2', 'DR2.1', 'DR2.2', 'DR3.1', 'DR3.2', 'DR4.1', 'DR5.1',
    // Radiology
    'RD1.1', 'RD1.2', 'RD2.1', 'RD2.2', 'RD3.1',
    // Anesthesia
    'AS1.1', 'AS1.2', 'AS2.1', 'AS2.2', 'AS3.1',
  ];

  useEffect(() => {
    topicsService.getSubjects().then(setSubjects).catch(() => {});
  }, []);

  const addRow = () => setRows(prev => [...prev, createEmptyRow()]);
  const removeRow = (id: string) => { if (rows.length > 1) setRows(prev => prev.filter(r => r.id !== id)); };
  const toggleExpand = (id: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, expanded: !r.expanded } : r));
  const updateRow = (id: string, field: keyof McqRow, value: string | boolean) => setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && (f.type === 'text/csv' || f.name.endsWith('.csv'))) {
      setFile(f); setError(''); setResult(null);
    } else { setError('Please select a CSV file'); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const f = e.dataTransfer.files[0];
      if (f.name.endsWith('.csv')) { setFile(f); setError(''); setResult(null); }
      else setError('Please drop a CSV file');
    }
  };

  const handleCsvUpload = async () => {
    if (!file) { setError('Please select a file first'); return; }
    setUploading(true); setError(''); setResult(null);
    try {
      const data = await mcqService.bulkUpload(file);
      setResult(data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (data.success > 0 && onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to upload CSV');
    } finally { setUploading(false); }
  };

  const handleFormUpload = async () => {
    setError(''); setResult(null);
    const invalid = rows.filter(r => !r.question || !r.optionA || !r.optionB || !r.subject);
    if (invalid.length > 0) {
      setError(`${invalid.length} MCQ(s) missing required fields (question, options A & B, subject)`);
      return;
    }
    const headers = 'question,optionA,optionB,optionC,optionD,optionE,correctAnswer,subject,topic,mcqType,difficultyLevel,bloomsLevel,competencyCodes,tags,year,source,questionImageUrl';
    const csvRows = rows.map(r => {
      const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return [r.question, r.optionA, r.optionB, r.optionC, r.optionD, r.optionE,
        r.correctAnswer, r.subject, r.topic, r.mcqType, r.difficultyLevel,
        r.bloomsLevel, r.competencyCodes, r.tags, r.year, r.source, r.questionImage || ''].map(escape).join(',');
    });
    const csvContent = [headers, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const csvFile = new File([blob], 'bulk_mcqs.csv', { type: 'text/csv' });

    setUploading(true);
    try {
      const data = await mcqService.bulkUpload(csvFile);
      setResult(data);
      if (data.success > 0 && onSuccess) onSuccess();
      if (data.failed === 0) setRows([createEmptyRow()]);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to upload');
    } finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const csvContent = `question,optionA,optionB,optionC,optionD,optionE,correctAnswer,subject,topic,mcqType,difficultyLevel,bloomsLevel,competencyCodes,tags,year,source,questionImageUrl
"What is the normal heart rate?","60-100 bpm","40-60 bpm","100-120 bpm","120-140 bpm","","A","Physiology","Cardiovascular System","NORMAL","K","REMEMBER","PY2.1,PY2.2","cardiology,vitals","2024","NEET PG",""
"A 45-year-old patient presents with chest pain. ECG shows ST elevation.","Myocardial Infarction","Angina","Pericarditis","Aortic Dissection","","A","Medicine","Cardiovascular System","SCENARIO_BASED","KH","APPLY","IM3.1,IM3.2","cardiology","2024","AIIMS","https://example.com/ecg-image.jpg"`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mcq_template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--bo-border)',
    fontSize: 13, background: 'var(--bo-card-bg)', color: 'var(--bo-text)',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer',
    appearance: 'none' as const, WebkitAppearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '14px',
    paddingRight: 32,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--bo-text-muted)',
    display: 'block', marginBottom: 6, letterSpacing: '0.03em', textTransform: 'uppercase' as const,
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text)', marginBottom: 4 }}>Bulk MCQ Upload</h3>
          <p style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>Add multiple MCQs using the interactive form or CSV upload</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--bo-border)', width: 'fit-content' }}>
        {([
          { id: 'form' as const, label: 'Interactive Form', icon: <FileText size={14} /> },
          { id: 'csv' as const, label: 'CSV Upload', icon: <Upload size={14} /> },
        ]).map(tab => (
          <button key={tab.id} onClick={() => { setMode(tab.id); setResult(null); setError(''); }}
            style={{
              padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
              background: mode === tab.id ? 'var(--bo-primary)' : 'transparent',
              color: mode === tab.id ? '#fff' : 'var(--bo-text-muted)',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* === INTERACTIVE FORM MODE === */}
      {mode === 'form' && !uploading && (
        <>
          {rows.map((row, idx) => (
            <div key={row.id} className="bo-card" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
              {/* Row Header */}
              <div onClick={() => toggleExpand(row.id)} style={{
                padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: row.expanded ? 'var(--bo-bg)' : 'transparent',
                borderBottom: row.expanded ? '1px solid var(--bo-border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bo-primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--bo-text)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.question || 'New MCQ'}
                  </span>
                  {row.question && row.optionA && row.optionB && row.subject && (
                    <CheckCircle2 size={14} style={{ color: '#10B981' }} />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {row.subject && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bo-primary)', color: '#fff' }}>{row.subject}</span>}
                  {rows.length > 1 && (
                    <button type="button" onClick={e => { e.stopPropagation(); removeRow(row.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bo-danger, #EF4444)', padding: 2 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                  <ChevronDown size={16} style={{ color: 'var(--bo-text-muted)', transform: row.expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </div>
              </div>

              {/* Row Body */}
              {row.expanded && (
                <div style={{ padding: 16 }}>
                  {/* Question */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Question *</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.5 }}
                      value={row.question}
                      onChange={e => updateRow(row.id, 'question', e.target.value)}
                      placeholder="Enter the MCQ question..."
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {/* Image Upload Section - Only for Scenario-Based & Image-Based MCQs */}
                  {(row.mcqType === 'SCENARIO_BASED' || row.mcqType === 'IMAGE_BASED') && (
                    <div className="bo-card" style={{
                      padding: 16, marginBottom: 14,
                      background: 'linear-gradient(135deg, #667eea11, #764ba211)',
                      border: '2px dashed var(--bo-primary-light, #9F7AEA)',
                      borderRadius: 12,
                      transition: 'all 0.3s ease',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <ImageIcon size={18} style={{ color: 'var(--bo-primary)' }} />
                        <label style={{
                          ...labelStyle,
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--bo-text)',
                          textTransform: 'none',
                        }}>
                          📸 Image Upload (Optional) — For Scenario-Based & Image-Based MCQs
                        </label>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--bo-text-muted)', marginBottom: 10 }}>
                        Upload an image if this MCQ requires visual context (ECG, X-ray, clinical photo, diagram, etc.)
                      </p>
                      {row.questionImage ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img src={row.questionImage} alt="Question" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--bo-border)' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'var(--bo-text)', fontWeight: 600, marginBottom: 4 }}>✅ Image Uploaded</div>
                            <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', wordBreak: 'break-all' }}>{row.questionImage}</div>
                          </div>
                          <button type="button"
                            onClick={() => updateRow(row.id, 'questionImage', '')}
                            style={{
                              padding: '6px 12px', borderRadius: 6, border: '1px solid var(--bo-danger)',
                              background: 'transparent', color: 'var(--bo-danger)', cursor: 'pointer',
                              fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                            <X size={12} /> Remove
                          </button>
                        </div>
                      ) : (
                        <FileUploadButton
                          fileType="image"
                          label="Upload Image"
                          onUploadComplete={(url) => updateRow(row.id, 'questionImage', url)}
                        />
                      )}
                      <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                        💡 Supported formats: JPG, PNG, GIF, WebP • Max size: 5MB
                      </div>
                    </div>
                  )}

                  {/* Options Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {(['A', 'B', 'C', 'D', 'E'] as const).map(letter => {
                      const field = `option${letter}` as keyof McqRow;
                      const isRequired = letter === 'A' || letter === 'B';
                      return (
                        <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" onClick={() => updateRow(row.id, 'correctAnswer', letter)}
                            style={{
                              width: 28, height: 28, borderRadius: '50%', border: `2px solid ${row.correctAnswer === letter ? '#10B981' : 'var(--bo-border)'}`,
                              background: row.correctAnswer === letter ? '#10B981' : 'transparent',
                              color: row.correctAnswer === letter ? '#fff' : 'var(--bo-text)',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                            {letter}
                          </button>
                          <input style={{ ...inputStyle, flex: 1 }} value={row[field] as string}
                            onChange={e => updateRow(row.id, field, e.target.value)}
                            placeholder={`Option ${letter}${isRequired ? ' *' : ' (optional)'}`} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Topic Search & Competency Mapping */}
                  <div className="bo-card" style={{ padding: 14, marginBottom: 12, background: 'var(--bo-bg)', border: '1px solid var(--bo-border)', borderRadius: 10 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--bo-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Topic & Competency Mapping
                    </h4>
                    <TopicSearch
                      selectedTopicId={rowTopicIds[row.id]}
                      selectedSubject={rowTopicSubjects[row.id] || ''}
                      onTopicSelect={(topic: Topic | null) => {
                        if (topic) {
                          setRowTopicIds(prev => ({ ...prev, [row.id]: topic.id }));
                          updateRow(row.id, 'topic', topic.name);
                          updateRow(row.id, 'subject', topic.subject);
                          setRowTopicSubjects(prev => ({ ...prev, [row.id]: topic.subject }));
                        } else {
                          setRowTopicIds(prev => ({ ...prev, [row.id]: undefined }));
                          updateRow(row.id, 'topic', '');
                        }
                      }}
                      onSubjectSelect={(s: string) => {
                        setRowTopicSubjects(prev => ({ ...prev, [row.id]: s }));
                        if (s) updateRow(row.id, 'subject', s);
                      }}
                      onCompetenciesLoad={(comps) => {
                        setRowCompetencies(prev => ({ ...prev, [row.id]: comps }));
                        const allIds = comps.map(c => c.id);
                        setRowSelectedCompIds(prev => ({ ...prev, [row.id]: allIds }));
                        // Auto-fill competency codes from loaded competencies
                        const codes = comps.map(c => c.code).join(', ');
                        updateRow(row.id, 'competencyCodes', codes);
                      }}
                      placeholder="Search topics to auto-fill subject & competencies..."
                    />
                    {(rowCompetencies[row.id] || []).length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <CompetencySearch
                          competencies={rowCompetencies[row.id] || []}
                          selectedIds={rowSelectedCompIds[row.id] || []}
                          onChange={(ids) => {
                            setRowSelectedCompIds(prev => ({ ...prev, [row.id]: ids }));
                            // Sync selected competency codes back to the row
                            const selectedComps = (rowCompetencies[row.id] || []).filter(c => ids.includes(c.id));
                            const codes = selectedComps.map(c => c.code).join(', ');
                            updateRow(row.id, 'competencyCodes', codes);
                          }}
                          label="Mapped Competencies (auto-loaded from topic)"
                          maxHeight="250px"
                        />
                      </div>
                    )}
                  </div>

                  {/* Dropdowns Row 1: Subject, Year */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Subject *</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          style={{ ...selectStyle, borderColor: !row.subject ? '#F59E0B40' : 'var(--bo-border)' }}
                          value={row.subject}
                          onChange={e => updateRow(row.id, 'subject', e.target.value)}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = !row.subject ? '#F59E0B40' : 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <option value="">Select Subject</option>
                          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Year</label>
                      <select
                        style={selectStyle}
                        value={row.year}
                        onChange={e => updateRow(row.id, 'year', e.target.value)}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <option value="">—</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Dropdowns Row 2: MCQ Type, Difficulty, Bloom's */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>MCQ Type</label>
                      <select
                        style={selectStyle}
                        value={row.mcqType}
                        onChange={e => updateRow(row.id, 'mcqType', e.target.value)}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {mcqTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Difficulty (Miller's)</label>
                      <select
                        style={selectStyle}
                        value={row.difficultyLevel}
                        onChange={e => updateRow(row.id, 'difficultyLevel', e.target.value)}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {diffLevels.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Bloom's Level</label>
                      <select
                        style={selectStyle}
                        value={row.bloomsLevel}
                        onChange={e => updateRow(row.id, 'bloomsLevel', e.target.value)}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {bloomsLevels.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Competency Codes, Tags, Source */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {/* Competency Codes — Multi-select chips */}
                    <div>
                      <label style={labelStyle}>Competency Codes</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          style={selectStyle}
                          value=""
                          onChange={e => {
                            const code = e.target.value;
                            if (!code) return;
                            const existing = row.competencyCodes ? row.competencyCodes.split(',').map(c => c.trim()).filter(Boolean) : [];
                            if (!existing.includes(code)) {
                              updateRow(row.id, 'competencyCodes', [...existing, code].join(', '));
                            }
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <option value="">{row.competencyCodes ? 'Add more codes...' : 'Select Competency Codes'}</option>
                          {competencyCodeOptions
                            .filter(c => !(row.competencyCodes || '').split(',').map(x => x.trim().toUpperCase()).includes(c.toUpperCase()))
                            .map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      {row.competencyCodes && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {row.competencyCodes.split(',').map(c => c.trim()).filter(Boolean).map(code => (
                            <span key={code} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                              borderRadius: 12, fontSize: 11, fontWeight: 500,
                              background: '#10B981', color: '#fff',
                            }}>
                              {code}
                              <button type="button" onClick={() => {
                                const updated = row.competencyCodes.split(',').map(c => c.trim()).filter(c => c !== code).join(', ');
                                updateRow(row.id, 'competencyCodes', updated);
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', lineHeight: 1 }}>
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tags — Multi-select chips */}
                    <div>
                      <label style={labelStyle}>Tags</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          style={selectStyle}
                          value=""
                          onChange={e => {
                            const tag = e.target.value;
                            if (!tag) return;
                            const existing = row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                            if (!existing.includes(tag)) {
                              updateRow(row.id, 'tags', [...existing, tag].join(', '));
                            }
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <option value="">{row.tags ? 'Add more tags...' : 'Select Tags'}</option>
                          {tagOptions
                            .filter(t => !(row.tags || '').split(',').map(x => x.trim().toLowerCase()).includes(t.toLowerCase()))
                            .map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      {row.tags && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {row.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                            <span key={tag} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                              borderRadius: 12, fontSize: 11, fontWeight: 500,
                              background: 'var(--bo-primary)', color: '#fff',
                            }}>
                              {tag}
                              <button type="button" onClick={() => {
                                const updated = row.tags.split(',').map(t => t.trim()).filter(t => t !== tag).join(', ');
                                updateRow(row.id, 'tags', updated);
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', lineHeight: 1 }}>
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Source — Dropdown */}
                    <div>
                      <label style={labelStyle}>Source</label>
                      <select
                        style={selectStyle}
                        value={row.source}
                        onChange={e => updateRow(row.id, 'source', e.target.value)}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--bo-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--bo-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <option value="">Select Source</option>
                        {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <button type="button" onClick={addRow} className="bo-btn bo-btn-outline" style={{ fontSize: 13 }}>
              <Plus size={14} /> Add Another MCQ
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{rows.length} MCQ{rows.length > 1 ? 's' : ''}</span>
              <button type="button" onClick={handleFormUpload} className="bo-btn bo-btn-primary" disabled={uploading} style={{ padding: '10px 24px' }}>
                Upload {rows.length} MCQ{rows.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </>
      )}

      {/* === CSV MODE === */}
      {mode === 'csv' && !uploading && (
        <>
          {/* Template Info */}
          <div className="bo-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} /> CSV Format
            </div>
            <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', display: 'grid', gap: 4 }}>
              <div><strong>Required:</strong> question, optionA, optionB, correctAnswer, subject</div>
              <div><strong>Optional:</strong> optionC–E, topic, mcqType, difficultyLevel, bloomsLevel, competencyCodes, tags, year, source</div>
              <div><strong>mcqType:</strong> NORMAL | SCENARIO_BASED | IMAGE_BASED</div>
              <div><strong>difficultyLevel:</strong> K | KH | S | SH | P</div>
            </div>
            <button onClick={downloadTemplate} className="bo-btn bo-btn-outline" style={{ marginTop: 10, fontSize: 12 }}>
              <Download size={14} /> Download Template
            </button>
          </div>

          {/* Drop Zone */}
          {!file && (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? 'var(--bo-primary)' : 'var(--bo-border)'}`,
                borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'var(--bo-bg)',
                transition: 'all 0.2s', marginBottom: 16,
              }}>
              <Upload size={32} style={{ color: 'var(--bo-text-muted)', marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: 'var(--bo-text)', marginBottom: 4 }}>Drag & Drop CSV file here</div>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>or click to browse</div>
              <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
          )}

          {/* File Selected */}
          {file && (
            <div className="bo-card" style={{ padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={18} style={{ color: 'var(--bo-primary)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="bo-btn bo-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>
                    <X size={14} /> Remove
                  </button>
                  <button onClick={handleCsvUpload} className="bo-btn bo-btn-primary" style={{ padding: '6px 16px', fontSize: 12 }}>
                    <Upload size={14} /> Upload
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Uploading */}
      {uploading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
          <div className="bo-spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14 }}>Uploading and processing MCQs...</div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bo-card" style={{ padding: 20, marginTop: 16, borderLeft: `4px solid ${result.failed === 0 ? '#10B981' : result.success === 0 ? '#EF4444' : '#F59E0B'}` }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            {result.failed === 0 ? <CheckCircle2 size={18} style={{ color: '#10B981' }} /> : <AlertCircle size={18} style={{ color: '#F59E0B' }} />}
            Upload {result.failed === 0 ? 'Successful' : 'Complete'}
          </h4>
          <div style={{ display: 'flex', gap: 24, marginBottom: result.errors.length > 0 ? 12 : 0 }}>
            <div>
              <span style={{ color: '#10B981', fontWeight: 700, fontSize: 24 }}>{result.success}</span>
              <span style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginLeft: 6 }}>successful</span>
            </div>
            {result.failed > 0 && (
              <div>
                <span style={{ color: '#EF4444', fontWeight: 700, fontSize: 24 }}>{result.failed}</span>
                <span style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginLeft: 6 }}>failed</span>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div style={{ fontSize: 12, color: '#EF4444', maxHeight: 150, overflowY: 'auto', background: 'var(--bo-bg)', padding: 10, borderRadius: 6 }}>
              {result.errors.slice(0, 15).map((err, i) => <div key={i} style={{ marginBottom: 4 }}>• {err}</div>)}
              {result.errors.length > 15 && <div style={{ color: 'var(--bo-text-muted)', marginTop: 4 }}>...and {result.errors.length - 15} more</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkMcqUpload;
