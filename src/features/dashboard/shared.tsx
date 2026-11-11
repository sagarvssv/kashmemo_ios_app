import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ListRow, Section } from '@/components/card';
import { ChipGroup } from '@/components/chip-group';
import { PrimaryButton } from '@/components/primary-button';
import { SkeletonList } from '@/components/skeleton';
import { EmptyState } from '@/components/states';
import { ProgressBar } from '@/components/stat-tile';
import { TicketRow } from '@/components/ticket-row';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, spacing, typography } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { departmentVisual } from '@/lib/department-icons';
import { dashboardApi, departmentApi, ticketApi } from '@/lib/endpoints';
import { can } from '@/lib/permissions';
import { fetchDepartmentTickets } from '@/lib/ticket-filters';
import { formatRelative, initials, ROLE_LABELS, shortId, ticketRef } from '@/lib/format';
import type { BudgetStatus, SessionUser, Ticket } from '@/lib/types';
import { useMoney, useMoneyText } from '@/lib/use-money';

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
  return <PrimaryButton label="Request amount" icon="add-circle-outline" onPress={() => router.push('/raise-ticket')} />;
}

// Avatar at the top right of the home screen; opens the signed-in user's profile.
export function ProfileButton() {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  const user = useCurrentUser();
  return (
    <Pressable
      onPress={() => router.push('/my-profile')}
      hitSlop={8}
      accessibilityLabel="Your profile"
      style={({ pressed }) => [styles.profileButton, { backgroundColor: brand.secondary }, pressed && { opacity: 0.7 }]}>
      <Text style={styles.profileInitials}>{initials(user.name)}</Text>
      {/* Nudge towards the profile while a temporary password is still in use. */}
      {user.mustResetPassword ? <View style={[styles.profileDot, { borderColor: brand.background }]} /> : null}
    </Pressable>
  );
}

export function TicketPreviewList({
  title,
  tickets,
  emptyTitle,
  onSeeAll,
  loading,
  filter,
}: {
  title: string;
  tickets: Ticket[] | undefined;
  emptyTitle: string;
  onSeeAll?: () => void;
  // First load in progress: show skeleton rows instead of the empty message.
  loading?: boolean;
  // Rendered between the heading and the list, e.g. a row of filter chips.
  filter?: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Section title={title} action={onSeeAll ? { label: 'See all', onPress: onSeeAll } : undefined}>
      {filter}
      {loading && !tickets ? (
        <SkeletonList count={2} />
      ) : tickets && tickets.length > 0 ? (
        <View style={styles.list}>
          {tickets.map((ticket, index) => (
            <TicketRow key={ticket.id} ticket={ticket} index={index} />
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
  const styles = useThemedStyles(makeStyles);
  const moneyText = useMoneyText();
  const { data } = useApi(() => dashboardApi.recentActivity({ limit }), [limit]);
  const activity = data?.data ?? [];

  return (
    <Section title="Recent activity" action={{ label: 'See all', onPress: () => router.push('/activity') }}>
      <Card style={styles.compactCard}>
        {activity.length === 0 ? (
          <EmptyState icon="pulse-outline" title="No activity yet" />
        ) : (
          activity.map((entry) => {
            const ticketId = entry.metadata?.ticketId;
            return (
              <ListRow
                key={entry.id}
                icon={ticketId ? 'receipt-outline' : 'pulse-outline'}
                title={moneyText(entry.message)}
                subtitle={[ticketRef(ticketId), entry.actor?.name ?? 'Someone', formatRelative(entry.createdAt)]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={
                  ticketId ? () => router.push({ pathname: '/ticket/[id]', params: { id: ticketId } }) : undefined
                }
              />
            );
          })
        )}
      </Card>
    </Section>
  );
}

// Shortcut to today's ticket report, for the roles that can open it.
export function DailyReportShortcut() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const accents = colors.accents;
  const user = useCurrentUser();
  if (!can.viewDailyReport(user.role)) return null;
  return (
    <Card style={styles.compactCard}>
      <ListRow
        icon="calendar-outline"
        tint={accents.indigo}
        title="Daily ticket report"
        subtitle="Tickets raised per day, by status and amount"
        onPress={() => router.push({ pathname: '/reports', params: { view: 'daily' } })}
      />
    </Card>
  );
}

export function BudgetCard({ status, onPress }: { status: BudgetStatus; onPress?: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const brand = useBrand();
  const formatMoney = useMoney();
  const content = (
    <Card>
      <View style={styles.budgetHeader}>
        <View style={styles.budgetTitleRow}>
          <Text style={styles.budgetTitle}>{status.departmentId.name}</Text>
          <Text style={styles.budgetMeta}>{shortId(status.departmentId.id)}</Text>
        </View>
        {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
      </View>
      {status.hasBudgetSet ? (
        <>
          <ProgressBar value={status.spent} max={status.totalAllocated} />
          <View style={styles.budgetRow}>
            <Text style={styles.budgetMeta}>Spent {formatMoney(status.spent)}</Text>
            <Text style={styles.budgetMeta}>of {formatMoney(status.totalAllocated)}</Text>
          </View>
          <Text style={[styles.remaining, { color: brand.primary }, status.remaining < 0 && { color: colors.danger }]}>
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

const ALL_DEPARTMENTS = 'ALL';
const DEPARTMENT_PREVIEW_SIZE = 5;

// Latest organisation tickets with a row of department chips to narrow them down.
// `refreshToken` lets the parent screen's pull-to-refresh reload it too.
export function DepartmentTicketsPreview({ refreshToken = 0 }: { refreshToken?: number }) {
  const palette = useColors();
  const [departmentId, setDepartmentId] = useState(ALL_DEPARTMENTS);
  const departments = useApi(() => departmentApi.list(), []);
  const tickets = useApi(() => {
    const filtered = departmentId !== ALL_DEPARTMENTS;
    const fetchPage = (cursor: string | undefined) =>
      ticketApi.organization({
        cursor,
        limit: DEPARTMENT_PREVIEW_SIZE,
        departmentId: filtered ? departmentId : undefined,
      });
    if (!filtered) return fetchPage(undefined);
    return fetchDepartmentTickets(fetchPage, departmentId, undefined, DEPARTMENT_PREVIEW_SIZE);
  }, [departmentId, refreshToken]);

  useRealtime(['ticket:created', 'ticket:status-update'], () => {
    void tickets.reload();
  });

  const options = [
    { value: ALL_DEPARTMENTS, label: 'All', icon: 'grid' as const },
    ...(departments.data?.data ?? []).map((department) => ({
      value: department.id,
      label: department.name,
      ...departmentVisual(department.name, palette.departmentTints),
    })),
  ];

  return (
    <TicketPreviewList
      title="Tickets by department"
      filter={<ChipGroup compact options={options} value={departmentId} onChange={setDepartmentId} />}
      tickets={tickets.isLoading ? undefined : tickets.data?.data.slice(0, DEPARTMENT_PREVIEW_SIZE)}
      loading={tickets.isLoading}
      emptyTitle={tickets.error ?? 'No tickets for this department'}
      onSeeAll={() =>
        router.push({
          pathname: '/tickets',
          params: { scope: 'all', ...(departmentId === ALL_DEPARTMENTS ? {} : { departmentId }) },
        })
      }
    />
  );
}

// Compact department budget row: tinted department icon, allocation and a thin
// spend bar. Opens the department's budget page.
export function DepartmentBudgetRow({
  status,
  first,
  pressable = true,
  month,
}: {
  status: BudgetStatus;
  first: boolean;
  // Opens the department page on this month instead of the current one.
  month?: { month: number; year: number };
  // Off for roles that can't open the department budget page (managers).
  pressable?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const brand = useBrand();
  const formatMoney = useMoney();
  const { icon, tint } = departmentVisual(status.departmentId.name, colors.departmentTints);
  const ratio = status.totalAllocated > 0 ? Math.min(status.spent / status.totalAllocated, 1) : 0;
  const over = status.remaining < 0;

  return (
    <Pressable
      disabled={!pressable}
      onPress={() =>
        router.push({
          pathname: '/department/[id]',
          params: {
            id: status.departmentId.id,
            ...(month ? { month: String(month.month), year: String(month.year) } : {}),
          },
        })
      }
      style={({ pressed }) => [styles.deptRow, !first && styles.deptRowDivider, pressed && styles.deptPressed]}>
      <View style={[styles.deptIcon, { backgroundColor: iconBadge(tint) }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <View style={styles.deptBody}>
        <View style={styles.deptLine}>
          <Text style={styles.deptName} numberOfLines={1}>
            {status.departmentId.name}
          </Text>
          <Text style={styles.deptAmount}>
            {status.hasBudgetSet ? formatMoney(status.totalAllocated) : '—'}
          </Text>
        </View>
        {status.hasBudgetSet ? (
          <>
            <View style={[styles.deptTrack, { backgroundColor: brand.background }]}>
              <View
                style={[
                  styles.deptFill,
                  { width: `${Math.round(ratio * 100)}%`, backgroundColor: tint },
                  (over || ratio > 0.9) && { backgroundColor: colors.danger },
                ]}
              />
            </View>
            {status.spendingUnavailable ? (
              <Text style={styles.deptMeta}>Spending couldn&apos;t be loaded</Text>
            ) : (
              <View style={styles.deptLine}>
                <Text style={styles.deptMeta}>Spent {formatMoney(status.spent)}</Text>
                <Text style={[styles.deptMetaStrong, { color: brand.primary }, over && { color: colors.danger }]}>
                  {formatMoney(status.remaining)} left
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.deptMeta}>No budget set this month</Text>
        )}
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.three,
    paddingVertical: spacing.three,
  },
  deptRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  deptIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptBody: {
    flex: 1,
    gap: 5,
  },
  deptLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.two,
  },
  deptName: {
    ...typography.footnoteStrong,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  deptAmount: {
    ...typography.footnoteStrong,
    color: colors.textPrimary,
  },
  deptTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  deptFill: {
    height: '100%',
    borderRadius: 999,
  },
  deptMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  deptMetaStrong: {
    ...typography.captionStrong,
    color: colors.primary,
  },
  deptPressed: {
    opacity: 0.7,
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInitials: {
    ...typography.footnoteStrong,
    color: '#FFFFFF',
  },
  profileDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.warning,
    borderWidth: 2,
    borderColor: colors.background,
  },
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
  budgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.two,
    flexShrink: 1,
  },
  budgetTitle: {
    ...typography.bodyStrong,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetMeta: {
    ...typography.footnote,
    color: colors.textMuted,
  },
  remaining: {
    ...typography.calloutStrong,
    color: colors.primary,
  },
});
