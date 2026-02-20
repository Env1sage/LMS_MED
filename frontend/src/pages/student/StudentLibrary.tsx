import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import { 
  Library, BookOpen, FileText, Video, File, Search, 
  FolderPlus, Folder, X, Eye, Trash2, Filter, SortAsc, BookMarked, ClipboardList
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface LibraryItem {
  id: string;
  title: string;
  type: 'BOOK' | 'VIDEO' | 'DOCUMENT' | 'REFERENCE' | 'EBOOK' | 'COURSE' | 'MCQ';
  courseName?: string;
  author?: string;
  uploadedBy?: string;
  uploadedAt: string;
  fileUrl?: string;
  year?: number;
  folderId?: string;
  description?: string;
  fileSize?: string;
  duration?: string;
  pages?: number;
  subject?: string;
  saved?: boolean;
  questionCount?: number;
  isFacultyCreated?: boolean;
  isFromCompletedCourse?: boolean;
}

interface CustomFolder {
  id: string;
  name: string;
  color: string;
  itemCount: number;
}

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'type';

const StudentLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [activeSection, setActiveSection] = useState<'ALL' | 'BOOKS' | 'VIDEOS' | 'MCQS'>('ALL');
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'year1' | 'year2' | 'year3' | 'year4' | 'custom' | string>('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#6366F1');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterType, setFilterType] = useState<string>('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchAllContent = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch library and tests data
      const [libraryRes, testsRes] = await Promise.all([
        apiService.get('/student-portal/library'),
        apiService.get('/student-portal/tests').catch(() => ({ data: [] })),
      ]);

      // Library API returns: { totalItems, ebooks: [...], videos: [...], interactives: [...], documents: [...], facultyContent: [...], completedCourseContent: [...] }
      const rawEbooks = libraryRes.data?.ebooks || [];
      const rawVideos = libraryRes.data?.videos || [];
      const rawInteractives = libraryRes.data?.interactives || [];
      const rawDocuments = libraryRes.data?.documents || [];

      // Map ebooks - WITHOUT publisher name
      const ebooks = rawEbooks.map((book: any) => ({
        id: book.id,
        title: book.title,
        type: 'EBOOK' as const,
        description: book.description,
        subject: book.subject || book.topic,
        courseName: book.courseTitle,
        author: book.assignedBy || 'Course Content', // Show teacher name or generic
        uploadedBy: book.assignedBy ? `Assigned by ${book.assignedBy}` : book.isFromCompletedCourse ? 'From Completed Course' : 'Course Content',
        uploadedAt: book.createdAt || new Date().toISOString(),
        duration: book.duration ? `${book.duration} min` : undefined,
        thumbnail: book.thumbnail,
        saved: false,
        isFacultyCreated: book.isFacultyCreated,
        isFromCompletedCourse: book.isFromCompletedCourse,
      }));

      // Map videos - WITHOUT publisher name
      const videos = rawVideos.map((video: any) => ({
        id: video.id,
        title: video.title,
        type: 'VIDEO' as const,
        description: video.description,
        subject: video.subject || video.topic,
        courseName: video.courseTitle,
        author: video.assignedBy || 'Course Content',
        uploadedBy: video.assignedBy ? `Assigned by ${video.assignedBy}` : video.isFromCompletedCourse ? 'From Completed Course' : 'Course Content',
        uploadedAt: video.createdAt || new Date().toISOString(),
        duration: video.duration ? `${video.duration} min` : undefined,
        thumbnail: video.thumbnail,
        saved: false,
        isFacultyCreated: video.isFacultyCreated,
        isFromCompletedCourse: video.isFromCompletedCourse,
      }));

      // Map documents (handbooks, PPTs, notes)
      const documents = rawDocuments.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        type: 'DOCUMENT' as const,
        description: doc.description,
        subject: doc.subject || doc.topic,
        courseName: doc.courseTitle,
        author: doc.assignedBy || 'Course Content',
        uploadedBy: doc.assignedBy ? `Assigned by ${doc.assignedBy}` : doc.isFromCompletedCourse ? 'From Completed Course' : 'Course Content',
        uploadedAt: doc.createdAt || new Date().toISOString(),
        saved: false,
        isFacultyCreated: doc.isFacultyCreated,
        isFromCompletedCourse: doc.isFromCompletedCourse,
      }));

      // Map interactives - WITHOUT publisher name
      const interactives = rawInteractives.map((item: any) => ({
        id: item.id,
        title: item.title,
        type: 'DOCUMENT' as const,
        description: item.description,
        subject: item.subject || item.topic,
        courseName: item.courseTitle,
        author: item.assignedBy || 'Course Content',
        uploadedBy: item.assignedBy ? `Assigned by ${item.assignedBy}` : item.isFromCompletedCourse ? 'From Completed Course' : 'Course Content',
        uploadedAt: item.createdAt || new Date().toISOString(),
        saved: false,
        isFacultyCreated: item.isFacultyCreated,
        isFromCompletedCourse: item.isFromCompletedCourse,
      }));

      // Map MCQ tests as library items
      const testsData = Array.isArray(testsRes.data) ? testsRes.data : (testsRes.data?.tests || []);
      const mcqs = (testsData as any[])
        .filter((t: any) => t.type === 'MCQ' || t.type === 'PRACTICE')
        .map((test: any) => ({
          id: test.id,
          title: test.title,
          type: 'MCQ' as const,
          subject: test.subject,
          courseName: test.courseName || test.course?.title,
          author: test.creatorName || 'Course Content',
          uploadedBy: test.creatorName,
          uploadedAt: test.createdAt || new Date().toISOString(),
          questionCount: test.totalQuestions || test.questionCount || 0,
          description: `${test.totalQuestions || 0} questions • ${test.durationMinutes || 0} mins`,
          saved: false,
        }));

      // Merge all content
      const allItems = [...ebooks, ...videos, ...documents, ...interactives, ...mcqs];

      setItems(allItems);
      setCustomFolders([]);
    } catch (err: any) {
      console.error('Failed to fetch content:', err);
      setItems([]);
      setCustomFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllContent();
  }, [fetchAllContent]);

  const handleSaveToLibrary = async (item: LibraryItem) => {
    try {
      setSavingId(item.id);
      
      const endpoint = item.type === 'EBOOK' 
        ? `/student-portal/ebooks/${item.id}/save-to-library`
        : item.type === 'VIDEO'
        ? `/student-portal/videos/${item.id}/save-to-library`
        : `/student-portal/library/save`;
      
      await apiService.post(endpoint, {
        itemId: item.id,
        type: item.type,
        title: item.title
      });
      
      // Update local state
      setItems(items.map(i => i.id === item.id ? { ...i, saved: true } : i));
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const newFolder: CustomFolder = {
        id: `f${Date.now()}`,
        name: newFolderName,
        color: newFolderColor,
        itemCount: 0
      };

      await apiService.post('/student-portal/library/folders', newFolder);
      setCustomFolders([...customFolders, newFolder]);
      setNewFolderName('');
      setNewFolderColor('#6366F1');
      setShowCreateFolder(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm('Delete this folder? Items will be moved to "All Items".')) return;

    try {
      await apiService.delete(`/student-portal/library/folders/${folderId}`);
      setCustomFolders(customFolders.filter(f => f.id !== folderId));
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
        setActiveTab('all');
      }
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  const getSortedAndFilteredItems = () => {
    let filtered = [...items];

    // Filter by section (Books, Videos, MCQs)
    if (activeSection === 'BOOKS') {
      filtered = filtered.filter(i => i.type === 'BOOK' || i.type === 'EBOOK');
    } else if (activeSection === 'VIDEOS') {
      filtered = filtered.filter(i => i.type === 'VIDEO');
    } else if (activeSection === 'MCQS') {
      filtered = filtered.filter(i => i.type === 'MCQ');
    }

    // Filter by tab/year
    if (activeTab === 'year1') filtered = filtered.filter(i => i.year === 1);
    else if (activeTab === 'year2') filtered = filtered.filter(i => i.year === 2);
    else if (activeTab === 'year3') filtered = filtered.filter(i => i.year === 3);
    else if (activeTab === 'year4') filtered = filtered.filter(i => i.year === 4);
    else if (activeTab === 'custom' && selectedFolder) {
      filtered = filtered.filter(i => i.folderId === selectedFolder);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(i => i.type === filterType);
    }

    // Filter by search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(search) ||
        (item.courseName && item.courseName.toLowerCase().includes(search)) ||
        (item.author && item.author.toLowerCase().includes(search)) ||
        (item.subject && item.subject.toLowerCase().includes(search))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'oldest':
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BOOK':
      case 'EBOOK': return <BookOpen size={20} />;
      case 'VIDEO': return <Video size={20} />;
      case 'DOCUMENT': return <FileText size={20} />;
      case 'REFERENCE': return <File size={20} />;
      case 'MCQ': return <ClipboardList size={20} />;
      default: return <File size={20} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BOOK':
      case 'EBOOK': return 'var(--bo-accent)';
      case 'VIDEO': return 'var(--bo-danger)';
      case 'DOCUMENT': return 'var(--bo-success)';
      case 'REFERENCE': return 'var(--bo-warning)';
      case 'MCQ': return '#8b5cf6';
      default: return 'var(--bo-text-muted)';
    }
  };

  const filteredItems = getSortedAndFilteredItems();

  const yearCounts = {
    1: items.filter(i => i.year === 1).length,
    2: items.filter(i => i.year === 2).length,
    3: items.filter(i => i.year === 3).length,
    4: items.filter(i => i.year === 4).length,
  };

  const typeCounts = {
    all: items.length,
    BOOK: items.filter(i => i.type === 'BOOK' || i.type === 'EBOOK').length,
    VIDEO: items.filter(i => i.type === 'VIDEO').length,
    MCQ: items.filter(i => i.type === 'MCQ').length,
    DOCUMENT: items.filter(i => i.type === 'DOCUMENT').length,
    REFERENCE: items.filter(i => i.type === 'REFERENCE').length,
  };

  const folderColors = ['#6366F1', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

  if (loading) {
    return (
      <StudentLayout>
        <div className="page-loading-screen">
          <div className="loading-rings">
            <div className="loading-ring loading-ring-1"></div>
            <div className="loading-ring loading-ring-2"></div>
            <div className="loading-ring loading-ring-3"></div>
          </div>
          <div className="loading-dots">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
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
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
      >
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Library size={28} style={{ color: 'var(--bo-accent)' }} />
              My Library
            </h1>
            <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
              Content assigned by your teachers and from completed courses
            </p>
          </div>
          <button
            className="bo-btn"
            onClick={() => setShowCreateFolder(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <FolderPlus size={18} />
            Create Folder
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
        <div className="bo-stat-card" onClick={() => setActiveSection('ALL')} style={{ cursor: 'pointer', border: activeSection === 'ALL' ? '2px solid var(--bo-accent)' : undefined }}>
          <div className="bo-stat-icon blue">
            <Library size={22} />
          </div>
          <div className="bo-stat-value">{typeCounts.all}</div>
          <div className="bo-stat-label">Total Items</div>
        </div>
        
        <div className="bo-stat-card" onClick={() => setActiveSection('BOOKS')} style={{ cursor: 'pointer', border: activeSection === 'BOOKS' ? '2px solid var(--bo-accent)' : undefined }}>
          <div className="bo-stat-icon purple">
            <BookOpen size={22} />
          </div>
          <div className="bo-stat-value">{typeCounts.BOOK}</div>
          <div className="bo-stat-label">Books & E-Books</div>
        </div>
        
        <div className="bo-stat-card" onClick={() => setActiveSection('VIDEOS')} style={{ cursor: 'pointer', border: activeSection === 'VIDEOS' ? '2px solid var(--bo-danger)' : undefined }}>
          <div className="bo-stat-icon orange">
            <Video size={22} />
          </div>
          <div className="bo-stat-value">{typeCounts.VIDEO}</div>
          <div className="bo-stat-label">Videos</div>
        </div>
        
        <div className="bo-stat-card" onClick={() => setActiveSection('MCQS')} style={{ cursor: 'pointer', border: activeSection === 'MCQS' ? '2px solid #8b5cf6' : undefined }}>
          <div className="bo-stat-icon green">
            <ClipboardList size={22} />
          </div>
          <div className="bo-stat-value">{typeCounts.MCQ}</div>
          <div className="bo-stat-label">MCQs / Practice</div>
        </div>
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="bo-card" style={{ width: 450, padding: 32, position: 'relative' }}>
            <button
              onClick={() => setShowCreateFolder(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--bo-text-muted)'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 24 }}>
              Create New Folder
            </h2>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--bo-text-primary)', marginBottom: 8 }}>
                Folder Name
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Exam Preparation"
                className="bo-input"
                style={{ width: '100%' }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--bo-text-primary)', marginBottom: 8 }}>
                Folder Color
              </label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {folderColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewFolderColor(color)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: color,
                      border: newFolderColor === color ? '3px solid var(--bo-text-primary)' : '2px solid var(--bo-border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="bo-btn bo-btn-outline"
                onClick={() => setShowCreateFolder(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="bo-btn"
                onClick={handleCreateFolder}
                style={{ flex: 1 }}
                disabled={!newFolderName.trim()}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Heading */}
      {activeSection !== 'ALL' && (
        <div className="bo-card" style={{ padding: '14px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeSection === 'BOOKS' && <BookOpen size={20} color="var(--bo-accent)" />}
            {activeSection === 'VIDEOS' && <Video size={20} color="var(--bo-danger)" />}
            {activeSection === 'MCQS' && <ClipboardList size={20} color="#8b5cf6" />}
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', margin: 0 }}>
              {activeSection === 'BOOKS' ? 'Books & E-Books' : activeSection === 'VIDEOS' ? 'Video Lectures' : 'MCQs & Practice Tests'}
            </h2>
            <span style={{ fontSize: 13, color: 'var(--bo-text-muted)', padding: '2px 10px', background: 'var(--bo-border-light)', borderRadius: 12 }}>
              {activeSection === 'BOOKS' ? typeCounts.BOOK : activeSection === 'VIDEOS' ? typeCounts.VIDEO : typeCounts.MCQ} items
            </span>
          </div>
          <button
            className="bo-btn bo-btn-outline"
            onClick={() => setActiveSection('ALL')}
            style={{ padding: '4px 12px', fontSize: 12 }}
          >
            Show All
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: 24, borderBottom: '2px solid var(--bo-border)' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          <button
            onClick={() => { setActiveTab('all'); setSelectedFolder(null); }}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'all' ? '3px solid var(--bo-accent)' : '3px solid transparent',
              color: activeTab === 'all' ? 'var(--bo-accent)' : 'var(--bo-text-secondary)',
              fontWeight: activeTab === 'all' ? 600 : 500,
              cursor: 'pointer',
              fontSize: 14,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            All Items ({items.length})
          </button>

          <button
            onClick={() => { setActiveTab('year1'); setSelectedFolder(null); }}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'year1' ? '3px solid var(--bo-accent)' : '3px solid transparent',
              color: activeTab === 'year1' ? 'var(--bo-accent)' : 'var(--bo-text-secondary)',
              fontWeight: activeTab === 'year1' ? 600 : 500,
              cursor: 'pointer',
              fontSize: 14,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            Year 1 ({yearCounts[1]})
          </button>

          <button
            onClick={() => { setActiveTab('year2'); setSelectedFolder(null); }}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'year2' ? '3px solid var(--bo-accent)' : '3px solid transparent',
              color: activeTab === 'year2' ? 'var(--bo-accent)' : 'var(--bo-text-secondary)',
              fontWeight: activeTab === 'year2' ? 600 : 500,
              cursor: 'pointer',
              fontSize: 14,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            Year 2 ({yearCounts[2]})
          </button>

          <button
            onClick={() => { setActiveTab('year3'); setSelectedFolder(null); }}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'year3' ? '3px solid var(--bo-accent)' : '3px solid transparent',
              color: activeTab === 'year3' ? 'var(--bo-accent)' : 'var(--bo-text-secondary)',
              fontWeight: activeTab === 'year3' ? 600 : 500,
              cursor: 'pointer',
              fontSize: 14,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            Year 3 ({yearCounts[3]})
          </button>

          <button
            onClick={() => { setActiveTab('year4'); setSelectedFolder(null); }}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'year4' ? '3px solid var(--bo-accent)' : '3px solid transparent',
              color: activeTab === 'year4' ? 'var(--bo-accent)' : 'var(--bo-text-secondary)',
              fontWeight: activeTab === 'year4' ? 600 : 500,
              cursor: 'pointer',
              fontSize: 14,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            Year 4 ({yearCounts[4]})
          </button>
        </div>
      </div>

      {/* Custom Folders */}
      {customFolders.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 16 }}>
            Custom Folders
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {customFolders.map(folder => (
              <div
                key={folder.id}
                className="bo-card"
                style={{
                  padding: 20,
                  cursor: 'pointer',
                  borderLeft: `4px solid ${folder.color}`,
                  background: selectedFolder === folder.id ? 'var(--bo-accent-light)' : 'white',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  setActiveTab('custom');
                  setSelectedFolder(folder.id);
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <Folder size={32} style={{ color: folder.color }} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--bo-text-muted)',
                      padding: 4
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>
                  {folder.name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>
                  {folder.itemCount} items
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bo-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 300, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
            <input
              type="text"
              placeholder="Search by title, author, subject, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bo-input"
              style={{ paddingLeft: 40, width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={18} style={{ color: 'var(--bo-text-muted)' }} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bo-input"
                style={{ padding: '8px 12px', minWidth: 140 }}
              >
                <option value="all">All Types</option>
                <option value="BOOK">Books</option>
                <option value="EBOOK">E-Books</option>
                <option value="VIDEO">Videos</option>
                <option value="MCQ">MCQs / Practice</option>
                <option value="DOCUMENT">Documents</option>
                <option value="REFERENCE">References</option>
              </select>
            </div>

            {/* Sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SortAsc size={18} style={{ color: 'var(--bo-text-muted)' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bo-input"
                style={{ padding: '8px 12px', minWidth: 160 }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="type">Type</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Library Items */}
      {filteredItems.length === 0 ? (
        <div className="bo-card" style={{ padding: 48, textAlign: 'center' }}>
          <Library size={48} style={{ color: 'var(--bo-text-muted)', opacity: 0.5, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 16, color: 'var(--bo-text-muted)', marginBottom: 8 }}>
            No items found
          </div>
          <div style={{ fontSize: 14, color: 'var(--bo-text-muted)' }}>
            Try adjusting your search or filters
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredItems.map(item => {
            const isSaving = savingId === item.id;
            
            return (
              <div key={item.id} className="bo-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    background: `${getTypeColor(item.type)}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: getTypeColor(item.type)
                  }}>
                    {getTypeIcon(item.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
                      {item.title}
                    </h3>
                    {(item.uploadedBy || item.courseName) && (
                      <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 8 }}>
                        {item.uploadedBy || item.courseName}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: `${getTypeColor(item.type)}15`,
                        color: getTypeColor(item.type),
                        fontWeight: 500
                      }}>
                        {item.type === 'EBOOK' ? 'E-BOOK' : item.type}
                      </span>
                      {item.isFacultyCreated && (
                        <span style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: '#10B98115',
                          color: '#10B981',
                          fontWeight: 500
                        }}>
                          👨‍🏫 Faculty Content
                        </span>
                      )}
                      {item.isFromCompletedCourse && !item.isFacultyCreated && (
                        <span style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: '#3B82F615',
                          color: '#3B82F6',
                          fontWeight: 500
                        }}>
                          ✓ Completed Course
                        </span>
                      )}
                      {item.year && (
                        <span style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: 'var(--bo-accent-light)',
                          color: 'var(--bo-accent)',
                          fontWeight: 500
                        }}>
                          Year {item.year}
                        </span>
                      )}
                      {item.saved && (
                        <span style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: 'var(--bo-success)',
                          color: 'white',
                          fontWeight: 500
                        }}>
                          ✓ Saved
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {item.description && (
                  <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 16 }}>
                  {item.duration && (
                    <span>⏱️ {item.duration}</span>
                  )}
                  {item.pages && (
                    <span>📄 {item.pages} pages</span>
                  )}
                  {item.subject && (
                    <span>📚 {item.subject}</span>
                  )}
                </div>

                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 16 }}>
                  {new Date(item.uploadedAt).toLocaleDateString()}
                  {item.uploadedBy && ` • ${item.uploadedBy}`}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="bo-btn bo-btn-outline"
                    style={{ flex: 1, fontSize: 13, padding: '8px 12px' }}
                    onClick={() => {
                      if (item.type === 'MCQ') {
                        navigate(`/student/assignments/${item.id}`);
                      } else {
                        navigate(`/student/library/${item.id}/view`);
                      }
                    }}
                  >
                    {item.type === 'MCQ' ? (
                      <><ClipboardList size={14} style={{ marginRight: 6 }} />Start Practice</>
                    ) : (
                      <><Eye size={14} style={{ marginRight: 6 }} />View</>
                    )}
                  </button>
                  
                  {!item.saved && (
                    <button
                      className="bo-btn"
                      style={{
                        flex: 1,
                        fontSize: 13,
                        padding: '8px 12px',
                        background: isSaving ? 'var(--bo-text-muted)' : 'var(--bo-accent)',
                        cursor: isSaving ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => handleSaveToLibrary(item)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <div className="bo-spinner" style={{ marginRight: 6, width: 12, height: 12 }} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <BookMarked size={14} style={{ marginRight: 6 }} />
                          Save
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Banner */}
      <div className="bo-card" style={{ 
        padding: 20, 
        marginTop: 32,
        background: 'linear-gradient(135deg, var(--bo-accent-light) 0%, var(--bo-bg) 100%)',
        border: '1px solid var(--bo-accent)'
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
          <Library size={24} style={{ color: 'var(--bo-accent)', flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 8 }}>
              📚 Unified Library System
            </h4>
            <p style={{ fontSize: 14, color: 'var(--bo-text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
              Your library now includes all content: E-Books, Videos, Course Materials, and Documents. 
              Click the <strong>"Save"</strong> button on any item to add it to your personal library. 
              Content remains accessible until graduation.
            </p>
            <p style={{ fontSize: 13, color: 'var(--bo-danger)', lineHeight: 1.6, fontWeight: 500 }}>
              ⚠️ Content Protection: All materials are view-only. Copying, downloading, and screen capture are prohibited.
            </p>
          </div>
        </div>
      </div>
      </div>
    </StudentLayout>
  );
};

export default StudentLibrary;
