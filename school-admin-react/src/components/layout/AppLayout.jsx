import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { OfflineBanner } from '../common/OfflineBanner.jsx';
import {
  IconDashboard, IconStudents, IconTeachers, IconClasses,
  IconAttendanceStudents, IconAttendanceTeachers, IconFees, IconClassFees,
  IconExams, IconMarks, IconResults, IconTimetables, IconAnnouncements, IconSettings,
} from '../common/Icons.jsx';

const ROUTE_META = [
  { path: '/', Icon: IconDashboard, key: 'nav.dashboard' },
  { path: '/students', Icon: IconStudents, key: 'nav.students' },
  { path: '/teachers', Icon: IconTeachers, key: 'nav.teachers' },
  { path: '/classes', Icon: IconClasses, key: 'nav.classes' },
  { path: '/attendance/students', Icon: IconAttendanceStudents, key: 'nav.attStu' },
  { path: '/attendance/teachers', Icon: IconAttendanceTeachers, key: 'nav.attTch' },
  { path: '/fees', Icon: IconFees, key: 'nav.fees' },
  { path: '/class-fees', Icon: IconClassFees, key: 'nav.classFees' },
  { path: '/exams', Icon: IconExams, key: 'nav.exams' },
  { path: '/marks', Icon: IconMarks, key: 'nav.marks' },
  { path: '/results', Icon: IconResults, key: 'nav.results' },
  { path: '/timetables', Icon: IconTimetables, key: 'nav.timetables' },
  { path: '/announcements', Icon: IconAnnouncements, key: 'nav.announcements' },
  { path: '/settings', Icon: IconSettings, key: 'nav.settings' },
];

const AppLayout = memo(function AppLayout() {
  const loc = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile nav)
  useEffect(() => {
    setSidebarOpen(false);
  }, [loc.pathname]);

  // Close sidebar when pressing Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen]);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  const meta = useMemo(() => {
    return ROUTE_META.find((r) => r.path === loc.pathname) || ROUTE_META[0];
  }, [loc.pathname]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('a11y.skip')}
      </a>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        <Topbar meta={meta} onMenuToggle={toggleSidebar} />
        <OfflineBanner />
        <main id="main-content" className="content">
          <Outlet />
        </main>
      </div>
    </>
  );
});

export default AppLayout;
