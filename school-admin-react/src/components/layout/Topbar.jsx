import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useColorMode } from '../../hooks/useColorMode.js';
import { IconMenu, IconLogout, IconDashboard, IconMoon, IconSun } from '../common/Icons.jsx';

export const Topbar = memo(function Topbar({ meta, onMenuToggle }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isDark, toggleMode } = useColorMode();
  const navigate = useNavigate();

  const dateStr = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const roleLabel =
    user?.role === 'admin' ? t('topbar.admin') : user?.role === 'teacher' ? t('topbar.teacher') : '';

  const PageIcon = meta?.Icon || IconDashboard;
  const pageTitle = meta ? t(meta.key) : t('nav.dashboard');

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onMenuToggle && (
          <button
            type="button"
            className="hamburger-btn"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            <IconMenu size={20} />
          </button>
        )}
        <span className="topbar-title">
          <PageIcon size={18} strokeWidth={2} />
          {pageTitle}
        </span>
      </div>

      <div className="topbar-right">
        {/* Desktop only: user badge + email */}
        {user && (
          <span className="topbar-user topbar-desktop-only" title={user.email}>
            <span className="topbar-badge">{roleLabel}</span>
            <span className="topbar-email">{user.email}</span>
          </span>
        )}

        {/* Theme toggle — icon + text on desktop, icon-only on mobile */}
        <button
          type="button"
          className="topbar-icon-btn"
          onClick={toggleMode}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
          <span className="topbar-btn-label">{isDark ? 'Light' : 'Dark'}</span>
        </button>

        {/* Desktop only: date + logout */}
        <span className="topbar-date topbar-desktop-only">{dateStr}</span>
        <button
          type="button"
          className="topbar-icon-btn topbar-desktop-only"
          onClick={onLogout}
          title={t('topbar.logout')}
        >
          <IconLogout size={17} />
          <span className="topbar-btn-label">{t('topbar.logout')}</span>
        </button>
      </div>
    </header>
  );
});
