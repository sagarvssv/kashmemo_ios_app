import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { radius, withAlpha } from '@/constants/theme';

const LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
};

// Six glass boxes; the active box is outlined in the brand colour and each
// digit pops in as it is typed. Pasting a full code fills every box.
export function OtpInput({ value, onChange }: OtpInputProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  // RN 0.88: the ref holds the TextInput instance type, not the component type.
  const inputRefs = useRef<(React.ComponentRef<typeof TextInput> | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

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
      {Array.from({ length: LENGTH }).map((_, index) => {
        const digit = value[index] ?? '';
        const focused = focusedIndex === index;
        return (
          <DigitBox key={index} digit={digit} focused={focused}>
            <TextInput
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={styles.input}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={LENGTH}
              value={digit}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
              onChangeText={(text) => setDigit(index, text)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              selectionColor={colors.primary}
            />
          </DigitBox>
        );
      })}
    </View>
  );
}

// The box pulses when a digit lands in it. The input itself never remounts,
// so keyboard focus and backspacing are unaffected.
function DigitBox({ digit, focused, children }: { digit: string; focused: boolean; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!digit) return;
    scale.set(withSequence(withTiming(1.12, { duration: 90 }), withSpring(1, { damping: 10, stiffness: 260 })));
  }, [digit, scale]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={[styles.box, digit && styles.boxFilled, focused && styles.boxFocused, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 58,
    borderRadius: radius.medium,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: withAlpha(colors.border, 0.18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: withAlpha(colors.primary, 0.45),
  },
  boxFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  input: {
    width: 44,
    height: 54,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
