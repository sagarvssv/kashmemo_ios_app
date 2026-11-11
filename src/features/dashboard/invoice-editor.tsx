import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { PrimaryButton } from '@/components/primary-button';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { radius, spacing, statusColors, typography } from '@/constants/theme';
import { useCurrentUser } from '@/context/session';
import { toIsoDate } from '@/lib/format';
import {
  checkDuplicate,
  type ExtractedInvoice,
  type Invoice,
  InvoiceApiError,
  INVOICE_CATEGORIES,
  type InvoiceCategory,
  updateInvoice,
} from '@/lib/invoices';

// Correct the AI-extracted fields and category, then save (PUT /invoices/{id}).
// Only changed values are sent; "Save & confirm" also marks the invoice CONFIRMED.

const CATEGORY_OPTIONS = INVOICE_CATEGORIES.map((category) => ({ value: category, label: category }));

const FIELD_LABELS: Record<string, string> = {
  invoiceNumber: 'Invoice number',
  invoiceDate: 'Invoice date',
  vendorName: 'Vendor',
  totalAmount: 'Total',
};

function fromIsoDate(value: string | null | undefined): Date | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

const numberText = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

// '' -> null (clear the field); anything that isn't a non-negative number -> undefined (invalid).
function parseAmount(text: string): number | null | undefined {
  const trimmed = text.replace(/,/g, '').trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

// Turns an API error into something to show: the server's message plus any
// missing fields or the invoice it clashes with.
function describeError(err: unknown) {
  if (!(err instanceof InvoiceApiError))
    return err instanceof Error ? err.message : 'Could not save. Please try again.';
  const body = (err.body ?? {}) as { missingFields?: string[]; duplicateOf?: string };
  const parts = [err.message];
  if (body.missingFields?.length) {
    parts.push(`Missing: ${body.missingFields.map((field) => FIELD_LABELS[field] ?? field).join(', ')}`);
  }
  if (body.duplicateOf) parts.push(`Clashes with invoice ${body.duplicateOf}`);
  if (err.status === 409 && !body.duplicateOf) parts.push('Reload the invoice and try again.');
  return parts.join('\n');
}

export function InvoiceEditor({
  invoice,
  onSaved,
  onCancel,
}: {
  invoice: Invoice;
  onSaved: (invoice: Invoice) => void;
  onCancel: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const user = useCurrentUser();
  const original: Partial<ExtractedInvoice> = invoice.extracted ?? {};
  const originalDate = fromIsoDate(original.invoiceDate);

  const [vendorName, setVendorName] = useState(original.vendorName ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState(original.invoiceNumber ?? '');
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(originalDate);
  const [totalAmount, setTotalAmount] = useState(numberText(original.totalAmount));
  const [taxAmount, setTaxAmount] = useState(numberText(original.taxAmount));
  const [currency, setCurrency] = useState(original.currency ?? '');
  const [category, setCategory] = useState<InvoiceCategory | null>(invoice.category ?? null);
  const [saving, setSaving] = useState<'save' | 'confirm' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A possible-duplicate warning the user has seen for these exact details; a
  // second Save with the same details goes ahead.
  const [warning, setWarning] = useState<{ key: string; message: string } | null>(null);

  const total = parseAmount(totalAmount);
  const tax = parseAmount(taxAmount);
  const currencyCode = currency.trim().toUpperCase();
  const invalid =
    total === undefined
      ? 'Total must be a number.'
      : tax === undefined
        ? 'Tax must be a number.'
        : currencyCode && !/^[A-Z]{3}$/.test(currencyCode)
          ? 'Currency must be a 3-letter code, e.g. AED.'
          : null;

  // Only what the user actually changed.
  const changes = (): Partial<ExtractedInvoice> => {
    const fields: Partial<ExtractedInvoice> = {};
    const text = (value: string) => value.trim() || null;
    if (text(vendorName) !== (original.vendorName ?? null)) fields.vendorName = text(vendorName);
    if (text(invoiceNumber) !== (original.invoiceNumber ?? null)) fields.invoiceNumber = text(invoiceNumber);
    const date = invoiceDate ? toIsoDate(invoiceDate) : null;
    if (date !== (original.invoiceDate ?? null)) fields.invoiceDate = date;
    if (total !== undefined && total !== (original.totalAmount ?? null)) fields.totalAmount = total;
    if (tax !== undefined && tax !== (original.taxAmount ?? null)) fields.taxAmount = tax;
    if ((currencyCode || null) !== (original.currency ?? null)) fields.currency = currencyCode || null;
    return fields;
  };

  const save = async (confirm: boolean) => {
    if (invalid) {
      setError(invalid);
      return;
    }
    const fields = changes();
    const categoryChanged = category !== null && category !== invoice.category;
    if (!confirm && Object.keys(fields).length === 0 && !categoryChanged) {
      onCancel();
      return;
    }
    setSaving(confirm ? 'confirm' : 'save');
    setError(null);
    try {
      // Changing the identifying details can collide with another invoice. The
      // server rejects exact duplicates on save anyway; checking first gives a clear
      // message and lets us warn about possible duplicates, which it would accept.
      const identityChanged = ['vendorName', 'invoiceNumber', 'invoiceDate', 'totalAmount'].some(
        (key) => key in fields,
      );
      const finalVendor = 'vendorName' in fields ? fields.vendorName : original.vendorName;
      if (identityChanged && finalVendor) {
        const details = {
          vendorName: finalVendor,
          invoiceNumber: 'invoiceNumber' in fields ? fields.invoiceNumber : original.invoiceNumber,
          invoiceDate: 'invoiceDate' in fields ? fields.invoiceDate : original.invoiceDate,
          totalAmount: 'totalAmount' in fields ? fields.totalAmount : original.totalAmount,
        };
        const check = await checkDuplicate({ ...details, excludeInvoiceId: invoice.invoiceId }).catch(() => null);
        if (check?.isDuplicate) {
          setError(`Another invoice already has this vendor and invoice number (${check.duplicateOf}).`);
          return;
        }
        const key = JSON.stringify(details);
        if (check?.possibleDuplicateOf && warning?.key !== key) {
          setWarning({
            key,
            message: `This looks like invoice ${check.possibleDuplicateOf} (same vendor, date and total). Check it isn't the same receipt, then save again to continue.`,
          });
          return;
        }
      }
      setWarning(null);
      const updated = await updateInvoice(invoice.invoiceId, {
        ...(Object.keys(fields).length ? { fields } : {}),
        ...(categoryChanged ? { category: category! } : {}),
        ...(confirm ? { confirm: true } : {}),
        updatedBy: user.userId,
      });
      onSaved(updated);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={styles.form}>
      <View style={styles.heading}>
        <Ionicons name="create-outline" size={16} color={colors.primary} />
        <Text style={styles.headingText}>Edit invoice details</Text>
      </View>

      <TextField label="Vendor" value={vendorName} onChangeText={setVendorName} placeholder="Vendor name" />
      <TextField
        label="Invoice number"
        value={invoiceNumber}
        onChangeText={setInvoiceNumber}
        placeholder="e.g. INV-2026-001"
        autoCapitalize="characters"
      />
      {invoiceDate ? (
        <DateField label="Invoice date" value={invoiceDate} onChange={setInvoiceDate} maximumDate={new Date()} />
      ) : (
        <PrimaryButton
          label="Add invoice date"
          icon="calendar-outline"
          variant="secondary"
          compact
          onPress={() => setInvoiceDate(new Date())}
        />
      )}
      <View style={styles.row}>
        <View style={styles.grow}>
          <TextField
            label="Total"
            value={totalAmount}
            onChangeText={setTotalAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </View>
        <View style={styles.currency}>
          <TextField
            label="Currency"
            value={currency}
            onChangeText={setCurrency}
            autoCapitalize="characters"
            maxLength={3}
            placeholder="AED"
          />
        </View>
      </View>
      <TextField
        label="Tax"
        value={taxAmount}
        onChangeText={setTaxAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <SelectField
        label="Category"
        value={category}
        options={CATEGORY_OPTIONS}
        onChange={(value) => setCategory(value as InvoiceCategory)}
      />

      {warning ? (
        <View style={styles.warningRow}>
          <Ionicons name="warning-outline" size={16} color={statusColors.PENDING.text} />
          <Text style={styles.warningText}>{warning.message}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {invoice.status === 'COMPLETED' ? (
        <PrimaryButton
          label="Save & confirm"
          icon="checkmark-circle-outline"
          onPress={() => void save(true)}
          loading={saving === 'confirm'}
          disabled={saving !== null}
        />
      ) : null}
      <PrimaryButton
        label="Save changes"
        icon="save-outline"
        variant="secondary"
        onPress={() => void save(false)}
        loading={saving === 'save'}
        disabled={saving !== null}
      />
      <PrimaryButton label="Cancel" variant="secondary" onPress={onCancel} disabled={saving !== null} />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    form: {
      gap: spacing.three,
    },
    heading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
    },
    headingText: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.three,
    },
    grow: {
      flex: 1,
    },
    currency: {
      width: 96,
    },
    warningRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.two,
      padding: spacing.three,
      borderRadius: radius.medium,
      backgroundColor: statusColors.PENDING.background,
    },
    warningText: {
      flex: 1,
      ...typography.footnoteStrong,
      color: statusColors.PENDING.text,
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
  });
