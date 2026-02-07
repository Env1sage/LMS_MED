import React, { CSSProperties } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  hover?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  compact = false,
  hover = true,
  onClick,
  style
}) => {
  const classes = [
    'card',
    compact ? 'card-compact' : '',
    !hover ? 'no-hover' : '',
    onClick ? 'cursor-pointer' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} style={style}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => (
  <h3 className={`card-title ${className}`}>{children}</h3>
);

interface CardSubtitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardSubtitle: React.FC<CardSubtitleProps> = ({ children, className = '' }) => (
  <p className={`card-subtitle ${className}`}>{children}</p>
);

export default Card;
