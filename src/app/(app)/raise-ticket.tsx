import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Divider, KeyValue } from '@/components/card';
import { ChipGroup } from '@/components/chip-group';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { InlineError } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { SuccessCelebration } from '@/components/success-celebration';
import { TextField } from '@/components/text-field';
import { type Palette, useThemedStyles } from '@/constants/brand';
import { typography } from '@/constants/theme';
import { errorMessage } from '@/lib/api';
import { CURRENCY } from '@/lib/config';
import { useDisplayCurrency } from '@/lib/currency';
import { INVOICE_CATEGORIES, type InvoiceCategory } from '@/lib/invoices';
import { ticketApi } from '@/lib/endpoints';
import { formatBaseMoney, ticketRef } from '@/lib/format';
import type { Ticket } from '@/lib/types';
import { useMoney } from '@/lib/use-money';

// Mirrors riseTicketSchema on the backend.
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 10000;

// Same categories as scanned receipts (and the backend's TICKET_CATEGORIES).
const CATEGORY_ICONS: Record<InvoiceCategory, keyof typeof Ionicons.glyphMap> = {
  Electronics: 'hardware-chip-outline',
  'Logistics & Courier': 'cube-outline',
  'Food & Beverages': 'restaurant-outline',
  'Office Supplies': 'document-text-outline',
  'Travel & Transport': 'car-outline',
  'Repairs & Maintenance': 'construct-outline',
  'Utilities & Telecom': 'flash-outline',
  Accommodation: 'bed-outline',
  Miscellaneous: 'ellipsis-horizontal-circle-outline',
};
const CATEGORY_OPTIONS = INVOICE_CATEGORIES.map((category) => ({
  value: category,
  label: category,
  icon: CATEGORY_ICONS[category],
}));

export default function RaiseTicketScreen() {
  const styles = useThemedStyles(makeStyles);
  const display = useDisplayCurrency();
  const formatMoney = useMoney();
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  // Optional; '' means none chosen. Tapping the chosen chip again clears it.
  const [category, setCategory] = useState<InvoiceCategory | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The ticket just raised; while set, the success screen is shown.
  const [created, setCreated] = useState<Ticket | null>(null);

  const parsedAmount = Number(amount.replace(/,/g, ''));
  const amountInRange = Number.isFinite(parsedAmount) && parsedAmount >= MIN_AMOUNT && parsedAmount <= MAX_AMOUNT;
  const showAmountError = amount.trim().length > 0 && !amountInRange;
  const canSubmit = purpose.trim().length >= 3 && amountInRange && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await ticketApi.raise(purpose.trim(), parsedAmount, category || undefined);
      setCreated(data);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const raiseAnother = () => {
    setCreated(null);
    setPurpose('');
    setAmount('');
    setCategory('');
    setError(null);
  };

  if (created) {
    return (
      <SuccessCelebration
        title="Amount requested"
        message="It's on its way to your approvers. We'll notify you when it's approved and paid out."
        actions={
          <>
            <PrimaryButton
              label="View ticket"
              icon="receipt-outline"
              onPress={() => router.replace({ pathname: '/ticket/[id]', params: { id: created.id } })}
            />
            <PrimaryButton label="Request another" variant="secondary" icon="add" onPress={raiseAnother} />
          </>
        }>
        <View style={styles.summaryTop}>
          <Text style={styles.summaryAmount}>{formatMoney(created.amount)}</Text>
          <StatusBadge status={created.status} />
        </View>
        <Text style={styles.summaryPurpose} numberOfLines={3}>
          {created.purpose}
        </Text>
        <Divider />
        <KeyValue icon="pricetag-outline" label="Reference" value={ticketRef(created.id)} />
        {created.category ? <KeyValue icon="sparkles-outline" label="Category" value={created.category} /> : null}
        {created.department?.name ? <KeyValue icon="business-outline" label="Department" value={created.department.name} /> : null}
      </SuccessCelebration>
    );
  }

  return (
    <Screen
      title="Request amount"
      backFallback="/tickets"
      footer={<PrimaryButton label="Submit request" onPress={handleSubmit} disabled={!canSubmit} loading={isSubmitting} />}>
      <Text style={styles.hint}>
        Your request goes to your department&apos;s approvers. You&apos;ll be notified when it is approved and paid out.
      </Text>
      <TextField
        label={`Amount (${CURRENCY})`}
        icon="cash-outline"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <Text style={[styles.limit, showAmountError && styles.limitError]}>
        Between {formatBaseMoney(MIN_AMOUNT)} and {formatBaseMoney(MAX_AMOUNT)}
        {display.code !== CURRENCY && amountInRange ? ` · ≈ ${formatMoney(parsedAmount)}` : ''}
      </Text>
      <TextField
        label="Purpose"
        placeholder="What is this expense for?"
        multiline
        value={purpose}
        onChangeText={setPurpose}
        maxLength={500}
      />
      <View style={styles.categories}>
        <Text style={styles.categoriesLabel}>Category (optional)</Text>
        <ChipGroup
          wrap
          compact
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(value) => setCategory((current) => (current === value ? '' : value))}
        />
      </View>
      <InlineError message={error} />
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryAmount: {
    ...typography.title,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryPurpose: {
    ...typography.body,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.callout,
    color: colors.textMuted,
  },
  limit: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -8,
  },
  limitError: {
    color: colors.danger,
  },
  categories: {
    gap: 8,
  },
  categoriesLabel: {
    ...typography.footnoteStrong,
    color: colors.textMuted,
  },
});
