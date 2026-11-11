import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion';
import { type Palette, useBrand, useThemedStyles } from '@/constants/brand';
import { typography } from '@/constants/theme';

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
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  const isDisabled = disabled || loading;
  const textColor = variant === 'secondary' ? brand.primary : '#FFFFFF';

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={[
        styles.button,
        { backgroundColor: brand.primary, shadowColor: brand.primary },
        compact && styles.compact,
        variant === 'secondary' && [styles.secondary, { borderColor: brand.primary }],
        variant === 'danger' && styles.danger,
        isDisabled && (variant === 'secondary' ? styles.secondaryDisabled : styles.buttonDisabled),
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
    </PressableScale>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  compact: {
    height: 42,
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  secondaryDisabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.button,
  },
});
