import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { ReceiptFileViewer } from '@/components/receipt-file-viewer';
import { LoadingState } from '@/components/states';
import { type Palette, useThemedStyles } from '@/constants/brand';
import { typography } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { getInvoice } from '@/lib/invoices';

// The uploaded receipt behind a bill on an advance, so reviewers can check it
// before approving. Loaded only when shown.
export function BillReceipt({ invoiceId }: { invoiceId: string }) {
  const styles = useThemedStyles(makeStyles);
  const invoice = useApi(() => getInvoice(invoiceId), [invoiceId]);

  if (invoice.isLoading && !invoice.data) return <LoadingState padded />;
  if (!invoice.data) return <Text style={styles.error}>{invoice.error ?? 'Could not load the receipt.'}</Text>;
  if (!invoice.data.fileUrl) return <Text style={styles.muted}>This bill has no receipt file.</Text>;
  return <ReceiptFileViewer invoice={invoice.data} />;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    error: {
      ...typography.footnote,
      color: colors.danger,
    },
    muted: {
      ...typography.footnote,
      color: colors.textMuted,
    },
  });
