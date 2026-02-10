import React, { useState, useEffect, useCallback } from 'react';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import { facultyAnalyticsService, StudentInfo } from '../../services/faculty-analytics.service';
import { Search, Users, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const ACCENT = '#7C3AED';

type FilterType = 'all' | 'active' | 'assigned';
type SortField = 'name' | 'progress' | 'coursesEnrolled';
type SortDir = 'asc' | 'desc';

const FacultyStudents: React.FC = () => {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await facultyAnalyticsService.getAllStudents(filter);
      setStudents(res.students || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = students
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'progress') cmp = (a.progress || 0) - (b.progress || 0);
      else if (sortField === 'coursesEnrolled') cmp = (a.coursesEnrolled || 0) - (b.coursesEnrolled || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const activeCount = students.filter(s => s.isActive).length;
  const avgProgress = students.length > 0 ? Math.round(students.reduce((sum, s) => sum + (s.progress || 0), 0) / students.length) : 0;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={14} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={14} style={{ color: ACCENT }} /> : <ChevronDown size={14} style={{ color: ACCENT }} />;
  };

  const getProgressColor = (p: number) => p >= 80 ? '#10B981' : p >= 50 ? '#F59E0B' : p >= 20 ? '#3B82F6' : '#EF4444';

  if (loading) return (
    <FacultyLayout>
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
        <div className="loading-title">Loading Students...</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </FacultyLayout>
  );

  return (
    <FacultyLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', margin: 0 }}>My Students</h1>
        <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>Students enrolled in your courses</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Students', value: total, color: ACCENT, icon: '👥' },
          { label: 'Active Students', value: activeCount, color: '#10B981', icon: '✅' },
          { label: 'Avg. Progress', value: `${avgProgress}%`, color: '#3B82F6', icon: '📊' },
        ].map((s, i) => (
          <div key={i} className="bo-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--bo-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 14, background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bo-bg)', borderRadius: 8 }}>
          {(['all', 'active', 'assigned'] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: filter === f ? ACCENT : 'transparent', color: filter === f ? '#fff' : 'var(--bo-text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
          <Users size={48} style={{ color: 'var(--bo-text-muted)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>No students found</h3>
          <p style={{ color: 'var(--bo-text-secondary)', fontSize: 14 }}>Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--bo-bg)' }}>
                  <th onClick={() => toggleSort('name')} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Name <SortIcon field="name" /></span>
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>Year</th>
                  <th onClick={() => toggleSort('coursesEnrolled')} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>Courses <SortIcon field="coursesEnrolled" /></span>
                  </th>
                  <th onClick={() => toggleSort('progress')} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Progress <SortIcon field="progress" /></span>
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--bo-border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: ACCENT, flexShrink: 0 }}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--bo-text-secondary)', fontSize: 13 }}>{s.email}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13 }}>{({'YEAR_1':'Year 1','YEAR_2':'Year 2','YEAR_3':'Year 3','YEAR_3_MINOR':'Year 3 (Part 1)','YEAR_3_MAJOR':'Year 3 (Part 2)','YEAR_4':'Year 4','YEAR_5':'Year 5','FIRST_YEAR':'1st Year','SECOND_YEAR':'2nd Year','THIRD_YEAR':'3rd Year','FOURTH_YEAR':'4th Year','FIFTH_YEAR':'5th Year','INTERNSHIP':'Internship','PART_1':'Part 1','PART_2':'Part 2'} as Record<string,string>)[s.academicYear] || s.academicYear || '—'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: ACCENT }}>{s.coursesEnrolled}</span>
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${s.progress || 0}%`, background: getProgressColor(s.progress || 0), borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: getProgressColor(s.progress || 0), minWidth: 36, textAlign: 'right' }}>{s.progress || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.isActive ? '#D1FAE5' : '#FEE2E2', color: s.isActive ? '#065F46' : '#991B1B' }}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bo-border)', fontSize: 13, color: 'var(--bo-text-muted)' }}>
            Showing {filtered.length} of {total} students
          </div>
        </div>
      )}
    </FacultyLayout>
  );
};

export default FacultyStudents;
