import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type Palette, useBrand, useThemedStyles } from '@/constants/brand';
import { iconBadge, spacing, typography } from '@/constants/theme';

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  // Accent for the icon badge; defaults to the primary color.
  tint?: string;
};

type ChipGroupProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  // Wraps onto multiple lines instead of scrolling horizontally.
  wrap?: boolean;
  // Smaller chips with smaller labels, for dense filter rows.
  compact?: boolean;
};

export function ChipGroup<T extends string>({ options, value, onChange, wrap, compact }: ChipGroupProps<T>) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[
          styles.chip,
          compact && styles.chipCompact,
          option.icon && styles.chipWithIcon,
          selected && { backgroundColor: brand.primary, borderColor: brand.primary },
        ]}>
        {option.icon ? (
          <View
            style={[
              styles.iconBadge,
              compact && styles.iconBadgeCompact,
              { backgroundColor: selected ? '#FFFFFF' : iconBadge(option.tint ?? brand.primary) },
            ]}>
            <Ionicons name={option.icon} size={compact ? 12 : 14} color={option.tint ?? brand.primary} />
          </View>
        ) : null}
        <Text style={[styles.label, compact && styles.labelCompact, selected && styles.labelSelected]}>
          {option.label}
        </Text>
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
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
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
            style={[styles.segment, selected && { backgroundColor: brand.primary }]}>
            {option.icon ? (
              <Ionicons name={option.icon} size={14} color={selected ? '#FFFFFF' : (option.tint ?? brand.primary)} />
            ) : null}
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  row: {
    gap: spacing.two,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipWithIcon: {
    paddingLeft: 5,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeCompact: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  label: {
    ...typography.footnoteStrong,
    color: colors.textPrimary,
  },
  labelCompact: {
    ...typography.captionStrong,
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
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    ...typography.footnoteStrong,
    color: colors.textPrimary,
  },
  segmentLabelSelected: {
    color: '#FFFFFF',
  },
});
