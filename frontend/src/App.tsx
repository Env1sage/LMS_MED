import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UnauthorizedPage from './pages/UnauthorizedPage';
import Login from './pages/Login';
import LoginNew from './pages/LoginNew';
import BitflowOwnerDashboard from './pages/BitflowOwnerDashboard';
import CompetencyDashboard from './pages/CompetencyDashboard';
import ContentManagement from './pages/ContentManagement';
import PublisherAdminDashboard from './pages/PublisherAdminDashboard';
import PublisherProfilePage from './pages/PublisherProfilePage';
import CreateLearningUnit from './pages/CreateLearningUnit';
import ViewLearningUnit from './pages/ViewLearningUnit';
import EditLearningUnit from './pages/EditLearningUnit';
import McqManagement from './pages/McqManagement';
import CollegeAdminDashboard from './pages/CollegeAdminDashboardNew';
import DepartmentManagement from './pages/DepartmentManagementNew';
import FacultyManagement from './pages/FacultyManagementNew';
import CollegeProfile from './pages/CollegeProfile';
import CreateStudent from './pages/CreateStudent';
import EditStudent from './pages/EditStudent';
import ResetStudentPassword from './pages/ResetStudentPassword';
import DeanDashboard from './pages/DeanDashboard';
import FacultyDashboard from './pages/FacultyDashboardNew';
import CreateCourse from './pages/CreateCourse';
import EditCourse from './pages/EditCourse';
import AssignCourse from './pages/AssignCourse';
import CourseDetails from './pages/CourseDetails';
import CourseAnalytics from './pages/CourseAnalytics';
import StudentTracking from './pages/StudentTracking';
import StudentProgressDetail from './pages/StudentProgressDetail';
import StudentDashboard from './pages/StudentDashboard';
import StudentPortal from './pages/StudentPortal';
import StudentCourseView from './pages/StudentCourseView';
import TestAttempt from './pages/TestAttempt';
import SelfPacedContentManager from './pages/SelfPacedContentManager';
import StudentSelfPaced from './pages/StudentSelfPaced';
import { UserRole } from './types';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginNew />} />
          <Route path="/login-old" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requiredRole={UserRole.BITFLOW_OWNER}>
                <BitflowOwnerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/competencies" 
            element={
              <ProtectedRoute requiredRole={UserRole.BITFLOW_OWNER}>
                <CompetencyDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/content" 
            element={
              <ProtectedRoute requiredRole={UserRole.BITFLOW_OWNER}>
                <ContentManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/publisher-admin" 
            element={
              <ProtectedRoute requiredRole={UserRole.PUBLISHER_ADMIN}>
                <PublisherAdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/publisher-admin/create" 
            element={
              <ProtectedRoute requiredRole={UserRole.PUBLISHER_ADMIN}>
                <CreateLearningUnit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/publisher-admin/view/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.PUBLISHER_ADMIN}>
                <ViewLearningUnit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/publisher-admin/learning-units/:id/edit" 
            element={
              <ProtectedRoute requiredRole={UserRole.PUBLISHER_ADMIN}>
                <EditLearningUnit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/publisher-admin/mcqs" 
            element={
              <ProtectedRoute requiredRole={UserRole.PUBLISHER_ADMIN}>
                <McqManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/publisher-admin/profile" 
            element={
              <ProtectedRoute requiredRole={UserRole.PUBLISHER_ADMIN}>
                <PublisherProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeAdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/create-student" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CreateStudent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/edit-student/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <EditStudent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/students/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <EditStudent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/reset-password/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <ResetStudentPassword />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/departments" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <DepartmentManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/faculty" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <FacultyManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/profile" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dean" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_DEAN}>
                <DeanDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty" 
            element={
              <ProtectedRoute requiredRole={UserRole.FACULTY}>
                <FacultyDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/create-course" 
            element={
              <ProtectedRoute requiredRole={UserRole.FACULTY}>
                <CreateCourse />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/edit-course/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.FACULTY}>
                <EditCourse />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/courses/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.FACULTY}>
                <CourseDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/assign-course/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.FACULTY}>
                <AssignCourse />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/courses/:id/analytics" 
            element={
              <ProtectedRoute requiredRole={UserRole.FACULTY}>
                <CourseAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/courses/:courseId/tracking" 
            element={
              <ProtectedRoute requiredRole={UserRole.FACULTY}>
                <StudentTracking />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/courses/:courseId/students/:studentId" 
            element={
              <ProtectedRoute requiredRole={UserRole.FACULTY}>
                <StudentProgressDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/self-paced" 
            element={
              <ProtectedRoute requiredRole={UserRole.FACULTY}>
                <SelfPacedContentManager />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentPortal />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/dashboard-old" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/courses/:courseId" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentCourseView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/tests/:testId" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <TestAttempt />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/self-paced" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentSelfPaced />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/tests/:testId/results" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <TestAttempt />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
