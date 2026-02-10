import React, { useEffect, useState, useCallback } from 'react';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import { Video, Search, Filter, BookMarked, Check, Play, Clock } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface VideoContent {
  id: string;
  title: string;
  instructor: string;
  subject: string;
  description: string;
  thumbnailUrl?: string;
  duration: string;
  uploadedAt: string;
  views: number;
  category: string;
}

const StudentVideos: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/student-portal/videos');
      
      // Use API response data
      const videosData = response.data?.videos || [];
      
      setVideos(videosData);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleSaveToLibrary = async (video: VideoContent) => {
    try {
      setSavingId(video.id);
      await apiService.post(`/student-portal/videos/${video.id}/save-to-library`, {
        type: 'VIDEO',
        title: video.title,
        metadata: {
          instructor: video.instructor,
          subject: video.subject,
          duration: video.duration
        }
      });
      
      setSavedVideos(prev => {
        const updated = new Set(prev);
        updated.add(video.id);
        return updated;
      });
      
      console.log(`Saved "${video.title}" to library`);
    } catch (err) {
      console.error('Failed to save video:', err);
    } finally {
      setSavingId(null);
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterCategory === 'all' || video.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const categories = ['all', ...Array.from(new Set(videos.map(v => v.category)))];

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
          <div className="loading-title">Loading Videos</div>
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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Video size={28} style={{ color: 'var(--bo-accent)' }} />
          Video Library
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          Watch lectures, clinical demonstrations, and save them to your library
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bo-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
            <input
              type="text"
              placeholder="Search videos by title, instructor, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bo-input"
              style={{ paddingLeft: 40, width: '100%' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={18} style={{ color: 'var(--bo-text-muted)' }} />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className="bo-btn bo-btn-sm"
                style={{
                  background: filterCategory === cat ? 'var(--bo-accent)' : 'var(--bo-bg)',
                  color: filterCategory === cat ? 'white' : 'var(--bo-text-primary)',
                  textTransform: 'capitalize'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {filteredVideos.map(video => {
          const isSaved = savedVideos.has(video.id);
          const isSaving = savingId === video.id;
          
          return (
            <div key={video.id} className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Video Thumbnail */}
              <div style={{
                height: 180,
                background: 'linear-gradient(135deg, var(--bo-accent) 0%, var(--bo-primary) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: 'pointer'
              }}
              onClick={() => window.open(`/videos/${video.id}/watch`, '_blank')}
              >
                <Play size={48} style={{ color: 'white', opacity: 0.9 }} />
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.75)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Clock size={12} />
                  {video.duration}
                </div>
              </div>
              
              {/* Video Info */}
              <div style={{ padding: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 8 }}>
                  {video.title}
                </h3>
                
                <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 4 }}>
                  {video.instructor}
                </div>
                
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, marginBottom: 12 }}>
                  <span style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    background: 'var(--bo-accent-light)',
                    color: 'var(--bo-accent)',
                    borderRadius: 4,
                    fontWeight: 500
                  }}>
                    {video.subject}
                  </span>
                  <span style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    background: 'var(--bo-bg)',
                    color: 'var(--bo-text-muted)',
                    borderRadius: 4
                  }}>
                    {video.category}
                  </span>
                </div>
                
                <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                  {video.description}
                </p>
                
                <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 16 }}>
                  {video.views.toLocaleString()} views • {new Date(video.uploadedAt).toLocaleDateString()}
                </div>
                
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    className="bo-btn bo-btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => window.open(`/videos/${video.id}/watch`, '_blank')}
                  >
                    <Play size={16} style={{ marginRight: 6 }} />
                    Watch Only
                  </button>
                  
                  <button
                    className="bo-btn"
                    style={{
                      flex: 1,
                      background: isSaved ? 'var(--bo-success)' : 'var(--bo-accent)',
                      cursor: isSaved || isSaving ? 'default' : 'pointer'
                    }}
                    onClick={() => !isSaved && !isSaving && handleSaveToLibrary(video)}
                    disabled={isSaved || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="bo-spinner" style={{ marginRight: 6, width: 14, height: 14 }} />
                        Saving...
                      </>
                    ) : isSaved ? (
                      <>
                        <Check size={16} style={{ marginRight: 6 }} />
                        Saved
                      </>
                    ) : (
                      <>
                        <BookMarked size={16} style={{ marginRight: 6 }} />
                        Save to Library
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredVideos.length === 0 && (
        <div className="bo-card" style={{ padding: 48, textAlign: 'center' }}>
          <Video size={48} style={{ color: 'var(--bo-text-muted)', opacity: 0.5, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 16, color: 'var(--bo-text-muted)' }}>
            No videos found matching your criteria
          </div>
        </div>
      )}
      </div>
    </StudentLayout>
  );
};

export default StudentVideos;
