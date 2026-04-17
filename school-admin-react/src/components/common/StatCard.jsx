import { memo } from 'react';

const VARIANT_CLASS = {
  s1: 's1',
  s2: 's2',
  s3: 's3',
  s4: 's4',
  s5: 's5',
  s6: 's6',
};

/** Dashboard metric tile — pairs with `.stat` / `.s1`…`.s6` in global CSS */
export const StatCard = memo(function StatCard({ variant = 's1', icon, label, value, sub, onClick }) {
  const vc = VARIANT_CLASS[variant] || 's1';
  const isInteractive = Boolean(onClick);
  return (
    <div
      className={`stat ${vc}`}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="stat-icon-wrap">{icon}</div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub != null && sub !== '' && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
});
