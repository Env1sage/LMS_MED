/**
 * HOD Students page — shows students scoped to HOD's department.
 * Reuses CollegeStudents layout but rendered inside HodLayout.
 */
import React, { useState, useEffect, useCallback } from 'react';
import governanceService from '../../services/governance.service';
import HodLayout from '../../components/hod/HodLayout';
import {
  GraduationCap, Search, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';
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

const ACADEMIC_YEARS = [
  { value: '', label: 'All Years' },
  { value: 'FIRST_YEAR', label: 'First Year' },
  { value: 'SECOND_YEAR', label: 'Second Year' },
  { value: 'YEAR_3_PART1', label: 'Third Year (Part 1)' },
  { value: 'YEAR_3_PART2', label: 'Third Year (Part 2)' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'GRADUATED', label: 'Graduated' },
];

const YEAR_LABELS: Record<string, string> = {
  FIRST_YEAR: 'First Year', SECOND_YEAR: 'Second Year',
  YEAR_3_PART1: 'Third Year (Part 1)', YEAR_3_PART2: 'Third Year (Part 2)', INTERNSHIP: 'Internship',
};

const HodStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (yearFilter) params.currentAcademicYear = yearFilter;
      const res = await governanceService.getHodStudents(params);
      setStudents(res.data || []);
      setTotal(res.meta?.total || res.data?.length || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, yearFilter]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const totalPages = Math.ceil(total / limit);

  return (
    <HodLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <GraduationCap size={24} color="#2563EB" />
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Department Students</h1>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--bo-text-muted)' }}>{total} total</span>
        <button onClick={fetchStudents} className="bo-btn bo-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            style={{ paddingLeft: 32, width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1); }}
          style={{ height: 36, borderRadius: 8, border: '1px solid var(--bo-border)', padding: '0 10px', fontSize: 13 }}>
          {ACADEMIC_YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ height: 36, borderRadius: 8, border: '1px solid var(--bo-border)', padding: '0 10px', fontSize: 13 }}>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>Loading…</div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>No students found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--bo-border)' }}>
                {['Name', 'Email', 'Academic Year', 'Status', 'Last Login'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--bo-border)', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{s.fullName}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--bo-text-muted)' }}>{s.user?.email}</td>
                  <td style={{ padding: '12px 16px' }}>{YEAR_LABELS[s.currentAcademicYear] || s.currentAcademicYear}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: s.status === 'ACTIVE' ? '#ECFDF5' : '#FEF2F2',
                      color: s.status === 'ACTIVE' ? '#059669' : '#DC2626',
                    }}>{s.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--bo-text-muted)' }}>
                    {s.user?.lastLoginAt ? formatDate(s.user.lastLoginAt) : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13, color: 'var(--bo-text-muted)' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </HodLayout>
  );
};

export default HodStudents;
