/**
 * HOD Student Performance page — adapts StudentPerformance for HodLayout.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import HodLayout from '../../components/hod/HodLayout';
import { studentService } from '../../services/student.service';
import { Target, RefreshCw, Search, Award, AlertTriangle, GraduationCap } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const YEAR_LABELS: Record<string, string> = {
  FIRST_YEAR: '1st Year', SECOND_YEAR: '2nd Year', YEAR_3_PART1: 'Year 3 Part 1',
  YEAR_3_PART2: 'Year 3 Part 2', INTERNSHIP: 'Internship',
};

interface StudentPerf {
  id: string; name: string; email: string; year: string;
  completionRate: number; avgTestScore: number; coursesCompleted: number; totalCourses: number;
}

const HodStudentPerformance: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<StudentPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await studentService.getPerformanceAnalytics();
      setData(res.allStudents || res.students || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load student performance');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = data.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const topPerformers = data.filter(s => s.completionRate >= 80).length;
  const needAttention = data.filter(s => s.completionRate < 40).length;

  return (
    <HodLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Target size={24} color="#DC2626" />
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Student Performance</h1>
        <button onClick={fetchData} className="bo-btn bo-btn-outline" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}

      {/* Summary */}
      {data.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total Students', value: data.length, color: '#2563EB', icon: <GraduationCap size={18} /> },
            { label: 'Top Performers (≥80%)', value: topPerformers, color: '#059669', icon: <Award size={18} /> },
            { label: 'Need Attention (<40%)', value: needAttention, color: '#DC2626', icon: <AlertTriangle size={18} /> },
          ].map((s, i) => (
            <div key={i} className="bo-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student…"
            style={{ paddingLeft: 32, width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--bo-border)', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
      </div>

      <div className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--bo-text-muted)' }}>
            {data.length === 0 ? 'No performance data available yet' : 'No students match your search'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--bo-border)' }}>
                {['Student', 'Year', 'Completion', 'Avg Test Score', 'Courses Done'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--bo-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--bo-border)', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--bo-text-muted)' }}>{YEAR_LABELS[s.year] || s.year}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 70, height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.completionRate}%`, background: s.completionRate >= 80 ? '#059669' : s.completionRate >= 40 ? '#F59E0B' : '#DC2626', borderRadius: 3 }} />
                      </div>
                      <span>{s.completionRate?.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{s.avgTestScore?.toFixed(1) ?? '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{s.coursesCompleted ?? 0} / {s.totalCourses ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </HodLayout>
  );
};

export default HodStudentPerformance;
