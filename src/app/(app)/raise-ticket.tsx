import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { InlineError } from '@/components/states';
import { TextField } from '@/components/text-field';
import { colors } from '@/constants/theme';
import { errorMessage } from '@/lib/api';
import { ticketApi } from '@/lib/endpoints';

export default function RaiseTicketScreen() {
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedAmount = Number(amount.replace(/,/g, ''));
  const canSubmit = purpose.trim().length >= 3 && Number.isFinite(parsedAmount) && parsedAmount > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await ticketApi.raise(purpose.trim(), parsedAmount);
      router.replace({ pathname: '/ticket/[id]', params: { id: data.id } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen
      title="Raise a ticket"
      backFallback="/tickets"
      footer={<PrimaryButton label="Submit ticket" onPress={handleSubmit} disabled={!canSubmit} loading={isSubmitting} />}>
      <Text style={styles.hint}>
        Your ticket goes to your department&apos;s approvers. You&apos;ll be notified when it is approved and paid out.
      </Text>
      <TextField
        label="Amount"
        icon="cash-outline"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <TextField
        label="Purpose"
        placeholder="What is this expense for?"
        multiline
        value={purpose}
        onChangeText={setPurpose}
        maxLength={500}
      />
      <InlineError message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
