import React from 'react';
import './StatGrid.css';

interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export const StatGrid: React.FC<StatGridProps> = ({ children, columns = 3 }) => {
  return (
    <div className="stat-grid-component" data-columns={columns}>
      {children}
    </div>
  );
};
