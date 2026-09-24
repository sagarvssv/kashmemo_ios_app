import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OtpInput } from '@/components/otp-input';
import { PrimaryButton } from '@/components/primary-button';
import { InlineError } from '@/components/states';
import { colors, spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api';
import { authApi } from '@/lib/endpoints';
import { goBackOrReplace } from '@/utils/navigation';

const RESEND_SECONDS = 45;

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const canSubmit = otp.length === 6;

  // The backend checks the code together with the new password, so it is
  // carried forward to the reset screen rather than verified here.
  const handleVerify = () => {
    if (!canSubmit) return;
    router.push({ pathname: '/reset-password', params: { email, otp } });
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || !email) return;
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setOtp('');
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const timerLabel = `00:${secondsLeft.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => goBackOrReplace('/login')} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Verify OTP</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.description}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <OtpInput value={otp} onChange={setOtp} />

        {secondsLeft > 0 ? (
          <Text style={styles.resendHint}>Resend OTP in {timerLabel}</Text>
        ) : (
          <Pressable onPress={handleResend}>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </Pressable>
        )}

        <InlineError message={error} />

        <PrimaryButton label="Continue" onPress={handleVerify} disabled={!canSubmit} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.four,
    paddingTop: spacing.three,
    gap: spacing.three,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body: {
    paddingHorizontal: spacing.six,
    marginTop: spacing.eight,
    gap: spacing.five,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  email: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  resendHint: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  resendLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
});
