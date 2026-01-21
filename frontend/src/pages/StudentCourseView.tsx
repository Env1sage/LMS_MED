import React, { useEffect, useState } from 'react';
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
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
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
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '80vh',
            userSelect: 'none', // Disable text selection
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
          }
        }}
        onContextMenu={(e) => e.preventDefault()} // Disable right-click
      >
        <DialogTitle>
          {currentUnit?.title}
          <Typography variant="body2" color="text.secondary">
            {currentUnit?.type}
          </Typography>
          {/* Session Watermark */}
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              fontSize: '10px',
              color: 'rgba(0,0,0,0.3)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            Session: {Date.now().toString(36)}
          </Box>
        </DialogTitle>
        <DialogContent
          sx={{
            userSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {currentUnit?.type === 'BOOK' && currentUnit.secureAccessUrl && (
            <Box sx={{ width: '100%', height: '70vh', position: 'relative' }}>
              <iframe
                src={currentUnit.secureAccessUrl}
                width="100%"
                height="100%"
                title="Content Viewer"
                style={{ border: 'none', pointerEvents: 'auto' }}
                sandbox="allow-same-origin allow-scripts"
              />
              {/* Overlay watermark */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-45deg)',
                  fontSize: '60px',
                  color: 'rgba(0,0,0,0.05)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                }}
              >
                AIIMS NAGPUR - CONFIDENTIAL
              </Box>
            </Box>
          )}
          
          {currentUnit?.type === 'VIDEO' && currentUnit.secureAccessUrl && (
            <Box sx={{ width: '100%', height: '70vh', bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {currentUnit.deliveryType === 'EMBED' ? (
                <video
                  controls
                  width="100%"
                  height="100%"
                  style={{ maxHeight: '70vh' }}
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  disablePictureInPicture
                >
                  <source src={currentUnit.secureAccessUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <iframe
                  src={currentUnit.secureAccessUrl}
                  width="100%"
                  height="100%"
                  title="Video Viewer"
                  style={{ border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
              {/* Video watermark */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  right: 20,
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.6)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                AIIMS Nagpur Medical LMS
              </Box>
            </Box>
          )}
          
          {currentUnit?.type === 'INTERACTIVE' && currentUnit.secureAccessUrl && (
            <Box sx={{ width: '100%', height: '70vh' }}>
              <iframe
                src={currentUnit.secureAccessUrl}
                width="100%"
                height="100%"
                title="Interactive Content"
                style={{ border: 'none' }}
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewer} variant="contained">
            Mark as Complete & Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentCourseView;
