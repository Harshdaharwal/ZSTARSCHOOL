import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { ACADEMIC_YEAR } from '../../config/schoolConfig.js';

const ALL_LINKS = [
  { to: '/', labelKey: 'nav.dashboard', icon: '📊', end: true, adminOnly: false },
  { to: '/students', labelKey: 'nav.students', icon: '🎒', adminOnly: true },
  { to: '/teachers', labelKey: 'nav.teachers', icon: '👨‍🏫', adminOnly: true },
  { to: '/classes', labelKey: 'nav.classes', icon: '🏛️', adminOnly: false },
  { to: '/attendance/students', labelKey: 'nav.attStu', icon: '✅', adminOnly: false },
  { to: '/attendance/teachers', labelKey: 'nav.attTch', icon: '📋', adminOnly: true },
  { to: '/fees', labelKey: 'nav.fees', icon: '💰', adminOnly: true },
  { to: '/class-fees', labelKey: 'nav.classFees', icon: '🏷️', adminOnly: true },
  { to: '/salary', labelKey: 'nav.salary', icon: '💼', adminOnly: true },
  { to: '/exams', labelKey: 'nav.exams', icon: '📝', adminOnly: true },
  { to: '/marks', labelKey: 'nav.marks', icon: '📑', adminOnly: true },
  { to: '/results', labelKey: 'nav.results', icon: '🎓', adminOnly: false, teacherOnly: true },
  { to: '/class-notices', labelKey: 'nav.classNotices', icon: '📢', adminOnly: false },
  { to: '/timetables', labelKey: 'nav.timetables', icon: '🗓️', adminOnly: true },
  { to: '/announcements', labelKey: 'nav.announcements', icon: '📣', adminOnly: true },
  { to: '/settings', labelKey: 'nav.settings', icon: '⚙️', adminOnly: true },
];

export const Sidebar = memo(function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const links = useMemo(
    () =>
      ALL_LINKS.filter((l) => {
        if (l.teacherOnly && user?.role !== 'teacher') return false;
        if (l.adminOnly && !isAdmin) return false;
        return true;
      }),
    [isAdmin, user?.role]
  );

  return (
    <aside className="sidebar" aria-label={t('nav.menu')}>
      <div className="logo">
        <span className="logo-icon">🏫</span>
        <span className="logo-text">{t('schoolName')}</span>
      </div>
      <div className="nav-year" aria-hidden>
        {ACADEMIC_YEAR}
      </div>
      <div className="nav-sec-label">{t('nav.menu')}</div>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <span className="nav-icon">{l.icon}</span>
          <span>{t(l.labelKey)}</span>
        </NavLink>
      ))}
    </aside>
  );
});
