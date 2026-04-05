import { memo } from 'react';

/** Standard panel with optional hover — reusable across forms, charts, tables */
export const Card = memo(function Card({ children, className = '', noPadding, style, ...rest }) {
  const mergedStyle = noPadding ? { ...style, padding: 0 } : style;
  return (
    <div className={`card ${className}`.trim()} style={mergedStyle} {...rest}>
      {children}
    </div>
  );
});

export const CardTitle = memo(function CardTitle({ children, className = '' }) {
  return <div className={`card-title ${className}`.trim()}>{children}</div>;
});

/** Chart / metric card with consistent bottom spacing */
export const ChartCard = memo(function ChartCard({ title, children, className = '' }) {
  return (
    <Card className={className} style={{ marginBottom: 0, paddingBottom: 10 }}>
      {title && <CardTitle>{title}</CardTitle>}
      {children}
    </Card>
  );
});
