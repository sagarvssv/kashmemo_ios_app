import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { typography } from '@/constants/theme';

type TextFieldProps = TextInputProps & {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onTrailingIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  icon,
  label,
  trailingIcon,
  onTrailingIconPress,
  containerStyle,
  multiline,
  ...textInputProps
}: TextFieldProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const field = (
    <View style={[styles.container, multiline && styles.multilineContainer, !label && containerStyle]}>
      {icon && <Ionicons name={icon} size={18} color={colors.textSecondary} style={styles.leadingIcon} />}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline && styles.multilineInput]}
        multiline={multiline}
        {...textInputProps}
      />
      {trailingIcon && (
        <Pressable onPress={onTrailingIconPress} hitSlop={8}>
          <Ionicons name={trailingIcon} size={18} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );

  if (!label) return field;

  return (
    <View style={[styles.labelled, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      {field}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  labelled: {
    gap: 6,
  },
  label: {
    ...typography.footnoteStrong,
    color: colors.textPrimary,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  multilineContainer: {
    height: undefined,
    minHeight: 96,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  leadingIcon: {
    marginRight: 0,
  },
  input: {
    flex: 1,
    ...typography.input,
    color: colors.textPrimary,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 72,
  },
});
