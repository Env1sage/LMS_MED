import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'title' | 'card';
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  variant = 'text',
  className = '' 
}) => {
  const classes = ['skeleton', `skeleton-${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} aria-hidden="true"></div>;
};

interface SkeletonGroupProps {
  count?: number;
}

export const SkeletonText: React.FC<SkeletonGroupProps> = ({ count = 3 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} variant="text" />
    ))}
  </>
);

export const SkeletonCard: React.FC = () => <Skeleton variant="card" />;

export default Skeleton;
