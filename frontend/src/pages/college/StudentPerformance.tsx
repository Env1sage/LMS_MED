import React, { useState, useEffect } from 'react';
import { studentService } from '../../services/student.service';
import { useAuth } from '../../context/AuthContext';
import CollegeLayout from '../../components/college/CollegeLayout';
import {
  Users, Award, AlertTriangle, RefreshCw, Search,
  ChevronDown, ChevronUp, GraduationCap, BarChart3, Target,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

interface StudentScore {
  id: string; name: string; year: string; department: string; score: number;
  completionRate: number; avgTestScore: number; coursesCompleted: number;
  totalCourses: number; testsAttempted: number;
}
interface YearStat {
  year: string; count: number; avgScore: number;
  topPerformersCount: number; needAttentionCount: number;
}
interface PerformanceData {
  summary: { totalStudents: number; activeStudents: number; overallAvgScore: number; topPerformersCount: number; needAttentionCount: number };
  topPerformers: StudentScore[]; needAttention: StudentScore[]; yearWiseStats: YearStat[]; allStudents: StudentScore[];
}

const formatYear = (y: string) => {
  const m: Record<string, string> = {
    FIRST_YEAR: '1st Year', SECOND_YEAR: '2nd Year', THIRD_YEAR: '3rd Year',
    FOURTH_YEAR: '4th Year', FIFTH_YEAR: '5th Year', INTERNSHIP: 'Internship',
    YEAR_1: '1st Year', YEAR_2: '2nd Year', YEAR_3: '3rd Year',
    YEAR_4: '4th Year', YEAR_5: '5th Year',
    YEAR_3_MINOR: 'Year 3 (Part 1)', YEAR_3_MAJOR: 'Year 3 (Part 2)',
    YEAR_1_MINOR: '1st Year (Part 1)', YEAR_2_MINOR: '2nd Year (Part 1)',
    YEAR_4_MINOR: '4th Year (Part 1)', YEAR_5_MINOR: '5th Year (Part 1)',
    PART_1: 'Part 1', PART_2: 'Part 2',
    PRE_CLINICAL: 'Pre-Clinical', PARA_CLINICAL: 'Para-Clinical', CLINICAL: 'Clinical',
  };
  return m[y] || y.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const yearColors: Array<{ from: string; to: string; bg: string }> = [
  { from: '#059669', to: '#10B981', bg: '#ECFDF5' },
  { from: '#3B82F6', to: '#60A5FA', bg: '#EFF6FF' },
  { from: '#8B5CF6', to: '#A78BFA', bg: '#F5F3FF' },
  { from: '#F59E0B', to: '#FBBF24', bg: '#FFFBEB' },
  { from: '#EC4899', to: '#F472B6', bg: '#FDF2F8' },
  { from: '#06B6D4', to: '#22D3EE', bg: '#ECFEFF' },
];

const RadialGauge = ({ value, size = 80, sw = 7, color }: { value: number; size?: number; sw?: number; color: string }) => {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, o = c - (Math.min(value, 100) / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
};

const StudentPerformance: React.FC = () => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'top' | 'attention' | 'all'>('overview');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sortField, setSortField] = useState<'score' | 'completionRate' | 'avgTestScore' | 'name'>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try { setData(await studentService.getPerformanceAnalytics()); }
    catch (err: any) { setError(err.response?.data?.message || err.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };
  const sortIcon = (field: string) => sortField !== field ? null : sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  const scoreColor = (s: number) => s >= 80 ? '#10B981' : s >= 60 ? '#3B82F6' : s >= 40 ? '#F59E0B' : '#EF4444';
  const scoreBadge = (s: number) => s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Average' : 'At Risk';
  const scoreArrow = (s: number) => s >= 60 ? <ArrowUpRight size={13} /> : s >= 40 ? <Minus size={13} /> : <ArrowDownRight size={13} />;

  const getStudentList = () => {
    if (!data) return [];
    let list: StudentScore[] = tab === 'top' ? (data.topPerformers || []) : tab === 'attention' ? (data.needAttention || []) : (data.allStudents || []);
    if (search) list = list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.department.toLowerCase().includes(search.toLowerCase()));
    if (yearFilter !== 'all') list = list.filter(s => s.year === yearFilter);
    if (deptFilter !== 'all') list = list.filter(s => s.department === deptFilter);
    return [...list].sort((a, b) => sortField === 'name'
      ? (sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
      : (sortDir === 'desc' ? (b[sortField] || 0) - (a[sortField] || 0) : (a[sortField] || 0) - (b[sortField] || 0))
    );
  };

  const allYears = data ? Array.from(new Set((data.allStudents || []).map(s => s.year).filter(Boolean))).sort() : [];
  const allDepts = data ? Array.from(new Set((data.allStudents || []).map(s => s.department).filter(Boolean))).sort() : [];

  if (loading) return (
    <CollegeLayout>
      <div className="page-loading-screen">
        <div className="loading-rings"><div className="loading-ring loading-ring-1" /><div className="loading-ring loading-ring-2" /><div className="loading-ring loading-ring-3" /></div>
        <div className="loading-dots"><div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" /></div>
        <div className="loading-title">Loading Student Performance</div>
        <div className="loading-bar-track"><div className="loading-bar-fill" /></div>
      </div>
    </CollegeLayout>
  );

  const s = data?.summary;
  const thStyle: React.CSSProperties = { padding: '13px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.7px' };

  return (
    <CollegeLayout>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.3px' }}>Student Performance</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Track academic performance, identify top achievers and students needing support</p>
        </div>
        <button className="bo-btn bo-btn-outline" onClick={fetchData} style={{ gap: 6 }}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13, border: '1px solid #FECACA' }}>{error}</div>}

      {/* ── Summary Cards with accent bar ── */}
      {s && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total Students', value: s.totalStudents, color: '#059669', icon: <Users size={20} />, sub: 'enrolled' },
            { label: 'Active Students', value: s.activeStudents, color: '#3B82F6', icon: <GraduationCap size={20} />, sub: 'with activity' },
            { label: 'Avg Score', value: s.overallAvgScore.toFixed(1) + '%', color: '#8B5CF6', icon: <Target size={20} />, sub: 'overall' },
            { label: 'Top Performers', value: s.topPerformersCount, color: '#10B981', icon: <Award size={20} />, sub: 'score ≥ 80%' },
            { label: 'Need Attention', value: s.needAttentionCount, color: '#EF4444', icon: <AlertTriangle size={20} />, sub: 'score < 60%' },
          ].map((c, i) => (
            <div key={i} className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 3, background: `linear-gradient(90deg, ${c.color}, ${c.color}88)` }} />
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--bo-text-muted)', marginTop: 2 }}>{c.sub}</div>
                  </div>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>{c.icon}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Pills ── */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 6, background: 'var(--bo-bg)', padding: 4, borderRadius: 12, border: '1px solid var(--bo-border)' }}>
        {[
          { key: 'overview', label: 'Year Overview', icon: <BarChart3 size={14} /> },
          { key: 'top', label: `Top Performers (${s?.topPerformersCount || 0})`, icon: <Award size={14} /> },
          { key: 'attention', label: `Need Attention (${s?.needAttentionCount || 0})`, icon: <AlertTriangle size={14} /> },
          { key: 'all', label: 'All Students', icon: <Users size={14} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: tab === t.key ? '#059669' : 'transparent', color: tab === t.key ? 'white' : 'var(--bo-text-secondary)',
            transition: 'all 0.2s', boxShadow: tab === t.key ? '0 2px 8px rgba(5,150,105,0.25)' : 'none',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ═══════ YEAR OVERVIEW ═══════ */}
      {tab === 'overview' && data?.yearWiseStats && (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Year Cards with radial gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
            {data.yearWiseStats.map((ys, i) => {
              const c = yearColors[i % yearColors.length];
              return (
                <div key={i} className="bo-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${c.from}, ${c.to})` }} />
                  <div style={{ padding: '20px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: c.from, marginBottom: 2 }}>{formatYear(ys.year)}</h3>
                        <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>{ys.count} student{ys.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ position: 'relative', width: 76, height: 76 }}>
                        <RadialGauge value={ys.avgScore} size={76} color={scoreColor(ys.avgScore)} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 17, fontWeight: 700, color: scoreColor(ys.avgScore), lineHeight: 1 }}>{ys.avgScore.toFixed(0)}</span>
                          <span style={{ fontSize: 8, color: 'var(--bo-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>avg%</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 5, borderRadius: 3, background: '#F3F4F6', marginBottom: 14 }}>
                      <div style={{ width: `${Math.min(ys.avgScore, 100)}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${c.from}, ${c.to})`, transition: 'width 0.6s' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div style={{ padding: '10px 8px', borderRadius: 10, background: c.bg, textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: c.from }}>{ys.count}</div>
                        <div style={{ fontSize: 9, color: c.from, fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Total</div>
                      </div>
                      <div style={{ padding: '10px 8px', borderRadius: 10, background: '#ECFDF5', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>{ys.topPerformersCount}</div>
                        <div style={{ fontSize: 9, color: '#059669', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Top</div>
                      </div>
                      <div style={{ padding: '10px 8px', borderRadius: 10, background: '#FEF2F2', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#EF4444' }}>{ys.needAttentionCount}</div>
                        <div style={{ fontSize: 9, color: '#DC2626', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>At Risk</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {data.yearWiseStats.length === 0 && (
            <div className="bo-card" style={{ padding: 60, textAlign: 'center' }}>
              <BarChart3 size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 500 }}>No year-wise data available</div>
            </div>
          )}

          {/* Horizontal comparison bars */}
          {data.yearWiseStats.length > 1 && (
            <div className="bo-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Year-wise Comparison</h3>
              <p style={{ fontSize: 12, color: 'var(--bo-text-muted)', marginBottom: 20 }}>Average performance score by academic year</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.yearWiseStats.map((ys, i) => {
                  const c = yearColors[i % yearColors.length];
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: `linear-gradient(135deg, ${c.from}, ${c.to})` }} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{formatYear(ys.year)}</span>
                          <span style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>({ys.count})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: scoreColor(ys.avgScore) }}>{ys.avgScore.toFixed(1)}%</span>
                          <span style={{ color: scoreColor(ys.avgScore) }}>{scoreArrow(ys.avgScore)}</span>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: 22, borderRadius: 8, background: '#F3F4F6', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(ys.avgScore, 100)}%`, height: '100%', borderRadius: 8,
                          background: `linear-gradient(90deg, ${c.from}, ${c.to})`, transition: 'width 0.6s',
                          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                        }}>
                          {ys.avgScore > 12 && <span style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{ys.avgScore.toFixed(0)}%</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--bo-border)' }}>
                {[{ l: 'Excellent (≥80%)', c: '#10B981' }, { l: 'Good (60-79%)', c: '#3B82F6' }, { l: 'Average (40-59%)', c: '#F59E0B' }, { l: 'At Risk (<40%)', c: '#EF4444' }].map((x, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: x.c }} />
                    <span style={{ fontSize: 11, color: 'var(--bo-text-muted)', fontWeight: 500 }}>{x.l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ STUDENT TABLES ═══════ */}
      {tab !== 'overview' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bo-text-muted)' }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or department..."
                style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--bo-border)', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--bo-bg)' }} />
            </div>
            {allYears.length > 0 && (
              <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                style={{ padding: '10px 14px', border: '1px solid var(--bo-border)', borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer' }}>
                <option value="all">All Years</option>
                {allYears.map(y => <option key={y} value={y}>{formatYear(y)}</option>)}
              </select>
            )}
            {allDepts.length > 1 && (
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                style={{ padding: '10px 14px', border: '1px solid var(--bo-border)', borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer' }}>
                <option value="all">All Departments</option>
                {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>

          <div className="bo-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12 }}>
            {getStudentList().length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #0a2e36, #1a4a54)' }}>
                    <th style={{ ...thStyle, textAlign: 'center', width: 44 }}>#</th>
                    <th onClick={() => handleSort('name')} style={{ ...thStyle, cursor: 'pointer' }}>Student {sortIcon('name')}</th>
                    <th style={thStyle}>Dept / Year</th>
                    <th onClick={() => handleSort('score')} style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }}>Score {sortIcon('score')}</th>
                    <th onClick={() => handleSort('completionRate')} style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }}>Completion {sortIcon('completionRate')}</th>
                    <th onClick={() => handleSort('avgTestScore')} style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }}>Test Score {sortIcon('avgTestScore')}</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Courses</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Tests</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getStudentList().map((st, idx) => (
                    <tr key={st.id} style={{ borderBottom: '1px solid var(--bo-border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fffe')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, background: idx < 3 ? '#059669' : '#F3F4F6', color: idx < 3 ? 'white' : 'var(--bo-text-muted)',
                        }}>{idx + 1}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{st.name}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{st.department}</div>
                        <div style={{ fontSize: 11, color: 'var(--bo-text-muted)' }}>{formatYear(st.year)}</div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${scoreColor(st.score)}12`, color: scoreColor(st.score), display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          {scoreArrow(st.score)} {st.score.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 6, borderRadius: 3, background: '#E5E7EB' }}>
                            <div style={{ width: `${Math.min(st.completionRate, 100)}%`, height: '100%', borderRadius: 3, background: st.completionRate >= 70 ? '#10B981' : st.completionRate >= 40 ? '#F59E0B' : '#EF4444', transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 30 }}>{st.completionRate.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: scoreColor(st.avgTestScore) }}>{st.avgTestScore.toFixed(0)}%</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ color: '#059669', fontWeight: 700 }}>{st.coursesCompleted}</span>
                        <span style={{ color: 'var(--bo-text-muted)' }}> / {st.totalCourses}</span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 500, color: 'var(--bo-text-secondary)' }}>{st.testsAttempted}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${scoreColor(st.score)}10`, color: scoreColor(st.score), textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          {scoreBadge(st.score)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <Users size={40} style={{ color: 'var(--bo-text-muted)', opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600 }}>No students found</div>
                <div style={{ color: 'var(--bo-text-muted)', fontSize: 12, marginTop: 4 }}>
                  {tab === 'top' ? 'No students with score ≥ 80% yet' : tab === 'attention' ? 'No students flagged — great!' : 'No student data available'}
                </div>
              </div>
            )}
          </div>

          {getStudentList().length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--bo-text-muted)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
              <span style={{ padding: '2px 8px', borderRadius: 8, background: 'var(--bo-bg)', fontWeight: 600 }}>{getStudentList().length}</span>
              student{getStudentList().length !== 1 ? 's' : ''}
              {yearFilter !== 'all' ? ` in ${formatYear(yearFilter)}` : ''}
              {deptFilter !== 'all' ? ` · ${deptFilter}` : ''}
            </div>
          )}
        </div>
      )}
    </CollegeLayout>
  );
};

export default StudentPerformance;
