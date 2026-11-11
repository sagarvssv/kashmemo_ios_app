import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { InlineError } from '@/components/states';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, spacing, typography } from '@/constants/theme';
import { useCurrentUser } from '@/context/session';
import { formatInvoiceAmount } from '@/features/dashboard/invoice-result';
import { useReceiptClaims } from '@/features/dashboard/receipt-claims';
import { useApi } from '@/hooks/use-api';
import { errorMessage } from '@/lib/api';
import { advanceApi } from '@/lib/endpoints';
import { formatDate } from '@/lib/format';
import { listInvoices } from '@/lib/invoices';

// Confirmed receipts to look through for ones not yet claimed.
const RECEIPT_LOOKUP_LIMIT = 50;

type AddBillSheetProps = {
  visible: boolean;
  advanceId: string;
  onClose: () => void;
  onAdded: () => void;
};

// Picks one of the employee's confirmed, unclaimed receipts and adds it to the
// advance as a bill, or sends them off to scan a new one.
export function AddBillSheet({ visible, onClose, ...props }: AddBillSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Mounted only while open so every opening loads fresh receipts. */}
      {visible && <Sheet {...props} onClose={onClose} />}
    </Modal>
  );
}

function Sheet({ advanceId, onClose, onAdded }: Omit<AddBillSheetProps, 'visible'>) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const user = useCurrentUser();
  const claims = useReceiptClaims();
  const receipts = useApi(
    () => listInvoices({ uploadedBy: user.userId, status: 'CONFIRMED', limit: RECEIPT_LOOKUP_LIMIT }),
    [user.userId],
  );
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = (receipts.isLoading && !receipts.data) || (claims.isLoading && !claims.data);
  const unclaimed = (receipts.data?.items ?? []).filter((receipt) => !claims.data?.has(receipt.invoiceId));

  const add = async (invoiceId: string) => {
    setAdding(invoiceId);
    setError(null);
    try {
      await advanceApi.addBill(advanceId, invoiceId);
      onAdded();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAdding(null);
    }
  };

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <Text style={styles.title}>Add a bill</Text>
        <Text style={styles.message}>Choose a confirmed receipt, or scan a new one.</Text>

        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        <InlineError message={receipts.error ?? error} />
        {!loading && !receipts.error && unclaimed.length === 0 ? (
          <Text style={styles.message}>You have no confirmed receipts that aren&apos;t already claimed.</Text>
        ) : null}

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {unclaimed.map((receipt) => (
            <Pressable
              key={receipt.invoiceId}
              onPress={() => void add(receipt.invoiceId)}
              disabled={adding !== null}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={[styles.icon, { backgroundColor: iconBadge(colors.primary) }]}>
                <Ionicons name="receipt-outline" size={16} color={colors.primary} />
              </View>
              <View style={styles.body}>
                <Text style={styles.vendor} numberOfLines={1}>
                  {receipt.vendorName || receipt.fileName || 'Receipt'}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[receipt.category, formatDate(receipt.invoiceDate ?? receipt.uploadedAt)].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {adding === receipt.invoiceId ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.amount}>{formatInvoiceAmount(receipt.totalAmount, receipt.currency)}</Text>
              )}
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.actions}>
          <PrimaryButton label="Cancel" variant="secondary" onPress={onClose} style={styles.action} />
          <PrimaryButton
            label="Scan new"
            icon="scan-outline"
            onPress={() => {
              onClose();
              // Scan for this advance, then come back here (not to the home screen).
              router.push({ pathname: '/scan-bill/[advanceId]', params: { advanceId } });
            }}
            style={styles.action}
          />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
      maxHeight: '80%',
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: spacing.six,
      paddingBottom: spacing.eight,
      gap: spacing.four,
    },
    title: {
      ...typography.headline,
      color: colors.textPrimary,
    },
    message: {
      ...typography.callout,
      color: colors.textMuted,
    },
    list: {
      flexGrow: 0,
    },
    listContent: {
      gap: spacing.two,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.two,
    },
    pressed: {
      opacity: 0.6,
    },
    icon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
      gap: 2,
    },
    vendor: {
      ...typography.calloutStrong,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.footnote,
      color: colors.textMuted,
    },
    amount: {
      ...typography.calloutStrong,
      color: colors.textPrimary,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.three,
    },
    action: {
      flex: 1,
    },
  });
