import { memo } from 'react';

export const Spinner = memo(function Spinner() {
  return <div className="spinner" />;
});

export const EmptyState = memo(function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
});
