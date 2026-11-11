import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Section } from '@/components/card';
import { GlassSurface } from '@/components/glass';
import { currentMonth, MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { SkeletonList } from '@/components/skeleton';
import { EmptyState, ErrorState } from '@/components/states';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, radius, spacing, typography } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { AdvanceShortcuts } from '@/features/advances/components';
import { useApi } from '@/hooks/use-api';
import { dashboardApi, departmentApi, ticketApi } from '@/lib/endpoints';
import { toAmount } from '@/lib/format';
import type { BudgetStatus } from '@/lib/types';
import { useMoney } from '@/lib/use-money';

import {
  DailyReportShortcut,
  DepartmentBudgetRow,
  DepartmentTicketsPreview,
  greetingSubtitle,
  greetingTitle,
  ProfileButton,
  RaiseTicketButton,
  RecentActivityPreview,
  TicketPreviewList,
} from './shared';

const PREVIEW_SIZE = 5;

type IconName = keyof typeof Ionicons.glyphMap;

// The Finance Manager can't read /dashboard/summary, so this dashboard is built
// from the per-department budget status and ticket endpoints it does have access to.
export function FinanceDashboard() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const accents = colors.accents;
  const formatMoney = useMoney();
  const user = useCurrentUser();
  const [month, setMonth] = useState(currentMonth);
  const [refreshToken, setRefreshToken] = useState(0);

  // One request chain, so the section never renders an empty first pass while the
  // department list is still loading. Each department's status loads on its own:
  // one failure falls back to its allocation from the organisation budget instead
  // of blanking the whole section.
  const statuses = useApi(async (): Promise<BudgetStatus[]> => {
    const [{ data: departments }, orgBudget] = await Promise.all([
      departmentApi.list(),
      departmentApi.organizationBudget(month).catch(() => null),
    ]);
    const allocations = new Map((orgBudget?.data ?? []).map((budget) => [budget.department.id, toAmount(budget.amount)]));
    const results = await Promise.allSettled(
      departments.map((department) => departmentApi.budgetStatus(department.id, month).then((r) => r.data)),
    );
    if (departments.length > 0 && !orgBudget && results.every((result) => result.status === 'rejected')) {
      throw (results[0] as PromiseRejectedResult).reason;
    }
    return departments.map((department, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') return result.value;
      const allocated = allocations.get(department.id);
      return {
        departmentId: { id: department.id, name: department.name },
        month: month.month,
        year: month.year,
        totalAllocated: allocated ?? 0,
        spent: 0,
        remaining: allocated ?? 0,
        hasBudgetSet: allocated !== undefined,
        spendingUnavailable: true,
      };
    });
  }, [month]);
  const pending = useApi(() => dashboardApi.pendingTickets(month), [month]);
  const toDisburse = useApi(() => ticketApi.organization({ status: 'APPROVED', limit: PREVIEW_SIZE }), []);

  useRealtime(['ticket:created', 'ticket:status-update', 'budget:update'], () => {
    void statuses.reload();
    void pending.reload();
    void toDisburse.reload();
  });

  const refresh = async () => {
    setRefreshToken((token) => token + 1);
    await Promise.all([
      statuses.refresh(),
      pending.refresh(),
      toDisburse.refresh(),
    ]);
  };

  const statusList = statuses.data ?? [];
  const budgeted = statusList.filter((status) => status.hasBudgetSet);
  const totalAllocated = budgeted.reduce((sum, status) => sum + status.totalAllocated, 0);
  const totalSpent = budgeted.reduce((sum, status) => sum + status.spent, 0);
  const totalRemaining = budgeted.reduce((sum, status) => sum + status.remaining, 0);
  const pendingList = pending.data?.data ?? [];
  const pendingAmount = pendingList.reduce((sum, ticket) => sum + toAmount(ticket.amount), 0);
  const ownBudget = statusList.find((status) => status.departmentId.id === user.departmentId);
  const budgetsLoading = statuses.isLoading && !statuses.data;

  return (
    <Screen
      title={greetingTitle(user)}
      subtitle={greetingSubtitle(user)}
      right={<ProfileButton />}
      refreshing={statuses.isRefreshing}
      onRefresh={refresh}>
      <MonthSwitcher value={month} onChange={setMonth} />

      {user.departmentId ? <OwnBudgetCard status={ownBudget} loading={budgetsLoading} /> : null}

      <View style={styles.kpiGrid}>
        <Kpi icon="pie-chart" tint={accents.green} label="Allocated" value={formatMoney(totalAllocated)} />
        <Kpi icon="trending-up" tint={accents.blue} label="Spent" value={formatMoney(totalSpent)} />
        <Kpi
          icon="wallet"
          tint={totalRemaining < 0 ? colors.danger : accents.cyan}
          label="Remaining"
          value={formatMoney(totalRemaining)}
        />
        <Kpi
          icon="time"
          tint={colors.warning}
          label={`${pendingList.length} pending`}
          value={formatMoney(pendingAmount)}
          onPress={() => router.push({ pathname: '/tickets', params: { scope: 'all', status: 'PENDING' } })}
        />
      </View>

      <RaiseTicketButton />

      <AdvanceShortcuts />

      <Section title="Budgets by department" action={{ label: 'Manage', onPress: () => router.push('/departments') }}>
        <Card style={styles.budgetCard}>
          {statuses.error && !statuses.data ? <ErrorState message={statuses.error} onRetry={statuses.reload} /> : null}
          {budgetsLoading && !statuses.error ? <SkeletonList count={3} /> : null}
          {statuses.data && statusList.length === 0 ? (
            <EmptyState icon="pie-chart-outline" title="No departments yet" />
          ) : null}
          {statusList.map((status, index) => (
            <DepartmentBudgetRow key={status.departmentId.id} status={status} first={index === 0} />
          ))}
        </Card>
      </Section>

      <DailyReportShortcut />

      <DepartmentTicketsPreview refreshToken={refreshToken} />

      <TicketPreviewList
        title="Pending approval"
        tickets={pending.data ? pendingList.slice(0, PREVIEW_SIZE) : undefined}
        loading={pending.isLoading}
        emptyTitle={pending.error ?? 'Nothing waiting for approval'}
        onSeeAll={() => router.push({ pathname: '/tickets', params: { scope: 'all', status: 'PENDING' } })}
      />

      <TicketPreviewList
        title="Approved · ready to disburse"
        tickets={toDisburse.data?.data}
        loading={toDisburse.isLoading}
        emptyTitle={toDisburse.error ?? 'No approved tickets awaiting payout'}
        onSeeAll={() => router.push({ pathname: '/tickets', params: { scope: 'all', status: 'APPROVED' } })}
      />

      <RecentActivityPreview />
    </Screen>
  );
}

// The signed-in Finance Manager's own department budget for the selected month.
function OwnBudgetCard({ status, loading }: { status: BudgetStatus | undefined; loading: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  const formatMoney = useMoney();
  const allocated = status?.totalAllocated ?? 0;
  const spent = status?.spent ?? 0;
  const remaining = status?.remaining ?? 0;
  const ratio = allocated > 0 ? Math.min(spent / allocated, 1) : 0;
  const percentUsed = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
  const over = remaining < 0;

  return (
    <View style={[styles.hero, { backgroundColor: brand.primary, shadowColor: brand.primary }]}>
      <View style={styles.heroHeader}>
        <View style={styles.heroIcon}>
          <Ionicons name="wallet" size={16} color={brand.primary} />
        </View>
        <Text style={styles.heroLabel} numberOfLines={1}>
          My budget{status ? ` · ${status.departmentId.name}` : ''}
        </Text>
      </View>

      {loading ? (
        <Text style={styles.heroMeta}>Loading your budget…</Text>
      ) : !status || !status.hasBudgetSet ? (
        <Text style={styles.heroMeta}>No budget set for your department this month.</Text>
      ) : (
        <>
          <View>
            <Text style={[styles.heroValue, over && styles.heroValueOver]} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(remaining)}
            </Text>
            <Text style={styles.heroCaption}>{over ? 'over budget' : 'remaining this month'}</Text>
          </View>
          <View style={styles.heroTrack}>
            <View
              style={[styles.heroFill, { width: `${Math.round(ratio * 100)}%` }, ratio > 0.9 && styles.heroFillAlert]}
            />
          </View>
          <View style={styles.heroRow}>
            <Text style={styles.heroMeta}>
              Spent {formatMoney(spent)} of {formatMoney(allocated)}
            </Text>
            <Text style={styles.heroMetaStrong}>{percentUsed}% used</Text>
          </View>
        </>
      )}
    </View>
  );
}

function Kpi({
  icon,
  tint,
  label,
  value,
  onPress,
}: {
  icon: IconName;
  tint: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const content = (
    <GlassSurface style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: iconBadge(tint) }]}>
        <Ionicons name={icon} size={14} color={tint} />
      </View>
      <View style={styles.kpiText}>
        <Text style={styles.kpiLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
    </GlassSurface>
  );
  if (!onPress) return <View style={styles.kpiCell}>{content}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.kpiCell, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.large,
    padding: spacing.four,
    gap: spacing.three,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
  },
  heroIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    ...typography.overline,
    color: 'rgba(255,255,255,0.85)',
    flexShrink: 1,
  },
  heroValue: {
    ...typography.title,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroValueOver: {
    color: '#FECACA',
  },
  heroCaption: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  heroTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  heroFillAlert: {
    backgroundColor: '#FCA5A5',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.two,
  },
  heroMeta: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    flexShrink: 1,
  },
  heroMetaStrong: {
    ...typography.captionStrong,
    color: '#FFFFFF',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
  },
  kpiCell: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  kpi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
    borderRadius: radius.medium,
    paddingVertical: spacing.three,
    paddingHorizontal: spacing.three,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiText: {
    flex: 1,
  },
  kpiLabel: {
    ...typography.micro,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  kpiValue: {
    ...typography.bodyStrong,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  budgetCard: {
    gap: 0,
    paddingVertical: spacing.one,
  },
});
