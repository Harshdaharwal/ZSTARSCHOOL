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
          <PageIcon size={20} strokeWidth={2} />
          {pageTitle}
        </span>
      </div>
      <div className="topbar-right">
        {user && (
          <span className="topbar-user" title={user.email}>
            <span className="topbar-badge">{roleLabel}</span>
            <span className="topbar-email">{user.email}</span>
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleMode}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
          {isDark ? 'Light' : 'Dark'}
        </Button>
        <span className="topbar-date">{dateStr}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onLogout}>
          <IconLogout size={15} />
          {t('topbar.logout')}
        </Button>
      </div>
    </header>
  );
});
