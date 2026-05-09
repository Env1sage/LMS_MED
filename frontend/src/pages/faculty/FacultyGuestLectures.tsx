import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FacultyLayout from '../../components/faculty/FacultyLayout';
import apiService from '../../services/api.service';
import {
  ArrowLeft, Plus, Calendar, Clock, MapPin, Users, Video, Trash2, Edit3,
  ChevronDown, ChevronUp, CheckCircle, Search, X, Eye
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

const ACCENT = '#7C3AED';

interface GuestLecture {
  id: string;
  title: string;
  description: string;
  speaker: string;
  speakerBio: string | null;
  type: 'GUEST_LECTURE' | 'WORKSHOP' | 'SEMINAR' | 'WEBINAR';
  date: string;
  startTime: string;
  endTime: string;
  venue: string | null;
  meetingLink: string | null;
  capacity: number;
  registrationCount: number;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  department: string | null;
  creator?: { id: string; fullName: string; email: string };
  _count?: { registrations: number };
  registrations?: Array<{
    id: string;
    attended: boolean;
    student: { id: string; user: { fullName: string; email: string } };
  }>;
}

const emptyForm = {
  title: '', description: '', speaker: '', speakerBio: '', type: 'GUEST_LECTURE' as string,
  date: '', startTime: '', endTime: '', venue: '', meetingLink: '', capacity: 50, department: '',
};

const typeLabels: Record<string, string> = {
  GUEST_LECTURE: 'Guest Lecture', WORKSHOP: 'Workshop', SEMINAR: 'Seminar', WEBINAR: 'Webinar',
};
const statusColors: Record<string, string> = {
  UPCOMING: '#3B82F6', ONGOING: '#10B981', COMPLETED: '#6B7280', CANCELLED: '#EF4444',
};

const FacultyGuestLectures: React.FC = () => {
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<GuestLecture[]>([])
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailLecture, setDetailLecture] = useState<GuestLecture | null>(null);
  const [search, setSearch] = useState('');
  const [attendanceIds, setAttendanceIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await apiService.get('/guest-lectures/my-lectures');
      setLectures(res.data);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (l: GuestLecture) => {
    setForm({
      title: l.title, description: l.description, speaker: l.speaker,
      speakerBio: l.speakerBio || '', type: l.type, date: l.date.slice(0, 10),
      startTime: l.startTime, endTime: l.endTime, venue: l.venue || '',
      meetingLink: l.meetingLink || '', capacity: l.capacity, department: l.department || '',
    });
    setEditId(l.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.speaker || !form.date || !form.startTime || !form.endTime) return;
    setSaving(true);
    try {
      if (editId) {
        await apiService.put(`/guest-lectures/${editId}`, form);
      } else {
        await apiService.post('/guest-lectures', form);
      }
      setShowForm(false);
      load();
    } catch { /* empty */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this lecture?')) return;
    try { await apiService.delete(`/guest-lectures/${id}`); load(); } catch { /* empty */ }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try { await apiService.put(`/guest-lectures/${id}`, { status }); load(); } catch { /* empty */ }
  };

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); setDetailLecture(null); return; }
    try {
      const res = await apiService.get(`/guest-lectures/${id}`);
      setDetailLecture(res.data);
      setExpanded(id);
      // Pre-fill attended students
      const attended = new Set<string>();
      (res.data.registrations || []).forEach((r: any) => { if (r.attended) attended.add(r.student.id); });
      setAttendanceIds(attended);
    } catch { /* empty */ }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendanceIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return next;
    });
  };

  const saveAttendance = async (lectureId: string) => {
    try {
      await apiService.post(`/guest-lectures/${lectureId}/attendance`, {
        studentIds: Array.from(attendanceIds),
      });
      // Reload detail in-place without closing the panel
      const res = await apiService.get(`/guest-lectures/${lectureId}`);
      setDetailLecture(res.data);
      const attended = new Set<string>();
      (res.data.registrations || []).forEach((r: any) => { if (r.attended) attended.add(r.student.id); });
      setAttendanceIds(attended);
    } catch { /* empty */ }
  };

  const filtered = lectures.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.speaker.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: lectures.length,
    upcoming: lectures.filter(l => l.status === 'UPCOMING').length,
    totalRegistrations: lectures.reduce((s, l) => s + l.registrationCount, 0),
  };

  return (
    <FacultyLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/faculty')}
          className="bo-btn bo-btn-outline"
          style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text)' }}>Guest Lectures</h1>
            <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>Create and manage guest lectures, workshops & seminars</p>
          </div>
          <button onClick={openCreate} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontWeight: 600, fontSize: 14,
          }}>
            <Plus size={18} /> Create Lecture
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Lectures', value: stats.total, color: ACCENT },
            { label: 'Upcoming', value: stats.upcoming, color: '#3B82F6' },
            { label: 'Total Registrations', value: stats.totalRegistrations, color: '#10B981' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 12, padding: 20, border: '1px solid var(--bo-border)',
            }}>
              <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--bo-text-muted)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or speaker..."
            style={{
              width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8,
              border: '1px solid var(--bo-border)', fontSize: 14, outline: 'none',
            }}
          />
        </div>

        {/* Lectures list */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--bo-text-muted)', padding: 40 }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12,
            border: '1px solid var(--bo-border)', color: 'var(--bo-text-muted)',
          }}>
            <Calendar size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>No guest lectures yet. Create your first one!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(l => (
              <div key={l.id} style={{
                background: '#fff', borderRadius: 12, border: '1px solid var(--bo-border)',
                overflow: 'hidden',
              }}>
                {/* Card header */}
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                          background: `${statusColors[l.status]}15`, color: statusColors[l.status],
                        }}>{l.status}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 500, padding: '2px 10px', borderRadius: 20,
                          background: '#F3F4F6', color: '#6B7280',
                        }}>{typeLabels[l.type]}</span>
                      </div>
                      <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--bo-text)', margin: '4px 0' }}>{l.title}</h3>
                      <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', margin: 0 }}>Speaker: <strong>{l.speaker}</strong></p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {l.status === 'UPCOMING' && (
                        <>
                          <button onClick={() => handleStatusChange(l.id, 'ONGOING')} title="Start" style={{
                            padding: '6px 12px', borderRadius: 6, border: '1px solid #10B981',
                            background: '#ECFDF5', color: '#10B981', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          }}>Start</button>
                          <button onClick={() => openEdit(l)} style={{
                            padding: 6, borderRadius: 6, border: '1px solid var(--bo-border)',
                            background: '#fff', cursor: 'pointer',
                          }}><Edit3 size={14} /></button>
                        </>
                      )}
                      {l.status === 'ONGOING' && (
                        <button onClick={() => handleStatusChange(l.id, 'COMPLETED')} style={{
                          padding: '6px 12px', borderRadius: 6, border: '1px solid #6B7280',
                          background: '#F9FAFB', color: '#6B7280', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}>End</button>
                      )}
                      <button onClick={() => handleDelete(l.id)} style={{
                        padding: 6, borderRadius: 6, border: '1px solid #FCA5A5',
                        background: '#FFF5F5', cursor: 'pointer',
                      }}><Trash2 size={14} color="#EF4444" /></button>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--bo-text-secondary)' }}>
                      <Calendar size={14} /> {formatDate(l.date)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--bo-text-secondary)' }}>
                      <Clock size={14} /> {l.startTime} – {l.endTime}
                    </span>
                    {l.venue && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--bo-text-secondary)' }}>
                        <MapPin size={14} /> {l.venue}
                      </span>
                    )}
                    {l.meetingLink && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#3B82F6' }}>
                        <Video size={14} /> Online
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--bo-text-secondary)' }}>
                      <Users size={14} /> {l.registrationCount}/{l.capacity}
                    </span>
                  </div>
                </div>

                {/* Expand / Registration list */}
                <div style={{ borderTop: '1px solid var(--bo-border)' }}>
                  <button onClick={() => toggleExpand(l.id)} style={{
                    width: '100%', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: 'none', background: '#FAFAFA', cursor: 'pointer', fontSize: 13, color: 'var(--bo-text-secondary)',
                  }}>
                    <span><Eye size={14} style={{ marginRight: 6 }} />View Registrations & Attendance</span>
                    {expanded === l.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expanded === l.id && detailLecture && (
                    <div style={{ padding: 20, background: '#FAFAFA' }}>
                      {(!detailLecture.registrations || detailLecture.registrations.length === 0) ? (
                        <p style={{ color: 'var(--bo-text-muted)', fontSize: 13 }}>No registrations yet.</p>
                      ) : (
                        <>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--bo-border)' }}>
                                <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--bo-text-muted)', fontWeight: 600 }}>Student</th>
                                <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--bo-text-muted)', fontWeight: 600 }}>Email</th>
                                <th style={{ textAlign: 'center', padding: '8px 0', color: 'var(--bo-text-muted)', fontWeight: 600 }}>Attended</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailLecture.registrations.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                  <td style={{ padding: '8px 0' }}>{r.student.user.fullName}</td>
                                  <td style={{ padding: '8px 0', color: 'var(--bo-text-muted)' }}>{r.student.user.email}</td>
                                  <td style={{ padding: '8px 0', textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={attendanceIds.has(r.student.id)}
                                      onChange={() => toggleAttendance(r.student.id)}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ marginTop: 12, textAlign: 'right' }}>
                            <button onClick={() => saveAttendance(l.id)} style={{
                              padding: '8px 20px', background: '#10B981', color: '#fff', border: 'none',
                              borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}>
                              <CheckCircle size={14} /> Save Attendance
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showForm && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}>
            <div style={{
              background: '#fff', borderRadius: 16, padding: 28, width: 560,
              maxHeight: '90vh', overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editId ? 'Edit Lecture' : 'Create Guest Lecture'}</h2>
                <button onClick={() => setShowForm(false)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    style={inputStyle} placeholder="Advances in Cardiology" />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Speaker Name *</label>
                    <input value={form.speaker} onChange={e => setForm({ ...form, speaker: e.target.value })}
                      style={inputStyle} placeholder="Dr. Jane Smith" />
                  </div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}
                      style={inputStyle}>
                      <option value="GUEST_LECTURE">Guest Lecture</option>
                      <option value="WORKSHOP">Workshop</option>
                      <option value="SEMINAR">Seminar</option>
                      <option value="WEBINAR">Webinar</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Speaker Bio</label>
                  <textarea value={form.speakerBio} onChange={e => setForm({ ...form, speakerBio: e.target.value })}
                    style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} placeholder="Brief bio..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Date *</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Start Time *</label>
                    <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>End Time *</label>
                    <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                      style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Venue</label>
                    <input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
                      style={inputStyle} placeholder="Auditorium / Room 301" />
                  </div>
                  <div>
                    <label style={labelStyle}>Meeting Link</label>
                    <input value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })}
                      style={inputStyle} placeholder="https://meet.google.com/..." />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Capacity</label>
                    <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 50 })}
                      style={inputStyle} min={1} />
                  </div>
                  <div>
                    <label style={labelStyle}>Department</label>
                    <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                      style={inputStyle} placeholder="Cardiology" />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setShowForm(false)} style={{
                  padding: '10px 20px', borderRadius: 8, border: '1px solid var(--bo-border)',
                  background: '#fff', cursor: 'pointer', fontSize: 14,
                }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: ACCENT, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  opacity: saving ? 0.6 : 1,
                }}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FacultyLayout>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--bo-text-secondary)', marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--bo-border)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

export default FacultyGuestLectures;
