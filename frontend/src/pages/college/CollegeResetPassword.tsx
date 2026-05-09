import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import CollegeLayout from '../../components/college/CollegeLayout';
import { ArrowLeft, KeyRound, RefreshCw, AlertTriangle, Copy, Check } from 'lucide-react';
import '../../styles/bitflow-owner.css';
import '../../styles/loading-screen.css';

const CollegeResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<{ fullName: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await studentService.getById(id);
        setStudentInfo({ fullName: data.fullName, email: data.users?.email || '' });
      } catch (err: any) { setError(err.response?.data?.message || 'Failed to load student'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewPassword(pw);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setResetting(true); setError(null);
    try {
      await studentService.resetCredentials(id, newPassword);
      setSuccess(`Password reset successfully! New password: ${newPassword}`);
      setTimeout(() => navigate('/college-admin/students'), 3000);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to reset password'); }
    finally { setResetting(false); }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bo-border)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  if (loading) return (
    <CollegeLayout>
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
        <div className="loading-title">Loading</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </CollegeLayout>
  );

  return (
    <CollegeLayout>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => navigate('/college-admin/students')} className="bo-btn bo-btn-outline" style={{ marginBottom: 12, padding: '6px 12px', fontSize: 12 }}>
            <ArrowLeft size={14} /> Back to Students
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Reset Student Password</h1>
          <p style={{ color: 'var(--bo-text-muted)', fontSize: 13, marginTop: 4 }}>Generate a new password for the student</p>
        </div>

        {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>{error}</span><button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}>×</button></div>}
        {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', marginBottom: 16, fontSize: 13 }}>{success}</div>}

        {studentInfo && (
          <div className="bo-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#059669', fontSize: 18 }}>
                {studentInfo.fullName.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{studentInfo.fullName}</div>
                <div style={{ color: 'var(--bo-text-muted)', fontSize: 12 }}>{studentInfo.email}</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleReset}>
          <div className="bo-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>New Password</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Enter new password (min 8 chars)" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={generatePassword} className="bo-btn bo-btn-outline" style={{ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                <RefreshCw size={14} /> Generate
              </button>
              {newPassword && (
                <button type="button" onClick={copyPassword} className="bo-btn bo-btn-outline" style={{ padding: '8px 14px', fontSize: 12 }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 4 }}>
                <AlertTriangle size={14} /> Important
              </div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>Copy the password before submitting</li>
                <li>This password will be shown only once</li>
                <li>Share it securely with the student</li>
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="bo-btn bo-btn-outline" onClick={() => navigate('/college-admin/students')}>Cancel</button>
            <button type="submit" className="bo-btn bo-btn-primary" style={{ background: '#059669' }} disabled={resetting || !newPassword}>
              <KeyRound size={14} /> {resetting ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </CollegeLayout>
  );
};

export default CollegeResetPassword;
