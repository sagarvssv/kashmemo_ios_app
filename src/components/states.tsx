import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { colors, spacing } from '@/constants/theme';

export function LoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
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
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={32} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action}
    </View>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.inline}>
      <Ionicons name="alert-circle" size={16} color={colors.danger} />
      <Text style={styles.inlineText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.eight,
    paddingHorizontal: spacing.six,
    gap: spacing.three,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  inline: {
    flexDirection: 'row',
    gap: spacing.two,
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: spacing.three,
  },
  inlineText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
  },
});
