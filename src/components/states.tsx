import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { PrimaryButton } from '@/components/primary-button';
import { SkeletonCards, SkeletonDashboard, SkeletonDetail, SkeletonList } from '@/components/skeleton';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, spacing, typography } from '@/constants/theme';

type LoadingVariant = 'list' | 'detail' | 'cards' | 'dashboard';

// Shimmering placeholders shaped like the content that's loading.
// `padded` adds the screen gutter for screens that render their own list.
export function LoadingState({ variant = 'list', padded }: { variant?: LoadingVariant; padded?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const content =
    variant === 'detail' ? (
      <SkeletonDetail />
    ) : variant === 'cards' ? (
      <SkeletonCards />
    ) : variant === 'dashboard' ? (
      <SkeletonDashboard />
    ) : (
      <SkeletonList />
    );
  return (
    <View
      style={padded && styles.padded}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading">
      {content}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View style={styles.container}>
      <View style={[styles.stateIcon, { backgroundColor: iconBadge(colors.danger) }]}>
        <Ionicons name="cloud-offline-outline" size={24} color={colors.danger} />
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry && <PrimaryButton label="Try again" onPress={onRetry} variant="secondary" compact />}
    </View>
  );
}

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon = 'file-tray-outline', title, message, action }: EmptyStateProps) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  return (
    <View style={styles.container}>
      <View style={[styles.stateIcon, { backgroundColor: iconBadge(brand.primary) }]}>
        <Ionicons name={icon} size={24} color={brand.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action}
    </View>
  );
}

// Form error box. Each new message shakes the box, pops the icon and gives an
// error haptic, so a failed submit is noticed even when the box was already there.
export function InlineError({ message }: { message: string | null }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!message) return;
    shake.set(
      withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 70 }),
        withTiming(-5, { duration: 60 }),
        withTiming(5, { duration: 60 }),
        withTiming(0, { duration: 50 }),
      ),
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [message, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  if (!message) return null;
  return (
    <Animated.View entering={FadeIn.duration(180)} style={[styles.inline, shakeStyle]} accessibilityRole="alert">
      <Animated.View key={message} entering={ZoomIn.springify().damping(9)}>
        <Ionicons name="alert-circle" size={18} color={colors.danger} />
      </Animated.View>
      <Text style={styles.inlineText}>{message}</Text>
    </Animated.View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padded: {
    paddingHorizontal: spacing.four,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.eight,
    paddingHorizontal: spacing.six,
    gap: spacing.three,
  },
  title: {
    ...typography.button,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...typography.callout,
    color: colors.textMuted,
    textAlign: 'center',
  },
  inline: {
    flexDirection: 'row',
    gap: spacing.two,
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    padding: spacing.three,
  },
  inlineText: {
    flex: 1,
    ...typography.footnote,
    color: '#991B1B',
  },
});
