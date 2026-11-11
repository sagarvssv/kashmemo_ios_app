import React from 'react';

import { Screen } from '@/components/screen';
import { ReceiptScanCard } from '@/features/dashboard/receipt-scan-card';

// Scan tab: photograph or upload a receipt, review what was read, confirm it -
// which submits the bill for approval - and find it again in My receipts.
export default function ScanScreen() {
  return (
    <Screen title="Scan bill" subtitle="Snap a receipt and submit it for approval">
      <ReceiptScanCard title="New receipt" />
    </Screen>
  );
}
