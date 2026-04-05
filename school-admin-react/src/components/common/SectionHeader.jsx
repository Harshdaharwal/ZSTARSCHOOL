import { memo } from 'react';

export const SectionHeader = memo(function SectionHeader({ title, actions }) {
  return (
    <div className="sec-hdr">
      <div className="card-title" style={{ margin: 0, border: 0, padding: 0 }}>
        {title}
      </div>
      {actions}
    </div>
  );
});
