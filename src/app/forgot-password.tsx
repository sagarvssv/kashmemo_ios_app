import { Link, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AuthHero } from '@/components/auth-hero';
import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { InlineError } from '@/components/states';
import { TextField } from '@/components/text-field';
import { type Palette, useThemedStyles } from '@/constants/brand';
import { typography } from '@/constants/theme';
import { errorMessage } from '@/lib/api';
import { authApi } from '@/lib/endpoints';

export default function ForgotPasswordScreen() {
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const canSubmit = email.trim().length > 0 && !isSending;

  const handleSendOtp = async () => {
    if (!canSubmit) return;
    const normalizedEmail = email.trim().toLowerCase();
    setIsSending(true);
    setError(null);
    try {
      const result = await authApi.forgotPassword(normalizedEmail);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.push({ pathname: '/verify-otp', params: { email: normalizedEmail } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Screen title="Forgot password" backFallback="/login">
      <AuthHero
        icon="key-outline"
        title="Reset your password"
        description="Enter your email and we'll send you a 6-digit code to set a new password."
        step={{ current: 1, total: 3 }}
      />

      <Card>
        <TextField
          label="Email address"
          icon="mail-outline"
          placeholder="you@company.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="send"
          onSubmitEditing={handleSendOtp}
          value={email}
          onChangeText={setEmail}
        />
        <InlineError message={error} />
        <PrimaryButton label="Send code" icon="paper-plane-outline" onPress={handleSendOtp} disabled={!canSubmit} loading={isSending} />
      </Card>

      <Link href="/login" style={styles.backLink}>
        Back to login
      </Link>
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  backLink: {
    ...typography.footnoteStrong,
    alignSelf: 'center',
    color: colors.primary,
  },
});
