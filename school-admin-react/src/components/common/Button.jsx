import { memo } from 'react';

const VARIANT = {
  primary: 'btn-primary',
  success: 'btn-success',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
  info: 'btn-info',
  accent: 'btn-accent',
  teal: 'btn-teal',
};

export const Button = memo(function Button({
  variant = 'primary',
  size,
  className = '',
  type = 'button',
  children,
  ...rest
}) {
  const cls = ['btn', VARIANT[variant] || VARIANT.primary, size === 'sm' ? 'btn-sm' : '', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
});
