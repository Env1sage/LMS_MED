import React, { useState, useEffect } from 'react';
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
  label = 'Map Competencies',
  placeholder = 'Search by code, title, subject…',
  maxHeight = '320px',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtered, setFiltered] = useState<Competency[]>([]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFiltered(competencies.slice(0, 120));
    } else {
      const t = searchTerm.toLowerCase();
      setFiltered(
        competencies
          .filter(c =>
            c.code.toLowerCase().includes(t) ||
            c.title.toLowerCase().includes(t) ||
            c.description?.toLowerCase().includes(t) ||
            c.subject?.toLowerCase().includes(t) ||
            c.domain?.toLowerCase().includes(t),
          )
          .slice(0, 200),
      );
    }
  }, [searchTerm, competencies]);

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);

  const remove = (id: string) => onChange(selectedIds.filter(x => x !== id));

  const selected = competencies.filter(c => selectedIds.includes(c.id));

  return (
    <div>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bo-text, #1e293b)', marginBottom: 10 }}>
          {label}
          {selectedIds.length > 0 && (
            <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 12, color: '#6366f1' }}>
              {selectedIds.length} selected
            </span>
          )}
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {selected.map(c => (
            <span key={c.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 20,
              background: '#e0e7ff', color: '#3730a3',
              border: '1px solid #c7d2fe', fontSize: 12, fontWeight: 600,
            }}>
              {c.code}
              <span style={{ fontWeight: 400, color: '#4338ca', fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                &nbsp;{c.title}
              </span>
              <button type="button" onClick={() => remove(c.id)} style={{
                marginLeft: 2, background: 'none', border: 'none', cursor: 'pointer',
                color: '#6366f1', padding: '0 2px', lineHeight: 1, display: 'flex', alignItems: 'center',
              }}>
                <X size={11} />
              </button>
            </span>
          ))}
          {selected.length > 1 && (
            <button type="button" onClick={() => onChange([])} style={{
              fontSize: 11, color: '#ef4444', background: 'none', border: '1px solid #fecaca',
              borderRadius: 20, padding: '3px 10px', cursor: 'pointer',
            }}>
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Search box */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', paddingLeft: 32, paddingRight: 32, paddingTop: 8, paddingBottom: 8,
            border: '1px solid var(--bo-border, #d1d5db)', borderRadius: 8, fontSize: 13,
            outline: 'none', background: 'var(--bo-card-bg, #fff)', color: 'var(--bo-text, #1e293b)',
            boxSizing: 'border-box',
          }}
        />
        {searchTerm && (
          <button type="button" onClick={() => setSearchTerm('')} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2,
          }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Count hint */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, paddingLeft: 2 }}>
        {filtered.length === 0
          ? 'No results — try a different keyword'
          : `Showing ${filtered.length} of ${competencies.length} competencies`}
      </div>

      {/* Always-visible scrollable list */}
      <div style={{
        border: '1px solid var(--bo-border, #e2e8f0)',
        borderRadius: 8, overflowY: 'auto', maxHeight,
        background: 'var(--bo-card-bg, #fff)',
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            No competencies found for "{searchTerm}"
          </div>
        ) : (
          filtered.map((comp, idx) => {
            const sel = selectedIds.includes(comp.id);
            return (
              <div
                key={comp.id}
                onClick={() => toggle(comp.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                  cursor: 'pointer',
                  background: sel ? '#eff6ff' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = sel ? '#eff6ff' : 'transparent'; }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: sel ? '2px solid #2563eb' : '2px solid #d1d5db',
                  background: sel ? '#2563eb' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.1s',
                }}>
                  {sel && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>

                {/* Code */}
                <span style={{ fontWeight: 700, color: '#2563eb', fontSize: 12, flexShrink: 0, minWidth: 56 }}>
                  {comp.code}
                </span>

                {/* Title + description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {comp.title}
                  </div>
                  {comp.description && (
                    <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {comp.description}
                    </div>
                  )}
                </div>

                {/* Subject / domain tags */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {comp.subject && (
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#e2e8f0', color: '#475569', whiteSpace: 'nowrap' }}>
                      {comp.subject}
                    </span>
                  )}
                  {comp.domain && (
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#f3e8ff', color: '#7c3aed', whiteSpace: 'nowrap' }}>
                      {comp.domain}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CompetencySearch;
