import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Segmented } from '@/components/chip-group';
import { Screen } from '@/components/screen';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { TicketRow } from '@/components/ticket-row';
import { spacing } from '@/constants/theme';
import { useRealtime } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { ticketApi } from '@/lib/endpoints';
import { formatMoney } from '@/lib/format';

type Tab = 'approved' | 'disbursed';

export default function WalletScreen() {
  const [tab, setTab] = useState<Tab>('approved');
  const wallet = useApi(() => ticketApi.wallet().then((r) => r.data), []);

  useRealtime(['ticket:status-update'], () => {
    void wallet.reload();
  });

  const data = wallet.data;
  const tickets = tab === 'approved' ? data?.approvedTickets : data?.disbursedTickets;

  return (
    <Screen title="My wallet" backFallback="/profile" refreshing={wallet.isRefreshing} onRefresh={wallet.refresh}>
      {wallet.isLoading && !data ? <LoadingState /> : null}
      {wallet.error && !data ? <ErrorState message={wallet.error} onRetry={wallet.reload} /> : null}

      {data && (
        <>
          <StatGrid>
            <StatTile label="Total" value={formatMoney(data.totalAmout)} icon="wallet-outline" tone="highlight" />
            <StatTile label="Awaiting payout" value={formatMoney(data.totalApproved)} icon="time-outline" />
            <StatTile label="Paid out" value={formatMoney(data.totalDisbursed)} icon="checkmark-done-outline" />
          </StatGrid>

          <Segmented
            options={[
              { value: 'approved', label: `Awaiting payout (${data.approvedTickets.length})` },
              { value: 'disbursed', label: `Paid (${data.disbursedTickets.length})` },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tickets && tickets.length > 0 ? (
            <View style={styles.list}>
              {tickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="wallet-outline"
              title={tab === 'approved' ? 'Nothing awaiting payout' : 'No payouts yet'}
            />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.three,
  },
});
