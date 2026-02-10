import React, { useState, useEffect, useCallback } from 'react';
import StudentLayout from '../components/student/StudentLayout';
import apiService from '../services/api.service';
import { BookOpen, Video, FileText, Eye, Search, Filter, Clock, User, Save } from 'lucide-react';
import '../styles/bitflow-owner.css';
import '../styles/loading-screen.css';

interface SelfPacedResource {
  id: string;
  title: string;
  description?: string;
  resourceType: string;
  fileUrl?: string;
  content?: string;
  subject?: string;
  academicYear?: string;
  tags: string[];
  viewCount: number;
  facultyName: string;
  createdAt: string;
}

const StudentSelfPaced: React.FC = () => {
  const [resources, setResources] = useState<SelfPacedResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<SelfPacedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<SelfPacedResource | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [error, setError] = useState('');
  const [savedToLibrary, setSavedToLibrary] = useState<Set<string>>(new Set());

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get('/self-paced/available');
      const resourceData = Array.isArray(response.data) ? response.data : [];
      setResources(resourceData);
      setFilteredResources(resourceData);
    } catch (err: any) {
      console.error('Error fetching resources:', err);
      setError(err.response?.data?.message || 'Failed to load resources');
      setResources([]);
      setFilteredResources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    let filtered = [...resources];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (filterType) {
      filtered = filtered.filter(r => r.resourceType === filterType);
    }

    if (filterSubject) {
      filtered = filtered.filter(r => r.subject === filterSubject);
    }

    setFilteredResources(filtered);
  }, [searchQuery, filterType, filterSubject, resources]);

  const handleResourceView = async (resource: SelfPacedResource) => {
    setSelectedResource(resource);
    try {
      await apiService.post(`/self-paced/${resource.id}/log-access`, {});
    } catch (error) {
      console.error('Error logging access:', error);
    }
  };

  const handleSaveToLibrary = async (resource: SelfPacedResource) => {
    try {
      await apiService.post(`/self-paced/${resource.id}/save-to-library`, {});
      setSavedToLibrary(prev => new Set(prev).add(resource.id));
      alert('✅ Resource saved to your library! Access it anytime from the Library section.');
    } catch (error: any) {
      console.error('Error saving to library:', error);
      alert(error.response?.data?.message || 'Failed to save to library');
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'VIDEO': return <Video size={20} />;
      case 'DOCUMENT': return <FileText size={20} />;
      case 'BOOK': return <BookOpen size={20} />;
      default: return <FileText size={20} />;
    }
  };

  const getResourceColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'VIDEO': return 'var(--bo-danger)';
      case 'DOCUMENT': return 'var(--bo-success)';
      case 'BOOK': return 'var(--bo-accent)';
      default: return 'var(--bo-text-muted)';
    }
  };

  const typesSet = new Set<string>();
  resources.forEach(r => typesSet.add(r.resourceType));
  const uniqueTypes: string[] = [];
  typesSet.forEach(t => uniqueTypes.push(t));

  const subjectsSet = new Set<string>();
  resources.forEach(r => r.subject && subjectsSet.add(r.subject));
  const uniqueSubjects: string[] = [];
  subjectsSet.forEach(s => uniqueSubjects.push(s));

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
          <div className="loading-title">Loading Resources</div>
          <div className="loading-bar-track">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (selectedResource) {
    return (
      <StudentLayout>
        <div style={{ marginBottom: 24 }}>
          <button 
            className="bo-btn bo-btn-outline" 
            onClick={() => setSelectedResource(null)}
            style={{ marginBottom: 16 }}
          >
            ← Back to Resources
          </button>
          
          <div className="bo-card" style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--bo-text-primary)', marginBottom: 8 }}>
                  {selectedResource.title}
                </h1>
                <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--bo-text-muted)', marginBottom: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={14} /> {selectedResource.facultyName}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} /> {new Date(selectedResource.createdAt).toLocaleDateString()}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={14} /> {selectedResource.viewCount} views
                  </span>
                </div>
                {selectedResource.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedResource.tags.map((tag, idx) => (
                      <span 
                        key={idx}
                        style={{ 
                          padding: '4px 10px', 
                          background: 'var(--bo-bg)', 
                          borderRadius: 12, 
                          fontSize: 12,
                          color: 'var(--bo-text-muted)'
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button 
                className="bo-btn bo-btn-primary"
                onClick={() => handleSaveToLibrary(selectedResource)}
                disabled={savedToLibrary.has(selectedResource.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Save size={16} />
                {savedToLibrary.has(selectedResource.id) ? 'Saved to Library' : 'Save to Library'}
              </button>
            </div>

            {selectedResource.description && (
              <div style={{ marginBottom: 24, padding: 16, background: 'var(--bo-bg)', borderRadius: 'var(--bo-radius)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Description</h3>
                <p style={{ color: 'var(--bo-text-secondary)', lineHeight: 1.6 }}>
                  {selectedResource.description}
                </p>
              </div>
            )}

            {selectedResource.fileUrl && (
              <div style={{ marginTop: 24 }}>
                {selectedResource.resourceType === 'VIDEO' ? (
                  <video 
                    controls 
                    style={{ width: '100%', maxHeight: '500px', borderRadius: 'var(--bo-radius)' }}
                    src={selectedResource.fileUrl}
                  >
                    Your browser does not support video playback.
                  </video>
                ) : selectedResource.resourceType === 'DOCUMENT' || selectedResource.resourceType === 'BOOK' ? (
                  <div style={{ textAlign: 'center', padding: 40, background: 'var(--bo-bg)', borderRadius: 'var(--bo-radius)' }}>
                    <FileText size={64} style={{ color: 'var(--bo-accent)', marginBottom: 16 }} />
                    <p style={{ marginBottom: 20, color: 'var(--bo-text-muted)' }}>
                      View-only content - No downloading allowed
                    </p>
                    <button 
                      className="bo-btn bo-btn-primary"
                      onClick={() => window.open(selectedResource.fileUrl, '_blank')}
                    >
                      <Eye size={16} style={{ marginRight: 8 }} />
                      View Only
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {selectedResource.content && (
              <div 
                style={{ 
                  marginTop: 24, 
                  padding: 24, 
                  background: 'var(--bo-bg)', 
                  borderRadius: 'var(--bo-radius)',
                  lineHeight: 1.8 
                }}
                dangerouslySetInnerHTML={{ __html: selectedResource.content }}
              />
            )}
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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
          Self-Paced Learning
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          Access faculty-curated learning materials • Save to your library for permanent access
        </p>
      </div>

      {/* Stats */}
      <div className="bo-stats-grid" style={{ marginBottom: 24 }}>
        <div className="bo-stat-card">
          <div className="bo-stat-icon blue">
            <BookOpen size={22} />
          </div>
          <div className="bo-stat-value">{resources.length}</div>
          <div className="bo-stat-label">Total Resources</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon purple">
            <Video size={22} />
          </div>
          <div className="bo-stat-value">{resources.filter(r => r.resourceType === 'VIDEO').length}</div>
          <div className="bo-stat-label">Video Lectures</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon green">
            <FileText size={22} />
          </div>
          <div className="bo-stat-value">{resources.filter(r => r.resourceType === 'DOCUMENT').length}</div>
          <div className="bo-stat-label">Documents</div>
        </div>
        
        <div className="bo-stat-card">
          <div className="bo-stat-icon orange">
            <BookOpen size={22} />
          </div>
          <div className="bo-stat-value">{resources.filter(r => r.resourceType === 'BOOK').length}</div>
          <div className="bo-stat-label">Books</div>
        </div>
      </div>

      {/* Info Banner */}
      <div style={{ 
        padding: 16, 
        background: 'var(--bo-info-light)', 
        borderRadius: 'var(--bo-radius)', 
        border: '1px solid var(--bo-info)',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <Save size={20} style={{ color: 'var(--bo-info)', flexShrink: 0 }} />
        <div style={{ fontSize: 14, color: 'var(--bo-text-primary)' }}>
          <strong>Save to Library:</strong> Click "Save to Library" on any resource to access it permanently from your Library, even after course completion or account suspension.
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bo-card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid var(--bo-border)',
                borderRadius: 'var(--bo-radius)',
                fontSize: 14,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={16} style={{ color: 'var(--bo-text-muted)' }} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--bo-border)',
                borderRadius: 'var(--bo-radius)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <option value="">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--bo-border)',
                borderRadius: 'var(--bo-radius)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <option value="">All Subjects</option>
              {uniqueSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      {error && (
        <div className="bo-card" style={{ padding: 24, marginBottom: 24, textAlign: 'center', color: 'var(--bo-danger)' }}>
          {error}
        </div>
      )}

      {filteredResources.length === 0 ? (
        <div className="bo-card" style={{ padding: 80, textAlign: 'center' }}>
          <BookOpen size={64} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 8 }}>
            No resources found
          </h3>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>
            {searchQuery || filterType || filterSubject ? 'Try adjusting your search or filters' : 'No resources are available yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredResources.map((resource) => (
            <div 
              key={resource.id}
              className="bo-card"
              style={{ 
                padding: 20,
                border: '1px solid var(--bo-border)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onClick={() => handleResourceView(resource)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--bo-shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--bo-shadow-sm)';
              }}
            >
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 'var(--bo-radius)', 
                  background: `${getResourceColor(resource.resourceType)}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: getResourceColor(resource.resourceType),
                  flexShrink: 0,
                }}>
                  {getResourceIcon(resource.resourceType)}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>
                    {resource.title}
                  </h4>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: 8, 
                    fontSize: 11, 
                    fontWeight: 600,
                    background: `${getResourceColor(resource.resourceType)}15`,
                    color: getResourceColor(resource.resourceType)
                  }}>
                    {resource.resourceType}
                  </span>
                </div>
              </div>
              
              {resource.description && (
                <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                  {resource.description.length > 120 ? resource.description.substring(0, 120) + '...' : resource.description}
                </p>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--bo-text-muted)', paddingTop: 12, borderTop: '1px solid var(--bo-border)' }}>
                <span>👨‍🏫 {resource.facultyName}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Eye size={12} /> {resource.viewCount}
                </span>
              </div>

              {resource.subject && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--bo-accent)' }}>
                  📚 {resource.subject}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </StudentLayout>
  );
};

export default StudentSelfPaced;
