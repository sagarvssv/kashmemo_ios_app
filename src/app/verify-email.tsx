import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthHero } from '@/components/auth-hero';
import { Card } from '@/components/card';
import { OtpInput } from '@/components/otp-input';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { InlineError } from '@/components/states';
import { SuccessCelebration } from '@/components/success-celebration';
import { type Palette, useThemedStyles } from '@/constants/brand';
import { typography } from '@/constants/theme';
import { errorMessage } from '@/lib/api';
import { authApi } from '@/lib/endpoints';

const RESEND_SECONDS = 60;

export default function VerifyEmailScreen() {
  const styles = useThemedStyles(makeStyles);
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // The backend allows one resend per minute.
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleResend = async () => {
    if (secondsLeft > 0 || !email) return;
    setError(null);
    setNotice(null);
    try {
      const { data } = await authApi.resendVerificationCode(email);
      setOtp('');
      setNotice(data?.message ?? 'A new code has been sent.');
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6 || !email) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.verifyEmail(email, otp);
      setVerified(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verified) {
    return (
      <SuccessCelebration
        title="Email verified"
        message="Your organisation is ready. Log in to set up departments and add your team."
        actions={<PrimaryButton label="Log in" icon="log-in-outline" onPress={() => router.replace('/login')} />}
      />
    );
  }

  return (
    <Screen title="Verify email" backFallback="/login">
      <AuthHero
        icon="mail-unread-outline"
        title="Verify your email"
        description={
          <>
            Enter the 6-digit code we sent to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </>
        }
      />
      <Card>
        <OtpInput value={otp} onChange={setOtp} />
        <View style={styles.center}>
          <Text style={styles.hint}>The code is valid for 10 minutes.</Text>
          {secondsLeft > 0 ? (
            <Text style={styles.hint}>Resend code in 0:{secondsLeft.toString().padStart(2, '0')}</Text>
          ) : (
            <Pressable onPress={handleResend} hitSlop={8}>
              <Text style={styles.resend}>Resend code</Text>
            </Pressable>
          )}
          {notice ? <Text style={styles.hint}>{notice}</Text> : null}
        </View>
        <InlineError message={error} />
        <PrimaryButton label="Verify email" icon="checkmark-done-outline" onPress={handleVerify} disabled={otp.length !== 6} loading={isSubmitting} />
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: 4,
  },
  email: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  hint: {
    ...typography.footnote,
    color: colors.textMuted,
  },
  resend: {
    ...typography.footnoteStrong,
    color: colors.primary,
  },
});
