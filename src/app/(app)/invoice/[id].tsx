import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card, Section } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/states';
import { useToast } from '@/components/toast';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';
import { InvoiceResult, messageOf } from '@/features/dashboard/invoice-result';
import { loadSpendableAdvances, useReceiptClaims } from '@/features/dashboard/receipt-claims';
import { useApi } from '@/hooks/use-api';
import { errorMessage } from '@/lib/api';
import { advanceApi, ticketApi } from '@/lib/endpoints';
import { getInvoice, isProcessing, reprocessInvoice, waitForInvoice } from '@/lib/invoices';
import { useMoney } from '@/lib/use-money';

// One uploaded receipt, opened from My receipts: review, edit, re-categorize,
// confirm, or retry a failed one.
export default function InvoiceDetailScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const params = useLocalSearchParams<{ id: string }>();
  const invoice = useApi(() => getInvoice(params.id), [params.id]);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const toast = useToast();
  const formatMoney = useMoney();
  const claims = useReceiptClaims();
  // Advances with collected cash: a bill can go on one of them instead of
  // becoming a separate claim.
  const advances = useApi(() => loadSpendableAdvances(), []);
  // Which button is working: an advance id, or 'claim' for a separate claim.
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // A confirmed receipt that wasn't submitted (e.g. the automatic submit failed).
  const submit = async (advanceId?: string) => {
    setSubmitting(advanceId ?? 'claim');
    setSubmitError(null);
    try {
      if (advanceId) {
        await advanceApi.addBill(advanceId, params.id);
        toast.show({ title: 'Bill added to your advance', message: 'Waiting for approval from your manager.' });
      } else {
        await ticketApi.fromInvoice(params.id);
        toast.show({ title: 'Bill uploaded successfully', message: 'Waiting for approval from your manager.' });
      }
      await claims.reload();
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(null);
    }
  };

  const retry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      await reprocessInvoice(params.id);
      const updated = await waitForInvoice(params.id);
      invoice.setData(() => updated);
    } catch (err) {
      setRetryError(messageOf(err));
    } finally {
      setRetrying(false);
    }
  };

  const data = invoice.data;
  const claim = claims.data?.get(params.id);
  const stillProcessing = data ? isProcessing(data.status) : false;

  return (
    <Screen
      title={data?.extracted?.vendorName || data?.fileName || 'Receipt'}
      backFallback="/receipts"
      refreshing={invoice.isRefreshing}
      onRefresh={invoice.refresh}>
      {invoice.isLoading && !data ? <LoadingState padded /> : null}
      {invoice.error && !data ? <ErrorState message={invoice.error} onRetry={invoice.reload} /> : null}

      {data ? (
        <Card>
          {retrying || stillProcessing ? (
            <View style={styles.working}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.workingText}>
                {retrying ? 'Reading your receipt again…' : 'Still being read. Pull down to refresh.'}
              </Text>
            </View>
          ) : (
            <InvoiceResult
              invoice={data}
              onUpdated={(updated) => invoice.setData(() => updated)}
              onRetry={() => void retry()}
            />
          )}
          {retryError ? <Text style={styles.error}>{retryError}</Text> : null}
        </Card>
      ) : null}

      {data?.status === 'CONFIRMED' ? (
        <Section title="Approval">
          <Card>
            {claim ? (
              <>
                <View style={[styles.claimPill, { backgroundColor: claim.background }]}>
                  <Text style={[styles.claimText, { color: claim.text }]}>{claim.label}</Text>
                </View>
                {claim.hint ? <Text style={styles.hint}>{claim.hint}</Text> : null}
                {claim.rejectionReason ? <Text style={styles.hint}>Reason: {claim.rejectionReason}</Text> : null}
                <PrimaryButton
                  label="View claim"
                  icon="receipt-outline"
                  variant="secondary"
                  compact
                  onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: claim.ticketId } })}
                />
              </>
            ) : claims.data && !advances.isLoading ? (
              <>
                <Text style={styles.hint}>
                  {advances.data?.length
                    ? 'Add this bill to the advance you spent it from, or submit it as a separate claim.'
                    : "This receipt hasn't been submitted yet. Submit it so your manager can approve it."}
                </Text>
                {advances.data?.map((advance) => (
                  <PrimaryButton
                    key={advance.id}
                    label={`Add to "${advance.purpose}" · ${formatMoney(advance.remaining)} left`}
                    icon="wallet-outline"
                    loading={submitting === advance.id}
                    disabled={submitting !== null && submitting !== advance.id}
                    onPress={() => void submit(advance.id)}
                  />
                ))}
                <PrimaryButton
                  label={advances.data?.length ? 'Submit as a separate claim' : 'Submit for approval'}
                  icon="send-outline"
                  variant={advances.data?.length ? 'secondary' : 'primary'}
                  loading={submitting === 'claim'}
                  disabled={submitting !== null && submitting !== 'claim'}
                  onPress={() => void submit()}
                />
                {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
              </>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    working: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.two,
    },
    workingText: {
      flex: 1,
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    hint: {
      ...typography.footnote,
      color: colors.textSecondary,
    },
    claimPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    claimText: {
      ...typography.captionStrong,
    },
    error: {
      ...typography.footnote,
      color: colors.danger,
    },
  });
