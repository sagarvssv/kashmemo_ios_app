import React, { createContext, useContext } from 'react';

import { accents, colors } from './theme';

// A complete color set for one role. Components read it through useColors() (or
// useBrand(), the same thing) and build their styles with useThemedStyles(), so
// text, borders, icons and backgrounds all follow the signed-in role.
// Status colors (pending, approved, rejected…) stay shared: they carry meaning.
export type Palette = typeof colors & {
  // Small round avatars and secondary brand marks.
  secondary: string;
  // Soft, low-opacity background blobs (see AuroraBackground).
  blobs: [string, string, string];
  // Icon badge hues (see `accents` in theme.ts).
  accents: Record<keyof typeof accents, string>;
  // When set, department icons take their tint from this list instead of their
  // own category color, keeping a single-hue theme.
  departmentTints?: readonly string[];
  // Surface for the one featured element per screen (highlighted stat tile, promo
  // card) and the text color that reads on it.
  highlight: string;
  onHighlight: string;
};

export const GREEN_PALETTE: Palette = {
  ...colors,
  primaryDark: '#08330d',
  secondary: colors.accentTeal,
  blobs: ['#1baf7a', '#2a78d6', '#0e4b14'],
  accents,
  highlight: colors.primary,
  onHighlight: '#FFFFFF',
};

// Finance Manager: a deep, desaturated violet with violet-tinted neutrals so text,
// borders and surfaces sit in the same family as the brand.
export const VIOLET_PALETTE: Palette = {
  primary: '#5B3FD0',
  primaryDark: '#3B2593',
  accentTeal: '#4338CA',
  background: '#EEEBFA',
  surface: '#FFFFFF',
  textPrimary: '#1E1B2E',
  textSecondary: '#3F3A56',
  textMuted: '#6B6880',
  inputBackground: '#FDFCFF',
  border: '#2E1F6B',
  borderLight: '#DCD6F2',
  success: '#2E1065',
  danger: colors.danger,
  warning: colors.warning,
  info: '#4338CA',
  secondary: '#4338CA',
  blobs: ['#8B5CF6', '#6366F1', '#4C1D95'],
  accents: {
    green: '#6D28D9',
    blue: '#4F46E5',
    indigo: '#4338CA',
    violet: '#7C3AED',
    pink: '#A21CAF',
    orange: '#9333EA',
    amber: '#8B5CF6',
    teal: '#5B3FD0',
    cyan: '#6366F1',
    slate: '#475569',
    red: accents.red,
  },
  departmentTints: ['#5B3FD0', '#7C3AED', '#4F46E5', '#9333EA', '#4338CA', '#A21CAF', '#6366F1', '#6D28D9'],
  highlight: '#5B3FD0',
  onHighlight: '#FFFFFF',
};

// Employee: built around sky #7DD3FC. It is too light to carry white text, so it
// is the highlight surface (with deep navy text on it), while buttons, links and
// selected states use a deeper sky from the same family for contrast.
export const SKY_PALETTE: Palette = {
  primary: '#0369A1',
  primaryDark: '#0C4A6E',
  accentTeal: '#075985',
  background: '#EAF6FD',
  surface: '#FFFFFF',
  textPrimary: '#0C1E2B',
  textSecondary: '#2B4556',
  textMuted: '#5A7385',
  inputBackground: '#FBFEFF',
  border: '#0C4A6E',
  borderLight: '#CDE9F8',
  success: '#0C4A6E',
  danger: colors.danger,
  warning: colors.warning,
  info: '#0369A1',
  secondary: '#0284C7',
  blobs: ['#7DD3FC', '#38BDF8', '#0EA5E9'],
  accents: {
    green: '#0891B2',
    blue: '#0284C7',
    indigo: '#0369A1',
    violet: '#0EA5E9',
    pink: '#06B6D4',
    orange: '#0E7490',
    amber: '#0C4A6E',
    teal: '#0891B2',
    cyan: '#0E7490',
    slate: '#475569',
    red: accents.red,
  },
  departmentTints: ['#0284C7', '#0891B2', '#0369A1', '#0EA5E9', '#0E7490', '#06B6D4', '#075985', '#0C4A6E'],
  highlight: '#7DD3FC',
  onHighlight: '#0C4A6E',
};

// Manager: deep navy-slate #22405F with blue-grey neutrals. Dark enough to carry
// white text, so it is both the brand and the highlight surface.
export const NAVY_PALETTE: Palette = {
  primary: '#22405F',
  primaryDark: '#152A40',
  accentTeal: '#2E5A85',
  background: '#EDF1F6',
  surface: '#FFFFFF',
  textPrimary: '#16212D',
  textSecondary: '#3A4A5C',
  textMuted: '#5F6F80',
  inputBackground: '#FCFDFE',
  border: '#22405F',
  borderLight: '#D5DEE8',
  success: '#1E3A5F',
  danger: colors.danger,
  warning: colors.warning,
  info: '#2E5A85',
  secondary: '#2E5A85',
  blobs: ['#5B85B5', '#3A6491', '#22405F'],
  accents: {
    green: '#2F6D8A',
    blue: '#2E5A85',
    indigo: '#22405F',
    violet: '#4A6FA5',
    pink: '#3D6B9A',
    orange: '#35658F',
    amber: '#1F4E79',
    teal: '#2C6B7F',
    cyan: '#3B7A99',
    slate: '#475569',
    red: accents.red,
  },
  departmentTints: ['#22405F', '#2E5A85', '#2F6D8A', '#4A6FA5', '#1F4E79', '#3B7A99', '#35658F', '#2C6B7F'],
  highlight: '#22405F',
  onHighlight: '#FFFFFF',
};

// Kept for existing call sites that only need the brand fields.
export type Brand = Palette;
export const GREEN_BRAND = GREEN_PALETTE;
export const VIOLET_BRAND = VIOLET_PALETTE;

const BrandContext = createContext<Palette>(GREEN_PALETTE);

export function BrandProvider({ brand, children }: { brand: Palette; children: React.ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useColors(): Palette {
  return useContext(BrandContext);
}

export const useBrand = useColors;

type StyleFactory<T> = (palette: Palette) => T;

// One StyleSheet per (factory, palette) pair, created on first use.
const styleCache = new WeakMap<StyleFactory<unknown>, Map<Palette, unknown>>();

export function useThemedStyles<T extends object>(factory: StyleFactory<T>): T {
  const palette = useColors();
  let byPalette = styleCache.get(factory as StyleFactory<unknown>);
  if (!byPalette) {
    byPalette = new Map();
    styleCache.set(factory as StyleFactory<unknown>, byPalette);
  }
  const cached = byPalette.get(palette) as T | undefined;
  if (cached) return cached;
  const created = factory(palette);
  byPalette.set(palette, created);
  return created;
}
