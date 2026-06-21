import { memo } from 'react';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles((theme) => ({
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '11px 20px',
    borderRadius: 9,
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    transition: theme.transitions?.default || 'all 0.2s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    '@media (max-width: 768px)': {
      padding: '8px 13px',
      fontSize: '0.78rem',
      borderRadius: 8,
      gap: 5,
    },
    '@media (max-width: 480px)': {
      padding: '7px 11px',
      fontSize: '0.74rem',
      borderRadius: 7,
      gap: 4,
    },
  },
  sm: {
    padding: '7px 14px',
    fontSize: '0.82rem',
    borderRadius: 8,
    '@media (max-width: 768px)': {
      padding: '6px 11px',
      fontSize: '0.74rem',
      borderRadius: 7,
    },
    '@media (max-width: 480px)': {
      padding: '5px 9px',
      fontSize: '0.7rem',
      borderRadius: 6,
    },
  },
  primary: {
    background: theme.colors.accent,
    color: '#fff',
    boxShadow: '0 3px 10px rgba(59, 130, 246, 0.25)',
    '&:hover': { filter: 'brightness(1.07)' },
    '&:active': { filter: 'brightness(0.95)' },
  },
  success: {
    background: theme.colors.success,
    color: '#fff',
    '&:active': { filter: 'brightness(0.92)' },
  },
  danger: {
    background: theme.colors.danger,
    color: '#fff',
    '&:active': { filter: 'brightness(0.92)' },
  },
  ghost: {
    background: theme.colors.background,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`,
    '&:hover': {
      borderColor: theme.colors.accent,
      color: theme.colors.accent,
    },
    '&:active': { opacity: 0.7 },
  },
  info: {
    background: theme.colors.info,
    color: '#fff',
    '&:active': { filter: 'brightness(0.92)' },
  },
  accent: {
    background: theme.colors.purple,
    color: '#fff',
    '&:active': { filter: 'brightness(0.92)' },
  },
  teal: {
    background: theme.colors.teal,
    color: '#fff',
    '&:active': { filter: 'brightness(0.92)' },
  },
}));

export const Button = memo(function Button({
  variant = 'primary',
  size,
  className = '',
  type = 'button',
  children,
  ...rest
}) {
  const classes = useStyles();

  const cls = [
    classes.btn,
    classes[variant] || classes.primary,
    size === 'sm' ? classes.sm : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
});
