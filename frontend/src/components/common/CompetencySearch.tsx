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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter competencies based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCompetencies(competencies.slice(0, 100)); // Show first 100 by default
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
      setFilteredCompetencies(filtered.slice(0, 200)); // Show top 200 matches
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
    <div className="competency-search-container" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

      {/* Selected Competencies */}
      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {getSelectedCompetencies().map((comp) => (
            <div
              key={comp.id}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
              title={`${comp.title} - ${comp.description}`}
            >
              <span className="font-semibold mr-1">{comp.code}</span>
              <span className="text-xs mr-1">• {comp.title.substring(0, 30)}{comp.title.length > 30 ? '...' : ''}</span>
              <button
                type="button"
                onClick={() => removeCompetency(comp.id)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg"
            style={{ maxHeight }}
          >
            <div className="p-2 border-b border-gray-200 bg-gray-50 text-sm text-gray-600">
              {filteredCompetencies.length > 0 ? (
                <>
                  Showing {filteredCompetencies.length} of {competencies.length} competencies
                  {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
                </>
              ) : (
                'No competencies found'
              )}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(' + maxHeight + ' - 50px)' }}>
              {filteredCompetencies.map((comp) => (
                <div
                  key={comp.id}
                  onClick={() => toggleCompetency(comp.id)}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                    isSelected(comp.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-blue-600">{comp.code}</span>
                        {comp.subject && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                            {comp.subject}
                          </span>
                        )}
                        {comp.domain && (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                            {comp.domain}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-1">{comp.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{comp.description}</p>
                    </div>
                    {isSelected(comp.id) && (
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-sm text-gray-500">
        {selectedIds.length === 0
          ? `No competencies selected. Search through ${competencies.length.toLocaleString()} available competencies.`
          : `${selectedIds.length} competency(ies) selected from ${competencies.length.toLocaleString()} total`}
      </p>
    </div>
  );
};

export default CompetencySearch;
