import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { PromptModal } from '@/components/prompt-modal';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useToast } from '@/components/toast';
import { type Palette, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';
import { useRealtime } from '@/context/session';
import { BillRow } from '@/features/advances/components';
import { useApi } from '@/hooks/use-api';
import { errorMessage } from '@/lib/api';
import { advanceApi } from '@/lib/endpoints';
import { toAmount } from '@/lib/format';
import type { PendingBill } from '@/lib/types';
import { useMoney } from '@/lib/use-money';

// Bills employees uploaded against their advances, waiting for a Manager (of
// that department), the Finance Manager or the CEO. Approving one debits the
// employee's wallet.
export default function BillsScreen() {
  const styles = useThemedStyles(makeStyles);
  const formatMoney = useMoney();
  const toast = useToast();
  const bills = useApi(() => advanceApi.pendingBills().then((r) => r.data), []);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingBill | null>(null);

  useRealtime(['ticket:status-update', 'activity'], () => {
    void bills.reload();
  });

  const removeBill = (billId: string) => {
    bills.setData((current) => current?.filter((bill) => bill.id !== billId));
  };

  const approve = async (bill: PendingBill) => {
    setApproving(bill.id);
    try {
      const { data: advance } = await advanceApi.approveBill(bill.id);
      removeBill(bill.id);
      const left = toAmount(advance.amount) - toAmount(advance.spentAmount);
      toast.show({
        title: 'Bill approved',
        message:
          left >= 0
            ? `${formatMoney(left)} left on "${advance.purpose}".`
            : `"${advance.purpose}" is now overspent by ${formatMoney(-left)}.`,
      });
    } catch (err) {
      toast.show({ type: 'error', title: "Couldn't approve", message: errorMessage(err) });
    } finally {
      setApproving(null);
    }
  };

  const list = bills.data ?? [];

  return (
    <Screen title="Bills to review" backFallback="/home" refreshing={bills.isRefreshing} onRefresh={bills.refresh}>
      {bills.isLoading && !bills.data ? <LoadingState /> : null}
      {bills.error && !bills.data ? <ErrorState message={bills.error} onRetry={bills.reload} /> : null}
      {bills.data && list.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="All caught up" message="No bills are waiting for review." />
      ) : null}

      {list.map((bill) => {
        const spent = toAmount(bill.ticket.spentAmount);
        const total = toAmount(bill.ticket.amount);
        return (
          <Card key={bill.id} style={styles.card}>
            <BillRow bill={bill} />
            <Text style={styles.advance} onPress={() => openAdvance(bill.ticket.id)}>
              {`"${bill.ticket.purpose}" · ${bill.ticket.department.name}\n`}
              {`Advance ${formatMoney(total)} · ${formatMoney(spent)} approved so far`}
              {spent + toAmount(bill.amount) > total ? ' · this bill goes over the advance' : ''}
            </Text>
            <View style={styles.actions}>
              <PrimaryButton
                label="Reject"
                variant="secondary"
                compact
                disabled={approving !== null}
                onPress={() => setRejecting(bill)}
                style={styles.action}
              />
              <PrimaryButton
                label="Approve"
                compact
                loading={approving === bill.id}
                disabled={approving !== null && approving !== bill.id}
                onPress={() => void approve(bill)}
                style={styles.action}
              />
            </View>
            <PrimaryButton
              label="View advance"
              icon="open-outline"
              variant="secondary"
              compact
              onPress={() => openAdvance(bill.ticket.id)}
            />
          </Card>
        );
      })}

      <PromptModal
        visible={rejecting !== null}
        title="Reject bill"
        message="The employee will see your reason. A rejected bill doesn't reduce their wallet."
        fields={[{ key: 'reason', label: 'Reason', placeholder: 'Why is this bill being rejected?', multiline: true }]}
        confirmLabel="Reject"
        destructive
        onClose={() => setRejecting(null)}
        onSubmit={async ({ reason }) => {
          if (!rejecting) return;
          await advanceApi.rejectBill(rejecting.id, reason);
          removeBill(rejecting.id);
          toast.show({ title: 'Bill rejected', message: 'The employee has been notified.' });
        }}
      />
    </Screen>
  );
}

function openAdvance(ticketId: string) {
  router.push({ pathname: '/ticket/[id]', params: { id: ticketId } });
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.two,
    },
    advance: {
      ...typography.footnote,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.three,
    },
    action: {
      flex: 1,
    },
  });
