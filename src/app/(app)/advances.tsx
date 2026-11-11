import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Segmented } from '@/components/chip-group';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/components/toast';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { spacing, statusColors, typography } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { AdvanceSummary } from '@/features/advances/components';
import { useApi } from '@/hooks/use-api';
import { errorMessage } from '@/lib/api';
import { advanceApi } from '@/lib/endpoints';
import { formatDate } from '@/lib/format';
import { canSettleAdvance } from '@/lib/permissions';
import type { OutstandingAdvance } from '@/lib/types';
import { useMoney } from '@/lib/use-money';

type Tab = 'settle' | 'all';

// Advances whose cash is out: still being spent, or waiting for the Finance
// Manager to settle the difference with the employee.
export default function AdvancesScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const formatMoney = useMoney();
  const user = useCurrentUser();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('settle');
  const [settling, setSettling] = useState<string | null>(null);
  const advances = useApi(() => advanceApi.outstanding().then((r) => r.data), []);

  useRealtime(['ticket:status-update', 'activity'], () => {
    void advances.reload();
  });

  const all = advances.data ?? [];
  const ready = all.filter((advance) => advance.status === 'SETTLEMENT_PENDING');
  const list = tab === 'settle' ? ready : all;
  const toCollect = all.reduce((sum, advance) => sum + advance.toReturn, 0);
  const toPay = all.reduce((sum, advance) => sum + advance.toPay, 0);

  const settle = (advance: OutstandingAdvance) => {
    const name = advance.employee?.name ?? 'the employee';
    const message =
      advance.toReturn > 0
        ? `Confirm you received ${formatMoney(advance.toReturn)} unspent cash from ${name}.`
        : advance.toPay > 0
          ? `Confirm you paid ${name} ${formatMoney(advance.toPay)} for the overspend.`
          : `"${advance.purpose}" is fully spent. Close it?`;
    Alert.alert('Settle advance', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Settle',
        onPress: async () => {
          setSettling(advance.id);
          try {
            await advanceApi.settle(advance.id);
            advances.setData((current) => current?.filter((item) => item.id !== advance.id));
            toast.show({ title: 'Advance settled', message: `"${advance.purpose}" is closed.` });
          } catch (err) {
            toast.show({ type: 'error', title: "Couldn't settle", message: errorMessage(err) });
          } finally {
            setSettling(null);
          }
        },
      },
    ]);
  };

  return (
    <Screen
      title="Outstanding advances"
      backFallback="/home"
      refreshing={advances.isRefreshing}
      onRefresh={advances.refresh}>
      {advances.isLoading && !advances.data ? <LoadingState variant="cards" /> : null}
      {advances.error && !advances.data ? <ErrorState message={advances.error} onRetry={advances.reload} /> : null}

      {advances.data ? (
        <>
          <StatGrid>
            <StatTile label="To collect back" value={formatMoney(toCollect)} icon="arrow-down-circle-outline" tone="highlight" />
            <StatTile label="To pay out" value={formatMoney(toPay)} icon="arrow-up-circle-outline" tint={colors.danger} />
          </StatGrid>

          <Segmented
            options={[
              { value: 'settle', label: `Ready to settle (${ready.length})` },
              { value: 'all', label: `All open (${all.length})` },
            ]}
            value={tab}
            onChange={setTab}
          />

          {list.length === 0 ? (
            <EmptyState
              icon="swap-horizontal-outline"
              title={tab === 'settle' ? 'Nothing to settle' : 'No open advances'}
              message={tab === 'settle' ? 'Employees send an advance here when they finish spending it.' : undefined}
            />
          ) : null}

          {list.map((advance) => {
            const canSettle = canSettleAdvance({
              myRole: user.role,
              myId: user.userId,
              raisedBy: advance.raisedBy,
              raiserRole: advance.employee?.role,
              status: advance.status,
            });
            return (
              <Card key={advance.id} style={styles.card}>
                <Pressable
                  onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: advance.id } })}
                  accessibilityRole="button"
                  style={styles.head}>
                  <View style={styles.headText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {advance.employee?.name ?? 'Employee'}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[advance.purpose, advance.department.name, `Collected ${formatDate(advance.disbursedAt)}`].join(' · ')}
                    </Text>
                  </View>
                  <StatusBadge status={advance.status} />
                </Pressable>
                <AdvanceSummary amount={advance.amount} spent={advance.spentAmount} />
                <Text style={[styles.outcome, advance.toPay > 0 && { color: colors.danger }]}>
                  {advance.toReturn > 0
                    ? `Employee returns ${formatMoney(advance.toReturn)}`
                    : advance.toPay > 0
                      ? `Pay employee ${formatMoney(advance.toPay)}`
                      : 'Fully spent - nothing to exchange'}
                </Text>
                {advance.pendingBills > 0 ? (
                  <Text style={styles.warning}>
                    {advance.pendingBills} bill{advance.pendingBills === 1 ? '' : 's'} still waiting for approval
                  </Text>
                ) : null}
                {canSettle ? (
                  <PrimaryButton
                    label="Settle"
                    icon="checkmark-done-outline"
                    compact
                    loading={settling === advance.id}
                    disabled={advance.pendingBills > 0 || (settling !== null && settling !== advance.id)}
                    onPress={() => settle(advance)}
                  />
                ) : null}
              </Card>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.three,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
    },
    headText: {
      flex: 1,
      gap: 2,
    },
    name: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.footnote,
      color: colors.textMuted,
    },
    outcome: {
      ...typography.calloutStrong,
      color: colors.textPrimary,
    },
    warning: {
      ...typography.footnote,
      color: statusColors.PENDING.text,
    },
  });
