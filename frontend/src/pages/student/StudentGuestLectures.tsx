import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/student/StudentLayout';
import apiService from '../../services/api.service';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Video, Search, UserPlus, UserMinus,
  CheckCircle, AlertCircle, ExternalLink
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

const BLUE = '#3B82F6';

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
  creator?: { fullName: string };
  _count?: { registrations: number };
  // Fields from my-registrations
  registeredAt?: string;
  attended?: boolean;
}

const typeLabels: Record<string, string> = {
  GUEST_LECTURE: 'Guest Lecture', WORKSHOP: 'Workshop', SEMINAR: 'Seminar', WEBINAR: 'Webinar',
};
const statusColors: Record<string, string> = {
  UPCOMING: '#3B82F6', ONGOING: '#10B981', COMPLETED: '#6B7280', CANCELLED: '#EF4444',
};

const StudentGuestLectures: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'browse' | 'registered'>('browse');
  const [allLectures, setAllLectures] = useState<GuestLecture[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<GuestLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        apiService.get('/guest-lectures'),
        apiService.get('/guest-lectures/my-registrations'),
      ]);
      setAllLectures(allRes.data);
      setMyRegistrations(myRes.data);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const registeredIds = new Set(myRegistrations.map(r => r.id));

  const handleRegister = async (id: string) => {
    setActionLoading(id);
    try {
      await apiService.post(`/guest-lectures/${id}/register`);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Registration failed';
      alert(msg);
    }
    setActionLoading(null);
  };

  const handleUnregister = async (id: string) => {
    if (!window.confirm('Cancel your registration?')) return;
    setActionLoading(id);
    try {
      await apiService.delete(`/guest-lectures/${id}/register`);
      await load();
    } catch { /* empty */ }
    setActionLoading(null);
  };

  const filterSearch = (l: GuestLecture) =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.speaker.toLowerCase().includes(search.toLowerCase());

  const browseLectures = allLectures.filter(filterSearch);
  const myFiltered = myRegistrations.filter(filterSearch);

  const stats = {
    available: allLectures.filter(l => l.status === 'UPCOMING').length,
    registered: myRegistrations.length,
    attended: myRegistrations.filter(r => r.attended).length,
  };

  const renderCard = (l: GuestLecture, isRegistered: boolean) => {
    const isFull = l.registrationCount >= l.capacity;
    const regCount = l._count?.registrations ?? l.registrationCount;

    return (
      <div key={l.id} style={{
        background: '#fff', borderRadius: 12, border: '1px solid var(--bo-border)',
        overflow: 'hidden', transition: 'box-shadow 0.2s',
      }}>
        <div style={{ padding: 20 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
              background: `${statusColors[l.status]}15`, color: statusColors[l.status],
            }}>{l.status}</span>
            <span style={{
              fontSize: 11, fontWeight: 500, padding: '2px 10px', borderRadius: 20,
              background: '#F3F4F6', color: '#6B7280',
            }}>{typeLabels[l.type]}</span>
            {isFull && l.status === 'UPCOMING' && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                background: '#FEF2F2', color: '#EF4444',
              }}>FULL</span>
            )}
            {isRegistered && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                background: '#ECFDF5', color: '#10B981',
              }}>✓ Registered</span>
            )}
          </div>

          <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--bo-text)', margin: '4px 0 6px' }}>{l.title}</h3>
          <p style={{ fontSize: 13, color: 'var(--bo-text-secondary)', margin: '0 0 4px' }}>
            Speaker: <strong>{l.speaker}</strong>
            {l.creator && <span style={{ color: 'var(--bo-text-muted)' }}> · Organized by {l.creator.fullName}</span>}
          </p>
          {l.description && (
            <p style={{ fontSize: 13, color: 'var(--bo-text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
              {l.description.length > 120 ? l.description.slice(0, 120) + '...' : l.description}
            </p>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
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
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
              color: isFull ? '#EF4444' : 'var(--bo-text-secondary)',
            }}>
              <Users size={14} /> {regCount}/{l.capacity}
            </span>
          </div>

          {/* Meeting link (shown only if registered) */}
          {isRegistered && l.meetingLink && (
            <div style={{
              marginTop: 12, padding: '8px 14px', borderRadius: 8, background: '#EFF6FF',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
            }}>
              <Video size={14} color={BLUE} />
              <a href={l.meetingLink} target="_blank" rel="noopener noreferrer"
                style={{ color: BLUE, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Join Meeting <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Attendance status on registered tab */}
          {tab === 'registered' && l.attended !== undefined && (
            <div style={{
              marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              color: l.attended ? '#10B981' : '#F59E0B',
            }}>
              {l.attended ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {l.attended ? 'Attendance Marked' : 'Attendance Pending'}
            </div>
          )}
        </div>

        {/* Action footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--bo-border)', background: '#FAFAFA',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          {isRegistered ? (
            <button onClick={() => handleUnregister(l.id)} disabled={actionLoading === l.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 6, border: '1px solid #FCA5A5', background: '#FFF5F5',
                color: '#EF4444', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                opacity: actionLoading === l.id ? 0.6 : 1,
              }}>
              <UserMinus size={14} /> {actionLoading === l.id ? 'Cancelling...' : 'Cancel Registration'}
            </button>
          ) : l.status === 'UPCOMING' && !isFull ? (
            <button onClick={() => handleRegister(l.id)} disabled={actionLoading === l.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 6, border: 'none', background: BLUE,
                color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                opacity: actionLoading === l.id ? 0.6 : 1,
              }}>
              <UserPlus size={14} /> {actionLoading === l.id ? 'Registering...' : 'Register'}
            </button>
          ) : isFull && l.status === 'UPCOMING' ? (
            <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 500 }}>Registration Full</span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <StudentLayout>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/student')}
          className="bo-btn bo-btn-outline"
          style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text)' }}>Guest Lectures</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 14 }}>Browse and register for guest lectures, workshops & seminars</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Available', value: stats.available, color: BLUE },
            { label: 'Registered', value: stats.registered, color: '#10B981' },
            { label: 'Attended', value: stats.attended, color: '#8B5CF6' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 12, padding: 20, border: '1px solid var(--bo-border)',
            }}>
              <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--bo-border)' }}>
          {(['browse', 'registered'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 24px', fontSize: 14, fontWeight: tab === t ? 600 : 400,
              border: 'none', borderBottom: tab === t ? `2px solid ${BLUE}` : '2px solid transparent',
              background: 'none', cursor: 'pointer', color: tab === t ? BLUE : 'var(--bo-text-muted)',
              marginBottom: -2,
            }}>
              {t === 'browse' ? `All Lectures (${allLectures.length})` : `My Registrations (${myRegistrations.length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--bo-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or speaker..."
            style={{
              width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8,
              border: '1px solid var(--bo-border)', fontSize: 14, outline: 'none',
            }}
          />
        </div>

        {/* Content */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--bo-text-muted)', padding: 40 }}>Loading...</p>
        ) : tab === 'browse' ? (
          browseLectures.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12,
              border: '1px solid var(--bo-border)', color: 'var(--bo-text-muted)',
            }}>
              <Calendar size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>No guest lectures available right now.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {browseLectures.map(l => renderCard(l, registeredIds.has(l.id)))}
            </div>
          )
        ) : (
          myFiltered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12,
              border: '1px solid var(--bo-border)', color: 'var(--bo-text-muted)',
            }}>
              <UserPlus size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>You haven't registered for any lectures yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {myFiltered.map(l => renderCard(l, true))}
            </div>
          )
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentGuestLectures;
