import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { GlassSurface } from '@/components/glass';
import { type Palette, useBrand, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';
import { formatMonth } from '@/lib/format';

export type MonthValue = { month: number; year: number };

export function currentMonth(): MonthValue {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function shift(value: MonthValue, delta: number): MonthValue {
  const index = value.year * 12 + (value.month - 1) + delta;
  return { month: (index % 12) + 1, year: Math.floor(index / 12) };
}

export function MonthSwitcher({ value, onChange }: { value: MonthValue; onChange: (value: MonthValue) => void }) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  return (
    <GlassSurface style={styles.container}>
      <Pressable onPress={() => onChange(shift(value, -1))} hitSlop={8} accessibilityLabel="Previous month">
        <Ionicons name="chevron-back" size={20} color={brand.primary} />
      </Pressable>
      <Text style={styles.label}>{formatMonth(value.month, value.year)}</Text>
      <Pressable onPress={() => onChange(shift(value, 1))} hitSlop={8} accessibilityLabel="Next month">
        <Ionicons name="chevron-forward" size={20} color={brand.primary} />
      </Pressable>
    </GlassSurface>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: spacing.four,
    paddingVertical: spacing.three,
  },
  label: {
    ...typography.bodyStrong,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
