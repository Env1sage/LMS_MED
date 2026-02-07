import React, { useState, useEffect, useCallback, useRef } from 'react';
import { topicsService, Topic } from '../services/topics.service';
import './TopicSearch.css';

interface TopicCompetency {
  id: string;
  code: string;
  title: string;
  description: string;
  domain: string;
  academicLevel: string;
  subject: string;
}

interface TopicSearchProps {
  selectedTopicId?: string;
  selectedSubject?: string;
  onTopicSelect: (topic: Topic | null) => void;
  onSubjectSelect?: (subject: string) => void;
  onCompetenciesLoad?: (competencies: TopicCompetency[]) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

const TopicSearch: React.FC<TopicSearchProps> = ({
  selectedTopicId,
  selectedSubject,
  onTopicSelect,
  onSubjectSelect,
  onCompetenciesLoad,
  disabled = false,
  placeholder = 'Search topics from CBME repository...',
  required = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [loadingCompetencies, setLoadingCompetencies] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load subjects on mount
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const subjectList = await topicsService.getSubjects();
        setSubjects(subjectList);
      } catch (error) {
        console.error('Failed to load subjects:', error);
      }
    };
    loadSubjects();
  }, []);

  // Load selected topic if selectedTopicId is provided
  useEffect(() => {
    if (selectedTopicId && !selectedTopic) {
      const loadTopic = async () => {
        try {
          const topic = await topicsService.getById(selectedTopicId);
          setSelectedTopic(topic);
          setSearchQuery(topic.name);
        } catch (error) {
          console.error('Failed to load topic:', error);
        }
      };
      loadTopic();
    }
  }, [selectedTopicId, selectedTopic]);

  // Search topics when query changes
  const searchTopics = useCallback(async (query: string) => {
    if (query.length < 2) {
      setTopics([]);
      return;
    }

    setLoading(true);
    try {
      const results = await topicsService.search(query, selectedSubject);
      setTopics(results);
      setShowDropdown(true);
    } catch (error) {
      console.error('Failed to search topics:', error);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject]);

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous selection if user starts typing
    if (selectedTopic && query !== selectedTopic.name) {
      setSelectedTopic(null);
      onTopicSelect(null);
      onCompetenciesLoad?.([]);
    }

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchTopics(query);
    }, 300);
  };

  // Handle topic selection - also auto-load competencies
  const handleTopicSelect = async (topic: Topic) => {
    setSelectedTopic(topic);
    setSearchQuery(topic.name);
    setShowDropdown(false);
    onTopicSelect(topic);

    // Auto-load competencies for this topic
    if (onCompetenciesLoad) {
      setLoadingCompetencies(true);
      try {
        const result = await topicsService.getCompetenciesByTopic(topic.id);
        onCompetenciesLoad(result.competencies);
      } catch (error) {
        console.error('Failed to load competencies for topic:', error);
        onCompetenciesLoad([]);
      } finally {
        setLoadingCompetencies(false);
      }
    }
  };

  // Handle subject filter change
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subject = e.target.value;
    onSubjectSelect?.(subject);
    // Clear current selection when subject changes
    setSelectedTopic(null);
    setSearchQuery('');
    onTopicSelect(null);
    onCompetenciesLoad?.([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear selection
  const handleClear = () => {
    setSelectedTopic(null);
    setSearchQuery('');
    setTopics([]);
    onTopicSelect(null);
    onCompetenciesLoad?.([]);
  };

  return (
    <div className="topic-search" ref={searchRef}>
      <div className="topic-search-filters">
        <select
          value={selectedSubject || ''}
          onChange={handleSubjectChange}
          disabled={disabled}
          className="subject-filter"
        >
          <option value="">All Subjects</option>
          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      <div className="topic-search-input-container">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => searchQuery.length >= 2 && topics.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required && !selectedTopic}
          className={`topic-search-input ${selectedTopic ? 'has-selection' : ''}`}
        />
        {(loading || loadingCompetencies) && <span className="topic-search-spinner">⏳</span>}
        {selectedTopic && (
          <button
            type="button"
            onClick={handleClear}
            className="topic-search-clear"
            disabled={disabled}
          >
            ✕
          </button>
        )}
      </div>

      {selectedTopic && (
        <div className="topic-selected-info">
          <span className="topic-code">{selectedTopic.code}</span>
          <span className="topic-subject">{selectedTopic.subject}</span>
          {loadingCompetencies && <span className="loading-competencies">Loading competencies...</span>}
        </div>
      )}

      {showDropdown && topics.length > 0 && (
        <div className="topic-search-dropdown">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className={`topic-search-item ${selectedTopic?.id === topic.id ? 'selected' : ''}`}
              onClick={() => handleTopicSelect(topic)}
            >
              <div className="topic-item-name">{topic.name}</div>
              <div className="topic-item-meta">
                <span className="topic-item-code">{topic.code}</span>
                <span className="topic-item-subject">{topic.subject}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && searchQuery.length >= 2 && topics.length === 0 && !loading && (
        <div className="topic-search-dropdown">
          <div className="topic-search-no-results">
            No topics found. Please search in the CBME repository.
          </div>
        </div>
      )}

      {required && !selectedTopic && (
        <p className="topic-search-hint">
          Topic selection is mandatory. Search and select from the CBME repository.
        </p>
      )}
    </div>
  );
};

export default TopicSearch;
