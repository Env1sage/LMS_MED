import React, { useState } from 'react';
import './GlassInput.css';

interface GlassInputProps {
  type?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  type = 'text',
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  icon
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="glass-input-wrapper">
      <label className={`glass-input-label ${isFocused || value ? 'glass-input-label-float' : ''}`}>
        {label} {required && <span className="glass-input-required">*</span>}
      </label>
      <div className={`glass-input-container ${isFocused ? 'glass-input-focused' : ''} ${error ? 'glass-input-error' : ''}`}>
        {icon && <div className="glass-input-icon">{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="glass-input"
        />
      </div>
      {error && <span className="glass-input-error-text">{error}</span>}
    </div>
  );
};
