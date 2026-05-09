// Medical LMS - Light Theme Configuration
// A professional, clean light theme for medical education

export const theme = {
  // Color Palette
  colors: {
    // Primary Colors - Medical Blue
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',  // Main primary
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    // Secondary Colors - Teal/Cyan for medical feel
    secondary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',  // Main secondary
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    // Success - Green
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    // Warning - Amber
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    // Error/Danger - Red
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    // Neutral/Gray
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    // Background colors
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      card: '#ffffff',
      hover: '#f8fafc',
    },
    // Text colors
    text: {
      primary: '#1e293b',
      secondary: '#475569',
      tertiary: '#64748b',
      muted: '#94a3b8',
      inverse: '#ffffff',
    },
    // Border colors
    border: {
      light: '#e2e8f0',
      default: '#cbd5e1',
      dark: '#94a3b8',
    },
  },

  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },

  // Border radius
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Transitions
  transitions: {
    fast: '150ms ease',
    default: '200ms ease',
    slow: '300ms ease',
  },
};

// Role-specific accent colors
export const roleColors = {
  bitflowOwner: {
    primary: '#7c3aed',  // Purple
    secondary: '#a78bfa',
    background: '#f5f3ff',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
  },
  publisher: {
    primary: '#0891b2',  // Cyan
    secondary: '#22d3ee',
    background: '#ecfeff',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
  },
  college: {
    primary: '#059669',  // Emerald
    secondary: '#34d399',
    background: '#ecfdf5',
    gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
  },
  faculty: {
    primary: '#d97706',  // Amber
    secondary: '#fbbf24',
    background: '#fffbeb',
    gradient: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
  },
  student: {
    primary: '#2563eb',  // Blue
    secondary: '#60a5fa',
    background: '#eff6ff',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)',
  },
};

// Common component styles
export const commonStyles = {
  // Page container
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: theme.colors.background.secondary,
    fontFamily: theme.typography.fontFamily,
  },

  // Header
  header: {
    backgroundColor: theme.colors.background.primary,
    borderBottom: `1px solid ${theme.colors.border.light}`,
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: theme.shadows.sm,
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },

  // Card
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border.light}`,
    boxShadow: theme.shadows.sm,
    padding: theme.spacing.lg,
    transition: theme.transitions.default,
  },

  cardHover: {
    boxShadow: theme.shadows.md,
    borderColor: theme.colors.border.default,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: theme.colors.primary[500],
    color: theme.colors.text.inverse,
    border: 'none',
    borderRadius: theme.borderRadius.md,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },

  buttonSecondary: {
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: theme.borderRadius.md,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },

  buttonDanger: {
    backgroundColor: theme.colors.error[500],
    color: theme.colors.text.inverse,
    border: 'none',
    borderRadius: theme.borderRadius.md,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },

  buttonSuccess: {
    backgroundColor: theme.colors.success[500],
    color: theme.colors.text.inverse,
    border: 'none',
    borderRadius: theme.borderRadius.md,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },

  // Input
  input: {
    width: '100%',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.typography.fontSizes.sm,
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
    transition: theme.transitions.fast,
    outline: 'none',
  },

  inputFocus: {
    borderColor: theme.colors.primary[500],
    boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
  },

  // Table
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },

  tableHeader: {
    backgroundColor: theme.colors.gray[50],
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },

  tableHeaderCell: {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    textAlign: 'left' as const,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },

  tableRow: {
    borderBottom: `1px solid ${theme.colors.border.light}`,
    transition: theme.transitions.fast,
  },

  tableRowHover: {
    backgroundColor: theme.colors.background.hover,
  },

  tableCell: {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.primary,
  },

  // Status badges
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
  },

  badgeSuccess: {
    backgroundColor: theme.colors.success[100],
    color: theme.colors.success[700],
  },

  badgeWarning: {
    backgroundColor: theme.colors.warning[100],
    color: theme.colors.warning[700],
  },

  badgeError: {
    backgroundColor: theme.colors.error[100],
    color: theme.colors.error[700],
  },

  badgeInfo: {
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
  },

  badgeNeutral: {
    backgroundColor: theme.colors.gray[100],
    color: theme.colors.gray[700],
  },

  // Stats cards
  statsCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing.lg,
    textAlign: 'center' as const,
  },

  statsNumber: {
    fontSize: theme.typography.fontSizes['3xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },

  statsLabel: {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },

  // Section
  section: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border.light}`,
    marginBottom: theme.spacing.lg,
  },

  sectionHeader: {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderBottom: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },

  sectionContent: {
    padding: theme.spacing.lg,
  },

  // Alert
  alertSuccess: {
    backgroundColor: theme.colors.success[50],
    border: `1px solid ${theme.colors.success[200]}`,
    color: theme.colors.success[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },

  alertError: {
    backgroundColor: theme.colors.error[50],
    border: `1px solid ${theme.colors.error[200]}`,
    color: theme.colors.error[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },

  alertWarning: {
    backgroundColor: theme.colors.warning[50],
    border: `1px solid ${theme.colors.warning[200]}`,
    color: theme.colors.warning[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },

  alertInfo: {
    backgroundColor: theme.colors.primary[50],
    border: `1px solid ${theme.colors.primary[200]}`,
    color: theme.colors.primary[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },

  // Modal
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: theme.spacing.lg,
  },

  modalContent: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.xl,
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: theme.shadows.xl,
  },

  modalHeader: {
    padding: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    margin: 0,
  },

  modalBody: {
    padding: theme.spacing.lg,
  },

  modalFooter: {
    padding: theme.spacing.lg,
    borderTop: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },

  // Form
  formGroup: {
    marginBottom: theme.spacing.md,
  },

  formLabel: {
    display: 'block',
    marginBottom: theme.spacing.xs,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.secondary,
  },

  formHelp: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.text.muted,
  },

  // Empty state
  emptyState: {
    textAlign: 'center' as const,
    padding: theme.spacing['2xl'],
    color: theme.colors.text.tertiary,
  },

  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: theme.spacing.md,
    opacity: 0.5,
  },

  emptyStateTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.medium,
    marginBottom: theme.spacing.sm,
  },

  emptyStateText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.muted,
  },

  // Loading
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['2xl'],
  },

  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: `3px solid ${theme.colors.border.light}`,
    borderTopColor: theme.colors.primary[500],
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default theme;
