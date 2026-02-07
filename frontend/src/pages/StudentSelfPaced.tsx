import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StudentSelfPaced.css';

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
  const [filters, setFilters] = useState({
    subject: '',
    resourceType: '',
    academicYear: '',
    searchQuery: '',
  });
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, resources]);

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/self-paced/available`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setResources(response.data);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...resources];

    if (filters.subject) {
      filtered = filtered.filter((r) => r.subject === filters.subject);
    }

    if (filters.resourceType) {
      filtered = filtered.filter((r) => r.resourceType === filters.resourceType);
    }

    if (filters.academicYear) {
      filtered = filtered.filter((r) => r.academicYear === filters.academicYear);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredResources(filtered);
  };

  const handleResourceView = async (resource: SelfPacedResource) => {
    setSelectedResource(resource);
    setStartTime(Date.now());

    // Log the access
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/self-paced/${resource.id}/log-access`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error('Error logging access:', error);
    }
  };

  const handleCloseResource = async () => {
    if (selectedResource && startTime) {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000); // in seconds

      try {
        const token = localStorage.getItem('token');
        await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/self-paced/${selectedResource.id}/log-access`,
          { timeSpent },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (error) {
        console.error('Error logging time spent:', error);
      }
    }

    setSelectedResource(null);
    setStartTime(0);
    fetchResources(); // Refresh to update view counts
  };

  const getUniqueValues = (field: keyof SelfPacedResource) => {
    const values = resources.map((r) => r[field]).filter((v) => v && v !== '');
    return Array.from(new Set(values));
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading resources...</p>
      </div>
    );
  }

  return (
    <div className="student-self-paced">
      <div className="header">
        <h1>📚 Self-Paced Learning Library</h1>
        <p className="subtitle">
          Explore supplementary materials uploaded by your faculty. Learn at your own pace!
        </p>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by title, description, or tags..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
          />
        </div>

        <div className="filters-row">
          <select
            value={filters.subject}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
          >
            <option value="">All Subjects</option>
            {getUniqueValues('subject').map((subject) => (
              <option key={subject as string} value={subject as string}>
                {subject}
              </option>
            ))}
          </select>

          <select
            value={filters.resourceType}
            onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="NOTE">Notes</option>
            <option value="VIDEO">Videos</option>
            <option value="DOCUMENT">Documents</option>
            <option value="REFERENCE">References</option>
            <option value="PRACTICE">Practice</option>
          </select>

          <select
            value={filters.academicYear}
            onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
          >
            <option value="">All Years</option>
            <option value="YEAR_1">Year 1</option>
            <option value="YEAR_2">Year 2</option>
            <option value="PART_1">3 Year Part 1</option>
            <option value="PART_2">3 Year Part 2</option>
            <option value="YEAR_4">Year 4</option>
          </select>

          {(filters.subject || filters.resourceType || filters.academicYear || filters.searchQuery) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() =>
                setFilters({
                  subject: '',
                  resourceType: '',
                  academicYear: '',
                  searchQuery: '',
                })
              }
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="resources-stats">
        <p>
          Showing <strong>{filteredResources.length}</strong> of <strong>{resources.length}</strong>{' '}
          resources
        </p>
      </div>

      {selectedResource && (
        <div className="modal-overlay">
          <div className="modal-content large resource-viewer">
            <div className="modal-header">
              <h2>{selectedResource.title}</h2>
              <button className="close-btn" onClick={handleCloseResource}>
                ×
              </button>
            </div>

            <div className="resource-info">
              <span className={`resource-type ${selectedResource.resourceType.toLowerCase()}`}>
                {selectedResource.resourceType}
              </span>
              {selectedResource.subject && <span className="info-badge">📚 {selectedResource.subject}</span>}
              {selectedResource.facultyName && (
                <span className="info-badge">👨‍🏫 {selectedResource.facultyName}</span>
              )}
            </div>

            {selectedResource.description && (
              <p className="resource-description">{selectedResource.description}</p>
            )}

            <div className="resource-content-area">
              {selectedResource.fileUrl && (
                <div className="file-viewer">
                  {selectedResource.resourceType === 'VIDEO' ? (
                    <video controls width="100%">
                      <source src={selectedResource.fileUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : selectedResource.fileUrl.endsWith('.pdf') ? (
                    <iframe
                      src={selectedResource.fileUrl}
                      width="100%"
                      height="600px"
                      title="PDF Viewer"
                    />
                  ) : (
                    <div className="file-download">
                      <p>📎 File Available</p>
                      <a
                        href={selectedResource.fileUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                      >
                        Download File
                      </a>
                    </div>
                  )}
                </div>
              )}

              {selectedResource.content && (
                <div className="text-content">
                  <pre>{selectedResource.content}</pre>
                </div>
              )}
            </div>

            {selectedResource.tags.length > 0 && (
              <div className="tags-list">
                {selectedResource.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="resources-grid">
        {filteredResources.length === 0 ? (
          <div className="empty-state">
            <p>No resources match your filters. Try adjusting your search criteria.</p>
          </div>
        ) : (
          filteredResources.map((resource) => (
            <div
              key={resource.id}
              className="resource-card clickable"
              onClick={() => handleResourceView(resource)}
            >
              <div className="resource-header">
                <span className={`resource-type ${resource.resourceType.toLowerCase()}`}>
                  {resource.resourceType}
                </span>
                <span className="view-count">👁️ {resource.viewCount}</span>
              </div>

              <h3>{resource.title}</h3>
              {resource.description && (
                <p className="description">
                  {resource.description.length > 100
                    ? `${resource.description.substring(0, 100)}...`
                    : resource.description}
                </p>
              )}

              <div className="resource-meta">
                {resource.subject && <span className="meta-item">📚 {resource.subject}</span>}
                {resource.academicYear && <span className="meta-item">🎓 {resource.academicYear}</span>}
                {resource.facultyName && <span className="meta-item">👨‍🏫 {resource.facultyName}</span>}
              </div>

              {resource.tags.length > 0 && (
                <div className="tags-list">
                  {resource.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag small">
                      {tag}
                    </span>
                  ))}
                  {resource.tags.length > 3 && <span className="tag small">+{resource.tags.length - 3}</span>}
                </div>
              )}

              <div className="resource-footer">
                <small>Added {new Date(resource.createdAt).toLocaleDateString()}</small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentSelfPaced;
