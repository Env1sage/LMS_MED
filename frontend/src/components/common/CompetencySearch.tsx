import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';

interface Competency {
  id: string;
  code: string;
  title: string;
  description: string;
  subject: string;
  domain?: string;
}

interface CompetencySearchProps {
  competencies: Competency[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  label?: string;
  placeholder?: string;
  maxHeight?: string;
}

const CompetencySearch: React.FC<CompetencySearchProps> = ({
  competencies,
  selectedIds,
  onChange,
  label = 'Select Competencies',
  placeholder = 'Search by code or description...',
  maxHeight = '400px',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCompetencies, setFilteredCompetencies] = useState<Competency[]>([]);
  const [hoveredChip, setHoveredChip] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter competencies based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCompetencies(competencies.slice(0, 100));
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = competencies.filter(
        (comp) =>
          comp.code.toLowerCase().includes(term) ||
          comp.title.toLowerCase().includes(term) ||
          comp.description.toLowerCase().includes(term) ||
          comp.subject?.toLowerCase().includes(term) ||
          comp.domain?.toLowerCase().includes(term)
      );
      setFilteredCompetencies(filtered.slice(0, 200));
    }
  }, [searchTerm, competencies]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleCompetency = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((cid) => cid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeCompetency = (id: string) => {
    onChange(selectedIds.filter((cid) => cid !== id));
  };

  const getSelectedCompetencies = () => {
    return competencies.filter((comp) => selectedIds.includes(comp.id));
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--bo-text, #1e293b)', marginBottom: 8 }}>
        {label}
      </label>

      {/* Selected Competencies */}
      {selectedIds.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {getSelectedCompetencies().map((comp) => (
            <div
              key={comp.id}
              title={`${comp.title} - ${comp.description}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 13,
                background: '#e0e7ff',
                color: '#3730a3',
                border: '1px solid #c7d2fe',
                lineHeight: '1.4',
              }}
            >
              <span style={{ fontWeight: 600, marginRight: 4 }}>{comp.code}</span>
              <span style={{ fontSize: 11, marginRight: 4, color: '#4338ca' }}>
                • {comp.title.substring(0, 30)}{comp.title.length > 30 ? '...' : ''}
              </span>
              <button
                type="button"
                onClick={() => removeCompetency(comp.id)}
                onMouseEnter={() => setHoveredChip(comp.id)}
                onMouseLeave={() => setHoveredChip(null)}
                style={{
                  marginLeft: 6,
                  background: hoveredChip === comp.id ? '#c7d2fe' : 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#4338ca',
                  padding: 0,
                  transition: 'background 0.15s',
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            style={{
              width: '100%',
              paddingLeft: 38,
              paddingRight: 16,
              paddingTop: 10,
              paddingBottom: 10,
              border: '1px solid var(--bo-border, #d1d5db)',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              background: 'var(--bo-card-bg, #fff)',
              color: 'var(--bo-text, #1e293b)',
              boxSizing: 'border-box',
            }}
            onBlur={(e) => {
              // Don't close if clicking inside dropdown
              setTimeout(() => {
                if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
                  // Let handleClickOutside handle it
                }
              }, 150);
            }}
          />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              zIndex: 50,
              width: '100%',
              marginTop: 4,
              background: 'var(--bo-card-bg, #fff)',
              border: '1px solid var(--bo-border, #d1d5db)',
              borderRadius: 8,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              maxHeight,
            }}
          >
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--bo-border, #e2e8f0)',
              background: '#f8fafc',
              fontSize: 12,
              color: '#64748b',
            }}>
              {filteredCompetencies.length > 0 ? (
                <>
                  Showing {filteredCompetencies.length} of {competencies.length} competencies
                  {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
                </>
              ) : (
                'No competencies found'
              )}
            </div>
            <div style={{ overflowY: 'auto', maxHeight: `calc(${maxHeight} - 50px)` }}>
              {filteredCompetencies.map((comp) => (
                <div
                  key={comp.id}
                  onClick={() => toggleCompetency(comp.id)}
                  onMouseEnter={() => setHoveredItem(comp.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f1f5f9',
                    background: isSelected(comp.id)
                      ? '#eff6ff'
                      : hoveredItem === comp.id
                        ? '#f8fafc'
                        : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: '#2563eb', fontSize: 13 }}>{comp.code}</span>
                        {comp.subject && (
                          <span style={{
                            fontSize: 11,
                            padding: '1px 8px',
                            borderRadius: 4,
                            background: '#e2e8f0',
                            color: '#475569',
                          }}>
                            {comp.subject}
                          </span>
                        )}
                        {comp.domain && (
                          <span style={{
                            fontSize: 11,
                            padding: '1px 8px',
                            borderRadius: 4,
                            background: '#f3e8ff',
                            color: '#7c3aed',
                          }}>
                            {comp.domain}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', marginTop: 4, marginBottom: 0 }}>
                        {comp.title}
                      </p>
                      <p style={{ fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 0 }}>
                        {comp.description}
                      </p>
                    </div>
                    {isSelected(comp.id) && (
                      <Check size={18} style={{ color: '#2563eb', flexShrink: 0, marginLeft: 8, marginTop: 2 }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
        {selectedIds.length === 0
          ? `No competencies selected. Search through ${competencies.length.toLocaleString()} available competencies.`
          : `${selectedIds.length} competency(ies) selected from ${competencies.length.toLocaleString()} total`}
      </p>
    </div>
  );
};

export default CompetencySearch;
