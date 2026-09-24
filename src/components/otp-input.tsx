import React, { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors } from '@/constants/theme';

const LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function OtpInput({ value, onChange }: OtpInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const setDigit = (index: number, text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');

    if (digitsOnly.length > 1) {
      const merged = (value.slice(0, index) + digitsOnly).slice(0, LENGTH);
      onChange(merged);
      const nextIndex = Math.min(merged.length, LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const chars = value.split('');
    chars[index] = digitsOnly;
    const next = chars.join('').slice(0, LENGTH);
    onChange(next);

    if (digitsOnly && index < LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length: LENGTH }).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={styles.box}
          keyboardType="number-pad"
          maxLength={LENGTH}
          value={value[index] ?? ''}
          onChangeText={(text) => setDigit(index, text)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  box: {
    width: 44,
    height: 52,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
