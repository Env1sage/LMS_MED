import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import CollegeLayout from '../../components/college/CollegeLayout';
import {
  GraduationCap, Search, Filter, PlusCircle, Edit2, Trash2,
  KeyRound, UserCheck, UserX, ChevronLeft, ChevronRight, RefreshCw, Download
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface Student {
  id: string;
  fullName: string;
  yearOfAdmission: number;
  expectedPassingYear: number;
  currentAcademicYear: string;
  status: string;
  users: { email: string; status: string; lastLoginAt: string | null };
}

const ACADEMIC_YEARS = [
  { value: '', label: 'All Years' },
  { value: 'YEAR_1', label: '1st Year' },
  { value: 'YEAR_2', label: '2nd Year' },
  { value: 'YEAR_3_MINOR', label: 'Year 3 (Part 1)' },
  { value: 'YEAR_3_MAJOR', label: 'Year 3 (Part 2)' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'FIRST_YEAR', label: '1st Year' },
  { value: 'SECOND_YEAR', label: '2nd Year' },
  { value: 'THIRD_YEAR', label: '3rd Year' },
  { value: 'FOURTH_YEAR', label: '4th Year' },
  { value: 'FIFTH_YEAR', label: '5th Year' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'GRADUATED', label: 'Graduated' },
  { value: 'DROPPED_OUT', label: 'Dropped Out' },
];

const CollegeStudents: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const limit = 20;

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (yearFilter) params.currentAcademicYear = yearFilter;
      const res = await studentService.getAll(params);
      if (Array.isArray(res)) { setStudents(res); setTotal(res.length); }
      else if (res.data) { setStudents(res.data); setTotal(res.total || res.data.length); }
      else { setStudents([]); setTotal(0); }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load students'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, yearFilter]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); } }, [success]);

  const handleActivate = async (id: string) => {
    try { await studentService.activate(id); setSuccess('Student activated'); fetchStudents(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleDeactivate = async (id: string) => {
    try { await studentService.deactivate(id); setSuccess('Student deactivated'); fetchStudents(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete student "${name}" permanently?`)) return;
    try { await studentService.delete(id); setSuccess('Student deleted'); fetchStudents(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to delete'); }
  };

  const formatYear = (y: string) => {
    const m: Record<string, string> = { FIRST_YEAR: '1st Year', SECOND_YEAR: '2nd Year', THIRD_YEAR: '3rd Year', FOURTH_YEAR: '4th Year', FIFTH_YEAR: '5th Year', INTERNSHIP: 'Internship', YEAR_1: '1st Year', YEAR_2: '2nd Year', YEAR_3_MINOR: 'Year 3 (Part 1)', YEAR_3_MAJOR: 'Year 3 (Part 2)', PART_1: 'Part 1', PART_2: 'Part 2' };
    return m[y] || y.replace(/_/g, ' ');
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      ACTIVE: { bg: '#ECFDF5', color: '#059669' },
      INACTIVE: { bg: '#FEF3C7', color: '#D97706' },
      GRADUATED: { bg: '#EFF6FF', color: '#2563EB' },
      DROPPED_OUT: { bg: '#FEF2F2', color: '#DC2626' },
    };
    const c = colors[status] || { bg: '#F3F4F6', color: '#6B7280' };
    return (
      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <CollegeLayout>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bo-text-primary)' }}>Student Management</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>{total} students total</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bo-btn bo-btn-outline" onClick={fetchStudents}><RefreshCw size={14} /> Refresh</button>
          <button className="bo-btn bo-btn-primary" style={{ background: '#059669' }} onClick={() => navigate('/college-admin/create-student')}>
            <PlusCircle size={14} /> Add Student
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}>×</button>
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>
      )}

      {/* Filters */}
      <div className="bo-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '8px 8px 8px 34px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, background: 'white', outline: 'none' }}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, background: 'white', outline: 'none' }}>
            {ACADEMIC_YEARS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="page-loading-screen" style={{ padding: 40 }}>
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
            <div className="loading-title">Loading Students</div>
            <div className="loading-bar-track">
              <div className="loading-bar-fill"></div>
            </div>
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--bo-text-muted)' }}>
            <GraduationCap size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 500 }}>No students found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filters or add new students</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bo-bg)', borderBottom: '1px solid var(--bo-border)' }}>
                {['Name', 'Email', 'Academic Year', 'Admission', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--bo-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bo-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{s.fullName}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--bo-text-secondary)' }}>{s.users?.email}</td>
                  <td style={{ padding: '10px 14px' }}>{formatYear(s.currentAcademicYear)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--bo-text-secondary)' }}>{s.yearOfAdmission}</td>
                  <td style={{ padding: '10px 14px' }}>{statusBadge(s.status)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--bo-text-muted)', fontSize: 12 }}>
                    {s.users?.lastLoginAt ? new Date(s.users.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button title="Edit" onClick={() => navigate(`/college-admin/edit-student/${s.id}`)}
                        style={{ padding: 5, border: '1px solid var(--bo-border)', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', color: '#3B82F6' }}>
                        <Edit2 size={14} />
                      </button>
                      <button title="Reset Password" onClick={() => navigate(`/college-admin/reset-password/${s.id}`)}
                        style={{ padding: 5, border: '1px solid var(--bo-border)', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', color: '#8B5CF6' }}>
                        <KeyRound size={14} />
                      </button>
                      {s.status === 'ACTIVE' ? (
                        <button title="Deactivate" onClick={() => handleDeactivate(s.id)}
                          style={{ padding: 5, border: '1px solid var(--bo-border)', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', color: '#F59E0B' }}>
                          <UserX size={14} />
                        </button>
                      ) : s.status === 'INACTIVE' ? (
                        <button title="Activate" onClick={() => handleActivate(s.id)}
                          style={{ padding: 5, border: '1px solid var(--bo-border)', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', color: '#10B981' }}>
                          <UserCheck size={14} />
                        </button>
                      ) : null}
                      <button title="Delete" onClick={() => handleDelete(s.id, s.fullName)}
                        style={{ padding: 5, border: '1px solid var(--bo-border)', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', color: '#EF4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 13, color: 'var(--bo-text-secondary)' }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="bo-btn bo-btn-outline" style={{ padding: '6px 10px' }}><ChevronRight size={14} /></button>
        </div>
      )}
    </CollegeLayout>
  );
};

export default CollegeStudents;
