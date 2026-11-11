import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Card, Divider, IdValue, KeyValue, ListRow, Section } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { PromptModal } from '@/components/prompt-modal';
import { ReceiptFileViewer } from '@/components/receipt-file-viewer';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/components/toast';
import { type Palette, useBrand, useThemedStyles } from '@/constants/brand';
import { spacing, statusColors, typography } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { AddBillSheet } from '@/features/advances/add-bill-sheet';
import { BillReceipt } from '@/features/advances/bill-receipt';
import { AdvanceSummary, BillRow } from '@/features/advances/components';
import { useApi } from '@/hooks/use-api';
import { errorMessage } from '@/lib/api';
import { advanceApi, employeeApi, ticketApi } from '@/lib/endpoints';
import { formatDate, formatDateTime, ROLE_LABELS, shortId, ticketRef } from '@/lib/format';
import { getInvoice } from '@/lib/invoices';
import { can, canActOnTicket, canSettleAdvance, settlerLabelFor } from '@/lib/permissions';
import type { EmployeeDetails, Ticket, TicketStatus } from '@/lib/types';
import { useMoney } from '@/lib/use-money';

type Sheet = 'reject' | 'disburse' | 'addBill' | null;

// Statuses where an advance's cash is out and it has bills and a wallet balance.
const ADVANCE_SPENDING_STATUSES: TicketStatus[] = ['DISBURSED', 'SETTLEMENT_PENDING', 'SETTLED'];

export default function TicketDetailScreen() {
  const styles = useThemedStyles(makeStyles);
  const formatMoney = useMoney();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const toast = useToast();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [billToReject, setBillToReject] = useState<string | null>(null);
  const [reviewingBill, setReviewingBill] = useState<string | null>(null);
  const [removingBill, setRemovingBill] = useState<string | null>(null);
  // The bill whose uploaded receipt is shown.
  const [viewingBill, setViewingBill] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const ticket = useApi(() => ticketApi.byId(id).then((r) => r.data), [id]);
  // Receipt tickets: the scanned bill they were created from, for approvers to check.
  const receiptInvoiceId = ticket.data?.source === 'RECEIPT' ? ticket.data.invoiceId : null;
  const receipt = useApi(
    () => (receiptInvoiceId ? getInvoice(receiptInvoiceId) : Promise.resolve(null)),
    [receiptInvoiceId],
  );
  const raiserId = ticket.data?.raisedBy;
  const raiser = useApi<EmployeeDetails | null>(
    () => (raiserId ? employeeApi.details(raiserId).then((r) => r.data) : Promise.resolve(null)),
    [raiserId],
  );

  // Advances (MANUAL tickets) whose cash is out: their bills and wallet balance.
  const isAdvance = ticket.data ? ticket.data.source !== 'RECEIPT' : false;
  const showAdvance = isAdvance && ADVANCE_SPENDING_STATUSES.includes(ticket.data?.status ?? 'PENDING');
  const advance = useApi(
    () => (showAdvance ? advanceApi.details(id, user.role).then((r) => r.data) : Promise.resolve(null)),
    [id, showAdvance, user.role],
  );

  useRealtime(['ticket:status-update'], (payload) => {
    const updated = (payload as { ticket?: Ticket } | undefined)?.ticket;
    if (updated?.id === id) {
      void ticket.reload();
      void advance.reload();
    }
  });

  if (ticket.isLoading && !ticket.data) {
    return (
      <Screen title="Ticket" backFallback="/tickets">
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (!ticket.data) {
    return (
      <Screen title="Ticket" backFallback="/tickets">
        <ErrorState message={ticket.error ?? 'Ticket not found.'} onRetry={ticket.reload} />
      </Screen>
    );
  }

  const data = ticket.data;
  const isMine = data.raisedBy === user.userId;
  const actions = canActOnTicket({
    myRole: user.role,
    myId: user.userId,
    raisedBy: data.raisedBy,
    raiserRole: raiser.data?.role,
    status: data.status,
  });
  const canDisburse = can.disburse(user.role) && data.status === 'APPROVED';
  const advanceData = advance.data;
  const pendingBills = advanceData?.bills.filter((bill) => bill.status === 'PENDING').length ?? 0;
  const canSpend = isMine && isAdvance && data.status === 'DISBURSED';
  const canSettle =
    isAdvance &&
    canSettleAdvance({
      myRole: user.role,
      myId: user.userId,
      raisedBy: data.raisedBy,
      raiserRole: raiser.data?.role,
      status: data.status,
    });
  // Who settles this advance: the CEO for a Finance Manager's own advance, otherwise finance.
  // While the raiser is loading, fall back to the viewer's own role when it's their advance.
  const raiserRole = raiser.data?.role ?? (isMine ? user.role : 'EMPLOYEE');
  const settler = settlerLabelFor(raiserRole);
  const Settler = settler.charAt(0).toUpperCase() + settler.slice(1);
  const canReviewBills =
    can.reviewBills(user.role) && !isMine && (data.status === 'DISBURSED' || data.status === 'SETTLEMENT_PENDING');

  const applyUpdate = (updated: Ticket) => {
    ticket.setData((current) => (current ? { ...current, ...updated } : updated));
  };

  const reloadAdvance = async () => {
    await Promise.all([ticket.reload(), advance.reload()]);
  };

  const approveBill = async (billId: string) => {
    setReviewingBill(billId);
    try {
      await advanceApi.approveBill(billId);
      toast.show({ title: 'Bill approved', message: "It has been deducted from the employee's wallet." });
      await reloadAdvance();
    } catch (err) {
      toast.show({ type: 'error', title: "Couldn't approve", message: errorMessage(err) });
    } finally {
      setReviewingBill(null);
    }
  };

  const removeBill = (billId: string) => {
    Alert.alert('Remove bill?', 'This bill will be taken off the advance. You can add the same receipt again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRemovingBill(billId);
          try {
            await advanceApi.removeBill(data.id, billId);
            toast.show({ title: 'Bill removed', message: 'The receipt is free to submit again.' });
            await reloadAdvance();
          } catch (err) {
            toast.show({ type: 'error', title: "Couldn't remove", message: errorMessage(err) });
          } finally {
            setRemovingBill(null);
          }
        },
      },
    ]);
  };

  const finishSpending = () => {
    const balance = advanceData?.balance ?? 0;
    Alert.alert(
      'Done spending?',
      balance > 0
        ? `You'll return ${formatMoney(balance)} unspent cash to ${settler}. You can't add bills after this.`
        : balance < 0
          ? `${Settler} will pay you ${formatMoney(-balance)} for the overspend. You can't add bills after this.`
          : `${Settler} will close this advance. You can't add bills after this.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send for settlement',
          onPress: async () => {
            setIsFinishing(true);
            try {
              const { data: result } = await advanceApi.submitSettlement(data.id);
              applyUpdate(result.ticket);
              toast.show({ title: 'Sent for settlement', message: `${Settler} has been notified.` });
            } catch (err) {
              toast.show({ type: 'error', title: "Couldn't send", message: errorMessage(err) });
            } finally {
              setIsFinishing(false);
            }
          },
        },
      ],
    );
  };

  const settle = () => {
    const balance = advanceData?.balance ?? 0;
    const name = raiser.data?.name ?? 'the employee';
    Alert.alert(
      'Settle advance',
      balance > 0
        ? `Confirm you received ${formatMoney(balance)} unspent cash from ${name}.`
        : balance < 0
          ? `Confirm you paid ${name} ${formatMoney(-balance)} for the overspend.`
          : 'This advance is fully spent. Close it?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          onPress: async () => {
            setIsSettling(true);
            try {
              const { data: updated } = await advanceApi.settle(data.id);
              applyUpdate(updated);
              void advance.reload();
              toast.show({ title: 'Advance settled', message: 'The employee has been notified.' });
            } catch (err) {
              toast.show({ type: 'error', title: "Couldn't settle", message: errorMessage(err) });
            } finally {
              setIsSettling(false);
            }
          },
        },
      ],
    );
  };

  const handleApprove = async () => {
    setIsApproving(true);
    setActionError(null);
    try {
      const { data: updated } = await ticketApi.approve(data.id);
      applyUpdate(updated);
      toast.show(
        updated.status === 'PARTIALLY_APPROVED'
          ? {
              title: 'Approved — one more sign-off needed',
              message: 'This amount also needs approval from the other approver.',
            }
          : {
              title: 'Ticket approved',
              message: isAdvance
                ? `${formatMoney(updated.amount)} is ready to collect from finance.`
                : `${formatMoney(updated.amount)} is ready to be paid out.`,
            },
      );
    } catch (err) {
      setActionError(errorMessage(err));
      toast.show({ type: 'error', title: "Couldn't approve", message: errorMessage(err) });
    } finally {
      setIsApproving(false);
    }
  };

  const hasActions = actions.approve || actions.reject || canDisburse || canSpend || canSettle;

  return (
    <Screen
      title={`Ticket ${ticketRef(data.id)}`}
      subtitle={data.department?.name}
      backFallback="/tickets"
      refreshing={ticket.isRefreshing}
      onRefresh={ticket.refresh}
      footer={
        hasActions ? (
          <View style={styles.footer}>
            {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
            <View style={styles.actions}>
              {actions.reject && (
                <PrimaryButton
                  label="Reject"
                  variant="secondary"
                  onPress={() => setSheet('reject')}
                  style={styles.action}
                />
              )}
              {actions.approve && (
                <PrimaryButton label="Approve" onPress={handleApprove} loading={isApproving} style={styles.action} />
              )}
              {canDisburse && (
                <PrimaryButton
                  label={isAdvance ? 'Hand over cash' : 'Mark as paid'}
                  icon="cash-outline"
                  onPress={() => setSheet('disburse')}
                  style={styles.action}
                />
              )}
              {canSpend && (
                <>
                  <PrimaryButton
                    label="Done spending"
                    variant="secondary"
                    loading={isFinishing}
                    disabled={!advanceData}
                    onPress={finishSpending}
                    style={styles.action}
                  />
                  <PrimaryButton
                    label="Add bill"
                    icon="receipt-outline"
                    onPress={() => setSheet('addBill')}
                    style={styles.action}
                  />
                </>
              )}
              {canSettle && (
                <PrimaryButton
                  label={pendingBills ? `${pendingBills} bill${pendingBills === 1 ? '' : 's'} to review first` : 'Settle'}
                  icon="checkmark-done-outline"
                  loading={isSettling}
                  disabled={!advanceData || pendingBills > 0}
                  onPress={settle}
                  style={styles.action}
                />
              )}
            </View>
          </View>
        ) : undefined
      }>
      <Card>
        <Text style={styles.amount}>{formatMoney(data.amount)}</Text>
        <Text style={styles.purpose}>{data.purpose}</Text>
        <StatusBadge status={data.status} />
        {data.status === 'PARTIALLY_APPROVED' && (
          <Text style={styles.note}>
            Amounts above the manager&apos;s approval limit need sign-off from both a Manager and the CEO.
          </Text>
        )}
        {data.status === 'REJECTED' && data.rejectionReason ? (
          <View style={styles.rejection}>
            <Text style={styles.rejectionLabel}>Reason for rejection</Text>
            <Text style={styles.rejectionText}>{data.rejectionReason}</Text>
          </View>
        ) : null}
      </Card>

      {data.source === 'RECEIPT' ? (
        <Section title="Receipt">
          <Card>
            {isMine && data.status === 'APPROVED' ? (
              <View style={styles.collect}>
                <Text style={styles.collectText}>Your bill was approved. Please collect your cash from finance.</Text>
              </View>
            ) : null}
            {receipt.data ? <ReceiptFileViewer invoice={receipt.data} /> : null}
            {receipt.error && !receipt.data ? <Text style={styles.receiptError}>{receipt.error}</Text> : null}
            <KeyValue icon="storefront-outline" label="Vendor" value={data.vendorName ?? '—'} />
            <Divider />
            <KeyValue icon="pricetag-outline" label="Invoice number" value={data.invoiceNumber ?? '—'} />
            <Divider />
            <KeyValue
              icon="calendar-outline"
              label="Invoice date"
              value={data.invoiceDate ? formatDate(data.invoiceDate) : '—'}
            />
            {data.category ? (
              <>
                <Divider />
                <KeyValue icon="sparkles-outline" label="Category" value={data.category} />
              </>
            ) : null}
          </Card>
        </Section>
      ) : null}

      {showAdvance ? (
        <>
          <Section title="Spending">
            <Card>
              {advanceData ? (
                <>
                  <AdvanceSummary
                    amount={advanceData.amount}
                    spent={advanceData.spentAmount ?? 0}
                    settlementBalance={data.status === 'SETTLED' ? advanceData.settlementBalanceAmount : undefined}
                  />
                  <AdvanceNote
                    status={data.status}
                    isMine={isMine}
                    balance={advanceData.balance}
                    settler={settler}
                    canSettle={canSettle}
                  />
                </>
              ) : advance.error ? (
                <Text style={styles.receiptError}>{advance.error}</Text>
              ) : (
                <LoadingState padded />
              )}
            </Card>
          </Section>

          {advanceData ? (
            <Section title={`Bills (${advanceData.bills.length})`}>
              <Card style={styles.bills}>
                {advanceData.bills.length === 0 ? (
                  <Text style={styles.note}>
                    {canSpend ? 'No bills yet. Add a bill for each purchase you make.' : 'No bills yet.'}
                  </Text>
                ) : null}
                {advanceData.bills.map((bill, index) => (
                  <React.Fragment key={bill.id}>
                    {index > 0 ? <Divider /> : null}
                    <BillRow
                      bill={bill}
                      footer={viewingBill === bill.id ? <BillReceipt invoiceId={bill.invoiceId} /> : null}>
                      <PrimaryButton
                        label={viewingBill === bill.id ? 'Hide bill' : 'View bill'}
                        variant="secondary"
                        icon={viewingBill === bill.id ? 'eye-off-outline' : 'eye-outline'}
                        compact
                        onPress={() => setViewingBill((current) => (current === bill.id ? null : bill.id))}
                        style={styles.action}
                      />
                      {canReviewBills && bill.status === 'PENDING' ? (
                        <>
                          <PrimaryButton
                            label="Reject"
                            variant="secondary"
                            compact
                            disabled={reviewingBill !== null}
                            onPress={() => setBillToReject(bill.id)}
                            style={styles.action}
                          />
                          <PrimaryButton
                            label="Approve"
                            compact
                            loading={reviewingBill === bill.id}
                            disabled={reviewingBill !== null && reviewingBill !== bill.id}
                            onPress={() => void approveBill(bill.id)}
                            style={styles.action}
                          />
                        </>
                      ) : null}
                      {canSpend && (bill.status === 'PENDING' || bill.status === 'REJECTED') ? (
                        <PrimaryButton
                          label="Remove"
                          variant="secondary"
                          icon="trash-outline"
                          compact
                          loading={removingBill === bill.id}
                          disabled={removingBill !== null && removingBill !== bill.id}
                          onPress={() => removeBill(bill.id)}
                          style={styles.action}
                        />
                      ) : null}
                    </BillRow>
                  </React.Fragment>
                ))}
              </Card>
            </Section>
          ) : null}
        </>
      ) : null}

      <Section title="Details">
        <Card>
          <KeyValue icon="pricetag-outline" label="Ticket ID" value={<IdValue id={data.id} />} />
          <Divider />
          <KeyValue icon="calendar-outline" label="Raised on" value={formatDateTime(data.createdAt)} />
          {data.source !== 'RECEIPT' && data.category ? (
            <>
              <Divider />
              <KeyValue icon="sparkles-outline" label="Category" value={data.category} />
            </>
          ) : null}
        </Card>
      </Section>

      <Section title="Raised by · Department">
        <Card style={styles.rows}>
          <ListRow
            icon="person-outline"
            title={isMine ? 'You' : (raiser.data?.name ?? '—')}
            subtitle={[raiser.data ? ROLE_LABELS[raiser.data.role] : null, shortId(data.raisedBy)]
              .filter(Boolean)
              .join(' · ')}
            onPress={
              can.viewPeople(user.role) && !isMine
                ? () => router.push({ pathname: '/employee/[id]', params: { id: data.raisedBy } })
                : undefined
            }
          />
          <Divider />
          <ListRow
            icon="business-outline"
            title={data.department?.name ?? '—'}
            subtitle={shortId(data.departmentId)}
            onPress={
              can.viewDepartments(user.role)
                ? () => router.push({ pathname: '/department/[id]', params: { id: data.departmentId } })
                : undefined
            }
          />
        </Card>
      </Section>

      <Section title="Timeline">
        <Card>
          <TimelineStep label="Raised" date={data.createdAt} done />
          {(data.managerApprovedAt || data.ceoApprovedAt) && data.status !== 'REJECTED' ? (
            <>
              {data.managerApprovedAt && (
                <TimelineStep label="Approved by manager" date={data.managerApprovedAt} done />
              )}
              {data.ceoApprovedAt && <TimelineStep label="Approved by CEO" date={data.ceoApprovedAt} done />}
            </>
          ) : null}
          {data.status === 'REJECTED' ? (
            <TimelineStep label="Rejected" date={data.approvedAt} done danger />
          ) : (
            <TimelineStep label="Approved" date={data.approvedAt} done={Boolean(data.approvedAt)} />
          )}
          {data.status !== 'REJECTED' && (
            <TimelineStep
              label={isAdvance ? 'Cash collected' : 'Paid out'}
              date={data.disbursedAt}
              done={Boolean(data.disbursedAt)}
            />
          )}
          {isAdvance && data.status !== 'REJECTED' && (
            <TimelineStep label="Settled" date={data.settledAt} done={data.status === 'SETTLED'} />
          )}
        </Card>
      </Section>

      <PromptModal
        visible={sheet === 'reject'}
        title="Reject ticket"
        message="The person who raised this ticket will see your reason."
        fields={[{ key: 'reason', label: 'Reason', placeholder: 'Why is this being rejected?', multiline: true }]}
        confirmLabel="Reject"
        destructive
        onClose={() => setSheet(null)}
        onSubmit={async ({ reason }) => {
          const { data: updated } = await ticketApi.reject(data.id, reason);
          applyUpdate(updated);
          toast.show({ title: 'Ticket rejected', message: 'The person who raised it has been notified.' });
        }}
      />

      <PromptModal
        visible={billToReject !== null}
        title="Reject bill"
        message="The employee will see your reason. A rejected bill doesn't reduce their wallet."
        fields={[{ key: 'reason', label: 'Reason', placeholder: 'Why is this bill being rejected?', multiline: true }]}
        confirmLabel="Reject"
        destructive
        onClose={() => setBillToReject(null)}
        onSubmit={async ({ reason }) => {
          if (!billToReject) return;
          await advanceApi.rejectBill(billToReject, reason);
          toast.show({ title: 'Bill rejected', message: 'The employee has been notified.' });
          await reloadAdvance();
        }}
      />

      {canSpend ? (
        <AddBillSheet
          visible={sheet === 'addBill'}
          advanceId={data.id}
          onClose={() => setSheet(null)}
          onAdded={() => {
            toast.show({ title: 'Bill added', message: 'Waiting for approval from your manager.' });
            void reloadAdvance();
          }}
        />
      ) : null}

      <PromptModal
        visible={sheet === 'disburse'}
        title={isAdvance ? 'Confirm cash handover' : 'Confirm payout'}
        message={
          isAdvance
            ? "Confirm the employee's email or phone number. The cash goes into their wallet until they account for it with bills."
            : "Confirm the recipient's email or phone number. It must match the employee who raised this ticket."
        }
        fields={[
          {
            key: 'email',
            label: 'Recipient email',
            keyboardType: 'email-address',
            initialValue: raiser.data?.email ?? '',
            optional: true,
          },
          {
            key: 'phoneNumber',
            label: 'or phone number',
            keyboardType: 'phone-pad',
            initialValue: raiser.data?.email ? '' : (raiser.data?.phoneNumber ?? ''),
            optional: true,
          },
        ]}
        confirmLabel={isAdvance ? 'Cash handed over' : 'Mark as paid'}
        onClose={() => setSheet(null)}
        onSubmit={async ({ email, phoneNumber }) => {
          if (!email && !phoneNumber) throw new Error('Enter the recipient email or phone number.');
          const { data: updated } = await ticketApi.disburse(data.id, email ? { email } : { phoneNumber });
          applyUpdate(updated);
          toast.show(
            isAdvance
              ? { title: 'Cash handed over', message: `${formatMoney(updated.amount)} added to the employee's wallet.` }
              : { title: 'Marked as paid', message: `${formatMoney(updated.amount)} disbursed. A receipt email is on its way.` },
          );
          void advance.reload();
        }}
      />
    </Screen>
  );
}

// What happens next on an advance, from the viewer's side.
function AdvanceNote({
  status,
  isMine,
  balance,
  settler,
  canSettle,
}: {
  status: TicketStatus;
  isMine: boolean;
  balance: number;
  // 'finance' or 'the CEO' - who settles this advance.
  settler: string;
  canSettle: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const formatMoney = useMoney();
  const Settler = settler.charAt(0).toUpperCase() + settler.slice(1);
  let text: string | null = null;
  if (status === 'DISBURSED') {
    text = isMine
      ? `Add a bill for each purchase. When you are done, tap "Done spending" to settle with ${settler}.`
      : 'The employee is spending this advance and uploading bills.';
  } else if (status === 'SETTLEMENT_PENDING') {
    if (!isMine && !canSettle) {
      text = `Waiting for ${settler} to settle this advance.`;
    } else if (balance > 0) {
      text = isMine
        ? `Return ${formatMoney(balance)} unspent cash to ${settler} to close this advance.`
        : `Collect ${formatMoney(balance)} unspent cash from the employee, then settle.`;
    } else if (balance < 0) {
      text = isMine
        ? `Collect ${formatMoney(-balance)} from ${settler} for your overspend to close this advance.`
        : `Pay the employee ${formatMoney(-balance)} for the overspend, then settle.`;
    } else {
      text = isMine ? `Fully spent. ${Settler} will close this advance.` : 'Fully spent. Settle to close it.';
    }
  }
  return text ? <Text style={styles.note}>{text}</Text> : null;
}

function TimelineStep({
  label,
  date,
  done,
  danger,
}: {
  label: string;
  date: string | null | undefined;
  done: boolean;
  danger?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  return (
    <View style={styles.step}>
      <View
        style={[styles.dot, done && [styles.dotDone, { backgroundColor: brand.primary }], danger && styles.dotDanger]}
      />
      <Text style={[styles.stepLabel, !done && styles.stepPending]}>{label}</Text>
      <Text style={styles.stepDate}>{done ? formatDateTime(date) : 'Pending'}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    collect: {
      padding: spacing.three,
      borderRadius: 12,
      backgroundColor: statusColors.APPROVED.background,
    },
    collectText: {
      ...typography.footnoteStrong,
      color: statusColors.APPROVED.text,
    },
    receiptError: {
      ...typography.footnote,
      color: colors.danger,
    },
    rows: {
      gap: 0,
      paddingVertical: spacing.one,
    },
    bills: {
      gap: 0,
      paddingVertical: spacing.one,
    },
    amount: {
      ...typography.display,
      color: colors.textPrimary,
    },
    purpose: {
      ...typography.body,
      color: colors.textPrimary,
    },
    note: {
      ...typography.footnote,
      color: colors.textMuted,
    },
    rejection: {
      backgroundColor: '#FEE2E2',
      borderRadius: 10,
      padding: spacing.three,
      gap: 4,
    },
    rejectionLabel: {
      ...typography.captionStrong,
      fontWeight: '700',
      color: '#991B1B',
    },
    rejectionText: {
      ...typography.callout,
      color: '#7F1D1D',
    },
    footer: {
      gap: spacing.two,
    },
    actionError: {
      ...typography.footnote,
      color: colors.danger,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.three,
    },
    action: {
      flex: 1,
    },
    step: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.borderLight,
    },
    dotDone: {
      backgroundColor: colors.primary,
    },
    dotDanger: {
      backgroundColor: colors.danger,
    },
    stepLabel: {
      flex: 1,
      ...typography.calloutStrong,
      color: colors.textPrimary,
    },
    stepPending: {
      color: colors.textMuted,
    },
    stepDate: {
      ...typography.footnote,
      color: colors.textMuted,
    },
  });
