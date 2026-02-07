import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <div style={{ 
      marginBottom: 'var(--space-lg)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-md)'
    }}>
      <div>
        <h1 style={{ 
          fontSize: 'var(--font-size-page-heading)',
          fontWeight: 'var(--font-weight-page-heading)',
          color: 'var(--text-primary)',
          marginBottom: subtitle ? 'var(--space-xs)' : 0
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ 
            fontSize: 'var(--font-size-body)',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
