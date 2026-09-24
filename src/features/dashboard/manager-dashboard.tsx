import { router } from 'expo-router';
import React, { useState } from 'react';

import { Section } from '@/components/card';
import { currentMonth, MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { ErrorState } from '@/components/states';
import { useCurrentUser, useRealtime } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { departmentApi, managerApi, ticketApi } from '@/lib/endpoints';

import {
  BudgetCard,
  greetingSubtitle,
  greetingTitle,
  NotificationBell,
  RaiseTicketButton,
  RecentActivityPreview,
  TicketPreviewList,
} from './shared';

export function ManagerDashboard() {
  const user = useCurrentUser();
  const [month, setMonth] = useState(currentMonth);

  const departments = useApi(() => managerApi.departments(user.userId), [user.userId]);
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

  return (
    <Screen
      title={greetingTitle(user)}
      subtitle={greetingSubtitle(user)}
      right={<NotificationBell />}
      refreshing={departments.isRefreshing || pending.isRefreshing}
      onRefresh={refresh}>
      <RaiseTicketButton />

      <TicketPreviewList
        title="Waiting for your approval"
        tickets={pending.data?.data}
        emptyTitle={pending.error ?? 'No pending tickets in your department'}
        onSeeAll={() => router.push({ pathname: '/tickets', params: { scope: 'team', status: 'PENDING' } })}
      />

      <Section title="Department budgets">
        <MonthSwitcher value={month} onChange={setMonth} />
        {departments.error ? <ErrorState message={departments.error} onRetry={departments.reload} /> : null}
        {(budgets.data ?? []).map((status) => (
          <BudgetCard key={status.departmentId.id} status={status} />
        ))}
      </Section>

      <RecentActivityPreview />
    </Screen>
  );
}
