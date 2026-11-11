import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components/glass';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, radius, spacing, typography } from '@/constants/theme';

type StatTileProps = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'highlight';
  // Accent for the icon badge on default tiles; defaults to the primary color.
  tint?: string;
};

export function StatTile({ label, value, icon, tone = 'default', tint }: StatTileProps) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  const accent = tint ?? brand.primary;
  const highlight = tone === 'highlight';
  const Container = highlight ? View : GlassSurface;
  return (
    <Container
      style={[
        styles.tile,
        highlight && [styles.highlight, { backgroundColor: brand.highlight, shadowColor: brand.highlight }],
      ]}>
      <View style={styles.tileHeader}>
        {icon && (
          <View style={[styles.iconBadge, { backgroundColor: highlight ? '#FFFFFF' : iconBadge(accent) }]}>
            <Ionicons name={icon} size={13} color={highlight ? brand.primary : accent} />
          </View>
        )}
        <Text style={[styles.label, highlight && { color: brand.onHighlight, opacity: 0.85 }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text
        style={[styles.value, highlight && { color: brand.onHighlight }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}>
        {value}
      </Text>
    </Container>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.grid}>{children}</View>;
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const brand = useBrand();
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max;
  return (
    <View style={[styles.track, { backgroundColor: brand.background }]}>
      <View
        style={[
          styles.fill,
          { width: `${Math.round(ratio * 100)}%`, backgroundColor: brand.primary },
          (over || ratio > 0.9) && { backgroundColor: colors.danger },
        ]}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.three,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    // Lets the tile shrink to its half of the row instead of growing with its text.
    minWidth: 0,
    borderRadius: radius.large,
    padding: spacing.three,
    gap: spacing.two,
  },
  iconBadge: {
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 26,
  },
  highlight: {
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  value: {
    ...typography.headline,
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  // Long labels wrap to a second line inside the tile instead of overflowing it.
  label: {
    ...typography.overline,
    flex: 1,
    flexShrink: 1,
    color: colors.textMuted,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
