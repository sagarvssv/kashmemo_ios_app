import type { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/constants/brand';
import { iconBadge, statusColors, typography } from '@/constants/theme';
import { STATUS_LABELS } from '@/lib/format';
import type { TicketStatus } from '@/lib/types';

// One icon per ticket status, shared by filters and lists.
export const STATUS_ICONS: Record<TicketStatus, keyof typeof Ionicons.glyphMap> = {
  PENDING: 'hourglass-outline',
  PARTIALLY_APPROVED: 'git-pull-request-outline',
  APPROVED: 'checkmark-circle-outline',
  REJECTED: 'close-circle-outline',
  DISBURSED: 'cash-outline',
  SETTLEMENT_PENDING: 'swap-horizontal-outline',
  SETTLED: 'checkmark-done-outline',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const palette = statusColors[status] ?? statusColors.PENDING;
  return (
    <View style={[styles.badge, styles.statusBadge, { backgroundColor: palette.background }]}>
      <View style={[styles.dot, { backgroundColor: palette.series }]} />
      <Text style={[styles.label, { color: palette.text }]}>{STATUS_LABELS[status] ?? status}</Text>
    </View>
  );
}

export function Tag({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: iconBadge(colors.primary) }]}>
      <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    ...typography.captionStrong,
  },
});
