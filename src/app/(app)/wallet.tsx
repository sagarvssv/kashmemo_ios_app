import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Divider } from '@/components/card';
import { Segmented } from '@/components/chip-group';
import { PressableScale } from '@/components/motion';
import { Screen } from '@/components/screen';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { TicketRow } from '@/components/ticket-row';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, spacing, typography } from '@/constants/theme';
import { useRealtime } from '@/context/session';
import { AdvanceSummary } from '@/features/advances/components';
import { useApi } from '@/hooks/use-api';
import { ticketApi } from '@/lib/endpoints';
import { formatDateTime, toAmount } from '@/lib/format';
import type { WalletTxnType } from '@/lib/types';
import { useMoney } from '@/lib/use-money';

type Tab = 'advances' | 'collect' | 'history';

const TXN_LABELS: Record<WalletTxnType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  ADVANCE_CREDIT: { label: 'Cash collected', icon: 'arrow-down-circle-outline' },
  BILL_DEBIT: { label: 'Bill approved', icon: 'receipt-outline' },
  CASH_RETURNED: { label: 'Cash returned to finance', icon: 'arrow-up-circle-outline' },
  OVERSPEND_PAID: { label: 'Overspend paid to you', icon: 'cash-outline' },
};

// The wallet holds cash collected for advances. Approved bills come off it;
// settlement with finance brings each advance back to zero.
export default function WalletScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const formatMoney = useMoney();
  const [tab, setTab] = useState<Tab>('advances');
  const wallet = useApi(() => ticketApi.wallet().then((r) => r.data), []);

  useRealtime(['ticket:status-update', 'activity'], () => {
    void wallet.reload();
  });

  const data = wallet.data;
  const awaitingAmount = (data?.awaitingCollection ?? []).reduce((sum, ticket) => sum + toAmount(ticket.amount), 0);

  return (
    <Screen title="My wallet" backFallback="/profile" refreshing={wallet.isRefreshing} onRefresh={wallet.refresh}>
      {wallet.isLoading && !data ? <LoadingState variant="dashboard" /> : null}
      {wallet.error && !data ? <ErrorState message={wallet.error} onRetry={wallet.reload} /> : null}

      {data && (
        <>
          <StatGrid>
            <StatTile label="Cash in hand" value={formatMoney(data.cashInHand)} icon="wallet-outline" tone="highlight" />
            <StatTile
              label="Overspent · finance owes you"
              value={formatMoney(data.overspent)}
              icon="alert-circle-outline"
              tint={data.overspent > 0 ? colors.danger : colors.accents.slate}
            />
            <StatTile
              label="Approved · collect from finance"
              value={formatMoney(awaitingAmount)}
              icon="time-outline"
              tint={colors.accents.amber}
            />
          </StatGrid>

          <Segmented
            options={[
              { value: 'advances', label: `Advances (${data.openAdvances.length})` },
              { value: 'collect', label: `To collect (${data.awaitingCollection.length})` },
              { value: 'history', label: 'History' },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'advances' &&
            (data.openAdvances.length > 0 ? (
              <View style={styles.list}>
                {data.openAdvances.map((advance) => {
                  const pendingBills = advance.bills.filter((bill) => bill.status === 'PENDING').length;
                  return (
                    <PressableScale
                      key={advance.id}
                      onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: advance.id } })}>
                      <Card style={styles.advance}>
                        <View style={styles.advanceHead}>
                          <Text style={styles.advanceTitle} numberOfLines={2}>
                            {advance.purpose}
                          </Text>
                          <StatusBadge status={advance.status} />
                        </View>
                        <AdvanceSummary amount={advance.amount} spent={advance.spentAmount} />
                        <Text style={styles.meta}>
                          {[
                            `${advance.bills.length} bill${advance.bills.length === 1 ? '' : 's'}`,
                            pendingBills ? `${pendingBills} waiting for approval` : null,
                            advance.status === 'DISBURSED' ? 'Tap to add bills or finish' : 'With finance for settlement',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </Card>
                    </PressableScale>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                icon="wallet-outline"
                title="No open advances"
                message="Request the amount you need. Once finance hands it over, it shows up here."
              />
            ))}

          {tab === 'collect' &&
            (data.awaitingCollection.length > 0 ? (
              <View style={styles.list}>
                {data.awaitingCollection.map((ticket, index) => (
                  <TicketRow key={ticket.id} ticket={ticket} index={index} />
                ))}
              </View>
            ) : (
              <EmptyState icon="time-outline" title="Nothing to collect" />
            ))}

          {tab === 'history' &&
            (data.transactions.length > 0 ? (
              <Card style={styles.history}>
                {data.transactions.map((txn, index) => {
                  const amount = toAmount(txn.amount);
                  const info = TXN_LABELS[txn.type];
                  const tint = amount >= 0 ? colors.accents.green : colors.textSecondary;
                  return (
                    <React.Fragment key={txn.id}>
                      {index > 0 ? <Divider /> : null}
                      <PressableScale
                        onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: txn.ticketId } })}
                        style={styles.txn}>
                        <View style={[styles.txnIcon, { backgroundColor: iconBadge(tint) }]}>
                          <Ionicons name={info.icon} size={16} color={tint} />
                        </View>
                        <View style={styles.txnBody}>
                          <Text style={styles.txnLabel}>{info.label}</Text>
                          <Text style={styles.meta}>{formatDateTime(txn.createdAt)}</Text>
                        </View>
                        <Text style={[styles.txnAmount, { color: tint }]}>
                          {amount >= 0 ? '+' : '−'}
                          {formatMoney(Math.abs(amount))}
                        </Text>
                      </PressableScale>
                    </React.Fragment>
                  );
                })}
              </Card>
            ) : (
              <EmptyState icon="list-outline" title="No wallet activity yet" />
            ))}
        </>
      )}
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    list: {
      gap: spacing.three,
    },
    advance: {
      gap: spacing.three,
    },
    advanceHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.three,
    },
    advanceTitle: {
      flex: 1,
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.footnote,
      color: colors.textMuted,
    },
    history: {
      gap: 0,
      paddingVertical: spacing.one,
    },
    txn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.two,
    },
    txnIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    txnBody: {
      flex: 1,
      gap: 2,
    },
    txnLabel: {
      ...typography.calloutStrong,
      color: colors.textPrimary,
    },
    txnAmount: {
      ...typography.calloutStrong,
    },
  });
