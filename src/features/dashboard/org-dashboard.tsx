import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Section } from '@/components/card';
import { currentMonth, MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { ErrorState, LoadingState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { colors, spacing } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { dashboardApi, ticketApi } from '@/lib/endpoints';
import { formatMoney } from '@/lib/format';
import { can } from '@/lib/permissions';
import type { TicketStatus } from '@/lib/types';

import {
  BudgetCard,
  greetingSubtitle,
  greetingTitle,
  NotificationBell,
  RaiseTicketButton,
  RecentActivityPreview,
  TicketPreviewList,
} from './shared';

const SUMMARY_STATUSES: TicketStatus[] = ['PENDING', 'PARTIALLY_APPROVED', 'APPROVED', 'DISBURSED', 'REJECTED'];

// Dashboard for the CEO and HR, built on /dashboard/summary.
export function OrgDashboard() {
  const user = useCurrentUser();
  const [month, setMonth] = useState(currentMonth);

  const summary = useApi(() => dashboardApi.summary(month), [month]);
  const pending = useApi(
    () =>
      can.viewPendingTickets(user.role)
        ? dashboardApi.pendingTickets(month).then((r) => r.data.slice(0, 5))
        : ticketApi.organization({ status: 'PENDING', limit: 5 }).then((r) => r.data),
    [month, user.role],
  );
  const toDisburse = useApi(() => ticketApi.organization({ status: 'APPROVED', limit: 5 }), []);

  useRealtime(['ticket:created', 'ticket:status-update', 'budget:update', 'employee:created'], () => {
    void summary.reload();
    void pending.reload();
    void toDisburse.reload();
  });

  const refresh = async () => {
    await Promise.all([summary.refresh(), pending.refresh(), toDisburse.refresh()]);
  };

  const data = summary.data?.data;

  return (
    <Screen
      title={greetingTitle(user)}
      subtitle={greetingSubtitle(user)}
      right={<NotificationBell />}
      refreshing={summary.isRefreshing}
      onRefresh={refresh}>
      <MonthSwitcher value={month} onChange={setMonth} />

      {summary.isLoading && !data ? <LoadingState /> : null}
      {summary.error && !data ? <ErrorState message={summary.error} onRetry={summary.reload} /> : null}

      {data && (
        <>
          <StatGrid>
            <StatTile
              label="Budget remaining"
              value={formatMoney(data.budget.totalRemaining)}
              icon="wallet-outline"
              tone="highlight"
            />
            <StatTile label="Spent" value={formatMoney(data.budget.totalSpent)} icon="trending-up-outline" />
            <StatTile label="Allocated" value={formatMoney(data.budget.totalAllocatedBudget)} icon="pie-chart-outline" />
            <StatTile label="Employees" value={String(data.totalEmployees)} icon="people-outline" />
          </StatGrid>

          <Section title="Tickets this month">
            <Card>
              {SUMMARY_STATUSES.map((status) => (
                <View key={status} style={styles.statusRow}>
                  <StatusBadge status={status} />
                  <Text style={styles.statusCount}>{data.tickets[status] ?? 0}</Text>
                </View>
              ))}
            </Card>
          </Section>
        </>
      )}

      <RaiseTicketButton />

      <TicketPreviewList
        title="Pending approval"
        tickets={pending.data}
        emptyTitle={pending.error ?? 'Nothing waiting for approval'}
        onSeeAll={() => router.push({ pathname: '/tickets', params: { scope: 'all', status: 'PENDING' } })}
      />

      <TicketPreviewList
        title="Approved · ready to disburse"
        tickets={toDisburse.data?.data}
        emptyTitle={toDisburse.error ?? 'No approved tickets awaiting payout'}
        onSeeAll={() => router.push({ pathname: '/tickets', params: { scope: 'all', status: 'APPROVED' } })}
      />

      {data && data.departments.length > 0 && (
        <Section title={`Departments (${data.totalDepartments})`} action={{ label: 'Manage', onPress: () => router.push('/departments') }}>
          {data.departments.map((status) => (
            <BudgetCard
              key={status.departmentId.id}
              status={status}
              onPress={() => router.push({ pathname: '/department/[id]', params: { id: status.departmentId.id } })}
            />
          ))}
        </Section>
      )}

      <RecentActivityPreview />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.one,
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
