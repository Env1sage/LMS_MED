import React from 'react';
import StudentLayout from '../../components/student/StudentLayout';
import { User, Mail, Phone, Calendar, MapPin, BookOpen, Award, Edit } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/bitflow-owner.css';

const StudentProfile: React.FC = () => {
  const { user } = useAuth();

  return (
    <StudentLayout>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
          My Profile
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          View and manage your personal information
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Main Profile Info */}
        <div>
          <div className="bo-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={20} /> Personal Information
              </h3>
              <button className="bo-btn bo-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}>
                <Edit size={16} /> Edit
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>Full Name</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500 }}>
                  {user?.fullName || 'N/A'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>Student ID</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500 }}>
                  STU-2021-045
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>Email</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={16} /> {user?.email || 'N/A'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>Phone</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={16} /> +1 234 567 8900
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>Date of Birth</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={16} /> January 15, 2000
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>Location</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={16} /> New York, USA
                </div>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="bo-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={20} /> Academic Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>College</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500 }}>
                  Medical College
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>Department</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500 }}>
                  Medicine
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>Current Semester</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500 }}>
                  5th Semester
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>Enrollment Year</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500 }}>
                  2021
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>Roll Number</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500 }}>
                  MED-2021-045
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--bo-text-muted)', display: 'block', marginBottom: 6 }}>Academic Advisor</label>
                <div style={{ fontSize: 15, color: 'var(--bo-text-primary)', fontWeight: 500 }}>
                  Dr. Sarah Johnson
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Profile Picture */}
          <div className="bo-card" style={{ padding: 24, marginBottom: 24, textAlign: 'center' }}>
            <div style={{ 
              width: 120, 
              height: 120, 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--bo-accent), var(--bo-info))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 48,
              fontWeight: 700,
              color: '#fff'
            }}>
              {user?.fullName?.charAt(0) || 'S'}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>
              {user?.fullName || 'Student'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--bo-text-muted)', marginBottom: 16 }}>
              Medical Student
            </p>
            <button className="bo-btn bo-btn-outline" style={{ width: '100%' }}>
              Change Photo
            </button>
          </div>

          {/* Quick Stats */}
          <div className="bo-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} /> Quick Stats
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Assignments Score</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-success)' }}>—</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Courses Completed</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-accent)' }}>—</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Total Credits</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-info)' }}>—</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--bo-text-muted)', marginBottom: 4 }}>Class Rank</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-warning)' }}>—</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentProfile;
