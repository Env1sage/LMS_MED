import React from 'react';
import { Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  path?: string;
}

interface ContentHeaderProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export const ContentHeader: React.FC<ContentHeaderProps> = ({
  title,
  breadcrumbs,
  actions,
}) => {
  return (
    <div className="content-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {crumb.path ? (
                <Link to={crumb.path} className="breadcrumb-item">
                  {crumb.label}
                </Link>
              ) : (
                <span className="breadcrumb-item active">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <span className="breadcrumb-separator">/</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="content-header-top">
        <h1 className="content-title">{title}</h1>
        {actions && <div className="content-actions">{actions}</div>}
      </div>
    </div>
  );
};
