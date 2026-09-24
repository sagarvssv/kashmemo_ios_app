import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { statusColors } from '@/constants/theme';
import { STATUS_LABELS } from '@/lib/format';
import type { TicketStatus } from '@/lib/types';

export function StatusBadge({ status }: { status: TicketStatus }) {
  const palette = statusColors[status] ?? statusColors.PENDING;
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.label, { color: palette.text }]}>{STATUS_LABELS[status] ?? status}</Text>
    </View>
  );
}

export function Tag({ label }: { label: string }) {
  return (
    <View style={[styles.badge, styles.tag]}>
      <Text style={[styles.label, styles.tagLabel]}>{label}</Text>
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
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  tag: {
    backgroundColor: '#E8F0E7',
  },
  tagLabel: {
    color: '#0e4b14',
  },
});
