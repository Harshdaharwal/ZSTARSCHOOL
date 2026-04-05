import { memo, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

const ROUTE_META = [
  { path: '/', emoji: '📊', key: 'nav.dashboard' },
  { path: '/students', emoji: '🎒', key: 'nav.students' },
  { path: '/teachers', emoji: '👨‍🏫', key: 'nav.teachers' },
  { path: '/classes', emoji: '🏛️', key: 'nav.classes' },
  { path: '/attendance/students', emoji: '✅', key: 'nav.attStu' },
  { path: '/attendance/teachers', emoji: '📋', key: 'nav.attTch' },
  { path: '/fees', emoji: '💰', key: 'nav.fees' },
  { path: '/class-fees', emoji: '🏷️', key: 'nav.classFees' },
  { path: '/exams', emoji: '📝', key: 'nav.exams' },
  { path: '/marks', emoji: '📑', key: 'nav.marks' },
  { path: '/results', emoji: '🎓', key: 'nav.results' },
  { path: '/timetables', emoji: '🗓️', key: 'nav.timetables' },
  { path: '/announcements', emoji: '📣', key: 'nav.announcements' },
  { path: '/settings', emoji: '⚙️', key: 'nav.settings' },
];

const AppLayout = memo(function AppLayout() {
  const loc = useLocation();
  const { t } = useTranslation();

  const title = useMemo(() => {
    const m = ROUTE_META.find((r) => r.path === loc.pathname);
    const meta = m || ROUTE_META[0];
    return `${meta.emoji} ${t(meta.key)}`;
  }, [loc.pathname, t]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('a11y.skip')}
      </a>
      <Sidebar />
      <div className="main">
        <Topbar title={title} />
        <main id="main-content" className="content">
          <Outlet />
        </main>
      </div>
    </>
  );
});

export default AppLayout;
