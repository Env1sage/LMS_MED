import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import '../styles/StudentPortal.css';

interface Question {
  id: number;
  questionNumber: number;
  questionText: string;
  questionType: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  marks: number;
  imageUrl?: string;
}

interface TestDetails {
  test: {
    id: number;
    title: string;
    description: string;
    type: string;
    totalQuestions: number;
    duration: number;
    totalMarks: number;
    passingMarks: number;
    courseName: string;
    courseCode: string;
  };
  attempt: {
    id: number;
    status: string;
    startedAt: string;
    expiresAt: string;
  };
  questions: Question[];
  savedAnswers: Record<number, string>;
}

interface AttemptResult {
  attempt: {
    id: number;
    status: string;
    score: number;
    totalMarks: number;
    percentage: number;
    passed: boolean;
    startedAt: string;
    submittedAt: string;
    timeTaken: number;
  };
  test: {
    title: string;
    passingMarks: number;
  };
  questions: Array<{
    id: number;
    questionNumber: number;
    questionText: string;
    options: Array<{ id: string; text: string }>;
    correctAnswer: string;
    studentAnswer: string;
    isCorrect: boolean;
    marks: number;
    marksAwarded: number;
  }>;
}

const TestAttempt: React.FC = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [testDetails, setTestDetails] = useState<TestDetails | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [testInfo, setTestInfo] = useState<any>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch test info before starting
  useEffect(() => {
    if (testId) {
      fetchTestInfo();
    }
  }, [testId]);

  // Timer effect
  useEffect(() => {
    if (testStarted && timeRemaining > 0 && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto-submit when time runs out
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [testStarted, submitted]);

  // Auto-save answers periodically
  useEffect(() => {
    if (testStarted && testDetails) {
      const autoSaveInterval = setInterval(() => {
        saveAllAnswers();
      }, 30000); // Auto-save every 30 seconds

      return () => clearInterval(autoSaveInterval);
    }
  }, [testStarted, answers]);

  const fetchTestInfo = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/student-portal/tests/${testId}`);
      setTestInfo(response.data);
    } catch (err: any) {
      console.error('Error fetching test info:', err);
      setError(err.response?.data?.message || 'Failed to load test information');
    } finally {
      setLoading(false);
    }
  };

  const startTest = async () => {
    try {
      setLoading(true);
      const response = await apiService.post(`/student-portal/tests/${testId}/start`);
      setTestDetails(response.data);
      setAnswers(response.data.savedAnswers || {});
      
      // Calculate remaining time
      const expiresAt = new Date(response.data.attempt.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);
      
      setTestStarted(true);
    } catch (err: any) {
      console.error('Error starting test:', err);
      setError(err.response?.data?.message || 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async (questionId: number, answer: string) => {
    try {
      await apiService.post(`/student-portal/attempts/${testDetails?.attempt.id}/answer`, {
        questionId,
        selectedOption: answer
      });
    } catch (err: any) {
      console.error('Error saving answer:', err);
    }
  };

  const saveAllAnswers = async () => {
    // Save all answers in the background
    for (const [questionId, answer] of Object.entries(answers)) {
      await saveAnswer(Number(questionId), answer);
    }
  };

  const handleAnswerSelect = (questionId: number, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
    // Save immediately
    saveAnswer(questionId, option);
  };

  const handleMarkForReview = () => {
    const questionId = testDetails?.questions[currentQuestion]?.id;
    if (questionId) {
      setMarkedQuestions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(questionId)) {
          newSet.delete(questionId);
        } else {
          newSet.add(questionId);
        }
        return newSet;
      });
    }
  };

  const handleSubmitTest = async () => {
    if (submitting) return;
    
    try {
      setSubmitting(true);
      setShowConfirmSubmit(false);
      
      const response = await apiService.post(`/student-portal/attempts/${testDetails?.attempt.id}/submit`);
      setResults(response.data);
      setSubmitted(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } catch (err: any) {
      console.error('Error submitting test:', err);
      setError(err.response?.data?.message || 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const getUnansweredCount = () => {
    return (testDetails?.questions.length || 0) - getAnsweredCount();
  };

  // Pre-test info screen
  if (!testStarted && !submitted) {
    if (loading) {
      return (
        <div className="test-container">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '50px', 
                height: '50px', 
                border: '4px solid #e2e8f0',
                borderTop: '4px solid #6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }} />
              <p style={{ color: '#64748b' }}>Loading test details...</p>
            </div>
          </div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }

    if (error) {
      return (
        <div className="test-container">
          <div style={{ 
            maxWidth: '500px', 
            margin: '100px auto', 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ color: '#0f172a', marginBottom: '10px' }}>Cannot Start Test</h2>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate('/student')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="test-container">
        <div style={{ 
          maxWidth: '600px', 
          margin: '50px auto', 
          background: '#fff', 
          borderRadius: '24px', 
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Test Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
            padding: '40px',
            color: 'white'
          }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>{testInfo?.title}</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>{testInfo?.courseName} • {testInfo?.courseCode}</p>
          </div>

          {/* Test Details */}
          <div style={{ padding: '40px' }}>
            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>
              {testInfo?.description || 'Complete this test within the allocated time. Make sure you have a stable internet connection before starting.'}
            </p>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '16px',
              marginBottom: '32px'
            }}>
              <div style={{ 
                padding: '16px', 
                background: '#f8fafc', 
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📝</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                  {testInfo?.totalQuestions}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Questions</div>
              </div>
              <div style={{ 
                padding: '16px', 
                background: '#f8fafc', 
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏱️</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                  {testInfo?.duration}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Minutes</div>
              </div>
              <div style={{ 
                padding: '16px', 
                background: '#f8fafc', 
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⭐</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                  {testInfo?.totalMarks}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Marks</div>
              </div>
              <div style={{ 
                padding: '16px', 
                background: '#f8fafc', 
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                  {testInfo?.passingMarks}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Pass Marks</div>
              </div>
            </div>

            {/* Instructions */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '32px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚠️ Important Instructions
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', lineHeight: 1.8 }}>
                <li>Once started, the test cannot be paused</li>
                <li>Do not refresh or close the browser window</li>
                <li>Answers are auto-saved every 30 seconds</li>
                <li>Submit before the timer runs out</li>
                <li>All questions are mandatory</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => navigate('/student')}
              >
                ← Back
              </button>
              <button 
                className="btn btn-success" 
                style={{ flex: 2 }}
                onClick={startTest}
              >
                Start Test →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (submitted && results) {
    return (
      <div className="test-container">
        <div style={{ 
          maxWidth: '800px', 
          margin: '50px auto', 
          background: '#fff', 
          borderRadius: '24px', 
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Results Header */}
          <div style={{ 
            background: results.attempt.passed 
              ? 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
            padding: '40px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>
              {results.attempt.passed ? '🎉' : '😔'}
            </div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '1.75rem' }}>
              {results.attempt.passed ? 'Congratulations!' : 'Keep Trying!'}
            </h1>
            <p style={{ margin: 0, opacity: 0.9 }}>
              {results.attempt.passed 
                ? 'You have passed the test!' 
                : 'You did not pass this time, but don\'t give up!'}
            </p>
          </div>

          {/* Score Summary */}
          <div style={{ padding: '40px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              gap: '40px',
              marginBottom: '40px',
              paddingBottom: '40px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '3rem', 
                  fontWeight: '800', 
                  color: results.attempt.passed ? '#10b981' : '#ef4444' 
                }}>
                  {results.attempt.percentage.toFixed(1)}%
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Your Score</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: '800', color: '#0f172a' }}>
                  {results.attempt.score}/{results.attempt.totalMarks}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Marks Obtained</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: '800', color: '#6366f1' }}>
                  {Math.floor(results.attempt.timeTaken / 60)}m
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Time Taken</div>
              </div>
            </div>

            {/* Question Review */}
            <h3 style={{ marginBottom: '20px', color: '#0f172a' }}>Question Review</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {results.questions.map((q, index) => (
                <div 
                  key={q.id} 
                  style={{ 
                    padding: '20px',
                    background: q.isCorrect 
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%)',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${q.isCorrect ? '#10b981' : '#ef4444'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>
                      Question {q.questionNumber}
                    </span>
                    <span style={{ 
                      padding: '2px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: q.isCorrect ? '#10b981' : '#ef4444',
                      color: 'white'
                    }}>
                      {q.isCorrect ? `✓ +${q.marksAwarded}` : '✗ 0'} marks
                    </span>
                  </div>
                  <p style={{ color: '#0f172a', marginBottom: '12px', lineHeight: 1.5 }}>
                    {q.questionText}
                  </p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Your Answer: </span>
                      <span style={{ fontWeight: '600', color: q.isCorrect ? '#10b981' : '#ef4444' }}>
                        {q.studentAnswer || 'Not answered'}
                      </span>
                    </div>
                    {!q.isCorrect && (
                      <div>
                        <span style={{ color: '#64748b' }}>Correct: </span>
                        <span style={{ fontWeight: '600', color: '#10b981' }}>
                          {q.correctAnswer}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Back to Dashboard */}
            <div style={{ marginTop: '40px', textAlign: 'center' }}>
              <button 
                className="btn btn-primary btn-lg" 
                onClick={() => navigate('/student')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Test taking interface
  const question = testDetails?.questions[currentQuestion];

  return (
    <div className="test-container">
      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
            <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Submit Test?</h3>
            <p style={{ color: '#64748b', marginBottom: '8px' }}>
              You have answered <strong>{getAnsweredCount()}</strong> out of <strong>{testDetails?.questions.length}</strong> questions.
            </p>
            {getUnansweredCount() > 0 && (
              <p style={{ color: '#f59e0b', marginBottom: '24px' }}>
                ⚠️ {getUnansweredCount()} questions are unanswered!
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setShowConfirmSubmit(false)}
              >
                Review
              </button>
              <button 
                className="btn btn-success" 
                style={{ flex: 1 }}
                onClick={handleSubmitTest}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Header */}
      <div className="test-header">
        <div className="test-header-info">
          <h1>{testDetails?.test.title}</h1>
          <div className="test-header-meta">
            <span>📚 {testDetails?.test.courseName}</span>
            <span>📝 {testDetails?.test.totalQuestions} Questions</span>
            <span>⭐ {testDetails?.test.totalMarks} Marks</span>
          </div>
        </div>
        <div className={`test-timer ${timeRemaining < 300 ? 'warning' : ''}`}>
          ⏰ {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Test Content */}
      <div className="test-content">
        {/* Question Area */}
        <div className="test-question-area">
          <div className="question-number">
            Question {currentQuestion + 1} of {testDetails?.questions.length}
            {markedQuestions.has(question?.id || 0) && (
              <span style={{ marginLeft: '12px', color: '#f59e0b' }}>🚩 Marked for Review</span>
            )}
          </div>
          <div className="question-text">{question?.questionText}</div>
          
          {question?.imageUrl && (
            <img src={question.imageUrl} alt="Question" className="question-image" />
          )}

          <div className="options-list">
            {question?.options.map((option, index) => (
              <div
                key={option.id}
                className={`option-item ${answers[question.id] === option.id ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(question.id, option.id)}
              >
                <div className="option-letter">
                  {String.fromCharCode(65 + index)}
                </div>
                <div className="option-text">{option.text}</div>
              </div>
            ))}
          </div>

          {/* Question Actions */}
          <div className="question-actions">
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
              >
                ← Previous
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleMarkForReview}
              >
                {markedQuestions.has(question?.id || 0) ? '🚩 Unmark' : '🚩 Mark for Review'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion < (testDetails?.questions.length || 0) - 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setCurrentQuestion(prev => prev + 1)}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={() => setShowConfirmSubmit(true)}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="test-navigator">
          <div className="navigator-header">Question Navigator</div>
          <div className="navigator-grid">
            {testDetails?.questions.map((q, index) => (
              <button
                key={q.id}
                className={`nav-question ${
                  index === currentQuestion ? 'current' : ''
                } ${answers[q.id] ? 'answered' : ''} ${
                  markedQuestions.has(q.id) ? 'marked' : ''
                }`}
                onClick={() => setCurrentQuestion(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          
          <div className="navigator-legend">
            <div className="legend-item">
              <span className="legend-dot answered" />
              Answered ({getAnsweredCount()})
            </div>
            <div className="legend-item">
              <span className="legend-dot current" />
              Current
            </div>
            <div className="legend-item">
              <span className="legend-dot marked" />
              Marked ({markedQuestions.size})
            </div>
            <div className="legend-item">
              <span className="legend-dot not-visited" />
              Not Visited ({getUnansweredCount()})
            </div>
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%', marginTop: '20px' }}
            onClick={() => setShowConfirmSubmit(true)}
          >
            Submit Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestAttempt;
