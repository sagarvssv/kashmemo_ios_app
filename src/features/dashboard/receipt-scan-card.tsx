import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { Card, Section } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { useToast } from '@/components/toast';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, spacing, statusColors, typography } from '@/constants/theme';
import { useCurrentUser } from '@/context/session';
import { errorMessage } from '@/lib/api';
import { advanceApi, ticketApi } from '@/lib/endpoints';
import { prepareReceiptImage } from '@/lib/receipt-photo';
import {
  type Invoice,
  InvoiceApiError,
  reprocessInvoice,
  toInvoiceContentType,
  type UploadStage,
  uploadInvoice,
  waitForInvoice,
} from '@/lib/invoices';

import { formatInvoiceAmount, InvoiceResult, messageOf } from './invoice-result';
import { loadSpendableAdvances } from './receipt-claims';

// Test harness for the invoice service on the employee home screen: snap or pick a
// receipt, upload it, wait for OCR + AI, then review, correct and confirm it.

type Stage = UploadStage | 'preparing' | 'retrying';
type Source = 'camera' | 'library' | 'file';
type Picked = { uri: string; name: string; mimeType?: string | null };

type State =
  | { kind: 'idle' }
  | { kind: 'working'; stage: Stage; fileName: string; startedAt: number }
  | { kind: 'done'; invoice: Invoice }
  | { kind: 'error'; message: string; invoiceId?: string; openSettings?: boolean };

const STAGE_TEXT: Record<Stage, string> = {
  preparing: 'Preparing your photo…',
  starting: 'Getting an upload link…',
  uploading: 'Uploading your receipt…',
  processing: 'Reading your receipt…',
  retrying: 'Reading your receipt again…',
};

// What the service is doing while it reads the receipt, by seconds elapsed, so
// the wait doesn't look stuck. The service doesn't report steps; these are its
// pipeline order (OCR, field extraction, AI category, duplicate check).
function processingHint(seconds: number) {
  if (seconds < 8) return 'Reading the text on your receipt';
  if (seconds < 16) return 'Picking out the vendor, date and total';
  if (seconds < 26) return 'Choosing a category and checking for duplicates';
  if (seconds < 45) return 'Taking a little longer than usual. Large photos and multi-page PDFs need more time.';
  return 'Still working. It stops automatically after 2 minutes so you can retry.';
}

function formatElapsed(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

class PickError extends Error {
  constructor(
    message: string,
    readonly openSettings = false,
  ) {
    super(message);
  }
}

// Camera, photo library or Files. Returns null when the user backs out.
async function pickReceipt(source: Source): Promise<Picked | null> {
  if (source === 'file') {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? null : result.assets?.[0];
    return asset ? { uri: asset.uri, name: asset.name, mimeType: asset.mimeType } : null;
  }

  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new PickError(
        permission.canAskAgain
          ? 'Camera access is needed to photograph receipts.'
          : 'Camera access is turned off for this app. Allow it in Settings to photograph receipts.',
        !permission.canAskAgain,
      );
    }
  }

  // Full quality here: prepareReceiptImage() does the one resize + compression.
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false };
  let result: ImagePicker.ImagePickerResult;
  try {
    result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
  } catch {
    throw new PickError(
      source === 'camera' ? 'The camera is not available on this device.' : 'Could not open your photos.',
    );
  }
  const asset = result.canceled ? null : result.assets?.[0];
  return asset ? { uri: asset.uri, name: asset.fileName ?? 'receipt.jpg', mimeType: asset.mimeType } : null;
}

type ReceiptScanCardProps = {
  title?: string;
  // Opened from an advance's "Add bill": the confirmed receipt goes straight onto
  // this advance, then onSubmitted runs (e.g. to go back to the advance).
  advanceId?: string;
  onSubmitted?: () => void;
};

export function ReceiptScanCard({ title = 'Scan a receipt', advanceId, onSubmitted }: ReceiptScanCardProps = {}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const user = useCurrentUser();
  const toast = useToast();
  // Shown on the reset card after a confirm, with a link to the saved receipt.
  const [lastConfirmed, setLastConfirmed] = useState<Invoice | null>(null);
  const [state, setState] = useState<State>({ kind: 'idle' });
  // Stops polling if the user leaves the screen mid-upload.
  const unmounted = useRef({ cancelled: false });
  // The upload/processing run in progress; Cancel stops waiting for it.
  const activeRun = useRef<{ userCancelled: boolean; readonly cancelled: boolean } | null>(null);

  // Reset on every mount: Fast Refresh and Strict Mode run cleanup and then mount
  // again with the same ref, which would otherwise leave every run "cancelled".
  useEffect(() => {
    const current = unmounted.current;
    current.cancelled = false;
    return () => {
      current.cancelled = true;
    };
  }, []);

  // With one advance open for spending, the confirmed receipt becomes a bill on
  // it; with several, the receipt screen asks which. Otherwise it becomes a
  // claim (a RECEIPT ticket) that the department's manager, the Finance Manager
  // or the CEO approves.
  const submitForApproval = async (invoice: Invoice) => {
    if (advanceId) {
      try {
        await advanceApi.addBill(advanceId, invoice.invoiceId);
        toast.show({ title: 'Bill added to your advance', message: 'Waiting for approval from your manager.' });
        onSubmitted?.();
      } catch (err) {
        toast.show({
          type: 'error',
          title: 'Confirmed, but not added',
          message: `${errorMessage(err)} You can add it from the advance's "Add bill".`,
        });
      }
      return;
    }
    try {
      const advances = await loadSpendableAdvances().catch(() => []);
      if (advances.length > 1) {
        toast.show({ title: 'Receipt confirmed', message: 'Choose which advance this bill belongs to.' });
        router.push({ pathname: '/invoice/[id]', params: { id: invoice.invoiceId } });
        return;
      }
      if (advances.length === 1) {
        await advanceApi.addBill(advances[0].id, invoice.invoiceId);
        toast.show({
          title: 'Bill added to your advance',
          message: `Added to "${advances[0].purpose}". Waiting for approval from your manager.`,
        });
      } else {
        await ticketApi.fromInvoice(invoice.invoiceId);
        toast.show({ title: 'Bill uploaded successfully', message: 'Waiting for approval from your manager.' });
      }
    } catch (err) {
      toast.show({
        type: 'error',
        title: 'Confirmed, but not submitted',
        message: `${errorMessage(err)} You can submit it from My receipts.`,
      });
    }
    router.push('/receipts');
  };

  const startRun = () => {
    const screen = unmounted.current;
    const run = {
      userCancelled: false,
      get cancelled() {
        return screen.cancelled || run.userCancelled;
      },
    };
    activeRun.current = run;
    return run;
  };

  // The service keeps processing; the app just stops waiting.
  const cancel = () => {
    if (activeRun.current) activeRun.current.userCancelled = true;
    setState({ kind: 'idle' });
  };

  const scan = async (source: Source) => {
    let picked: Picked | null;
    try {
      picked = await pickReceipt(source);
    } catch (err) {
      setState({ kind: 'error', message: messageOf(err), openSettings: err instanceof PickError && err.openSettings });
      return;
    }
    if (!picked) return;

    const isPdf = toInvoiceContentType(picked.mimeType, picked.name) === 'application/pdf';
    const run = startRun();
    const startedAt = Date.now();
    setState({ kind: 'working', stage: isPdf ? 'starting' : 'preparing', fileName: picked.name, startedAt });
    try {
      // Photos (any format the phone can decode, incl. HEIC) become a compact JPEG.
      const file = isPdf
        ? { uri: picked.uri, fileName: picked.name, contentType: 'application/pdf' as const }
        : await prepareReceiptImage(picked.uri, picked.name);
      if (run.cancelled) return;
      const invoice = await uploadInvoice(
        { fileUri: file.uri, fileName: file.fileName, contentType: file.contentType, uploadedBy: user.userId },
        (stage) => {
          if (!run.cancelled) setState({ kind: 'working', stage, fileName: file.fileName, startedAt });
        },
        run,
      );
      if (run.cancelled) return;
      setState({ kind: 'done', invoice });
    } catch (err) {
      if (run.cancelled) return;
      const invoiceId =
        err instanceof InvoiceApiError ? (err.body as { invoiceId?: string } | undefined)?.invoiceId : undefined;
      setState({ kind: 'error', message: messageOf(err), invoiceId });
    }
  };

  const retry = async (invoiceId: string) => {
    const run = startRun();
    setState({ kind: 'working', stage: 'retrying', fileName: '', startedAt: Date.now() });
    try {
      await reprocessInvoice(invoiceId);
      const invoice = await waitForInvoice(invoiceId, run);
      if (run.cancelled) return;
      setState({ kind: 'done', invoice });
    } catch (err) {
      if (run.cancelled) return;
      setState({ kind: 'error', message: messageOf(err), invoiceId });
    }
  };

  return (
    <Section title={title} action={{ label: 'My receipts', onPress: () => router.push('/receipts') }}>
      <Card>
        {state.kind === 'idle' ? (
          <>
            {lastConfirmed ? (
              <View style={styles.confirmed}>
                <Ionicons name="checkmark-circle" size={16} color={statusColors.APPROVED.text} />
                <Text style={styles.confirmedText} numberOfLines={1}>
                  Confirmed: {lastConfirmed.extracted?.vendorName || lastConfirmed.fileName || 'Receipt'}
                  {lastConfirmed.extracted?.totalAmount != null
                    ? ` · ${formatInvoiceAmount(lastConfirmed.extracted.totalAmount, lastConfirmed.extracted.currency)}`
                    : ''}
                </Text>
                <Text
                  style={styles.confirmedLink}
                  onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: lastConfirmed.invoiceId } })}>
                  View
                </Text>
              </View>
            ) : null}
            <View style={styles.intro}>
              <View style={styles.introIcon}>
                <Ionicons name="scan-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.introText}>
                Photograph a receipt or upload one (photo or PDF). The details are read automatically, usually within 30
                seconds.
              </Text>
            </View>
            <PrimaryButton label="Take photo" icon="camera-outline" onPress={() => void scan('camera')} />
            <View style={styles.sources}>
              <PrimaryButton
                label="Photo library"
                icon="images-outline"
                variant="secondary"
                compact
                style={styles.source}
                onPress={() => void scan('library')}
              />
              <PrimaryButton
                label="Upload file"
                icon="document-attach-outline"
                variant="secondary"
                compact
                style={styles.source}
                onPress={() => void scan('file')}
              />
            </View>
          </>
        ) : null}

        {state.kind === 'working' ? (
          <WorkingView stage={state.stage} fileName={state.fileName} startedAt={state.startedAt} onCancel={cancel} />
        ) : null}

        {state.kind === 'error' ? (
          <>
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{state.message}</Text>
            </View>
            {state.invoiceId ? (
              <PrimaryButton
                label="Retry processing"
                icon="refresh"
                variant="secondary"
                onPress={() => void retry(state.invoiceId!)}
              />
            ) : null}
            {state.openSettings ? (
              <PrimaryButton
                label="Open Settings"
                icon="settings-outline"
                onPress={() => void Linking.openSettings()}
              />
            ) : null}
            <PrimaryButton
              label="Scan another receipt"
              icon="scan-outline"
              variant={state.openSettings ? 'secondary' : 'primary'}
              onPress={() => setState({ kind: 'idle' })}
            />
          </>
        ) : null}

        {state.kind === 'done' ? (
          <InvoiceResult
            invoice={state.invoice}
            onUpdated={(invoice) => {
              // Confirmed: submit it for approval, reset the card for the next
              // receipt and show it in My receipts.
              if (invoice.status === 'CONFIRMED') {
                setLastConfirmed(invoice);
                setState({ kind: 'idle' });
                void submitForApproval(invoice);
              } else {
                setState({ kind: 'done', invoice });
              }
            }}
            onRetry={() => void retry(state.invoice.invoiceId)}
            onScanAnother={() => setState({ kind: 'idle' })}
          />
        ) : null}
      </Card>
    </Section>
  );
}

function WorkingView({
  stage,
  fileName,
  startedAt,
  onCancel,
}: {
  stage: Stage;
  fileName: string;
  startedAt: number;
  onCancel: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = Math.max(0, Math.round((now - startedAt) / 1000));
  const reading = stage === 'processing' || stage === 'retrying';

  return (
    <>
      <View style={styles.working}>
        <ActivityIndicator color={colors.primary} />
        <View style={styles.workingText}>
          <Text style={styles.workingTitle}>{STAGE_TEXT[stage]}</Text>
          {reading ? <Text style={styles.workingHint}>{processingHint(seconds)}</Text> : null}
          {fileName ? (
            <Text style={styles.muted} numberOfLines={1}>
              {fileName}
            </Text>
          ) : null}
        </View>
        <Text style={styles.elapsed}>{formatElapsed(seconds)}</Text>
      </View>
      <PrimaryButton label="Cancel" icon="close" variant="secondary" compact onPress={onCancel} />
    </>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    sources: {
      flexDirection: 'row',
      gap: spacing.two,
    },
    source: {
      flex: 1,
    },
    confirmed: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingHorizontal: spacing.three,
      paddingVertical: spacing.two,
      borderRadius: 10,
      backgroundColor: statusColors.APPROVED.background,
    },
    confirmedText: {
      flex: 1,
      ...typography.footnoteStrong,
      color: statusColors.APPROVED.text,
    },
    confirmedLink: {
      ...typography.footnoteStrong,
      color: colors.primary,
    },
    intro: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
    },
    introIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: iconBadge(colors.primary),
      alignItems: 'center',
      justifyContent: 'center',
    },
    introText: {
      flex: 1,
      ...typography.footnote,
      color: colors.textSecondary,
    },
    working: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.two,
    },
    workingText: {
      flex: 1,
      gap: 2,
    },
    workingHint: {
      ...typography.footnote,
      color: colors.textSecondary,
    },
    elapsed: {
      ...typography.footnoteStrong,
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    workingTitle: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
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
  });
