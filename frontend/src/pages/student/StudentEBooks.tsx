import React, { useEffect, useState, useCallback } from 'react';
import apiService from '../../services/api.service';
import StudentLayout from '../../components/student/StudentLayout';
import { BookOpen, Search, Filter, BookMarked, Check } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface EBook {
  id: string;
  title: string;
  author: string;
  subject: string;
  description: string;
  coverUrl?: string;
  pages: number;
  publishedYear: number;
  category: string;
}

const StudentEBooks: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<EBook[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [savedBooks, setSavedBooks] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/student-portal/ebooks');
      
      // Use API response data
      const booksData = response.data?.books || [];
      
      setBooks(booksData);
    } catch (err) {
      console.error('Failed to fetch books:', err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleSaveToLibrary = async (book: EBook) => {
    try {
      setSavingId(book.id);
      await apiService.post(`/student-portal/ebooks/${book.id}/save-to-library`, {
        type: 'BOOK',
        title: book.title,
        metadata: {
          author: book.author,
          subject: book.subject,
          pages: book.pages
        }
      });
      
      setSavedBooks(prev => {
        const updated = new Set(prev);
        updated.add(book.id);
        return updated;
      });
      
      // Optional: Show success message
      console.log(`Saved "${book.title}" to library`);
    } catch (err) {
      console.error('Failed to save book:', err);
    } finally {
      setSavingId(null);
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterCategory === 'all' || book.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const categories = ['all', ...Array.from(new Set(books.map(b => b.category)))];

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
          <div className="loading-title">Loading E-Books</div>
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
          <BookOpen size={28} style={{ color: 'var(--bo-accent)' }} />
          E-Books Library
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          Browse and save medical textbooks and references to your library
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bo-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
            <input
              type="text"
              placeholder="Search books by title, author, or subject..."
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

      {/* Books Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {filteredBooks.map(book => {
          const isSaved = savedBooks.has(book.id);
          const isSaving = savingId === book.id;
          
          return (
            <div key={book.id} className="bo-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 80,
                  height: 110,
                  background: 'linear-gradient(135deg, var(--bo-accent) 0%, var(--bo-primary) 100%)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <BookOpen size={32} style={{ color: 'white', opacity: 0.9 }} />
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 6 }}>
                    {book.title}
                  </h3>
                  <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 4 }}>
                    By {book.author}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    <span style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      background: 'var(--bo-accent-light)',
                      color: 'var(--bo-accent)',
                      borderRadius: 4,
                      fontWeight: 500
                    }}>
                      {book.subject}
                    </span>
                    <span style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      background: 'var(--bo-bg)',
                      color: 'var(--bo-text-muted)',
                      borderRadius: 4
                    }}>
                      {book.category}
                    </span>
                  </div>
                </div>
              </div>
              
              <p style={{ fontSize: 14, color: 'var(--bo-text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                {book.description}
              </p>
              
              <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 16 }}>
                {book.pages} pages • Published {book.publishedYear}
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
                <button
                  className="bo-btn bo-btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => window.open(`/ebooks/${book.id}/view`, '_blank')}
                >
                  <BookOpen size={16} style={{ marginRight: 6 }} />
                  Read Only
                </button>
                
                <button
                  className="bo-btn"
                  style={{
                    flex: 1,
                    background: isSaved ? 'var(--bo-success)' : 'var(--bo-accent)',
                    cursor: isSaved || isSaving ? 'default' : 'pointer'
                  }}
                  onClick={() => !isSaved && !isSaving && handleSaveToLibrary(book)}
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
          );
        })}
      </div>

      {filteredBooks.length === 0 && (
        <div className="bo-card" style={{ padding: 48, textAlign: 'center' }}>
          <BookOpen size={48} style={{ color: 'var(--bo-text-muted)', opacity: 0.5, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 16, color: 'var(--bo-text-muted)' }}>
            No books found matching your criteria
          </div>
        </div>
      )}
      </div>
    </StudentLayout>
  );
};

export default StudentEBooks;
