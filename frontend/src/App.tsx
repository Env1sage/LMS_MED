import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UnauthorizedPage from './pages/UnauthorizedPage';
import Login from './pages/Login';
import BitflowOwnerDashboard from './pages/BitflowOwnerDashboard';
import CompetencyDashboard from './pages/CompetencyDashboard';
import PublisherAdminDashboard from './pages/PublisherAdminDashboard';
import CreateLearningUnit from './pages/CreateLearningUnit';
import ViewLearningUnit from './pages/ViewLearningUnit';
import McqManagement from './pages/McqManagement';
import CollegeAdminDashboard from './pages/CollegeAdminDashboard';
import CreateStudent from './pages/CreateStudent';
import EditStudent from './pages/EditStudent';
import ResetStudentPassword from './pages/ResetStudentPassword';
import FacultyDashboard from './pages/FacultyDashboard';
import CreateCourse from './pages/CreateCourse';
import EditCourse from './pages/EditCourse';
import AssignCourse from './pages/AssignCourse';
import CourseDetails from './pages/CourseDetails';
import CourseAnalytics from './pages/CourseAnalytics';
import StudentDashboard from './pages/StudentDashboard';
import StudentCourseView from './pages/StudentCourseView';
import { UserRole } from './types';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
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
            path="/publisher-admin/mcqs" 
            element={
              <ProtectedRoute requiredRole={UserRole.PUBLISHER_ADMIN}>
                <McqManagement />
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
            path="/college-admin/reset-password/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <ResetStudentPassword />
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
            path="/student" 
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/unauthorized" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
