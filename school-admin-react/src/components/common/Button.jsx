import { memo } from 'react';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles((theme) => ({
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 24px',
    borderRadius: 10,
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    transition: theme.transitions.default,
  },
  sm: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  primary: {
    background: theme.colors.accent,
    color: '#fff',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
    '&:hover': { filter: 'brightness(1.05)' },
  },
  success: {
    background: theme.colors.success,
    color: '#fff',
  },
  danger: {
    background: theme.colors.danger,
    color: '#fff',
  },
  ghost: {
    background: theme.colors.background,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`,
    '&:hover': {
      borderColor: theme.colors.accent,
      color: theme.colors.accent,
    },
  },
  info: {
    background: theme.colors.info,
    color: '#fff',
  },
  accent: {
    background: theme.colors.purple,
    color: '#fff',
  },
  teal: {
    background: theme.colors.teal,
    color: '#fff',
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
    className
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
});
