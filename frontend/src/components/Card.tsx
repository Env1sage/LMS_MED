import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div className={`card ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, action }) => {
  return (
    <div className="card-header">
      <h3 className="card-title">{title}</h3>
      {action && <div>{action}</div>}
    </div>
  );
};

interface CardBodyProps {
  children: React.ReactNode;
}

export const CardBody: React.FC<CardBodyProps> = ({ children }) => {
  return <div className="card-body">{children}</div>;
};
