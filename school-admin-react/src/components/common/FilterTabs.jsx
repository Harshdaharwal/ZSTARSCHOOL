import { memo } from 'react';

export const FilterTabs = memo(function FilterTabs({ tabs, activeId, onChange }) {
  return (
    <div className="filter-tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={'filter-tab' + (activeId === t.id ? ' active' : '')}
          onClick={() => onChange(t.id)}
        >
          {t.Icon && <t.Icon size={15} strokeWidth={2} style={{ flexShrink: 0 }} />}
          {t.label}
        </button>
      ))}
    </div>
  );
});
