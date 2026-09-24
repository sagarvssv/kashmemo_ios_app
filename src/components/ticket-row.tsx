import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { colors, radius, spacing } from '@/constants/theme';
import { formatDate, formatMoney } from '@/lib/format';
import type { Money, TicketStatus } from '@/lib/types';

type TicketRowProps = {
  ticket: {
    id: string;
    purpose: string;
    amount: Money;
    status: TicketStatus;
    createdAt?: string;
    approvedAt?: string | null;
    disbursedAt?: string | null;
    department?: { name: string };
  };
};

export function TicketRow({ ticket }: TicketRowProps) {
  const date = ticket.disbursedAt ?? ticket.approvedAt ?? ticket.createdAt;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: ticket.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Text style={styles.purpose} numberOfLines={2}>
          {ticket.purpose}
        </Text>
        <Text style={styles.amount}>{formatMoney(ticket.amount)}</Text>
      </View>
      <View style={styles.bottom}>
        <StatusBadge status={ticket.status} />
        <Text style={styles.meta} numberOfLines={1}>
          {[ticket.department?.name, formatDate(date)].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: spacing.four,
    gap: spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  pressed: {
    opacity: 0.7,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.three,
  },
  purpose: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.three,
  },
  meta: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
});
