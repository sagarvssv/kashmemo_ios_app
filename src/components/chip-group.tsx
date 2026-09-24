import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

type Option<T extends string> = { value: T; label: string };

type ChipGroupProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  // Wraps onto multiple lines instead of scrolling horizontally.
  wrap?: boolean;
};

export function ChipGroup<T extends string>({ options, value, onChange, wrap }: ChipGroupProps<T>) {
  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[styles.chip, selected && styles.chipSelected]}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
      </Pressable>
    );
  });

  if (wrap) return <View style={styles.wrap}>{chips}</View>;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips}
    </ScrollView>
  );
}

// A full-width segmented control for 2–3 mutually exclusive views.
export function Segmented<T extends string>({ options, value, onChange }: ChipGroupProps<T>) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}>
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.two,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  labelSelected: {
    color: '#FFFFFF',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.primary,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  segmentLabelSelected: {
    color: '#FFFFFF',
  },
});
