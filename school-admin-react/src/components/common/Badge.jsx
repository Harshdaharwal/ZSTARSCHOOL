import { memo } from 'react';

const KIND = { success: 'bg', danger: 'br', warning: 'bo', info: 'bb', purple: 'bp', teal: 'bt' };

export const Badge = memo(function Badge({ kind = 'success', children }) {
  return <span className={`badge ${KIND[kind] || KIND.success}`}>{children}</span>;
});
