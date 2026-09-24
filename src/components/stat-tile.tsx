import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

type StatTileProps = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'highlight';
};

export function StatTile({ label, value, icon, tone = 'default' }: StatTileProps) {
  const highlight = tone === 'highlight';
  return (
    <View style={[styles.tile, highlight && styles.highlight]}>
      {icon && <Ionicons name={icon} size={18} color={highlight ? '#FFFFFF' : colors.primary} />}
      <Text style={[styles.value, highlight && styles.highlightText]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.label, highlight && styles.highlightLabel]}>{label}</Text>
    </View>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max;
  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          { width: `${Math.round(ratio * 100)}%` },
          (over || ratio > 0.9) && { backgroundColor: colors.danger },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.three,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: spacing.four,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  highlight: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  highlightText: {
    color: '#FFFFFF',
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
  },
  highlightLabel: {
    color: 'rgba(255,255,255,0.8)',
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
    backgroundColor: colors.primary,
  },
});
