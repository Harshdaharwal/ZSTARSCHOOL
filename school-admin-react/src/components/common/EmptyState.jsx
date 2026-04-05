import { memo } from 'react';

export const EmptyState = memo(function EmptyState({ title, hint, icon = '📭' }) {
  return (
    <div className="empty" role="status">
      <div style={{ fontSize: '2rem', marginBottom: 8 }} aria-hidden>
        {icon}
      </div>
      <div style={{ fontSize: '1.05rem', marginBottom: 6 }}>{title}</div>
      {hint && (
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto' }}>
          {hint}
        </div>
      )}
    </div>
  );
});
