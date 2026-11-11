import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, ListRow } from '@/components/card';
import { ProgressBar } from '@/components/stat-tile';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, spacing, statusColors, typography } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { BILL_STATUS } from '@/features/dashboard/receipt-claims';
import { useApi } from '@/hooks/use-api';
import { advanceApi } from '@/lib/endpoints';
import { formatDate, toAmount } from '@/lib/format';
import { can } from '@/lib/permissions';
import type { Money, TicketBill } from '@/lib/types';
import { useMoney } from '@/lib/use-money';

// How much of an advance has been backed by approved bills, and what is left
// (or overspent). Once settled, how the difference was closed.
export function AdvanceSummary({
  amount,
  spent,
  settlementBalance,
}: {
  amount: Money;
  spent: Money;
  // Set once settled: + returned by the employee, - paid to them.
  settlementBalance?: Money | null;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const formatMoney = useMoney();
  const total = toAmount(amount);
  const used = toAmount(spent);
  const remaining = total - used;
  const settled = settlementBalance !== undefined && settlementBalance !== null;
  const balance = toAmount(settlementBalance);

  return (
    <View style={styles.summary}>
      <View style={styles.summaryRow}>
        <SummaryFigure label="Advance" value={formatMoney(total)} />
        <SummaryFigure label="Spent" value={formatMoney(used)} />
        <SummaryFigure
          label={remaining < 0 ? 'Overspent' : settled ? 'Unspent' : 'Left'}
          value={formatMoney(Math.abs(remaining))}
          tint={remaining < 0 ? colors.danger : undefined}
        />
      </View>
      <ProgressBar value={used} max={total} />
      {settled ? (
        <Text style={styles.summaryNote}>
          {balance > 0
            ? `Settled · ${formatMoney(balance)} returned to finance`
            : balance < 0
              ? `Settled · finance paid ${formatMoney(-balance)} overspend`
              : 'Settled · fully spent'}
        </Text>
      ) : remaining < 0 ? (
        <Text style={[styles.summaryNote, { color: colors.danger }]}>
          {`${formatMoney(-remaining)} over the advance - collect it from finance at settlement.`}
        </Text>
      ) : null}
    </View>
  );
}

function SummaryFigure({ label, value, tint }: { label: string; value: string; tint?: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={[styles.figureValue, tint ? { color: tint } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

type BillRowBill = Pick<
  TicketBill,
  'id' | 'amount' | 'status' | 'vendorName' | 'category' | 'invoiceDate' | 'rejectionReason' | 'createdAt'
>;

// One bill on an advance; `children` holds review actions when the viewer can act,
// and `footer` extra content under them (e.g. the receipt).
export function BillRow({
  bill,
  subtitle,
  children,
  footer,
}: {
  bill: BillRowBill;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const formatMoney = useMoney();
  const status = BILL_STATUS[bill.status];
  const meta = subtitle ?? [bill.category, formatDate(bill.invoiceDate ?? bill.createdAt)].filter(Boolean).join(' · ');

  return (
    <View style={styles.bill}>
      <View style={styles.billTop}>
        <View style={[styles.billIcon, { backgroundColor: iconBadge(colors.primary) }]}>
          <Ionicons name="receipt-outline" size={16} color={colors.primary} />
        </View>
        <View style={styles.billBody}>
          <Text style={styles.billVendor} numberOfLines={1}>
            {bill.vendorName || 'Bill'}
          </Text>
          {meta ? (
            <Text style={styles.billMeta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        <View style={styles.billRight}>
          <Text style={styles.billAmount}>{formatMoney(bill.amount)}</Text>
          <View style={[styles.pill, { backgroundColor: status.background }]}>
            <Text style={[styles.pillText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>
      </View>
      {bill.status === 'REJECTED' && bill.rejectionReason ? (
        <Text style={styles.billReason}>Reason: {bill.rejectionReason}</Text>
      ) : null}
      {children ? <View style={styles.billActions}>{children}</View> : null}
      {footer}
    </View>
  );
}

// Dashboard shortcuts to the bill review queue and the advances finance must
// settle, for the roles that can open them. Counts refresh live.
export function AdvanceShortcuts() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const user = useCurrentUser();
  const showBills = can.reviewBills(user.role);
  const showAdvances = can.viewOutstandingAdvances(user.role);

  const bills = useApi(() => (showBills ? advanceApi.pendingBills().then((r) => r.data) : Promise.resolve([])), [showBills]);
  const advances = useApi(
    () => (showAdvances ? advanceApi.outstanding().then((r) => r.data) : Promise.resolve([])),
    [showAdvances],
  );

  useRealtime(['ticket:status-update', 'activity'], () => {
    void bills.reload();
    void advances.reload();
  });

  if (!showBills && !showAdvances) return null;
  const toSettle = advances.data?.filter((advance) => advance.status === 'SETTLEMENT_PENDING').length ?? 0;

  return (
    <Card style={styles.shortcuts}>
      {showBills ? (
        <ListRow
          icon="receipt-outline"
          tint={statusColors.PENDING.text}
          title="Bills to review"
          subtitle="Bills employees uploaded against their advances"
          meta={bills.data ? String(bills.data.length) : undefined}
          onPress={() => router.push('/bills')}
        />
      ) : null}
      {showAdvances ? (
        <ListRow
          icon="swap-horizontal-outline"
          tint={colors.accents.teal}
          title="Outstanding advances"
          subtitle={
            advances.data
              ? `${advances.data.length} with cash out · ${toSettle} ready to settle`
              : 'Cash handed out and not yet settled'
          }
          onPress={() => router.push('/advances')}
        />
      ) : null}
    </Card>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    summary: {
      gap: spacing.three,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: spacing.three,
    },
    summaryNote: {
      ...typography.footnote,
      color: colors.textSecondary,
    },
    figure: {
      flex: 1,
      gap: 2,
    },
    figureLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    figureValue: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    bill: {
      gap: spacing.two,
      paddingVertical: spacing.two,
    },
    billTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
    },
    billIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    billBody: {
      flex: 1,
      gap: 2,
    },
    billVendor: {
      ...typography.calloutStrong,
      color: colors.textPrimary,
    },
    billMeta: {
      ...typography.footnote,
      color: colors.textMuted,
    },
    billRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    billAmount: {
      ...typography.calloutStrong,
      color: colors.textPrimary,
    },
    billReason: {
      ...typography.footnote,
      color: statusColors.REJECTED.text,
    },
    billActions: {
      flexDirection: 'row',
      gap: spacing.two,
    },
    pill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    pillText: {
      ...typography.captionStrong,
    },
    shortcuts: {
      gap: 0,
      paddingVertical: spacing.one,
    },
  });
