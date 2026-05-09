import React from 'react';

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  trend?: {
    value: string;
    direction: 'positive' | 'negative';
  };
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  trend,
  accentColor,
}) => {
  const style = accentColor
    ? {
        '--accent-color': accentColor,
        '--accent-color-light': `${accentColor}20`,
      } as React.CSSProperties
    : undefined;

  return (
    <div className="stat-card" style={style}>
      <div className="stat-card-header">
        <div className="stat-card-icon">{icon}</div>
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {trend && (
        <div className={`stat-card-trend ${trend.direction}`}>
          <span>{trend.direction === 'positive' ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
};
