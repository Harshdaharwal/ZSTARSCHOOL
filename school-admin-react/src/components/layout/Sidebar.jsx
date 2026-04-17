import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { ACADEMIC_YEAR } from '../../config/schoolConfig.js';
import {
  IconDashboard, IconStudents, IconTeachers, IconClasses,
  IconAttendanceStudents, IconAttendanceTeachers, IconFees, IconClassFees,
  IconSalary, IconExams, IconMarks, IconResults, IconClassNotices,
  IconTimetables, IconAnnouncements, IconSettings, IconClose, IconSchool, IconBriefcase,
  IconCalendar,
} from '../common/Icons.jsx';

const ALL_LINKS = [
  { to: '/', labelKey: 'nav.dashboard', Icon: IconDashboard, end: true, adminOnly: false },
  { to: '/students', labelKey: 'nav.students', Icon: IconStudents, adminOnly: false },
  { to: '/teachers', labelKey: 'nav.teachers', Icon: IconTeachers, adminOnly: true },
  { to: '/classes', labelKey: 'nav.classes', Icon: IconClasses, adminOnly: true },
  { to: '/attendance/students', labelKey: 'nav.attStu', Icon: IconAttendanceStudents, adminOnly: false },
  { to: '/attendance/teachers', labelKey: 'nav.attTch', Icon: IconAttendanceTeachers, adminOnly: true },
  { to: '/fees', labelKey: 'nav.fees', Icon: IconFees, adminOnly: true },
  { to: '/class-fees', labelKey: 'nav.classFees', Icon: IconClassFees, adminOnly: true },
  { to: '/salary', labelKey: 'nav.salary', Icon: IconSalary, adminOnly: true },
  { to: '/teacher-portal', labelKey: 'nav.teacherPortal', Icon: IconBriefcase, teacherOnly: true },
  { to: '/exams', labelKey: 'nav.exams', Icon: IconExams, adminOnly: false },
  { to: '/marks', labelKey: 'nav.marks', Icon: IconMarks, adminOnly: true },
  { to: '/class-notices', labelKey: 'nav.classNotices', Icon: IconClassNotices, adminOnly: false },
  { to: '/timetables', labelKey: 'nav.timetables', Icon: IconTimetables, adminOnly: false },
  { to: '/timetable-builder', labelKey: 'nav.timetableBuilder', Icon: IconCalendar, adminOnly: true },
  { to: '/announcements', labelKey: 'nav.announcements', Icon: IconAnnouncements, adminOnly: false },
  { to: '/settings', labelKey: 'nav.settings', Icon: IconSettings, adminOnly: true },
];

export const Sidebar = memo(function Sidebar({ open, onClose }) {
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
    <aside className={'sidebar' + (open ? ' sidebar-mobile-open' : '')} aria-label={t('nav.menu')}>
      <div className="logo">
        <IconSchool size={26} className="logo-icon" strokeWidth={1.8} />
        <span className="logo-text">{t('schoolName')}</span>
        {onClose && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <IconClose size={16} />
          </button>
        )}
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
          <span className="nav-icon"><l.Icon size={18} strokeWidth={1.8} /></span>
          <span>{t(l.labelKey)}</span>
        </NavLink>
      ))}
    </aside>
  );
});
