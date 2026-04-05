import { useCallback, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/common/Button.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { DEMO_ADMIN, DEMO_TEACHER } from '../config/authCredentials.js';
import { ACADEMIC_YEAR, SCHOOL_TAGLINE } from '../config/schoolConfig.js';

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, loginTeacher, loginAdmin, loginWithFirebase, isFirebase } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [adminMode, setAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (isFirebase) {
        const res = await loginWithFirebase(email.trim(), password);
        if (!res.ok) {
          showToast(res.msg, 'err');
          return;
        }
        showToast('Signed in.', 'ok');
        navigate(from, { replace: true });
        return;
      }
      const res = adminMode ? loginAdmin(email.trim(), password) : loginTeacher(email.trim(), password);
      if (!res.ok) {
        showToast(res.msg, 'err');
        return;
      }
      showToast(adminMode ? 'Signed in as administrator.' : 'Signed in as teacher.', 'ok');
      navigate(from, { replace: true });
    },
    [adminMode, email, password, loginAdmin, loginTeacher, loginWithFirebase, isFirebase, navigate, from, showToast]
  );

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-page">
      <a href="#main-content" className="skip-link">
        {t('a11y.skip')}
      </a>
      <div className="login-card" id="main-content">
        <div className="login-brand">
          <span className="login-brand-icon">🏫</span>
          <div>
            <h1>{t('schoolName')}</h1>
            <p>{isFirebase ? t('login.firebaseHint') : adminMode ? t('login.adminTitle') : t('login.teacherTitle')}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {ACADEMIC_YEAR} · {SCHOOL_TAGLINE}
            </p>
          </div>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">{t('login.email')}</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder={isFirebase ? '' : adminMode ? DEMO_ADMIN.email : DEMO_TEACHER.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">{t('login.password')}</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isFirebase && (
            <p className="login-hint">
              {adminMode ? t('login.demoAdmin') : t('login.demoTeacher')}:{' '}
              <strong>{adminMode ? DEMO_ADMIN.email : DEMO_TEACHER.email}</strong> /{' '}
              <strong>{adminMode ? DEMO_ADMIN.password : DEMO_TEACHER.password}</strong>
            </p>
          )}

          <Button type="submit" className="login-submit">
            {isFirebase ? t('login.signIn') : adminMode ? t('login.signInAdmin') : t('login.signIn')}
          </Button>
        </form>

        <div className="login-footer" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!isFirebase &&
            (adminMode ? (
              <button type="button" className="login-link-btn" onClick={() => setAdminMode(false)}>
                {t('login.teacherBack')}
              </button>
            ) : (
              <button type="button" className="login-link-btn" onClick={() => setAdminMode(true)}>
                {t('login.adminLogin')}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
