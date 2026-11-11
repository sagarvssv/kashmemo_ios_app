import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Card, Section } from '@/components/card';
import { currentMonth, MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { ErrorState, LoadingState } from '@/components/states';
import { StatusBreakdown } from '@/components/status-breakdown';
import { useColors } from '@/constants/brand';
import { spacing } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { AdvanceShortcuts } from '@/features/advances/components';
import { useApi } from '@/hooks/use-api';
import { dashboardApi, ticketApi } from '@/lib/endpoints';
import { can } from '@/lib/permissions';
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

// Dashboard for the CEO and HR, built on /dashboard/summary.
export function OrgDashboard() {
  const colors = useColors();
  const accents = colors.accents;
  const formatMoney = useMoney();
  const user = useCurrentUser();
  const [month, setMonth] = useState(currentMonth);
  const [refreshToken, setRefreshToken] = useState(0);

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
    setRefreshToken((token) => token + 1);
    await Promise.all([summary.refresh(), pending.refresh(), toDisburse.refresh()]);
  };

  const data = summary.data?.data;

  return (
    <Screen
      title={greetingTitle(user)}
      subtitle={greetingSubtitle(user)}
      right={<ProfileButton />}
      refreshing={summary.isRefreshing}
      onRefresh={refresh}>
      <MonthSwitcher value={month} onChange={setMonth} />

      {summary.isLoading && !data ? <LoadingState variant="dashboard" /> : null}
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
            <StatTile label="Spent" value={formatMoney(data.budget.totalSpent)} icon="trending-up-outline" tint={accents.blue} />
            <StatTile
              label="Allocated"
              value={formatMoney(data.budget.totalAllocatedBudget)}
              icon="pie-chart-outline"
              tint={accents.green}
            />
            <StatTile label="Employees" value={String(data.totalEmployees)} icon="people-outline" tint={accents.violet} />
          </StatGrid>

          <Section title="Tickets this month">
            <Card>
              <StatusBreakdown
                counts={data.tickets}
                onOpenStatus={(status) => router.push({ pathname: '/tickets', params: { scope: 'all', status } })}
              />
            </Card>
          </Section>

          {data.departments.length > 0 && (
            <Section title={`Departments (${data.totalDepartments})`} action={{ label: 'Manage', onPress: () => router.push('/departments') }}>
              <Card style={styles.departments}>
                {data.departments.map((status, index) => (
                  <DepartmentBudgetRow key={status.departmentId.id} status={status} first={index === 0} />
                ))}
              </Card>
            </Section>
          )}
        </>
      )}

      <DailyReportShortcut />

      <AdvanceShortcuts />

      <DepartmentTicketsPreview refreshToken={refreshToken} />

      <RaiseTicketButton />

      <TicketPreviewList
        title="Pending approval"
        tickets={pending.data}
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

const styles = StyleSheet.create({
  departments: {
    gap: 0,
    paddingVertical: spacing.one,
  },
});
