import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { Screen } from '@/components/screen';
import { ReceiptScanCard } from '@/features/dashboard/receipt-scan-card';

// Opened from an advance's "Add bill" → "Scan new": scan a receipt, confirm it,
// and it is added to that advance. Then we return to the advance's ticket screen,
// which reloads its bills when it regains focus.
export default function ScanBillForAdvanceScreen() {
  const { advanceId } = useLocalSearchParams<{ advanceId: string }>();

  const backToAdvance = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/ticket/[id]', params: { id: advanceId } });
  };

  return (
    <Screen title="Scan bill" subtitle="The confirmed receipt is added to this advance" backFallback={`/ticket/${advanceId}`}>
      <ReceiptScanCard title="New receipt" advanceId={advanceId} onSubmitted={backToAdvance} />
    </Screen>
  );
}
