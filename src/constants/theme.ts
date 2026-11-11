export const colors = {
  primary: '#0e4b14',
  primaryDark: '#1E2875',
  accentTeal: '#2d4943',
  background: '#e4efe3',
  surface: '#ffffff',
  textPrimary: '#212922',
  textSecondary: '#3f4d43',
  textMuted: '#5b6b5d',
  inputBackground: '#fffcfc',
  border: '#123528',
  borderLight: '#cfdccd',
  success: '#02170a',
  danger: '#EF4444',
  warning: '#B45309',
  info: '#1D4ED8',
};

// `series` is the status's color in charts and badge dots - one color per status
// everywhere. The set is validated for colorblind separation in stacking order
// (Pending, Partially approved, Approved, Disbursed, Rejected) on the white card
// surface; yellow and aqua sit under 3:1, so every chart pairs them with a text label.
export const statusColors = {
  PENDING: { background: '#FEF3C7', text: '#92400E', series: '#eda100' },
  PARTIALLY_APPROVED: { background: '#DBEAFE', text: '#1E40AF', series: '#2a78d6' },
  APPROVED: { background: '#DCFCE7', text: '#166534', series: '#1baf7a' },
  REJECTED: { background: '#FEE2E2', text: '#991B1B', series: '#e34948' },
  DISBURSED: { background: '#E0E7FF', text: '#3730A3', series: '#4a3aa7' },
  SETTLEMENT_PENDING: { background: '#CCFBF1', text: '#115E59', series: '#0d9488' },
  SETTLED: { background: '#F1F5F9', text: '#334155', series: '#64748b' },
} as const;

// Accent hues for icon badges (icon in `tint`, badge fill in `tint` at ~12% alpha
// via iconBadge()). Distinct enough to tell rows apart at a glance.
export const accents = {
  green: '#0F7B4A',
  blue: '#2563EB',
  indigo: '#4F46E5',
  violet: '#7C3AED',
  pink: '#DB2777',
  orange: '#EA580C',
  amber: '#B45309',
  teal: '#0D9488',
  cyan: '#0891B2',
  slate: '#475569',
  red: '#DC2626',
} as const;

// A #RRGGBB color at the given opacity (0-1), as rgba().
export function withAlpha(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

// Soft badge fill for an accent: the hex color at ~12% opacity.
export function iconBadge(tint: string) {
  return `${tint}1F`;
}

export const chartInk = {
  track: '#EEF2EE',
  muted: '#898781',
};

// Type scale. Every text style in the app uses one of these roles, so sizes,
// weights, line heights and letter spacing stay consistent. System font
// throughout (San Francisco / Roboto): tighter tracking on large text,
// slightly open tracking on small labels.
export const typography = {
  display: { fontSize: 28, fontWeight: '800', lineHeight: 34, letterSpacing: -0.7 },
  largeTitle: { fontSize: 23, fontWeight: '800', lineHeight: 28, letterSpacing: -0.5 },
  title: { fontSize: 19, fontWeight: '700', lineHeight: 24, letterSpacing: -0.3 },
  headline: { fontSize: 15, fontWeight: '700', lineHeight: 20, letterSpacing: -0.1 },
  button: { fontSize: 15, fontWeight: '600', lineHeight: 19, letterSpacing: 0.1 },
  bodyStrong: { fontSize: 14, fontWeight: '600', lineHeight: 19, letterSpacing: -0.1 },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20, letterSpacing: -0.1 },
  calloutStrong: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  callout: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  footnoteStrong: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  footnote: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  captionStrong: { fontSize: 11, fontWeight: '600', lineHeight: 14, letterSpacing: 0.2 },
  caption: { fontSize: 11, fontWeight: '400', lineHeight: 14, letterSpacing: 0.1 },
  micro: { fontSize: 10, fontWeight: '600', lineHeight: 12, letterSpacing: 0.3 },
  // Text inputs: no lineHeight - iOS misaligns single-line input text with one.
  input: { fontSize: 15, fontWeight: '400' },
  // Small uppercase labels above values (stat tiles, overlines).
  overline: { fontSize: 10, fontWeight: '700', lineHeight: 13, letterSpacing: 0.8, textTransform: 'uppercase' },
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

// Bottom padding for scrolling content so the floating tab bar never covers it.
export const TAB_BAR_CLEARANCE = 112;

export const radius = {
  small: 8,
  medium: 12,
  large: 16,
};
