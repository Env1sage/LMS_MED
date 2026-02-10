import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  required,
  className = '',
  ...props
}) => {
  return (
    <div className="input-group">
      {label && (
        <label className={`input-label ${required ? 'input-label-required' : ''}`}>
          {label}
        </label>
      )}
      <input
        className={`input ${error ? 'input-error' : ''} ${className}`.trim()}
        {...props}
      />
      {error && <div className="input-error-message">{error}</div>}
      {helper && !error && <div className="input-helper">{helper}</div>}
    </div>
  );
};

interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helper,
  required,
  className = '',
  ...props
}) => {
  return (
    <div className="input-group">
      {label && (
        <label className={`input-label ${required ? 'input-label-required' : ''}`}>
          {label}
        </label>
      )}
      <textarea
        className={`input textarea ${error ? 'input-error' : ''} ${className}`.trim()}
        {...props}
      />
      {error && <div className="input-error-message">{error}</div>}
      {helper && !error && <div className="input-helper">{helper}</div>}
    </div>
  );
};

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helper,
  required,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="input-group">
      {label && (
        <label className={`input-label ${required ? 'input-label-required' : ''}`}>
          {label}
        </label>
      )}
      <select
        className={`input select ${error ? 'input-error' : ''} ${className}`.trim()}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <div className="input-error-message">{error}</div>}
      {helper && !error && <div className="input-helper">{helper}</div>}
    </div>
  );
};
