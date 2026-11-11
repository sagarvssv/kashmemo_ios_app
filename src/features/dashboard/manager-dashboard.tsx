import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Card, Section } from '@/components/card';
import { currentMonth, MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { SkeletonList } from '@/components/skeleton';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { EmptyState, ErrorState } from '@/components/states';
import { useColors } from '@/constants/brand';
import { spacing } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { AdvanceShortcuts } from '@/features/advances/components';
import { useApi } from '@/hooks/use-api';
import { departmentApi, managerApi, ticketApi } from '@/lib/endpoints';
import { useMoney } from '@/lib/use-money';

import {
  DepartmentBudgetRow,
  greetingSubtitle,
  greetingTitle,
  ProfileButton,
  RaiseTicketButton,
  RecentActivityPreview,
  TicketPreviewList,
} from './shared';

export function ManagerDashboard() {
  const colors = useColors();
  const accents = colors.accents;
  const formatMoney = useMoney();
  const user = useCurrentUser();
  const [month, setMonth] = useState(currentMonth);

  const departments = useApi(() => managerApi.myDepartments(), []);
  const budgets = useApi(async () => {
    const list = departments.data?.data ?? [];
    return Promise.all(list.map((department) => departmentApi.budgetStatus(department.id, month).then((r) => r.data)));
  }, [departments.data, month]);
  const pending = useApi(() => ticketApi.department({ status: 'PENDING', limit: 5 }), []);

  useRealtime(['ticket:created', 'ticket:status-update', 'budget:update'], () => {
    void pending.reload();
    void budgets.reload();
  });

  const refresh = async () => {
    await Promise.all([departments.refresh(), pending.refresh()]);
  };

  const budgetList = budgets.data ?? [];
  const budgeted = budgetList.filter((status) => status.hasBudgetSet);
  const allocated = budgeted.reduce((sum, status) => sum + status.totalAllocated, 0);
  const spent = budgeted.reduce((sum, status) => sum + status.spent, 0);
  const remaining = budgeted.reduce((sum, status) => sum + status.remaining, 0);
  const budgetsLoading = (departments.isLoading || budgets.isLoading) && !budgets.data;
  const budgetsError = departments.error ?? budgets.error;
  const pendingCount = pending.data?.data.length ?? 0;

  return (
    <Screen
      title={greetingTitle(user)}
      subtitle={greetingSubtitle(user)}
      right={<ProfileButton />}
      refreshing={departments.isRefreshing || pending.isRefreshing}
      onRefresh={refresh}>
      <MonthSwitcher value={month} onChange={setMonth} />

      <StatGrid>
        <StatTile label="Remaining" value={formatMoney(remaining)} icon="wallet-outline" tone="highlight" />
        <StatTile label="Spent" value={formatMoney(spent)} icon="trending-up-outline" tint={accents.blue} />
        <StatTile label="Allocated" value={formatMoney(allocated)} icon="pie-chart-outline" tint={accents.green} />
        <StatTile
          label="Awaiting you"
          value={pending.data ? `${pendingCount}${pending.data.nextCursor ? '+' : ''}` : '—'}
          icon="hourglass-outline"
          tint={accents.amber}
        />
      </StatGrid>

      <RaiseTicketButton />

      <AdvanceShortcuts />

      <Section title="Department budgets">
        <Card style={styles.budgets}>
          {budgetsError && !budgets.data ? (
            <ErrorState message={budgetsError} onRetry={departments.data ? budgets.reload : departments.reload} />
          ) : null}
          {budgetsLoading && !budgetsError ? <SkeletonList count={2} /> : null}
          {budgets.data && budgetList.length === 0 ? (
            <EmptyState icon="business-outline" title="You don't manage any departments yet" />
          ) : null}
          {budgetList.map((status, index) => (
            <DepartmentBudgetRow key={status.departmentId.id} status={status} first={index === 0} pressable={false} />
          ))}
        </Card>
      </Section>

      <TicketPreviewList
        title="Waiting for your approval"
        tickets={pending.data?.data}
        loading={pending.isLoading}
        emptyTitle={pending.error ?? 'No pending tickets in your department'}
        onSeeAll={() => router.push({ pathname: '/tickets', params: { scope: 'team', status: 'PENDING' } })}
      />

      <RecentActivityPreview />
    </Screen>
  );
}

const styles = StyleSheet.create({
  budgets: {
    gap: 0,
    paddingVertical: spacing.one,
  },
});
