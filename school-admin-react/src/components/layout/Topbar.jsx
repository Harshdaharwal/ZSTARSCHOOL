import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export const Topbar = memo(function Topbar({ title }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
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

  const [emoji, ...rest] = (title || '').split(/\s+/);
  const text = rest.join(' ');

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const roleLabel =
    user?.role === 'admin' ? t('topbar.admin') : user?.role === 'teacher' ? t('topbar.teacher') : '';

  return (
    <header className="topbar">
      <span className="topbar-title">
        <span>{emoji || '📊'}</span> {text || t('nav.dashboard')}
      </span>
      <div className="topbar-right">
        {user && (
          <span className="topbar-user" title={user.email}>
            <span className="topbar-badge">{roleLabel}</span>
            <span className="topbar-email">{user.email}</span>
          </span>
        )}
        <span className="topbar-date">{dateStr}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onLogout}>
          {t('topbar.logout')}
        </Button>
      </div>
    </header>
  );
});
