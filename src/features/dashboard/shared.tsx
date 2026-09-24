import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ListRow, Section } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { EmptyState } from '@/components/states';
import { ProgressBar } from '@/components/stat-tile';
import { TicketRow } from '@/components/ticket-row';
import { colors, spacing } from '@/constants/theme';
import { useCurrentUser } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { dashboardApi } from '@/lib/endpoints';
import { formatMoney, formatRelative, ROLE_LABELS } from '@/lib/format';
import type { BudgetStatus, SessionUser, Ticket } from '@/lib/types';

export function greetingTitle(user: SessionUser) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${greeting}, ${user.name.split(' ')[0]}`;
}

export function greetingSubtitle(user: SessionUser) {
  return [ROLE_LABELS[user.role], user.companyName].filter(Boolean).join(' · ');
}

// The backend requires a department on the raiser, so only offer it when one is set.
export function RaiseTicketButton() {
  const user = useCurrentUser();
  if (!user.departmentId) return null;
  return <PrimaryButton label="Raise a ticket" icon="add-circle-outline" onPress={() => router.push('/raise-ticket')} />;
}

export function NotificationBell() {
  return (
    <Pressable onPress={() => router.push('/alerts')} hitSlop={8} accessibilityLabel="Notifications">
      <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
    </Pressable>
  );
}

export function TicketPreviewList({
  title,
  tickets,
  emptyTitle,
  onSeeAll,
}: {
  title: string;
  tickets: Ticket[] | undefined;
  emptyTitle: string;
  onSeeAll?: () => void;
}) {
  return (
    <Section title={title} action={onSeeAll ? { label: 'See all', onPress: onSeeAll } : undefined}>
      {tickets && tickets.length > 0 ? (
        <View style={styles.list}>
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} />
          ))}
        </View>
      ) : (
        <Card>
          <EmptyState icon="checkmark-done-outline" title={emptyTitle} />
        </Card>
      )}
    </Section>
  );
}

export function RecentActivityPreview({ limit = 5 }: { limit?: number }) {
  const { data } = useApi(() => dashboardApi.recentActivity({ limit }), [limit]);
  const activity = data?.data ?? [];

  return (
    <Section title="Recent activity" action={{ label: 'See all', onPress: () => router.push('/activity') }}>
      <Card style={styles.compactCard}>
        {activity.length === 0 ? (
          <EmptyState icon="pulse-outline" title="No activity yet" />
        ) : (
          activity.map((entry) => (
            <ListRow
              key={entry.id}
              icon="pulse-outline"
              title={entry.message}
              subtitle={`${entry.actor?.name ?? 'Someone'} · ${formatRelative(entry.createdAt)}`}
            />
          ))
        )}
      </Card>
    </Section>
  );
}

export function BudgetCard({ status, onPress }: { status: BudgetStatus; onPress?: () => void }) {
  const content = (
    <Card>
      <View style={styles.budgetHeader}>
        <Text style={styles.budgetTitle}>{status.departmentId.name}</Text>
        {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
      </View>
      {status.hasBudgetSet ? (
        <>
          <ProgressBar value={status.spent} max={status.totalAllocated} />
          <View style={styles.budgetRow}>
            <Text style={styles.budgetMeta}>Spent {formatMoney(status.spent)}</Text>
            <Text style={styles.budgetMeta}>of {formatMoney(status.totalAllocated)}</Text>
          </View>
          <Text style={[styles.remaining, status.remaining < 0 && { color: colors.danger }]}>
            {formatMoney(status.remaining)} remaining
          </Text>
        </>
      ) : (
        <Text style={styles.budgetMeta}>No budget set for this month.</Text>
      )}
    </Card>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.three,
  },
  compactCard: {
    gap: 0,
    paddingVertical: spacing.one,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  remaining: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
