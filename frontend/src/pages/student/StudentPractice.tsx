import React from 'react';
import StudentLayout from '../../components/student/StudentLayout';
import { Target, Play, TrendingUp, Award } from 'lucide-react';
import '../../styles/bitflow-owner.css';

const StudentPractice: React.FC = () => {
  return (
    <StudentLayout>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)' }}>
          Practice Zone
        </h1>
        <p style={{ color: 'var(--bo-text-muted)', fontSize: 14, marginTop: 4 }}>
          Strengthen your knowledge with practice questions and quizzes
        </p>
      </div>

      {/* Coming Soon */}
      <div className="bo-card" style={{ padding: 80, textAlign: 'center' }}>
        <div style={{ 
          width: 80, 
          height: 80, 
          borderRadius: '50%', 
          background: 'linear-gradient(135deg, var(--bo-accent), var(--bo-info))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          color: '#fff'
        }}>
          <Target size={40} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--bo-text-primary)', marginBottom: 12 }}>
          Practice Zone Coming Soon
        </h2>
        <p style={{ fontSize: 16, color: 'var(--bo-text-muted)', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
          We're building an amazing practice zone where you can sharpen your skills with unlimited practice questions, adaptive quizzes, and instant feedback.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 600, margin: '0 auto' }}>
          <div style={{ padding: 20, background: 'var(--bo-bg)', borderRadius: 'var(--bo-radius)' }}>
            <Play size={32} style={{ color: 'var(--bo-accent)', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>Practice Tests</div>
            <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Unlimited practice questions</div>
          </div>
          <div style={{ padding: 20, background: 'var(--bo-bg)', borderRadius: 'var(--bo-radius)' }}>
            <TrendingUp size={32} style={{ color: 'var(--bo-success)', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>Adaptive Learning</div>
            <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Questions adapt to your level</div>
          </div>
          <div style={{ padding: 20, background: 'var(--bo-bg)', borderRadius: 'var(--bo-radius)' }}>
            <Award size={32} style={{ color: 'var(--bo-warning)', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bo-text-primary)', marginBottom: 4 }}>Instant Feedback</div>
            <div style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>Learn from your mistakes</div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentPractice;
