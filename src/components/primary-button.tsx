import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'danger';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
  compact,
  style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const textColor = variant === 'secondary' ? colors.primary : '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        isDisabled && (variant === 'secondary' ? styles.secondaryDisabled : styles.buttonDisabled),
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={textColor} />}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
  },
  compact: {
    height: 42,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  secondaryDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
