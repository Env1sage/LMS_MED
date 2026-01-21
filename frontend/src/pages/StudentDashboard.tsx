import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  School as SchoolIcon,
  PlayCircleOutline as PlayIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';

interface CourseProgress {
  courseId: number;
  title: string;
  description: string;
  code: string;
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  lastAccessedAt: string | null;
  nextStepId: number | null;
  nextStepTitle: string | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/progress/my-courses');
      setCourses(response.data);
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      setError(err.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = (courseId: number) => {
    navigate(`/student/courses/${courseId}`);
  };

  const handleContinueCourse = (courseId: number) => {
    navigate(`/student/courses/${courseId}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return <Chip label="Not Started" size="small" color="default" />;
      case 'IN_PROGRESS':
        return <Chip label="In Progress" size="small" color="primary" />;
      case 'COMPLETED':
        return <Chip label="Completed" size="small" color="success" icon={<CheckIcon />} />;
      default:
        return null;
    }
  };

  const formatLastAccessed = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            My Learning Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.fullName || 'Student'}!
          </Typography>
        </Box>
        <Button variant="outlined" color="error" onClick={handleLogout}>
          Logout
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Courses
              </Typography>
              <Typography variant="h3">{courses.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h3">
                {courses.filter(c => c.status === 'IN_PROGRESS').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h3">
                {courses.filter(c => c.status === 'COMPLETED').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Courses Section */}
      <Typography variant="h5" gutterBottom mb={2}>
        My Courses
      </Typography>

      {courses.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <LockIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No courses assigned yet
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Your faculty will assign courses to you soon.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {courses.map((course) => (
            <Grid size={{ xs: 12, md: 6 }} key={course.courseId}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Typography variant="h6" component="div">
                      {course.title}
                    </Typography>
                    {getStatusChip(course.status)}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {course.description}
                  </Typography>

                  <Chip 
                    label={`Code: ${course.code}`} 
                    size="small" 
                    variant="outlined" 
                    sx={{ mb: 2 }}
                  />

                  {/* Progress Bar */}
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {course.completedSteps} / {course.totalSteps} steps
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={course.progressPercentage} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary" mt={0.5}>
                      {course.progressPercentage}% Complete
                    </Typography>
                  </Box>

                  {/* Last Accessed */}
                  <Box display="flex" alignItems="center" gap={1}>
                    <ScheduleIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Last accessed: {formatLastAccessed(course.lastAccessedAt)}
                    </Typography>
                  </Box>

                  {/* Next Step Info */}
                  {course.nextStepTitle && course.status !== 'COMPLETED' && (
                    <Box mt={2} p={1.5} bgcolor="primary.light" borderRadius={1}>
                      <Typography variant="caption" color="primary.contrastText" fontWeight="bold">
                        Next: {course.nextStepTitle}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  {course.status === 'NOT_STARTED' ? (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<PlayIcon />}
                      onClick={() => handleStartCourse(course.courseId)}
                    >
                      Start Course
                    </Button>
                  ) : course.status === 'COMPLETED' ? (
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<CheckIcon />}
                      onClick={() => handleContinueCourse(course.courseId)}
                    >
                      Review Course
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<PlayIcon />}
                      onClick={() => handleContinueCourse(course.courseId)}
                    >
                      Continue Learning
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default StudentDashboard;
