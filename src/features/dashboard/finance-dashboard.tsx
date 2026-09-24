import { router } from 'expo-router';
import React, { useState } from 'react';

import { Card, ListRow, Section } from '@/components/card';
import { currentMonth, MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { EmptyState, ErrorState } from '@/components/states';
import { useCurrentUser, useRealtime } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { dashboardApi, departmentApi, ticketApi } from '@/lib/endpoints';
import { formatMoney, toAmount } from '@/lib/format';

import {
  greetingSubtitle,
  greetingTitle,
  NotificationBell,
  RaiseTicketButton,
  RecentActivityPreview,
  TicketPreviewList,
} from './shared';

// The Finance Manager can't read /dashboard/summary, so this dashboard is built
// from the organisation budget and ticket endpoints it does have access to.
export function FinanceDashboard() {
  const user = useCurrentUser();
  const [month, setMonth] = useState(currentMonth);

  const budgets = useApi(() => departmentApi.organizationBudget(month), [month]);
  const pending = useApi(() => dashboardApi.pendingTickets(month), [month]);
  const toDisburse = useApi(() => ticketApi.organization({ status: 'APPROVED', limit: 5 }), []);

  useRealtime(['ticket:created', 'ticket:status-update', 'budget:update'], () => {
    void budgets.reload();
    void pending.reload();
    void toDisburse.reload();
  });

  const refresh = async () => {
    await Promise.all([budgets.refresh(), pending.refresh(), toDisburse.refresh()]);
  };

  const budgetList = budgets.data?.data ?? [];
  const totalAllocated = budgetList.reduce((sum, budget) => sum + toAmount(budget.amount), 0);
  const pendingList = pending.data?.data ?? [];
  const pendingAmount = pendingList.reduce((sum, ticket) => sum + toAmount(ticket.amount), 0);

  return (
    <Screen
      title={greetingTitle(user)}
      subtitle={greetingSubtitle(user)}
      right={<NotificationBell />}
      refreshing={budgets.isRefreshing}
      onRefresh={refresh}>
      <MonthSwitcher value={month} onChange={setMonth} />

      <StatGrid>
        <StatTile label="Allocated this month" value={formatMoney(totalAllocated)} icon="pie-chart-outline" tone="highlight" />
        <StatTile label={`${pendingList.length} pending`} value={formatMoney(pendingAmount)} icon="time-outline" />
      </StatGrid>

      <RaiseTicketButton />

      <TicketPreviewList
        title="Pending approval"
        tickets={pendingList.slice(0, 5)}
        emptyTitle={pending.error ?? 'Nothing waiting for approval'}
        onSeeAll={() => router.push({ pathname: '/tickets', params: { scope: 'all', status: 'PENDING' } })}
      />

      <TicketPreviewList
        title="Approved · ready to disburse"
        tickets={toDisburse.data?.data}
        emptyTitle={toDisburse.error ?? 'No approved tickets awaiting payout'}
        onSeeAll={() => router.push({ pathname: '/tickets', params: { scope: 'all', status: 'APPROVED' } })}
      />

      <Section title="Budgets by department" action={{ label: 'Manage', onPress: () => router.push('/departments') }}>
        <Card>
          {budgets.error ? <ErrorState message={budgets.error} onRetry={budgets.reload} /> : null}
          {!budgets.error && budgetList.length === 0 ? (
            <EmptyState icon="pie-chart-outline" title="No budgets allocated for this month" />
          ) : null}
          {budgetList.map((budget) => (
            <ListRow
              key={budget.id}
              icon="business-outline"
              title={budget.department.name}
              meta={formatMoney(budget.amount)}
              onPress={() => router.push({ pathname: '/department/[id]', params: { id: budget.department.id } })}
            />
          ))}
        </Card>
      </Section>

      <RecentActivityPreview />
    </Screen>
  );
}
