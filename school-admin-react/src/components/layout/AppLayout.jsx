import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { OfflineBanner } from '../common/OfflineBanner.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import {
  IconDashboard, IconStudents, IconTeachers, IconClasses,
  IconAttendanceStudents, IconAttendanceTeachers, IconFees, IconClassFees,
  IconExams, IconMarks, IconResults, IconTimetables, IconAnnouncements, IconSettings,
  IconCalendar, IconMenu,
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
  { path: '/timetable-builder', Icon: IconCalendar, key: 'nav.timetableBuilder' },
  { path: '/announcements', Icon: IconAnnouncements, key: 'nav.announcements' },
  { path: '/settings', Icon: IconSettings, key: 'nav.settings' },
];

/* Bottom nav — 4 primary tabs + "More" that opens sidebar sheet */
function MobileBottomNav({ onMoreClick, moreOpen }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const tabs = useMemo(() => [
    { to: '/', Icon: IconDashboard, label: 'Home', end: true },
    { to: '/students', Icon: IconStudents, label: 'Students' },
    ...(isAdmin ? [{ to: '/fees', Icon: IconFees, label: 'Fees' }] : []),
    { to: '/attendance/students', Icon: IconAttendanceStudents, label: 'Attend.' },
  ], [isAdmin]);

  return (
    <nav className="mob-bottom-nav" aria-label="Mobile navigation">
      {tabs.map(({ to, Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => 'mob-nav-tab' + (isActive ? ' mob-nav-tab--active' : '')}
        >
          {({ isActive }) => (
            <>
              <span className="mob-nav-icon-wrap">
                {isActive && <span className="mob-nav-glow" />}
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.7} />
              </span>
              <span className="mob-nav-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button
        className={'mob-nav-tab mob-nav-more' + (moreOpen ? ' mob-nav-tab--active' : '')}
        onClick={onMoreClick}
        aria-label={t('nav.menu')}
      >
        <span className="mob-nav-icon-wrap">
          {moreOpen && <span className="mob-nav-glow" />}
          <IconMenu size={22} strokeWidth={moreOpen ? 2.2 : 1.7} />
        </span>
        <span className="mob-nav-label">More</span>
      </button>
    </nav>
  );
}

/* Auto-inject data-label on every td from thead, enables CSS card layout on mobile */
function useResponsiveTables(pathname) {
  useEffect(() => {
    const label = () => {
      document.querySelectorAll('.tbl-wrap table').forEach((table) => {
        const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
        table.querySelectorAll('tbody tr').forEach((row) => {
          [...row.querySelectorAll('td')].forEach((td, i) => {
            if (headers[i] !== undefined) td.setAttribute('data-label', headers[i]);
          });
        });
      });
    };
    // Label immediately + re-label when table content changes (async data loads)
    label();
    const obs = new MutationObserver(label);
    const root = document.getElementById('main-content');
    if (root) obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [pathname]);
}

const AppLayout = memo(function AppLayout() {
  const loc = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [loc.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen]);

  useResponsiveTables(loc.pathname);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  const meta = useMemo(() => {
    return ROUTE_META.find((r) => r.path === loc.pathname) || ROUTE_META[0];
  }, [loc.pathname]);

  return (
    <>
      <a href="#main-content" className="skip-link">{t('a11y.skip')}</a>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main">
        <Topbar meta={meta} onMenuToggle={toggleSidebar} />
        <OfflineBanner />
        <main id="main-content" className="content">
          <Outlet />
        </main>
      </div>

      {/* Mobile-only bottom nav */}
      <MobileBottomNav onMoreClick={toggleSidebar} moreOpen={sidebarOpen} />
    </>
  );
});

export default AppLayout;
