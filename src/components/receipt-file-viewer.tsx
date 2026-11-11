import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { radius, spacing, typography } from '@/constants/theme';
import { getInvoice, type Invoice } from '@/lib/invoices';

// The original receipt stored in S3. Its link (fileUrl) expires after 5 minutes,
// so a fresh one is fetched (GET /invoices/{id}) whenever it's opened or fails.

function isPdf(invoice: Invoice) {
  return invoice.contentType === 'application/pdf' || Boolean(invoice.fileName?.toLowerCase().endsWith('.pdf'));
}

async function freshFileUrl(invoiceId: string) {
  const { fileUrl } = await getInvoice(invoiceId);
  if (!fileUrl) throw new Error('This receipt has no file to show.');
  return fileUrl;
}

export function ReceiptFileViewer({ invoice }: { invoice: Invoice }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const [url, setUrl] = useState(invoice.fileUrl ?? null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One automatic refresh when the thumbnail fails (usually an expired link).
  const [refreshed, setRefreshed] = useState(false);

  const refresh = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await freshFileUrl(invoice.invoiceId);
      setUrl(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the receipt file.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const openPdf = async () => {
    const next = await refresh();
    // In-app browser (Safari view / Chrome custom tab) renders the PDF natively.
    if (next)
      await WebBrowser.openBrowserAsync(next, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
  };

  const openImage = async () => {
    // A fresh link so the full-screen view never hits an expired one.
    if (await refresh()) setOpen(true);
  };

  if (!invoice.fileUrl && !url) return null;

  if (isPdf(invoice)) {
    return (
      <View style={styles.wrap}>
        <Pressable
          onPress={() => void openPdf()}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.pdf, pressed && styles.pressed]}>
          <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          <View style={styles.pdfText}>
            <Text style={styles.pdfTitle} numberOfLines={1}>
              {invoice.fileName ?? 'Receipt.pdf'}
            </Text>
            <Text style={styles.muted}>Tap to view the PDF</Text>
          </View>
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons name="open-outline" size={18} color={colors.primary} />
          )}
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => void openImage()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="View receipt photo"
        style={({ pressed }) => [styles.thumbWrap, pressed && styles.pressed]}>
        {url ? (
          <Image
            source={{ uri: url }}
            style={styles.thumb}
            contentFit="cover"
            transition={150}
            onError={() => {
              if (!refreshed) {
                setRefreshed(true);
                void refresh();
              }
            }}
          />
        ) : null}
        <View style={styles.thumbBadge}>
          {busy ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="expand-outline" size={13} color="#FFFFFF" />
              <Text style={styles.thumbBadgeText}>View receipt</Text>
            </>
          )}
        </View>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        {url ? <ZoomableImage uri={url} title={invoice.fileName} onClose={() => setOpen(false)} /> : null}
      </Modal>
    </View>
  );
}

// Full-screen photo: pinch to zoom, drag when zoomed, double-tap to zoom in/out.
function ZoomableImage({ uri, title, onClose }: { uri: string; title?: string; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 1), 5);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) reset();
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      translateX.value = savedX.value + event.translationX;
      translateY.value = savedY.value + event.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <GestureHandlerRootView style={styles.viewer}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.viewer} edges={['top', 'bottom']}>
          <View style={styles.viewerHeader}>
            <Text style={styles.viewerTitle} numberOfLines={1}>
              {title ?? 'Receipt'}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
          </View>
          <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
            <Animated.View style={[styles.viewerBody, animatedStyle]}>
              <Image source={{ uri }} style={styles.viewerImage} contentFit="contain" />
            </Animated.View>
          </GestureDetector>
          <Text style={styles.viewerHint}>Pinch or double-tap to zoom</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.one,
    },
    pressed: {
      opacity: 0.75,
    },
    muted: {
      ...typography.caption,
      color: colors.textMuted,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
    pdf: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.surface,
    },
    pdfText: {
      flex: 1,
      gap: 2,
    },
    pdfTitle: {
      ...typography.footnoteStrong,
      color: colors.textPrimary,
    },
    thumbWrap: {
      height: 160,
      borderRadius: radius.medium,
      overflow: 'hidden',
      backgroundColor: colors.borderLight,
    },
    thumb: {
      width: '100%',
      height: '100%',
    },
    thumbBadge: {
      position: 'absolute',
      right: spacing.two,
      bottom: spacing.two,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    thumbBadgeText: {
      ...typography.captionStrong,
      color: '#FFFFFF',
    },
    viewer: {
      flex: 1,
      backgroundColor: '#000000',
    },
    viewerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.three,
      paddingHorizontal: spacing.four,
      paddingVertical: spacing.three,
    },
    viewerTitle: {
      flex: 1,
      ...typography.bodyStrong,
      color: '#FFFFFF',
    },
    viewerBody: {
      flex: 1,
    },
    viewerImage: {
      width: '100%',
      height: '100%',
    },
    viewerHint: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.7)',
      textAlign: 'center',
      paddingBottom: spacing.two,
    },
  });
