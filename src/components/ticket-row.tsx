import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components/glass';
import { FadeInItem, PressableScale } from '@/components/motion';

import { StatusBadge } from '@/components/status-badge';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, radius, spacing, typography } from '@/constants/theme';
import { formatDate, ticketRef } from '@/lib/format';
import type { Money, TicketSource, TicketStatus } from '@/lib/types';
import { useMoney } from '@/lib/use-money';

type TicketRowProps = {
  // Position in its list, for the staggered entrance.
  index?: number;
  ticket: {
    id: string;
    purpose: string;
    amount: Money;
    status: TicketStatus;
    createdAt?: string;
    approvedAt?: string | null;
    disbursedAt?: string | null;
    department?: { name: string };
    // RECEIPT tickets come from a scanned bill and get a small tag.
    source?: TicketSource;
  };
};

export function TicketRow({ ticket, index = 0 }: TicketRowProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const formatMoney = useMoney();
  const date = ticket.disbursedAt ?? ticket.approvedAt ?? ticket.createdAt;
  return (
    <FadeInItem index={index}>
      <PressableScale onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: ticket.id } })}>
        <GlassSurface style={styles.card}>
          <View style={styles.top}>
            <Text style={styles.purpose} numberOfLines={2}>
              {ticket.purpose}
            </Text>
            <Text style={styles.amount}>{formatMoney(ticket.amount)}</Text>
          </View>
          <View style={styles.bottom}>
            <View style={styles.badges}>
              <StatusBadge status={ticket.status} />
              {ticket.source === 'RECEIPT' ? (
                <View style={styles.receiptTag}>
                  <Ionicons name="receipt-outline" size={11} color={colors.primary} />
                  <Text style={styles.receiptTagText}>Receipt</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {[ticketRef(ticket.id), ticket.department?.name, formatDate(date)].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </GlassSurface>
      </PressableScale>
    </FadeInItem>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.large,
      padding: spacing.four,
      gap: spacing.three,
    },
    top: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.three,
    },
    purpose: {
      flex: 1,
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    amount: {
      ...typography.bodyStrong,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    bottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.three,
    },
    badges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    receiptTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: iconBadge(colors.primary),
    },
    receiptTagText: {
      ...typography.captionStrong,
      color: colors.primary,
    },
    meta: {
      flexShrink: 1,
      ...typography.caption,
      color: colors.textMuted,
    },
  });
