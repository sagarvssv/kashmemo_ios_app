import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthHero } from '@/components/auth-hero';
import { Card } from '@/components/card';
import { OtpInput } from '@/components/otp-input';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { InlineError } from '@/components/states';
import { type Palette, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';
import { errorMessage } from '@/lib/api';
import { authApi } from '@/lib/endpoints';

const RESEND_SECONDS = 45;

export default function VerifyOtpScreen() {
  const styles = useThemedStyles(makeStyles);
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    setNotice(null);
    try {
      await authApi.forgotPassword(email);
      setOtp('');
      setNotice('A new code is on its way.');
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const timerLabel = `0:${secondsLeft.toString().padStart(2, '0')}`;

  return (
    <Screen title="Verify code" backFallback="/forgot-password">
      <AuthHero
        icon="shield-checkmark-outline"
        title="Check your email"
        description={
          <>
            Enter the 6-digit code we sent to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </>
        }
        step={{ current: 2, total: 3 }}
      />

      <Card>
        <OtpInput value={otp} onChange={setOtp} />

        <View style={styles.resendRow}>
          {secondsLeft > 0 ? (
            <Text style={styles.resendHint}>Resend code in {timerLabel}</Text>
          ) : (
            <Pressable onPress={handleResend} hitSlop={8}>
              <Text style={styles.resendLink}>Resend code</Text>
            </Pressable>
          )}
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <InlineError message={error} />
        <PrimaryButton label="Continue" icon="arrow-forward" onPress={handleVerify} disabled={!canSubmit} />
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  email: {
    ...typography.calloutStrong,
    color: colors.textPrimary,
  },
  resendRow: {
    alignItems: 'center',
    paddingVertical: spacing.one,
  },
  resendHint: {
    ...typography.footnote,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  resendLink: {
    ...typography.footnoteStrong,
    color: colors.primary,
  },
  notice: {
    ...typography.footnote,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
