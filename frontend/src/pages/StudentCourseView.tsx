import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  PlayCircleOutline as PlayIcon,
  Description as DescriptionIcon,
  VideoLibrary as VideoIcon,
  TouchApp as InteractiveIcon,
} from '@mui/icons-material';
import apiService from '../services/api.service';
import SecurePdfViewer from '../components/SecurePdfViewer';

interface LearningUnit {
  id: string;
  title: string;
  description: string;
  type: 'BOOK' | 'VIDEO' | 'INTERACTIVE';
  estimatedDuration: number;
  secureAccessUrl: string;
  deliveryType: string;
  thumbnailUrl?: string;
}

interface LearningStep {
  id: string;
  stepOrder: number;
  learning_units: LearningUnit;
  isLocked: boolean;
  isCompleted: boolean;
  completionPercent: number;
  timeSpent: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  courseCode: string | null;
  learning_flow_steps: LearningStep[];
}

interface StepProgress {
  stepId: number;
  completionPercent: number;
  timeSpentSeconds: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

const StudentCourseView: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentUnit, setCurrentUnit] = useState<LearningUnit | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [iframeError, setIframeError] = useState(false);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Backend API URL for serving files with authentication
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Helper to get full content URL
  const getFullContentUrl = (url: string | undefined): string => {
    if (!url) {
      console.warn('No URL provided to getFullContentUrl');
      return '';
    }
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('Full URL detected:', url);
      return url;
    }
    // If it's a relative path starting with /uploads, prepend API_URL
    if (url.startsWith('/uploads/')) {
      const fullUrl = `${API_URL}${url}`;
      console.log('Built full URL:', fullUrl, 'from:', url);
      return fullUrl;
    }
    // For other relative paths, construct the URL
    const fullUrl = `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    console.log('Built full URL:', fullUrl, 'from:', url);
    return fullUrl;
  };

  // ===== SECURITY: Block keyboard shortcuts =====
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!viewerOpen) return;
    
    // Block Print Screen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      setSecurityWarning('Screenshots are not allowed');
      setTimeout(() => setSecurityWarning(null), 3000);
      return false;
    }
    
    // Block Ctrl/Cmd + P (Print)
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      setSecurityWarning('Printing is not allowed');
      setTimeout(() => setSecurityWarning(null), 3000);
      return false;
    }
    
    // Block Ctrl/Cmd + S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      setSecurityWarning('Saving is not allowed');
      setTimeout(() => setSecurityWarning(null), 3000);
      return false;
    }
    
    // Block Ctrl/Cmd + C (Copy)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      setSecurityWarning('Copying is not allowed');
      setTimeout(() => setSecurityWarning(null), 3000);
      return false;
    }
    
    // Block F12 (Dev Tools)
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
  }, [viewerOpen]);

  // ===== SECURITY: Block right-click context menu =====
  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (!viewerOpen) return;
    e.preventDefault();
    setSecurityWarning('Right-click is disabled for security');
    setTimeout(() => setSecurityWarning(null), 2000);
    return false;
  }, [viewerOpen]);

  // Setup security event listeners
  useEffect(() => {
    if (viewerOpen) {
      document.addEventListener('keydown', handleKeyDown as any);
      document.addEventListener('contextmenu', handleContextMenu as any);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown as any);
        document.removeEventListener('contextmenu', handleContextMenu as any);
      };
    }
  }, [viewerOpen, handleKeyDown, handleContextMenu]);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch course details with progress
      const progressResponse = await apiService.get(`/progress/course/${courseId}`);
      const courseData = progressResponse.data;
      
      setCourse(courseData);
      
      // Find the first incomplete step or last step
      const firstIncomplete = courseData.learning_flow_steps.findIndex(
        (step: LearningStep) => !step.isCompleted
      );
      setActiveStep(firstIncomplete !== -1 ? firstIncomplete : 0);
    } catch (err: any) {
      console.error('Error fetching course:', err);
      setError(err.response?.data?.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = async (index: number) => {
    const step = course?.learning_flow_steps[index];
    if (!step) return;

    if (step.isLocked) {
      setError('This step is locked. Please complete previous steps first.');
      return;
    }

    // Check access with backend
    try {
      const response = await apiService.get(`/progress/check-access/${step.id}`);
      if (response.data.canAccess) {
        setActiveStep(index);
        setError(null);
      } else {
        setError('You do not have access to this step yet.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Access denied');
    }
  };

  const handleStartLearning = (step: LearningStep) => {
    setCurrentUnit(step.learning_units);
    setViewerOpen(true);
    setStartTime(Date.now());
  };

  const handleCloseViewer = async () => {
    if (currentUnit && startTime) {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const step = course?.learning_flow_steps[activeStep];
      
      if (step) {
        // Submit progress
        try {
          await apiService.post('/progress/submit', {
            learning_flow_stepsId: step.id,
            completionPercent: 100,
            timeSpent: timeSpent,
          });
          
          // Refresh course data
          await fetchCourseDetails();
        } catch (err: any) {
          console.error('Error submitting progress:', err);
        }
      }
    }
    
    setViewerOpen(false);
    setCurrentUnit(null);
    setStartTime(0);
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'BOOK':
        return <DescriptionIcon />;
      case 'VIDEO':
        return <VideoIcon />;
      case 'INTERACTIVE':
        return <InteractiveIcon />;
      default:
        return <DescriptionIcon />;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `⏱️ Learn in ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `⏱️ Learn in ${hours}h ${mins}m`;
  };

  const calculateOverallProgress = () => {
    if (!course || course.learning_flow_steps.length === 0) return 0;
    const completed = course.learning_flow_steps.filter(s => s.isCompleted).length;
    return Math.round((completed / course.learning_flow_steps.length) * 100);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!course) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Course not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <Box mb={4}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/student')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        
        <Typography variant="h4" gutterBottom>
          {course.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {course.description}
        </Typography>
        {course.courseCode && <Chip label={`Course Code: ${course.courseCode}`} variant="outlined" />}
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Overall Progress */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overall Progress
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box flexGrow={1}>
              <LinearProgress 
                variant="determinate" 
                value={calculateOverallProgress()} 
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Typography variant="h6" color="primary">
              {calculateOverallProgress()}%
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mt={1}>
            {course.learning_flow_steps.filter(s => s.isCompleted).length} of {course.learning_flow_steps.length} steps completed
          </Typography>
        </CardContent>
      </Card>

      {/* Learning Flow Stepper */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Learning Path
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Follow the steps in order to complete this course
          </Typography>

          <Stepper activeStep={activeStep} orientation="vertical">
            {course.learning_flow_steps.map((step, index) => (
              <Step key={step.id} completed={step.isCompleted}>
                <StepLabel
                  optional={
                    step.isLocked ? (
                      <Chip 
                        label="Locked" 
                        size="small" 
                        icon={<LockIcon />} 
                        color="default" 
                      />
                    ) : step.isCompleted ? (
                      <Chip 
                        label="Completed" 
                        size="small" 
                        icon={<CheckCircleIcon />} 
                        color="success" 
                      />
                    ) : null
                  }
                  onClick={() => handleStepClick(index)}
                  sx={{ cursor: step.isLocked ? 'not-allowed' : 'pointer' }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    {getContentIcon(step.learning_units.type)}
                    <Typography variant="subtitle1">
                      {step.learning_units.title}
                    </Typography>
                  </Box>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {step.learning_units.description}
                  </Typography>
                  
                  <Box display="flex" gap={2} mb={2}>
                    <Chip 
                      label={step.learning_units.type} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      label={formatDuration(step.learning_units.estimatedDuration)} 
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  {step.completionPercent > 0 && !step.isCompleted && (
                    <Box mb={2}>
                      <Typography variant="caption" color="text.secondary">
                        Progress: {step.completionPercent}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={step.completionPercent} 
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  )}

                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      startIcon={<PlayIcon />}
                      onClick={() => handleStartLearning(step)}
                      disabled={step.isLocked}
                    >
                      {step.isCompleted ? 'Review' : step.completionPercent > 0 ? 'Continue' : 'Start'}
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Content Viewer Dialog */}
      <Dialog
        open={viewerOpen}
        onClose={handleCloseViewer}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '90vh',
            height: '90vh',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Security Warning Toast */}
        {securityWarning && (
          <Box
            sx={{
              position: 'fixed',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'error.main',
              color: 'white',
              px: 3,
              py: 1.5,
              borderRadius: 2,
              zIndex: 10000,
              boxShadow: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            🔒 {securityWarning}
          </Box>
        )}

        <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6">{currentUnit?.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {currentUnit?.type} • {currentUnit?.estimatedDuration} min
              </Typography>
            </Box>
            {/* Session Watermark */}
            <Box
              sx={{
                fontSize: '10px',
                color: 'rgba(0,0,0,0.3)',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              Protected Content • Session: {Date.now().toString(36).toUpperCase()}
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent
          ref={contentRef}
          sx={{
            p: 0,
            position: 'relative',
            overflow: 'hidden',
            userSelect: 'none',
            WebkitTouchCallout: 'none',
            height: 'calc(100% - 120px)',
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Box sx={{ width: '100%', height: '100%', position: 'relative', bgcolor: '#f5f5f5' }}>
            {/* Watermark Overlay for non-PDF content */}
            {currentUnit && !currentUnit.secureAccessUrl.match(/\.(pdf)$/i) && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                  zIndex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '100px',
                  padding: '50px',
                  opacity: 0.05,
                  userSelect: 'none',
                }}
              >
                {[...Array(20)].map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      transform: 'rotate(-45deg)',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    AIIMS NAGPUR • PROTECTED
                  </Box>
                ))}
              </Box>
            )}

            {/* PDF: Use SecurePdfViewer */}
            {currentUnit?.secureAccessUrl.match(/\.(pdf)$/i) && (
              <SecurePdfViewer 
                url={getFullContentUrl(currentUnit.secureAccessUrl)} 
                watermarkText="AIIMS NAGPUR • STUDENT ACCESS"
              />
            )}

            {/* VIDEO Content */}
            {currentUnit?.secureAccessUrl.match(/\.(mp4|webm|ogg)$/i) && (
              <Box sx={{ width: '100%', height: '100%', bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <video 
                  className="secure-video"
                  controls
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ width: '100%', height: '100%', maxHeight: '100%' }}
                >
                  <source src={getFullContentUrl(currentUnit.secureAccessUrl)} />
                  Your browser does not support the video tag.
                </video>
                {/* Video watermark */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 60,
                    right: 20,
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.7)',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: '4px 12px',
                    borderRadius: '4px',
                  }}
                >
                  AIIMS Nagpur Medical LMS • Protected Content
                </Box>
              </Box>
            )}

            {/* IMAGE Content */}
            {currentUnit?.secureAccessUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
              <Box 
                sx={{ 
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: '#000',
                }}
              >
                <img 
                  src={getFullContentUrl(currentUnit.secureAccessUrl)} 
                  alt={currentUnit.title} 
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%',
                    objectFit: 'contain',
                    userSelect: 'none',
                  }}
                />
              </Box>
            )}

            {/* YOUTUBE/EMBEDDED VIDEO */}
            {currentUnit && (getFullContentUrl(currentUnit.secureAccessUrl).includes('youtube.com') || getFullContentUrl(currentUnit.secureAccessUrl).includes('youtu.be')) && (
              <iframe
                src={getFullContentUrl(currentUnit.secureAccessUrl).replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                title={currentUnit.title}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={() => setIframeError(true)}
              />
            )}

            {/* INTERACTIVE/HTML Content */}
            {currentUnit && 
              !currentUnit.secureAccessUrl.match(/\.(pdf|mp4|webm|ogg|jpg|jpeg|png|gif|webp)$/i) &&
              !getFullContentUrl(currentUnit.secureAccessUrl).includes('youtube.com') &&
              !getFullContentUrl(currentUnit.secureAccessUrl).includes('youtu.be') && (
              <iframe
                src={getFullContentUrl(currentUnit.secureAccessUrl)}
                title={currentUnit.title}
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-same-origin allow-scripts allow-forms"
                onError={() => setIframeError(true)}
              />
            )}

            {/* Iframe Error Overlay */}
            {iframeError && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(0,0,0,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }}
              >
                <Box sx={{ textAlign: 'center', color: 'white', p: 4 }}>
                  <Typography variant="h5" gutterBottom>⚠️ Cannot Display Content</Typography>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    The content cannot be loaded in secure view mode.
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={() => setIframeError(false)}
                    sx={{ mr: 2 }}
                  >
                    🔄 Retry
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={handleCloseViewer}
                    sx={{ color: 'white', borderColor: 'white' }}
                  >
                    Close
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ borderTop: '1px solid #e0e0e0', p: 2 }}>
          <Button onClick={handleCloseViewer} variant="outlined" sx={{ mr: 'auto' }}>
            Close
          </Button>
          <Button onClick={handleCloseViewer} variant="contained" color="success">
            ✓ Mark as Complete & Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentCourseView;
