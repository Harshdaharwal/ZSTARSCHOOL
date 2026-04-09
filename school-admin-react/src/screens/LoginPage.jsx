import { useCallback, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createUseStyles } from 'react-jss';
import { Button } from '../components/common/Button.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { DEMO_ADMIN, DEMO_TEACHER } from '../config/authCredentials.js';
import { ACADEMIC_YEAR, SCHOOL_TAGLINE } from '../config/schoolConfig.js';

const useStyles = createUseStyles((theme) => ({
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: `linear-gradient(165deg, ${theme.colors.primary} 0%, #1e3a5f 40%, ${theme.colors.background} 40%)`,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: theme.colors.card,
    borderRadius: 20,
    padding: '40px 36px',
    boxShadow: theme.shadows.lg,
    border: `1px solid ${theme.colors.border}`,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  brandIcon: {
    fontSize: '2.5rem',
  },
  brandTextContainer: {
    '& h1': {
      fontSize: '1.35rem',
      fontWeight: 800,
      color: theme.colors.primary,
      margin: '0 0 4px',
    },
    '& p': {
      margin: 0,
      fontSize: '0.9rem',
      color: theme.colors.textMuted,
      fontWeight: 600,
    },
  },
  brandSub: {
    fontSize: '0.8rem',
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 18,
    '& label': {
      fontSize: '0.75rem',
      fontWeight: 700,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    '& input': {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: 10,
      padding: '12px 16px',
      fontFamily: 'inherit',
      fontSize: '0.9rem',
      transition: theme.transitions.default,
      background: theme.colors.background,
      color: theme.colors.text,
      fontWeight: 500,
      '&:focus': {
        outline: 'none',
        borderColor: theme.colors.accent,
        background: '#fff',
        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)',
      },
    },
  },
  hint: {
    fontSize: '0.75rem',
    color: theme.colors.textMuted,
    margin: '-8px 0 16px',
    lineHeight: 1.5,
  },
  submitBtn: {
    width: '100%',
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
    borderTop: `1px solid ${theme.colors.border}`,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: theme.colors.accent,
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
    '&:hover': {
      color: theme.colors.accentLight,
    },
  },
  skipLink: {
    position: 'absolute',
    left: -9999,
    zIndex: 10000,
    padding: '12px 20px',
    background: theme.colors.accent,
    color: '#fff',
    fontWeight: 700,
    borderRadius: 8,
    '&:focus': {
      left: 16,
      top: 16,
    },
  },
}));

export default function LoginPage() {
  const classes = useStyles();
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
    <div className={classes.page}>
      <a href="#main-content" className={classes.skipLink}>
        {t('a11y.skip')}
      </a>
      <div className={classes.card} id="main-content">
        <div className={classes.brand}>
          <span className={classes.brandIcon}>🏫</span>
          <div className={classes.brandTextContainer}>
            <h1>{t('schoolName')}</h1>
            <p>{isFirebase ? t('login.firebaseHint') : adminMode ? t('login.adminTitle') : t('login.teacherTitle')}</p>
            <p className={classes.brandSub}>
              {ACADEMIC_YEAR} · {SCHOOL_TAGLINE}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className={classes.formGroup}>
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
          <div className={classes.formGroup}>
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
            <p className={classes.hint}>
              {adminMode ? t('login.demoAdmin') : t('login.demoTeacher')}:{' '}
              <strong>{adminMode ? DEMO_ADMIN.email : DEMO_TEACHER.email}</strong> /{' '}
              <strong>{adminMode ? DEMO_ADMIN.password : DEMO_TEACHER.password}</strong>
            </p>
          )}

          <Button type="submit" className={classes.submitBtn}>
            {isFirebase ? t('login.signIn') : adminMode ? t('login.signInAdmin') : t('login.signIn')}
          </Button>
        </form>

        <div className={classes.footer}>
          {!isFirebase &&
            (adminMode ? (
              <button type="button" className={classes.linkBtn} onClick={() => setAdminMode(false)}>
                {t('login.teacherBack')}
              </button>
            ) : (
              <button type="button" className={classes.linkBtn} onClick={() => setAdminMode(true)}>
                {t('login.adminLogin')}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
