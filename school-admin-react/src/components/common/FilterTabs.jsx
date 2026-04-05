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
          {t.label}
        </button>
      ))}
    </div>
  );
});
