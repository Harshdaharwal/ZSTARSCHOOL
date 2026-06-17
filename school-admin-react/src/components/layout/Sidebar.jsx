import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useColorMode } from '../../hooks/useColorMode.js';
import { ACADEMIC_YEAR } from '../../config/schoolConfig.js';
import {
  IconDashboard, IconStudents, IconTeachers, IconClasses,
  IconAttendanceStudents, IconAttendanceTeachers, IconFees, IconClassFees,
  IconSalary, IconExams, IconMarks, IconResults, IconClassNotices,
  IconTimetables, IconAnnouncements, IconSettings, IconClose, IconSchool, IconBriefcase,
  IconCalendar, IconWhatsApp, IconAlertCircle, IconCertificate, IconLogout, IconMoon, IconSun,
} from '../common/Icons.jsx';

const ALL_LINKS = [
  { to: '/', labelKey: 'nav.dashboard', Icon: IconDashboard, end: true, adminOnly: false },
  { to: '/students', labelKey: 'nav.students', Icon: IconStudents, adminOnly: false },
  { to: '/teachers', labelKey: 'nav.teachers', Icon: IconTeachers, adminOnly: true },
  { to: '/classes', labelKey: 'nav.classes', Icon: IconClasses, adminOnly: true },
  { to: '/attendance/students', labelKey: 'nav.attStu', Icon: IconAttendanceStudents, adminOnly: false },
  { to: '/attendance/teachers', labelKey: 'nav.attTch', Icon: IconAttendanceTeachers, adminOnly: true },
  { to: '/fees', labelKey: 'nav.fees', Icon: IconFees, adminOnly: true },
  { to: '/fee-defaulters', labelKey: 'nav.feeDefaulters', Icon: IconAlertCircle, adminOnly: true },
  { to: '/class-fees', labelKey: 'nav.classFees', Icon: IconClassFees, adminOnly: true },
  { to: '/salary', labelKey: 'nav.salary', Icon: IconSalary, adminOnly: true },
  { to: '/teacher-portal', labelKey: 'nav.teacherPortal', Icon: IconBriefcase, teacherOnly: true },
  { to: '/exams', labelKey: 'nav.exams', Icon: IconExams, adminOnly: false },
  { to: '/marks', labelKey: 'nav.marks', Icon: IconMarks, adminOnly: true },
  { to: '/certificates', labelKey: 'nav.certificates', Icon: IconCertificate, adminOnly: true },
  { to: '/class-notices', labelKey: 'nav.classNotices', Icon: IconClassNotices, adminOnly: false },
  { to: '/timetables', labelKey: 'nav.timetables', Icon: IconTimetables, adminOnly: false },
  { to: '/timetable-builder', labelKey: 'nav.timetableBuilder', Icon: IconCalendar, adminOnly: true },
  { to: '/announcements', labelKey: 'nav.announcements', Icon: IconAnnouncements, adminOnly: false },
  { to: '/whatsapp', labelKey: 'nav.whatsapp', Icon: IconWhatsApp, adminOnly: true },
  { to: '/settings', labelKey: 'nav.settings', Icon: IconSettings, adminOnly: true },
];

export const Sidebar = memo(function Sidebar({ open, onClose }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isDark, toggleMode } = useColorMode();
  const navigate = useNavigate();
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

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';
  const roleLabel = user?.role === 'admin' ? 'Administrator' : user?.role === 'teacher' ? 'Teacher' : '';

  return (
    <aside className={'sidebar' + (open ? ' sidebar-mobile-open' : '')} aria-label={t('nav.menu')}>
      {/* Logo header */}
      <div className="logo">
        <IconSchool size={24} className="logo-icon" strokeWidth={1.8} />
        <span className="logo-text">{t('schoolName')}</span>
        {onClose && (
          <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <IconClose size={15} />
          </button>
        )}
      </div>

      <div className="nav-year" aria-hidden>{ACADEMIC_YEAR}</div>
      <div className="nav-sec-label">{t('nav.menu')}</div>

      {/* Nav links — scrollable */}
      <div className="sidebar-nav-scroll">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
          >
            <span className="nav-icon"><l.Icon size={17} strokeWidth={1.8} /></span>
            <span>{t(l.labelKey)}</span>
          </NavLink>
        ))}
      </div>

      {/* Bottom section: theme toggle + user profile + logout */}
      <div className="sidebar-bottom">
        {/* Theme toggle */}
        <button className="sidebar-theme-btn" onClick={toggleMode} type="button">
          {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* User profile */}
        {user && (
          <div className="sidebar-profile">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-profile-info">
              <div className="sidebar-profile-role">{roleLabel}</div>
              <div className="sidebar-profile-email">{user.email}</div>
            </div>
          </div>
        )}

        {/* Logout */}
        <button className="sidebar-logout-btn" onClick={handleLogout} type="button">
          <IconLogout size={16} />
          <span>{t('topbar.logout')}</span>
        </button>
      </div>
    </aside>
  );
});
