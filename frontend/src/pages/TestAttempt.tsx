import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/api.service';
import '../styles/StudentPortal.css';

// ── API Response Types (matching actual backend) ──────────────────────

interface TestInfoResponse {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: string;
  status: string;
  faculty: string;
  course: string;
  totalQuestions: number;
  totalMarks: number;
  passingMarks: number;
  durationMinutes: number;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  settings: {
    shuffleQuestions: boolean;
    showAnswersAfter: boolean;
    showExplanations: boolean;
    negativeMarking: boolean;
    negativeMarkValue: number;
    allowMultipleAttempts: boolean;
    maxAttempts: number;
  };
  attempts: Array<{
    id: string;
    attemptNumber: number;
    status: string;
    score: number;
    percentageScore: number;
    isPassed: boolean;
    submittedAt: string;
    timeSpent: number;
  }>;
  canAttempt: boolean;
}

interface StartTestQuestion {
  questionOrder: number;
  mcqId: string;
  marks: number;
  question: string;
  questionImage: string | null;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string | null;
  };
  subject?: string;
  topic?: string;
  difficulty?: string;
  savedAnswer?: string | null;
}

interface StartTestResponse {
  attemptId: string;
  testId: string;
  title: string;
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  startedAt: string;
  endsAt?: string;
  remainingSeconds?: number;
  questions: StartTestQuestion[];
  settings?: {
    negativeMarking: boolean;
    negativeMarkValue: number;
  };
  answeredCount?: number;
}

interface SubmitResponse {
  attemptId: string;
  status: string;
  totalScore: number;
  totalMarks: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSkipped: number;
  percentageScore: number;
  isPassed: boolean;
  timeSpent: number;
  passingMarks: number | null;
}

interface ResultsQuestion {
  questionOrder: number;
  question: string;
  questionImage: string | null;
  options: { A: string; B: string; C: string; D: string | null; E: string | null };
  yourAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  explanation: string | null;
  explanationImage: string | null;
  subject: string;
  topic: string;
}

interface ResultsResponse {
  attemptId: string;
  testTitle: string;
  status: string;
  startedAt: string;
  submittedAt: string;
  timeSpent: number;
  score: {
    total: number;
    outOf: number;
    percentage: number;
    passingMarks: number;
    isPassed: boolean;
  };
  breakdown: {
    correct: number;
    incorrect: number;
    skipped: number;
    total: number;
  };
  showAnswers: boolean;
  questions: ResultsQuestion[];
}

// ── Component ─────────────────────────────────────────────────────────

const TestAttempt: React.FC = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [testInfo, setTestInfo] = useState<TestInfoResponse | null>(null);
  const [testData, setTestData] = useState<StartTestResponse | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [detailedResults, setDetailedResults] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [testStarted, setTestStarted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch test info before starting
  useEffect(() => {
    if (testId) {
      fetchTestInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // Timer effect
  useEffect(() => {
    if (testStarted && timeRemaining > 0 && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testStarted, submitted]);

  // Auto-save answers periodically
  useEffect(() => {
    if (testStarted && testData) {
      const autoSaveInterval = setInterval(() => {
        saveAllAnswers();
      }, 30000);

      return () => clearInterval(autoSaveInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testStarted, answers]);

  const fetchTestInfo = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/student-portal/tests/${testId}`);
      setTestInfo(response.data);
      
      // Check URL to see if we should show results directly
      if (window.location.pathname.includes('/results')) {
        const completedAttempt = response.data.attempts?.find(
          (a: any) => a.status === 'SUBMITTED' || a.status === 'COMPLETED' || a.status === 'TIMED_OUT'
        );
        if (completedAttempt) {
          await fetchResults(completedAttempt.id);
        }
      }
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
      const data: StartTestResponse = response.data;
      setTestData(data);
      
      // Restore saved answers if resuming
      const restored: Record<string, string> = {};
      data.questions.forEach(q => {
        if (q.savedAnswer) {
          restored[q.mcqId] = q.savedAnswer;
        }
      });
      setAnswers(restored);
      
      // Calculate remaining time
      if (data.remainingSeconds != null) {
        setTimeRemaining(data.remainingSeconds);
      } else if (data.endsAt) {
        const endsAt = new Date(data.endsAt).getTime();
        const now = Date.now();
        setTimeRemaining(Math.max(0, Math.floor((endsAt - now) / 1000)));
      } else {
        setTimeRemaining(data.durationMinutes * 60);
      }
      
      setTestStarted(true);
    } catch (err: any) {
      console.error('Error starting test:', err);
      setError(err.response?.data?.message || 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async (mcqId: string, answer: string) => {
    try {
      await apiService.post(`/student-portal/attempts/${testData?.attemptId}/answer`, {
        mcqId,
        answer,
        timeSpent: 0
      });
    } catch (err: any) {
      console.error('Error saving answer:', err);
    }
  };

  const saveAllAnswers = async () => {
    for (const [mcqId, answer] of Object.entries(answers)) {
      await saveAnswer(mcqId, answer);
    }
  };

  const handleAnswerSelect = (mcqId: string, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [mcqId]: option
    }));
    saveAnswer(mcqId, option);
  };

  const handleMarkForReview = () => {
    const question = testData?.questions[currentQuestion];
    if (question) {
      setMarkedQuestions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(question.mcqId)) {
          newSet.delete(question.mcqId);
        } else {
          newSet.add(question.mcqId);
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
      
      const response = await apiService.post(`/student-portal/attempts/${testData?.attemptId}/submit`);
      const submitData: SubmitResponse = response.data;
      setSubmitResult(submitData);
      setSubmitted(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Fetch detailed results with question review
      await fetchResults(testData?.attemptId || submitData.attemptId);
    } catch (err: any) {
      console.error('Error submitting test:', err);
      setError(err.response?.data?.message || 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchResults = async (attemptId?: string) => {
    if (!attemptId) return;
    try {
      const response = await apiService.get(`/student-portal/attempts/${attemptId}/results`);
      setDetailedResults(response.data);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Error fetching results:', err);
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

  const getAnsweredCount = () => Object.keys(answers).length;
  const getUnansweredCount = () => (testData?.questions.length || 0) - getAnsweredCount();

  const getOptionKeys = (options: any): string[] => {
    const keys = ['A', 'B', 'C', 'D'];
    if (options?.E) keys.push('E');
    return keys;
  };

  // ── Pre-test info screen ────────────────────────────────────────────

  if (!testStarted && !submitted) {
    if (loading) {
      return (
        <div className="test-container">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '50px', height: '50px', 
                border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1',
                borderRadius: '50%', animation: 'spin 1s linear infinite',
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
            maxWidth: '500px', margin: '100px auto', background: '#fff', 
            borderRadius: '16px', padding: '40px', textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ color: '#0f172a', marginBottom: '10px' }}>Cannot Load Test</h2>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate('/student/assignments')}>
              Back to Tests
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="test-container">
        <div style={{ 
          maxWidth: '600px', margin: '50px auto', background: '#fff', 
          borderRadius: '24px', overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Test Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
            padding: '40px', color: 'white'
          }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>{testInfo?.title}</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>{testInfo?.course} • {testInfo?.subject}</p>
          </div>

          {/* Test Details */}
          <div style={{ padding: '40px' }}>
            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>
              {testInfo?.description || 'Complete this test within the allocated time. Make sure you have a stable internet connection before starting.'}
            </p>

            <div style={{ 
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px'
            }}>
              {[
                { icon: '📝', value: testInfo?.totalQuestions, label: 'Questions' },
                { icon: '⏱️', value: testInfo?.durationMinutes, label: 'Minutes' },
                { icon: '⭐', value: testInfo?.totalMarks, label: 'Total Marks' },
                { icon: '✅', value: testInfo?.passingMarks, label: 'Pass Marks' },
              ].map((item, i) => (
                <div key={i} style={{ 
                  padding: '16px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>{item.value}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* Past Attempts */}
            {testInfo?.attempts && testInfo.attempts.filter(a => a.status === 'SUBMITTED' || a.status === 'COMPLETED' || a.status === 'GRADED' || a.status === 'TIMED_OUT').length > 0 && (
              <div style={{ 
                background: '#f1f5f9', padding: '16px', borderRadius: '12px', marginBottom: '24px'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>📊 Previous Attempts</h4>
                {testInfo.attempts
                  .filter(a => a.status === 'SUBMITTED' || a.status === 'COMPLETED' || a.status === 'GRADED' || a.status === 'TIMED_OUT')
                  .map((a, i, arr) => (
                  <div key={i} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #e2e8f0' : 'none'
                  }}>
                    <span style={{ color: '#64748b' }}>Attempt {a.attemptNumber}</span>
                    <span style={{ 
                      fontWeight: '600', 
                      color: a.isPassed ? '#10b981' : '#ef4444'
                    }}>
                      {a.score ?? 0}/{testInfo.totalMarks} ({(a.percentageScore ?? 0).toFixed(1)}%)
                      {a.isPassed ? ' ✓ Passed' : ' ✗ Failed'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Negative Marking Warning */}
            {testInfo?.settings?.negativeMarking && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.08)', padding: '16px', borderRadius: '12px', 
                marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <p style={{ margin: 0, color: '#ef4444', fontSize: '0.9rem', fontWeight: '600' }}>
                  ⚠️ Negative Marking: -{testInfo.settings.negativeMarkValue} marks for each wrong answer
                </p>
              </div>
            )}

            {/* Instructions */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
              padding: '20px', borderRadius: '12px', marginBottom: '32px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚠️ Important Instructions
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', lineHeight: 1.8 }}>
                <li>Once started, the test cannot be paused</li>
                <li>Do not refresh or close the browser window</li>
                <li>Answers are auto-saved every 30 seconds</li>
                <li>Submit before the timer runs out</li>
                {testInfo?.settings?.allowMultipleAttempts && (
                  <li>You have up to {testInfo.settings.maxAttempts} attempts</li>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => navigate('/student/assignments')}
              >
                ← Back
              </button>
              {testInfo?.canAttempt ? (
                <button 
                  className="btn btn-success" style={{ flex: 2 }}
                  onClick={startTest}
                >
                  {testInfo?.attempts?.some((a: any) => a.status === 'IN_PROGRESS') ? 'Resume Test →' : testInfo?.attempts && testInfo.attempts.length > 0 ? 'Retake Test →' : 'Start Test →'}
                </button>
              ) : (
                <button className="btn btn-secondary" style={{ flex: 2, opacity: 0.6 }} disabled>
                  {(() => {
                    const now = new Date();
                    if (testInfo?.scheduledStartTime && now < new Date(testInfo.scheduledStartTime))
                      return `Available from ${new Date(testInfo.scheduledStartTime).toLocaleDateString()}`;
                    if (testInfo?.scheduledEndTime && now > new Date(testInfo.scheduledEndTime))
                      return 'Assignment Closed';
                    return 'Maximum Attempts Reached';
                  })()}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────

  if (submitted) {
    const results = detailedResults;
    const scores = results?.score || {
      total: submitResult?.totalScore || 0,
      outOf: submitResult?.totalMarks || testInfo?.totalMarks || 0,
      percentage: submitResult?.percentageScore || 0,
      passingMarks: submitResult?.passingMarks || testInfo?.passingMarks || 0,
      isPassed: submitResult?.isPassed || false
    };
    const breakdown = results?.breakdown || {
      correct: submitResult?.totalCorrect || 0,
      incorrect: submitResult?.totalIncorrect || 0,
      skipped: submitResult?.totalSkipped || 0,
      total: submitResult?.totalMarks || testInfo?.totalQuestions || 0
    };
    const timeSpent = results?.timeSpent || submitResult?.timeSpent || 0;
    const isPassed = scores.isPassed;

    return (
      <div className="test-container">
        <div style={{ 
          maxWidth: '800px', margin: '50px auto', background: '#fff', 
          borderRadius: '24px', overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Results Header */}
          <div style={{ 
            background: isPassed
              ? 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
            padding: '40px', color: 'white', textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>
              {isPassed ? '🎉' : '😔'}
            </div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '1.75rem' }}>
              {isPassed ? 'Congratulations!' : 'Keep Trying!'}
            </h1>
            <p style={{ margin: 0, opacity: 0.9 }}>
              {results?.testTitle || testInfo?.title || testData?.title}
            </p>
          </div>

          {/* Score Summary */}
          <div style={{ padding: '40px' }}>
            <div style={{ 
              display: 'flex', justifyContent: 'center', gap: '40px',
              marginBottom: '40px', paddingBottom: '40px', borderBottom: '1px solid #e2e8f0',
              flexWrap: 'wrap'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '3rem', fontWeight: '800', 
                  color: isPassed ? '#10b981' : '#ef4444' 
                }}>
                  {(typeof scores.percentage === 'number' ? scores.percentage : 0).toFixed(1)}%
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Your Score</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: '800', color: '#0f172a' }}>
                  {scores.total}/{scores.outOf}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Marks Obtained</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: '800', color: '#6366f1' }}>
                  {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Time Taken</div>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div style={{ 
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
              marginBottom: '32px'
            }}>
              <div style={{ 
                padding: '16px', background: 'rgba(16, 185, 129, 0.08)', 
                borderRadius: '12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#10b981' }}>
                  {breakdown.correct}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Correct</div>
              </div>
              <div style={{ 
                padding: '16px', background: 'rgba(239, 68, 68, 0.08)', 
                borderRadius: '12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ef4444' }}>
                  {breakdown.incorrect}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Incorrect</div>
              </div>
              <div style={{ 
                padding: '16px', background: 'rgba(100, 116, 139, 0.08)', 
                borderRadius: '12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#64748b' }}>
                  {breakdown.skipped}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Skipped</div>
              </div>
            </div>

            {/* Question Review */}
            {results?.showAnswers && results.questions && results.questions.length > 0 && (
              <>
                <h3 style={{ marginBottom: '20px', color: '#0f172a' }}>📋 Question Review</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {results.questions.map((q, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        padding: '20px',
                        background: q.isCorrect 
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)'
                          : q.yourAnswer 
                            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%)'
                            : 'linear-gradient(135deg, rgba(100, 116, 139, 0.05) 0%, rgba(148, 163, 184, 0.05) 100%)',
                        borderRadius: '12px',
                        borderLeft: `4px solid ${q.isCorrect ? '#10b981' : q.yourAnswer ? '#ef4444' : '#94a3b8'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>
                          Question {q.questionOrder}
                          {q.subject && <span style={{ color: '#64748b', fontWeight: '400', marginLeft: '8px', fontSize: '0.85rem' }}>({q.subject})</span>}
                        </span>
                        <span style={{ 
                          padding: '2px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600',
                          background: q.isCorrect ? '#10b981' : q.yourAnswer ? '#ef4444' : '#94a3b8',
                          color: 'white'
                        }}>
                          {q.isCorrect ? `✓ +${q.marksAwarded}` : q.yourAnswer ? `✗ ${q.marksAwarded}` : '— Skipped'} marks
                        </span>
                      </div>
                      
                      <p style={{ color: '#0f172a', marginBottom: '12px', lineHeight: 1.5 }}>
                        {q.question}
                      </p>

                      {q.questionImage && (
                        <img src={q.questionImage} alt="Question" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '12px' }} />
                      )}

                      {/* Show all options with highlighting */}
                      <div style={{ marginBottom: '12px' }}>
                        {getOptionKeys(q.options).map(key => {
                          const optVal = (q.options as any)[key];
                          if (!optVal) return null;
                          const isCorrectOpt = key === q.correctAnswer;
                          const isYourAnswer = key === q.yourAnswer;
                          return (
                            <div key={key} className={`option-item ${isCorrectOpt ? 'correct' : ''} ${isYourAnswer && !isCorrectOpt ? 'incorrect' : ''}`}
                              style={{ 
                                padding: '10px 14px', marginBottom: '6px', borderRadius: '10px',
                                display: 'flex', alignItems: 'center', gap: '10px',
                              }}>
                              <div className="option-letter" style={{
                                ...(isCorrectOpt ? { background: '#10b981', borderColor: '#10b981', color: 'white' } : {}),
                                ...(isYourAnswer && !isCorrectOpt ? { background: '#ef4444', borderColor: '#ef4444', color: 'white' } : {}),
                              }}>
                                {key}
                              </div>
                              <span className="option-text" style={{ flex: 1 }}>{optVal}</span>
                              {isCorrectOpt && <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>✓ Correct</span>}
                              {isYourAnswer && !isCorrectOpt && <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>✗ Your answer</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div style={{ 
                          background: 'rgba(99, 102, 241, 0.08)', padding: '12px', 
                          borderRadius: '8px', marginTop: '8px'
                        }}>
                          <span style={{ fontWeight: '600', color: '#6366f1', fontSize: '0.85rem' }}>💡 Explanation: </span>
                          <span style={{ color: '#475569', fontSize: '0.85rem' }}>{q.explanation}</span>
                          {q.explanationImage && (
                            <img src={q.explanationImage} alt="Explanation" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px' }} />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* No answers available message */}
            {results && !results.showAnswers && (
              <div style={{ 
                textAlign: 'center', padding: '20px', background: '#f8fafc', 
                borderRadius: '12px', marginBottom: '20px'
              }}>
                <p style={{ color: '#64748b', margin: 0 }}>
                  📝 Answer review is not available for this test.
                </p>
              </div>
            )}

            {/* Back Button */}
            <div style={{ marginTop: '40px', textAlign: 'center', display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary btn-lg" 
                onClick={() => navigate('/student/assignments')}
              >
                ← Back to Tests
              </button>
              {testInfo?.canAttempt && (
                <button 
                  className="btn btn-success btn-lg" 
                  onClick={() => { setSubmitted(false); setTestStarted(false); setSubmitResult(null); setDetailedResults(null); setError(null); }}
                >
                  🔄 Retake Test
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Test taking interface ───────────────────────────────────────────

  const question = testData?.questions[currentQuestion];
  const optionKeys = question ? getOptionKeys(question.options) : [];

  return (
    <div className="test-container">
      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '400px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
            <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Submit Test?</h3>
            <p style={{ color: '#64748b', marginBottom: '8px' }}>
              You have answered <strong>{getAnsweredCount()}</strong> out of <strong>{testData?.questions.length}</strong> questions.
            </p>
            {getUnansweredCount() > 0 && (
              <p style={{ color: '#f59e0b', marginBottom: '24px' }}>
                ⚠️ {getUnansweredCount()} questions are unanswered!
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowConfirmSubmit(false)}>
                Review
              </button>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={handleSubmitTest} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Header */}
      <div className="test-header">
        <div className="test-header-info">
          <h1>{testData?.title}</h1>
          <div className="test-header-meta">
            <span>📝 {testData?.totalQuestions} Questions</span>
            <span>⭐ {testData?.totalMarks} Marks</span>
            {testData?.settings?.negativeMarking && (
              <span style={{ color: '#ef4444' }}>⚠️ Negative Marking</span>
            )}
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
            Question {currentQuestion + 1} of {testData?.questions.length}
            {question && markedQuestions.has(question.mcqId) && (
              <span style={{ marginLeft: '12px', color: '#f59e0b' }}>🚩 Marked for Review</span>
            )}
            {question?.subject && (
              <span style={{ marginLeft: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                [{question.subject}]
              </span>
            )}
          </div>
          
          <div className="question-text">{question?.question}</div>
          
          {question?.questionImage && (
            <img src={question.questionImage} alt="Question" className="question-image" />
          )}

          <div className="options-list">
            {optionKeys.map((key) => {
              const optionText = (question?.options as any)?.[key];
              if (!optionText) return null;
              const isSelected = question ? answers[question.mcqId] === key : false;
              return (
                <div
                  key={key}
                  className={`option-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => question && handleAnswerSelect(question.mcqId, key)}
                >
                  <div className="option-letter">{key}</div>
                  <div className="option-text">{optionText}</div>
                </div>
              );
            })}
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
              <button className="btn btn-secondary" onClick={handleMarkForReview}>
                {question && markedQuestions.has(question.mcqId) ? '🚩 Unmark' : '🚩 Mark for Review'}
              </button>
              {question && answers[question.mcqId] && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    if (question) {
                      const newAnswers = { ...answers };
                      delete newAnswers[question.mcqId];
                      setAnswers(newAnswers);
                      saveAnswer(question.mcqId, '');
                    }
                  }}
                  style={{ color: '#ef4444' }}
                >
                  ✗ Clear
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion < (testData?.questions.length || 0) - 1 ? (
                <button className="btn btn-primary" onClick={() => setCurrentQuestion(prev => prev + 1)}>
                  Next →
                </button>
              ) : (
                <button className="btn btn-success" onClick={() => setShowConfirmSubmit(true)}>
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
            {testData?.questions.map((q, index) => (
              <button
                key={q.mcqId}
                className={`nav-question ${
                  index === currentQuestion ? 'current' : ''
                } ${answers[q.mcqId] ? 'answered' : ''} ${
                  markedQuestions.has(q.mcqId) ? 'marked' : ''
                }`}
                onClick={() => setCurrentQuestion(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          
          <div className="navigator-legend">
            <div className="legend-item">
              <span className="legend-dot answered" /> Answered ({getAnsweredCount()})
            </div>
            <div className="legend-item">
              <span className="legend-dot current" /> Current
            </div>
            <div className="legend-item">
              <span className="legend-dot marked" /> Marked ({markedQuestions.size})
            </div>
            <div className="legend-item">
              <span className="legend-dot not-visited" /> Not Visited ({getUnansweredCount()})
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
