import { memo } from 'react';
import { IconEmpty } from './Icons.jsx';

export const EmptyState = memo(function EmptyState({ title, hint, icon }) {
  return (
    <div className="empty" role="status">
      <div style={{ marginBottom: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }} aria-hidden>
        {icon ?? <IconEmpty size={40} strokeWidth={1.5} />}
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
