import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
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
  return (
    <View style={styles.container}>
      <Pressable onPress={() => onChange(shift(value, -1))} hitSlop={8} accessibilityLabel="Previous month">
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
      </Pressable>
      <Text style={styles.label}>{formatMonth(value.month, value.year)}</Text>
      <Pressable onPress={() => onChange(shift(value, 1))} hitSlop={8} accessibilityLabel="Next month">
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.four,
    paddingVertical: spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
