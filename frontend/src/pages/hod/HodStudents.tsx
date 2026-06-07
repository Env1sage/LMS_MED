/**
 * HOD Students page — shows students of the year corresponding to HOD's department.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import governanceService from '../../services/governance.service';
import HodLayout from '../../components/hod/HodLayout';
import { GraduationCap, Search, RefreshCw } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';
import { formatDate } from '../../utils/dateUtils';

interface Student {
  id: string;
  fullName: string;
  yearOfAdmission: number;
  expectedPassingYear: number;
  currentAcademicYear: string;
  status: string;
  user: { id?: string; email: string; status: string; lastLoginAt: string | null };
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'GRADUATED', label: 'Graduated' },
];

const YEAR_LABEL: Record<string, string> = {
  YEAR_1: 'Year 1', YEAR_2: 'Year 2',
  YEAR_3_PART1: 'Year 3 Part 1', YEAR_3_PART2: 'Year 3 Part 2', INTERNSHIP: 'Internship',
  FIRST_YEAR: 'Year 1', SECOND_YEAR: 'Year 2',
  YEAR_3_MINOR: 'Year 3 Part 1', YEAR_3_MAJOR: 'Year 3 Part 2',
  THIRD_YEAR: 'Year 3 Part 1', FOURTH_YEAR: 'Year 3 Part 2', FIFTH_YEAR: 'Internship',
  PART_1: 'Year 3 Part 1', PART_2: 'Year 3 Part 2',
  YEAR_3: 'Year 3 Part 1', YEAR_4: 'Year 3 Part 2', YEAR_5: 'Internship',
};

// Normalize all aliases to canonical key
const CANONICAL: Record<string, string> = {
  YEAR_1: 'YEAR_1', FIRST_YEAR: 'YEAR_1',
  YEAR_2: 'YEAR_2', SECOND_YEAR: 'YEAR_2',
  YEAR_3_PART1: 'YEAR_3_PART1', YEAR_3_MINOR: 'YEAR_3_PART1', YEAR_3: 'YEAR_3_PART1', THIRD_YEAR: 'YEAR_3_PART1', PART_1: 'YEAR_3_PART1',
  YEAR_3_PART2: 'YEAR_3_PART2', YEAR_3_MAJOR: 'YEAR_3_PART2', YEAR_4: 'YEAR_3_PART2', FOURTH_YEAR: 'YEAR_3_PART2', PART_2: 'YEAR_3_PART2',
  INTERNSHIP: 'INTERNSHIP', YEAR_5: 'INTERNSHIP', FIFTH_YEAR: 'INTERNSHIP',
};

const YEAR_BADGE: Record<string, { bg: string; accent: string }> = {
  YEAR_1:       { bg: '#EFF6FF', accent: '#2563EB' },
  YEAR_2:       { bg: '#F0FDF4', accent: '#16A34A' },
  YEAR_3_PART1: { bg: '#FFF7ED', accent: '#D97706' },
  YEAR_3_PART2: { bg: '#FDF4FF', accent: '#9333EA' },
  INTERNSHIP:   { bg: '#FFF1F2', accent: '#E11D48' },
};

const HodStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptYear, setDeptYear] = useState<string | null>(null);
  const [deptName, setDeptName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Load HOD's department year once
  useEffect(() => {
    governanceService.getMyDepartments().then(depts => {
      if (depts && depts.length > 0) {
        const year = (depts[0] as any).academicYear || null;
        setDeptYear(year ? (CANONICAL[year] || year) : null);
        setDeptName(depts[0].name);
      }
    }).catch(() => {});
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await governanceService.getHodStudents({ page: 1, limit: 500 });
      setStudents(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const canonical = CANONICAL[s.currentAcademicYear] || s.currentAcademicYear;
      // If HOD has a known dept year, show only that year's students
      if (deptYear && canonical !== deptYear) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.fullName?.toLowerCase().includes(q) && !s.user?.email?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [students, deptYear, statusFilter, search]);

  const yearInfo = deptYear ? YEAR_BADGE[deptYear] : null;

  return (
    <HodLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <GraduationCap size={24} color="#2563EB" />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Students</h1>
          {deptName && (
            <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', margin: '2px 0 0' }}>
              {deptName} department
            </p>
          )}
        </div>
        <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>{filtered.length} students</span>
        <button onClick={fetchStudents} className="bo-btn bo-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Year banner */}
      {deptYear && yearInfo && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: yearInfo.bg, border: `1px solid ${yearInfo.accent}33`, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: yearInfo.accent, display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: yearInfo.accent }}>
            {YEAR_LABEL[deptYear] || deptYear} Students
          </span>
          <span style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginLeft: 4 }}>
            — Showing students enrolled in your year
          </span>
        </div>
      )}

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ paddingLeft: 32, width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ height: 36, borderRadius: 8, border: '1px solid var(--bo-border)', padding: '0 10px', fontSize: 13 }}>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--bo-text-muted)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bo-card" style={{ textAlign: 'center', padding: 48 }}>
          <GraduationCap size={40} color="var(--bo-text-muted)" style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ color: 'var(--bo-text-muted)' }}>
            {deptYear ? `No ${YEAR_LABEL[deptYear] || deptYear} students found` : 'No students found'}
          </p>
        </div>
      ) : (
        <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--bo-border)' }}>
                {['Name', 'Email', 'Status', 'Last Login'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--bo-border)', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                  <td style={{ padding: '11px 16px', fontWeight: 500 }}>{s.fullName}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--bo-text-muted)' }}>{s.user?.email}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: s.status === 'ACTIVE' ? '#ECFDF5' : s.status === 'GRADUATED' ? '#EFF6FF' : '#FEF2F2',
                      color: s.status === 'ACTIVE' ? '#059669' : s.status === 'GRADUATED' ? '#2563EB' : '#DC2626',
                    }}>{s.status}</span>
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--bo-text-muted)' }}>
                    {s.user?.lastLoginAt ? formatDate(s.user.lastLoginAt) : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HodLayout>
  );
};

export default HodStudents;
