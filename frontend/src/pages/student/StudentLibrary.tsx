import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import {
  Library, BookOpen, Video, Search, Award,
  Eye, BookMarked, ClipboardList, Play, ChevronRight, Clock, Sparkles, FileText
} from 'lucide-react';
import { getAuthImageUrl } from '../../utils/imageUrl';
import BookCover from '../../components/BookCover';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';
import { formatDate } from '../../utils/dateUtils';

interface PackageItem {
  id: string;
  title: string;
  type: string;
  subject?: string;
  topic?: string;
  academicYear?: string | null;
  thumbnailUrl?: string;
  estimatedDuration?: number;
  description?: string;
  author?: string;
  tags: string[];
}

interface SavedResult {
  libraryId?: string;
  attemptId?: string;
  entryType: string;
  title: string;
  subject?: string;
  percentageScore?: number;
  score?: number;
  savedAt?: string;
}

const YEAR_LABELS: Record<string, string> = {
  YEAR_1: 'Year 1', FIRST_YEAR: 'Year 1',
  YEAR_2: 'Year 2', SECOND_YEAR: 'Year 2',
  YEAR_3_MINOR: 'Year 3 (Part 1)', THIRD_YEAR: 'Year 3', PART_1: 'Year 3 (Part 1)',
  YEAR_3_MAJOR: 'Year 3 (Part 2)', FOURTH_YEAR: 'Year 4', PART_2: 'Year 3 (Part 2)',
  FIFTH_YEAR: 'Year 5',
  INTERNSHIP: 'Internship',
};

type ActiveSection = 'ALL' | 'BOOKS' | 'VIDEOS' | 'MCQS' | 'RESULTS';

const StudentLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PackageItem[]>([]);
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [activeSection, setActiveSection] = useState<ActiveSection>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [currentStudentYear, setCurrentStudentYear] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const [pkgRes, resultsRes] = await Promise.allSettled([
        apiService.get('/student-portal/library/packages'),
        apiService.get('/student-portal/library-v2').catch(() => ({ data: { results: [] } })),
      ]);

      if (pkgRes.status === 'fulfilled') {
        const data = pkgRes.value.data;
        setItems(data.items || []);
        setCurrentStudentYear(data.currentYear || '');
        // Build unique years from actual data
        const yearsSet = new Set((data.items as PackageItem[])
          .map((i: PackageItem) => i.academicYear)
          .filter(Boolean));
        const years: string[] = [];
        yearsSet.forEach(y => { if (y) years.push(y); });
        setAvailableYears(years);
      }

      if (resultsRes.status === 'fulfilled') {
        const rData = (resultsRes.value as any).data;
        setSavedResults(rData?.results || []);
      }
    } catch (err) {
      console.error('Failed to fetch library:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const handleSave = async (item: PackageItem) => {
    try {
      setSavingId(item.id);
      await apiService.post('/student-portal/library/save', {
        itemId: item.id,
        type: item.type,
        title: item.title,
        subject: item.subject,
      });
      setSavedIds(prev => new Set(prev).add(item.id));
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSavingId(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'BOOK': case 'EBOOK': return 'var(--bo-accent)';
      case 'VIDEO': return '#ef4444';
      case 'DOCUMENT': case 'HANDBOOK': case 'PPT': return 'var(--bo-success)';
      case 'MCQ': return '#8b5cf6';
      default: return 'var(--bo-text-muted)';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'EBOOK': return 'E-Book';
      case 'HANDBOOK': return 'Handbook';
      default: return type;
    }
  };

  const isBookType = (type: string) => ['BOOK', 'EBOOK', 'HANDBOOK'].includes(type?.toUpperCase());
  const isVideoType = (type: string) => type?.toUpperCase() === 'VIDEO';
  const isMcqType = (type: string) => type?.toUpperCase() === 'MCQ';

  const filteredItems = items.filter(item => {
    if (activeSection === 'BOOKS' && !isBookType(item.type)) return false;
    if (activeSection === 'VIDEOS' && !isVideoType(item.type)) return false;
    if (activeSection === 'MCQS' && !isMcqType(item.type)) return false;
    if (yearFilter && item.academicYear !== yearFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!item.title.toLowerCase().includes(q) &&
          !(item.subject?.toLowerCase().includes(q)) &&
          !(item.topic?.toLowerCase().includes(q)) &&
          !(item.author?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const counts = {
    ALL: items.length,
    BOOKS: items.filter(i => isBookType(i.type)).length,
    VIDEOS: items.filter(i => isVideoType(i.type)).length,
    MCQS: items.filter(i => isMcqType(i.type)).length,
    RESULTS: savedResults.length,
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="page-loading-screen">
          <div className="loading-rings">
            <div className="loading-ring loading-ring-1"></div>
            <div className="loading-ring loading-ring-2"></div>
            <div className="loading-ring loading-ring-3"></div>
          </div>
          <div className="loading-title">Loading Library</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div
        style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>
              My Library
            </h1>
            <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
              {items.length} resources from college packages
              {currentStudentYear && (
                <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 600 }}>
                  {YEAR_LABELS[currentStudentYear] || currentStudentYear}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {([
            { key: 'ALL', label: 'All', icon: <Sparkles size={14} />, color: '#6366f1' },
            { key: 'BOOKS', label: 'Books', icon: <BookOpen size={14} />, color: '#3b82f6' },
            { key: 'VIDEOS', label: 'Videos', icon: <Video size={14} />, color: '#ef4444' },
            { key: 'MCQS', label: 'MCQs', icon: <ClipboardList size={14} />, color: '#8b5cf6' },
            { key: 'RESULTS', label: 'Results', icon: <Award size={14} />, color: '#16a34a' },
          ] as const).map(tab => {
            const active = activeSection === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: active ? `1.5px solid ${tab.color}` : '1.5px solid var(--bo-border)',
                  background: active ? `${tab.color}0d` : 'var(--bo-card-bg)',
                  color: active ? tab.color : 'var(--bo-text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {tab.icon} {tab.label}
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                  background: active ? `${tab.color}18` : 'var(--bo-border-light)',
                  color: active ? tab.color : 'var(--bo-text-muted)',
                }}>
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Year filter row */}
        {activeSection !== 'RESULTS' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
              <input
                type="text"
                placeholder="Search title, subject, author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bo-input"
                style={{ paddingLeft: 36, width: '100%', height: 38, fontSize: 13, borderRadius: 10 }}
              />
            </div>
            {availableYears.length > 0 && (
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bo-input"
                style={{ padding: '7px 10px', fontSize: 13, minWidth: 140, borderRadius: 10, height: 38 }}
              >
                <option value="">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{YEAR_LABELS[y] || y}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Results Section */}
        {activeSection === 'RESULTS' ? (
          <div>
            {savedResults.length === 0 ? (
              <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                <Award size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.35, marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--bo-text-muted)', marginBottom: 4 }}>No results yet</div>
                <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', opacity: 0.7 }}>Complete assignments and tests to see results here</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {savedResults.map((result) => (
                  <div key={result.libraryId || result.attemptId} className="bo-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{
                            padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                            background: result.entryType === 'ASSIGNMENT_RESULT' ? '#eff6ff' : '#f0fdf4',
                            color: result.entryType === 'ASSIGNMENT_RESULT' ? '#2563eb' : '#16a34a',
                          }}>
                            {result.entryType === 'ASSIGNMENT_RESULT' ? 'Assignment' : 'Test'}
                          </span>
                          {result.subject && (
                            <span style={{ fontSize: 12, color: '#6b7280' }}>{result.subject}</span>
                          )}
                        </div>
                        <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>
                          {result.title}
                        </h4>
                        <p style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
                          {result.savedAt ? formatDate(result.savedAt) : ''}
                        </p>
                      </div>
                      <div style={{
                        padding: '8px 14px', borderRadius: 10, textAlign: 'center', minWidth: 80,
                        background: (result.percentageScore || 0) >= 40 ? '#f0fdf4' : '#fef2f2',
                      }}>
                        <div style={{
                          fontSize: 20, fontWeight: 700,
                          color: (result.percentageScore || 0) >= 40 ? '#16a34a' : '#dc2626',
                        }}>
                          {result.percentageScore != null ? `${Math.round(result.percentageScore)}%` : '-'}
                        </div>
                        {result.score != null && (
                          <div style={{ fontSize: 11, color: '#6b7280' }}>Score: {result.score}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <Library size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.35, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--bo-text-muted)', marginBottom: 4 }}>
              {items.length === 0 ? 'No content available' : 'No items match your filters'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', opacity: 0.7 }}>
              {items.length === 0 ? 'Your college has no active package subscriptions yet' : 'Try adjusting your search or year filter'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {filteredItems.map(item => {
              const isSaving = savingId === item.id;
              const isSaved = savedIds.has(item.id);
              const isVideo = isVideoType(item.type);
              const isMCQ = isMcqType(item.type);
              const typeColor = getTypeColor(item.type);

              return (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bo-card-bg, #fff)',
                    border: '1px solid var(--bo-border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                  onClick={() => navigate(`/student/library/${item.id}/view`)}
                >
                  {/* Cover + info */}
                  <div style={{ display: 'flex', gap: 14, padding: '16px 16px 12px' }}>
                    {item.thumbnailUrl && getAuthImageUrl(item.thumbnailUrl) ? (
                      <div style={{ width: 52, height: 68, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#1a1a2e' }}>
                        <img src={getAuthImageUrl(item.thumbnailUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    ) : (
                      <BookCover title={item.title} type={item.type} subtitle={item.subject} width={52} height={68} />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontSize: 14, fontWeight: 600, color: 'var(--bo-text-primary)', margin: '0 0 6px',
                        lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                      }}>
                        {item.title}
                      </h3>
                      {item.subject && (
                        <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.subject}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                          background: `${typeColor}12`, color: typeColor,
                          textTransform: 'uppercase', letterSpacing: 0.3,
                        }}>
                          {getTypeLabel(item.type)}
                        </span>
                        {item.academicYear && (
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', fontWeight: 500 }}>
                            {YEAR_LABELS[item.academicYear] || item.academicYear}
                          </span>
                        )}
                        {item.estimatedDuration && (
                          <span style={{ fontSize: 11, color: 'var(--bo-text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={10} /> {item.estimatedDuration}m
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom bar */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 16px', borderTop: '1px solid var(--bo-border)',
                    background: 'var(--bo-bg, #fafbfc)',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--bo-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                      {item.author || item.topic || ''}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      {!isSaved && (
                        <button
                          onClick={() => handleSave(item)}
                          disabled={isSaving}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500,
                            padding: '5px 10px', borderRadius: 6,
                            border: '1px solid var(--bo-border)', background: 'var(--bo-card-bg, #fff)',
                            color: 'var(--bo-text-secondary)', cursor: isSaving ? 'wait' : 'pointer',
                          }}
                        >
                          <BookMarked size={12} />
                          {isSaving ? '...' : 'Save'}
                        </button>
                      )}
                      {isSaved && (
                        <span style={{ fontSize: 11, color: 'var(--bo-success)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <BookMarked size={11} /> Saved
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/student/library/${item.id}/view`); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
                          padding: '5px 12px', borderRadius: 6, border: 'none',
                          background: isVideo ? '#ef4444' : isMCQ ? '#8b5cf6' : 'var(--bo-accent)',
                          color: '#fff', cursor: 'pointer',
                        }}
                      >
                        {isVideo ? <Play size={12} /> : isMCQ ? <ClipboardList size={12} /> : <Eye size={12} />}
                        {isVideo ? 'Watch' : isMCQ ? 'Practice' : 'Read'}
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentLibrary;
