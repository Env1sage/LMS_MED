import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UnauthorizedPage from './pages/UnauthorizedPage';
import Login from './pages/Login';
import BitflowOwnerDashboard from './pages/BitflowOwnerDashboard';
import PublishersManagement from './pages/PublishersManagement';
import CollegesManagement from './pages/CollegesManagement';
import CompetencyBrowser from './pages/CompetencyBrowser';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import ContentManagementPage from './pages/ContentManagementPage';
import PackagesManagement from './pages/PackagesManagement';
import PublisherAdminDashboard from './pages/PublisherAdminDashboard';
import ContentListPage from './pages/ContentListPage';
import CreateLearningUnit from './pages/CreateLearningUnit';
import ViewLearningUnit from './pages/ViewLearningUnit';
import EditLearningUnit from './pages/EditLearningUnit';
import McqManagement from './pages/McqManagement';
import BulkUploadPage from './pages/BulkUploadPage';
import PublisherProfile from './pages/PublisherProfile';
import CollegeAdminDashboard from './pages/CollegeAdminDashboard';
import DeanDashboard from './pages/DeanDashboard';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyMyCourses from './pages/faculty/FacultyMyCourses';
import FacultyCreateCourse from './pages/faculty/FacultyCreateCourse';
import FacultyEditCourse from './pages/faculty/FacultyEditCourse';
import FacultyCourseDetails from './pages/faculty/FacultyCourseDetails';
import FacultyAssignCourse from './pages/faculty/FacultyAssignCourse';
import FacultyCourseAnalytics from './pages/faculty/FacultyCourseAnalytics';
import FacultyStudentTracking from './pages/faculty/FacultyStudentTracking';
import FacultyStudentProgress from './pages/faculty/FacultyStudentProgress';
import FacultySelfPaced from './pages/faculty/FacultySelfPaced';
import FacultyStudents from './pages/faculty/FacultyStudents';
import FacultyAnalytics from './pages/faculty/FacultyAnalytics';
import FacultyNotifications from './pages/faculty/FacultyNotifications';
import FacultyAssignments from './pages/faculty/FacultyAssignments';
import FacultyProfile from './pages/faculty/FacultyProfile';
import FacultyContentViewer from './pages/faculty/FacultyContentViewer';
import CollegeStudents from './pages/college/CollegeStudents';
import CollegeCreateStudent from './pages/college/CollegeCreateStudent';
import CollegeEditStudent from './pages/college/CollegeEditStudent';
import CollegeResetPassword from './pages/college/CollegeResetPassword';
import CollegeDepartments from './pages/college/CollegeDepartments';
import CollegeFaculty from './pages/college/CollegeFaculty';
import CollegeAnalytics from './pages/college/CollegeAnalytics';
import CollegeNotifications from './pages/college/CollegeNotifications';
import CollegeProfilePage from './pages/college/CollegeProfilePage';
import CollegeBulkUpload from './pages/college/CollegeBulkUpload';
import CollegePackages from './pages/college/CollegePackages';
import TeacherPerformance from './pages/college/TeacherPerformance';
import StudentPerformance from './pages/college/StudentPerformance';
import CourseAnalysis from './pages/college/CourseAnalysis';
// Old faculty page imports removed — now using pages/faculty/*
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCourses from './pages/student/StudentCourses';
import StudentTests from './pages/student/StudentTests';
import StudentLibrary from './pages/student/StudentLibrary';
import StudentAnalytics from './pages/student/StudentAnalytics';
import StudentSchedule from './pages/student/StudentSchedule';
import StudentProfile from './pages/student/StudentProfile';
import StudentNotifications from './pages/student/StudentNotifications';
import StudentCourseView from './pages/StudentCourseView';
import StudentContentViewer from './pages/student/StudentContentViewer';
import TestAttempt from './pages/TestAttempt';
// SelfPacedContentManager replaced by FacultySelfPaced
import StudentSelfPaced from './pages/StudentSelfPaced';
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
            path="/publishers" 
            element={
              <ProtectedRoute requiredRole={UserRole.BITFLOW_OWNER}>
                <PublishersManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/colleges" 
            element={
              <ProtectedRoute requiredRole={UserRole.BITFLOW_OWNER}>
                <CollegesManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/competencies" 
            element={
              <ProtectedRoute requiredRole={UserRole.BITFLOW_OWNER}>
                <CompetencyBrowser />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/content" 
            element={
              <ProtectedRoute requiredRole={UserRole.BITFLOW_OWNER}>
                <ContentManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute requiredRole={UserRole.BITFLOW_OWNER}>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/activity-logs" 
            element={
              <ProtectedRoute requiredRole={UserRole.BITFLOW_OWNER}>
                <AuditLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute requiredRole={UserRole.BITFLOW_OWNER}>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/packages" 
            element={
              <ProtectedRoute requiredRole={UserRole.BITFLOW_OWNER}>
                <PackagesManagement />
              </ProtectedRoute>
            } 
          />
          {/* Publisher Admin Portal */}
          <Route 
            path="/publisher-admin" 
            element={
              <ProtectedRoute requiredRole={UserRole.PUBLISHER_ADMIN}>
                <PublisherAdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/publisher-admin/content" 
            element={
              <ProtectedRoute requiredRole={UserRole.PUBLISHER_ADMIN}>
                <ContentListPage />
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
            path="/publisher-admin/edit/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.PUBLISHER_ADMIN}>
                <EditLearningUnit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/publisher-admin/bulk-upload" 
            element={
              <ProtectedRoute requiredRole={UserRole.PUBLISHER_ADMIN}>
                <BulkUploadPage />
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
                <PublisherProfile />
              </ProtectedRoute>
            } 
          />
          {/* College Admin Portal */}
          <Route 
            path="/college-admin" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeAdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/students" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeStudents />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/create-student" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeCreateStudent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/edit-student/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeEditStudent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/students/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeEditStudent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/reset-password/:id" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeResetPassword />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/departments" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeDepartments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/faculty" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeFaculty />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/analytics" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/packages" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegePackages />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/notifications" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeNotifications />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/bulk-upload" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeBulkUpload />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/teacher-performance" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <TeacherPerformance />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/student-performance" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <StudentPerformance />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/course-analysis" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CourseAnalysis />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/college-admin/profile" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_ADMIN}>
                <CollegeProfilePage />
              </ProtectedRoute>
            } 
          />
          {/* Faculty Portal Routes */}
          <Route path="/faculty" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyDashboard /></ProtectedRoute>} />
          <Route path="/faculty/courses" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyMyCourses /></ProtectedRoute>} />
          <Route path="/faculty/create-course" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyCreateCourse /></ProtectedRoute>} />
          <Route path="/faculty/edit-course/:id" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyEditCourse /></ProtectedRoute>} />
          <Route path="/faculty/courses/:id" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyCourseDetails /></ProtectedRoute>} />
          <Route path="/faculty/assign-course/:id" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyAssignCourse /></ProtectedRoute>} />
          <Route path="/faculty/courses/:id/analytics" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyCourseAnalytics /></ProtectedRoute>} />
          <Route path="/faculty/courses/:courseId/tracking" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyStudentTracking /></ProtectedRoute>} />
          <Route path="/faculty/courses/:courseId/students/:studentId" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyStudentProgress /></ProtectedRoute>} />
          <Route path="/faculty/self-paced" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultySelfPaced /></ProtectedRoute>} />
          <Route path="/faculty/students" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyStudents /></ProtectedRoute>} />
          <Route path="/faculty/analytics" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyAnalytics /></ProtectedRoute>} />
          <Route path="/faculty/notifications" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyNotifications /></ProtectedRoute>} />
          <Route path="/faculty/assignments" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyAssignments /></ProtectedRoute>} />
          <Route path="/faculty/profile" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyProfile /></ProtectedRoute>} />
          <Route path="/faculty/content/:id/view" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyContentViewer /></ProtectedRoute>} />
          <Route path="/view-content/:id" element={<ProtectedRoute requiredRole={UserRole.FACULTY}><FacultyContentViewer /></ProtectedRoute>} />
          <Route 
            path="/student" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/courses" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentCourses />
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
            path="/student/assignments" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentTests />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/assignments/:testId" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <TestAttempt />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/library" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentLibrary />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/library/:id/view" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentContentViewer />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/library/:id/view" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentContentViewer />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/content/:id/view" 
            element={
              <ProtectedRoute requiredRole={UserRole.FACULTY}>
                <ViewLearningUnit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/analytics" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/schedule" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentSchedule />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/notifications" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentNotifications />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/profile" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <StudentProfile />
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
            path="/student/assignments/:testId/results" 
            element={
              <ProtectedRoute requiredRole={UserRole.STUDENT}>
                <TestAttempt />
              </ProtectedRoute>
            } 
          />
          {/* Dean Portal */}
          <Route 
            path="/dean" 
            element={
              <ProtectedRoute requiredRole={UserRole.COLLEGE_DEAN}>
                <DeanDashboard />
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
