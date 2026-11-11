import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Divider, KeyValue } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ReceiptFileViewer } from '@/components/receipt-file-viewer';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, radius, spacing, statusColors, typography } from '@/constants/theme';
import { useCurrentUser } from '@/context/session';
import { LOCALE } from '@/lib/config';
import { formatDate } from '@/lib/format';
import {
  getInvoice,
  type Invoice,
  type InvoiceStatus,
  isEditable,
  recategorizeInvoice,
  updateInvoice,
} from '@/lib/invoices';

import { InvoiceEditor } from './invoice-editor';

// An uploaded invoice: status, extracted fields, category and review flags, with
// Edit / Re-categorize / Confirm / Retry. Used by the scan card and the receipt
// detail screen.

export const STATUS_STYLE: Record<InvoiceStatus, { label: string; background: string; text: string }> = {
  UPLOAD_PENDING: { label: 'Uploading', ...statusColors.PENDING },
  PROCESSING: { label: 'Processing', ...statusColors.PENDING },
  COMPLETED: { label: 'Ready to confirm', ...statusColors.PARTIALLY_APPROVED },
  CONFIRMED: { label: 'Confirmed', ...statusColors.APPROVED },
  DUPLICATE: { label: 'Duplicate', ...statusColors.REJECTED },
  FAILED: { label: 'Failed', ...statusColors.REJECTED },
};

const FIELD_LABELS: Record<string, string> = {
  invoiceNumber: 'Invoice number',
  invoiceDate: 'Invoice date',
  vendorName: 'Vendor',
  totalAmount: 'Total',
};

export // Invoice amounts are in the invoice's own currency, not the app's display currency.
function formatInvoiceAmount(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount === null || amount === undefined) return '—';
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: currency || 'AED' }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency ?? ''}`.trim();
  }
}

export function messageOf(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

export function InvoiceResult({
  invoice,
  onUpdated,
  onRetry,
  onScanAnother,
}: {
  invoice: Invoice;
  onUpdated: (invoice: Invoice) => void;
  onRetry: () => void;
  // Hidden when omitted (e.g. on the receipt detail screen).
  onScanAnother?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const user = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<'confirm' | 'categorize' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const status = STATUS_STYLE[invoice.status];
  const extracted = invoice.extracted;
  const missing = invoice.missingFields ?? [];
  const editable = isEditable(invoice.status);

  const run = async (kind: 'confirm' | 'categorize') => {
    setBusy(kind);
    setActionError(null);
    try {
      if (kind === 'confirm') {
        onUpdated(await updateInvoice(invoice.invoiceId, { confirm: true, updatedBy: user.userId }));
      } else {
        await recategorizeInvoice(invoice.invoiceId);
        onUpdated(await getInvoice(invoice.invoiceId));
      }
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(null);
    }
  };

  if (editing) {
    return (
      <InvoiceEditor
        invoice={invoice}
        onSaved={(updated) => {
          setEditing(false);
          onUpdated(updated);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <>
      <View style={styles.resultHeader}>
        <View style={[styles.statusPill, { backgroundColor: status.background }]}>
          <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      {/* The original photo/PDF from S3: thumbnail + full screen, or in-app PDF. */}
      <ReceiptFileViewer invoice={invoice} />

      {invoice.status === 'FAILED' ? (
        <Text style={styles.errorText}>{invoice.error ?? 'The receipt could not be read.'}</Text>
      ) : null}

      {invoice.status === 'DUPLICATE' ? (
        <Text style={styles.errorText}>
          {invoice.duplicateReason === 'SAME_FILE'
            ? 'This exact file was already uploaded.'
            : 'An invoice with this vendor and invoice number already exists.'}
          {invoice.duplicateOf ? `\nOriginal: ${invoice.duplicateOf}` : ''}
        </Text>
      ) : null}

      {extracted ? (
        <>
          <Text style={styles.total}>{formatInvoiceAmount(extracted.totalAmount, extracted.currency)}</Text>
          <KeyValue icon="storefront-outline" label="Vendor" value={extracted.vendorName ?? '—'} />
          <Divider />
          <KeyValue icon="pricetag-outline" label="Invoice number" value={extracted.invoiceNumber ?? '—'} />
          <Divider />
          <KeyValue
            icon="calendar-outline"
            label="Invoice date"
            value={extracted.invoiceDate ? formatDate(extracted.invoiceDate) : '—'}
          />
          {extracted.taxAmount !== null ? (
            <>
              <Divider />
              <KeyValue
                icon="receipt-outline"
                label="Tax"
                value={formatInvoiceAmount(extracted.taxAmount, extracted.currency)}
              />
            </>
          ) : null}
          {extracted.lineItems?.length ? (
            <>
              <Divider />
              <Text style={styles.subheading}>Items</Text>
              {extracted.lineItems.map((item, index) => (
                <View key={index} style={styles.lineItem}>
                  <Text style={styles.lineItemText} numberOfLines={2}>
                    {item.quantity ? `${item.quantity} × ` : ''}
                    {item.description ?? 'Item'}
                  </Text>
                  <Text style={styles.lineItemAmount}>{formatInvoiceAmount(item.amount, extracted.currency)}</Text>
                </View>
              ))}
            </>
          ) : null}
        </>
      ) : null}

      {invoice.category ? (
        <View style={styles.category}>
          <View style={styles.categoryChip}>
            <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
            <Text style={styles.categoryText}>{invoice.category}</Text>
            {invoice.categoryConfidence !== undefined ? (
              <Text style={styles.muted}>{Math.round(invoice.categoryConfidence * 100)}%</Text>
            ) : null}
          </View>
          {invoice.categoryReason ? <Text style={styles.muted}>{invoice.categoryReason}</Text> : null}
        </View>
      ) : null}

      {invoice.needsReview ? (
        <View style={styles.review}>
          <Ionicons name="warning-outline" size={16} color={statusColors.PENDING.text} />
          <Text style={styles.reviewText}>
            Needs review
            {missing.length ? ` · missing ${missing.map((field) => FIELD_LABELS[field] ?? field).join(', ')}` : ''}
            {invoice.possibleDuplicateOf ? ' · possible duplicate of another invoice' : ''}
          </Text>
        </View>
      ) : null}

      {extracted?.notes ? <Text style={styles.muted}>Note: {extracted.notes}</Text> : null}

      {actionError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      ) : null}

      {invoice.status === 'COMPLETED' && missing.length > 0 ? (
        <Text style={styles.muted}>Fill in the missing details with Edit details before confirming.</Text>
      ) : null}
      {invoice.status === 'COMPLETED' ? (
        <PrimaryButton
          label="Confirm invoice"
          icon="checkmark-circle-outline"
          onPress={() => void run('confirm')}
          loading={busy === 'confirm'}
          disabled={missing.length > 0 || busy !== null}
        />
      ) : null}
      {editable ? (
        <View style={styles.actions}>
          <PrimaryButton
            label="Edit details"
            icon="create-outline"
            variant="secondary"
            compact
            style={styles.action}
            onPress={() => setEditing(true)}
            disabled={busy !== null}
          />
          <PrimaryButton
            label="Re-categorize"
            icon="sparkles-outline"
            variant="secondary"
            compact
            style={styles.action}
            onPress={() => void run('categorize')}
            loading={busy === 'categorize'}
            disabled={busy !== null}
          />
        </View>
      ) : null}
      {invoice.status === 'FAILED' ? (
        <PrimaryButton label="Retry processing" icon="refresh" variant="secondary" onPress={onRetry} />
      ) : null}
      {onScanAnother ? (
        <PrimaryButton label="Scan another receipt" icon="scan-outline" variant="secondary" onPress={onScanAnother} />
      ) : null}
    </>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    muted: {
      ...typography.caption,
      color: colors.textMuted,
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.two,
    },
    errorText: {
      flex: 1,
      ...typography.footnote,
      color: colors.danger,
    },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    statusText: {
      ...typography.captionStrong,
    },
    total: {
      ...typography.title,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    subheading: {
      ...typography.overline,
      color: colors.textMuted,
    },
    lineItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.three,
    },
    lineItemText: {
      flex: 1,
      ...typography.footnote,
      color: colors.textSecondary,
    },
    lineItemAmount: {
      ...typography.footnoteStrong,
      color: colors.textPrimary,
    },
    category: {
      gap: 4,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.two,
    },
    action: {
      flex: 1,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: iconBadge(colors.primary),
    },
    categoryText: {
      ...typography.captionStrong,
      color: colors.primary,
    },
    review: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.two,
      padding: spacing.three,
      borderRadius: radius.medium,
      backgroundColor: statusColors.PENDING.background,
    },
    reviewText: {
      flex: 1,
      ...typography.footnoteStrong,
      color: statusColors.PENDING.text,
    },
  });
