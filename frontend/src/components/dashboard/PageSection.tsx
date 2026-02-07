import React from 'react';
import './PageSection.css';

interface PageSectionProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}

export const PageSection: React.FC<PageSectionProps> = ({
  title,
  subtitle,
  actions,
  children,
  noPadding = false,
}) => {
  return (
    <section className={`page-section ${noPadding ? 'page-section-no-padding' : ''}`}>
      {(title || subtitle || actions) && (
        <div className="page-section-header">
          <div className="page-section-header-text">
            {title && <h2 className="page-section-title">{title}</h2>}
            {subtitle && <p className="page-section-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="page-section-actions">{actions}</div>}
        </div>
      )}
      <div className="page-section-content">{children}</div>
    </section>
  );
};
