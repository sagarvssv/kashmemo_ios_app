import { router } from 'expo-router';
import React from 'react';

import { Screen } from '@/components/screen';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { ErrorState } from '@/components/states';
import { useCurrentUser, useRealtime } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { ticketApi } from '@/lib/endpoints';
import { formatMoney } from '@/lib/format';

import { greetingSubtitle, greetingTitle, NotificationBell, RaiseTicketButton, TicketPreviewList } from './shared';

export function EmployeeDashboard() {
  const user = useCurrentUser();
  const wallet = useApi(() => ticketApi.wallet(), []);
  const recent = useApi(() => ticketApi.mine({ limit: 5 }), []);

  useRealtime(['ticket:status-update'], () => {
    void wallet.reload();
    void recent.reload();
  });

  const refresh = async () => {
    await Promise.all([wallet.refresh(), recent.refresh()]);
  };

  const data = wallet.data?.data;

  return (
    <Screen
      title={greetingTitle(user)}
      subtitle={greetingSubtitle(user)}
      right={<NotificationBell />}
      refreshing={wallet.isRefreshing || recent.isRefreshing}
      onRefresh={refresh}>
      {wallet.error && !data ? <ErrorState message={wallet.error} onRetry={wallet.reload} /> : null}

      <StatGrid>
        <StatTile
          label="Approved · awaiting payout"
          value={formatMoney(data?.totalApproved ?? 0)}
          icon="time-outline"
          tone="highlight"
        />
        <StatTile label="Paid out to you" value={formatMoney(data?.totalDisbursed ?? 0)} icon="wallet-outline" />
      </StatGrid>

      <RaiseTicketButton />

      <TicketPreviewList
        title="Recent tickets"
        tickets={recent.data?.data}
        emptyTitle="You haven't raised any tickets yet"
        onSeeAll={() => router.push('/tickets')}
      />
    </Screen>
  );
}
