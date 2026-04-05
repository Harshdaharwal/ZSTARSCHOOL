import { Suspense, lazy } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider.jsx';
import { ApiProvider } from './context/ApiProvider.jsx';
import { ToastProvider } from './context/ToastProvider.jsx';
import { ToastHost } from './components/common/ToastHost.jsx';
import { StaffProtectedRoute } from './components/StaffProtectedRoute.jsx';
import { RequireAdmin } from './components/RequireAdmin.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import LoginPage from './screens/LoginPage.jsx';
import { Spinner } from './components/common/Spinner.jsx';

const DashboardPage = lazy(() => import('./screens/DashboardPage.jsx'));
const StudentsPage = lazy(() => import('./screens/StudentsPage.jsx'));
const TeachersPage = lazy(() => import('./screens/TeachersPage.jsx'));
const ClassesPage = lazy(() => import('./screens/ClassesPage.jsx'));
const FeesPage = lazy(() => import('./screens/FeesPage.jsx'));
const ClassFeeSettingsPage = lazy(() => import('./screens/ClassFeeSettingsPage.jsx'));
const ExamsPage = lazy(() => import('./screens/ExamsPage.jsx'));
const AttendanceStudentsPage = lazy(() => import('./screens/AttendanceStudentsPage.jsx'));
const AttendanceTeachersPage = lazy(() => import('./screens/AttendanceTeachersPage.jsx'));
const MarksResultsPage = lazy(() => import('./screens/MarksResultsPage.jsx'));
const TeacherResultsPage = lazy(() => import('./screens/TeacherResultsPage.jsx'));
const SettingsPage = lazy(() => import('./screens/SettingsPage.jsx'));
const TimetablesPage = lazy(() => import('./screens/TimetablesPage.jsx'));
const AnnouncementsPage = lazy(() => import('./screens/AnnouncementsPage.jsx'));
const SalaryPage = lazy(() => import('./screens/SalaryPage.jsx'));
const ClassAnnouncementsPage = lazy(() => import('./screens/ClassAnnouncementsPage.jsx'));

/** Browser history in dev; hash routes in production so static hosts (e.g. Live Server) work without SPA fallback. */
const Router = import.meta.env.PROD ? HashRouter : BrowserRouter;

function SuspenseFallback() {
  return (
    <div style={{ padding: 48 }} aria-busy="true">
      <Spinner />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ApiProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<StaffProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route
                    path="/"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <DashboardPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/students"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <RequireAdmin>
                          <StudentsPage />
                        </RequireAdmin>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/teachers"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <RequireAdmin>
                          <TeachersPage />
                        </RequireAdmin>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/classes"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <ClassesPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/attendance/students"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <AttendanceStudentsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/attendance/teachers"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <RequireAdmin>
                          <AttendanceTeachersPage />
                        </RequireAdmin>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/fees"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <RequireAdmin>
                          <FeesPage />
                        </RequireAdmin>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/class-fees"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <RequireAdmin>
                          <ClassFeeSettingsPage />
                        </RequireAdmin>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/exams"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <RequireAdmin>
                          <ExamsPage />
                        </RequireAdmin>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/marks"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <RequireAdmin>
                          <MarksResultsPage />
                        </RequireAdmin>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/results"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <TeacherResultsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/class-notices"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <ClassAnnouncementsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/salary"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <RequireAdmin>
                          <SalaryPage />
                        </RequireAdmin>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/timetables"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <RequireAdmin>
                          <TimetablesPage />
                        </RequireAdmin>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/announcements"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <RequireAdmin>
                          <AnnouncementsPage />
                        </RequireAdmin>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <Suspense fallback={<SuspenseFallback />}>
                        <RequireAdmin>
                          <SettingsPage />
                        </RequireAdmin>
                      </Suspense>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </Router>
          <ToastHost />
        </ToastProvider>
      </ApiProvider>
    </AuthProvider>
  );
}
