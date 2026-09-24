export const colors = {
  primary: '#0e4b14',
  primaryDark: '#1E2875',
  accentTeal: '#2d4943',
  background: '#e4efe3',
  surface: '#ffffff',
  textPrimary: '#212922',
  textSecondary: '#153e91',
  textMuted: '#5b6b5d',
  inputBackground: '#fffcfc',
  border: '#123528',
  borderLight: '#cfdccd',
  success: '#02170a',
  danger: '#EF4444',
  warning: '#B45309',
  info: '#1D4ED8',
};

export const statusColors = {
  PENDING: { background: '#FEF3C7', text: '#92400E' },
  PARTIALLY_APPROVED: { background: '#DBEAFE', text: '#1E40AF' },
  APPROVED: { background: '#DCFCE7', text: '#166534' },
  REJECTED: { background: '#FEE2E2', text: '#991B1B' },
  DISBURSED: { background: '#E0E7FF', text: '#3730A3' },
} as const;

export const spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
};

export const radius = {
  small: 8,
  medium: 12,
  large: 16,
};
