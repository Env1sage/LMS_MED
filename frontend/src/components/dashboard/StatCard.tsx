import React from 'react';
import './StatCard.css';

interface StatCardProps {
  label: string;
  value: string | number;
  type?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  trend?: {
    value: number;
    label: string;
  };
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  type = 'default',
  trend,
  icon,
  onClick,
}) => {
  return (
    <div
      className={`stat-card-component ${onClick ? 'stat-card-clickable' : ''}`}
      data-type={type}
      onClick={onClick}
    >
      {icon && <div className="stat-card-icon">{icon}</div>}
      <div className="stat-card-content">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        {trend && (
          <div className="stat-card-trend" data-direction={trend.value >= 0 ? 'up' : 'down'}>
            <span className="stat-card-trend-value">
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="stat-card-trend-label">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};
